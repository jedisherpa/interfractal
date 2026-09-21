import {freshState,canonicalStateAt,semanticPayload,ledgerPayload,exportResponseIsCurrent,fingerprint,clone,decimal,pointScreen,rationalToNumber} from './model.mjs';

const $=id=>document.getElementById(id);
const fixture=await fetch('/fixture.json',{cache:'no-store'}).then(r=>r.json());
const build=await fetch('/build.json',{cache:'no-store'}).then(r=>r.json());
let state=freshState(),ledger=[],reviewMetadata={externalExposure:'unknown',humanEligible:false,firstExposureHumanEligible:false},sessionToken=null,sessionId=null,attached=null,receipt=null,pending=null,epoch=0,revision=0,publishedRevision=0,events=[],sequence=0,timer=null,clockBase=0,lastBoundary=0;
const runId=build.runId,buildId=build.buildId;
const id=()=>crypto.randomUUID().replaceAll('-','');
const taskFor=s=>fixture.tasks.find(t=>t.id===s.caseId);
const safeAttempt=a=>a?{ordinal:a.ordinal,priorReveal:a.priorReveal}:null;
const safeReveal=r=>r?{target:clone(r.target),explanation:r.explanation,expectedOptionId:r.expectedOptionId,softwareGrade:r.softwareGrade}:null;
const json=x=>JSON.stringify(x,null,2);
function inspectorLedger(){return ledger.map(a=>({attemptId:a.attemptId,caseId:a.caseId,ordinal:a.ordinal,priorReveal:a.priorReveal,status:a.status,response:a.response,commitEventReference:a.commitEventReference??null,revealEventReference:a.revealEventReference??null,firstExposureHumanEligible:false}));}
function snapshotParts(){return {semantic:clone(semanticPayload(state,fixture)),ledger:clone(ledgerPayload(inspectorLedger(),reviewMetadata))};}
async function publish(){
  const n=++revision,parts=snapshotParts();
  const [semanticFingerprint,ledgerFingerprint]=await Promise.all([fingerprint(parts.semantic),fingerprint(parts.ledger)]);
  if(n!==revision)return;
  const packet={schema:'gate10-published-snapshot-v1',runId,buildId,snapshotRevision:n,semanticPayload:parts.semantic,semanticFingerprint,ledgerPayload:parts.ledger,ledgerFingerprint};
  render(packet);
  const cardRects=[...document.querySelectorAll('.card svg')].map(x=>({width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height}));
  packet.viewport={width:innerWidth,height:innerHeight,scrollX,scrollY,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight};
  packet.scene={cardWidthCss:280,cardHeightCss:200,renderedCardCount:cardRects.length,cardRects,caseId:parts.semantic.caseId};
  $('inspector').textContent=json(packet);publishedRevision=n;
}
function redraw(){if(!state.paused)advanceClock();publish().catch(e=>{$('status').textContent=`Snapshot error: ${e.message}`;});}
async function log(type,origin,intended,result,before,after){
  const actor=origin==='user-control'?'source_informed_software_ui':origin==='api'?'source_informed_software_api':'scripted_demonstration';
  const provenance=origin==='replay'||origin==='automatic'?'scripted_demonstration':'source_informed_software';
  const seq=++sequence,event={schema:'gate10-ui-event-v1',sequence:seq,eventId:`${runId}-ui:${seq}`,atUtc:new Date().toISOString(),runId,buildId,documentId:sessionId,origin,actor,provenance,type,intended,result,cursorSeconds:state.cursorSeconds,beforeSemanticFingerprint:await fingerprint(before),afterSemanticFingerprint:await fingerprint(after)};
  events.push(event);events.sort((a,b)=>a.sequence-b.sequence);
}
function mutate(type,origin,intended,fn,result='accepted'){
  const before=clone(semanticPayload(state,fixture));fn();const after=clone(semanticPayload(state,fixture));log(type,origin,intended,result,before,after);redraw();
}
function pauseClock(){if(timer){clearInterval(timer);timer=null;}state.paused=true;}
function clearLocal(){attached=null;receipt=null;pending=null;state.draftOption=null;state.responsePhase='none';state.response=null;state.revealedResult=null;state.attachedAttempt=null;state.pendingAction=null;$('export-output').textContent='';}
function restore(seconds,reason){
  if(pending)return;
  const before=clone(semanticPayload(state,fixture));pauseClock();epoch++;
  const prior=attached;clearLocal();state=canonicalStateAt(fixture,seconds);lastBoundary=seconds;
  if(prior&&sessionToken)fetch('/api/close',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionToken,buildId,attemptId:prior.attemptId,reason:'reopen-saved'})}).catch(()=>{});
  const after=clone(semanticPayload(state,fixture));log(reason,'user-control',{seconds},'accepted',before,after);redraw();
}
function localReview(caseId=state.caseId,type='case-select'){
  if(pending)return;
  const before=clone(semanticPayload(state,fixture));pauseClock();epoch++;
  const prior=attached;clearLocal();state.mode='local-review';state.caseId=caseId;state.reviewStatus='source-informed-local-review';
  if(prior&&sessionToken)fetch('/api/close',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionToken,buildId,attemptId:prior.attemptId,reason:'inspect-other-case'})}).catch(()=>{});
  const after=clone(semanticPayload(state,fixture));log(type,'user-control',{caseId},'accepted',before,after);redraw();
}
function advanceClock(){
  if(state.paused)return;
  const value=Math.min(20,(performance.now()-clockBase)/1000);
  for(let boundary=lastBoundary+4;boundary<=Math.floor(value/4)*4&&boundary<=20;boundary+=4){
    state.cursorSeconds=boundary;
    const before=clone(semanticPayload(state,fixture));state.caseId=fixture.savedTour.caseOrder[boundary/4];lastBoundary=boundary;
    log('case-select','replay',{caseId:state.caseId,boundarySeconds:boundary},'accepted',before,clone(semanticPayload(state,fixture)));
  }
  state.cursorSeconds=value;
  if(value>=20){const before=clone(semanticPayload(state,fixture));pauseClock();state.cursorSeconds=20;state.reviewStatus='end-of-sequence';log('tour-stop','automatic',{reason:'end-of-sequence'},'accepted',before,clone(semanticPayload(state,fixture)));}
}
function tick(){redraw();}
function play(){if(pending||state.practiceOpen)return;if(state.mode!=='saved-tour')restore(0,'reopen-saved');const before=clone(semanticPayload(state,fixture));state.paused=false;state.reviewStatus='standard-playback';clockBase=performance.now()-state.cursorSeconds*1000;lastBoundary=Math.floor(state.cursorSeconds/4)*4;if(timer)clearInterval(timer);timer=setInterval(tick,80);log('tour-play','user-control',{},'accepted',before,clone(semanticPayload(state,fixture)));redraw();}
function pause(){if(state.paused)return;advanceClock();if(state.paused){redraw();return;}const before=clone(semanticPayload(state,fixture));pauseClock();log('tour-pause','user-control',{},'accepted',before,clone(semanticPayload(state,fixture)));redraw();}
async function api(path,body){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});const data=await r.json();if(!r.ok)throw Object.assign(Error(data.error||`HTTP ${r.status}`),{status:r.status});return data;}
async function act(kind,path,body,onAck){
  if(pending)return;
  const capturedEpoch=epoch,capturedCase=state.caseId,capturedAttempt=attached?.attemptId??null;
  const before=clone(semanticPayload(state,fixture));pending={kind,path,body,capturedEpoch,capturedCase,capturedAttempt,onAck};state.pendingAction={kind,status:'awaiting-server-acknowledgement'};log(`${kind}-request`,'user-control',{caseId:capturedCase,attemptId:capturedAttempt},'accepted',before,clone(semanticPayload(state,fixture)));redraw();
  await dispatchPending();
}
async function dispatchPending(){
  if(!pending)return;const operation=pending;
  try{
    const data=await api(operation.path,operation.body);
    if(pending!==operation)return;
    if(epoch!==operation.capturedEpoch||state.caseId!==operation.capturedCase||attached?.attemptId!==operation.capturedAttempt){pending=null;state.pendingAction=null;redraw();return;}
    const before=clone(semanticPayload(state,fixture));operation.onAck(data);pending=null;state.pendingAction=null;
    log(`${operation.kind}-ack`,'api',{caseId:operation.capturedCase,eventReference:data.eventReference??null},'accepted',before,clone(semanticPayload(state,fixture)));redraw();
  }catch(e){if(pending!==operation)return;const before=clone(semanticPayload(state,fixture));state.pendingAction={kind:operation.kind,status:e.status?'rejected':'unknown'};
    if(e.status){pending=null;state.pendingAction=null;$('status').textContent=`Server rejected ${operation.kind}: ${e.message}`;}else $('status').textContent=`Network status unknown for ${operation.kind}; retry the same request.`;
    log(`${operation.kind}-${e.status?'reject':'unknown'}`,'api',{caseId:operation.capturedCase,reason:e.message},'rejected',before,clone(semanticPayload(state,fixture)));redraw();}
}
async function ensureSession(){if(sessionToken)return;
  const before=clone(semanticPayload(state,fixture)),capturedEpoch=epoch;
  pending={kind:'session',capturedEpoch};state.pendingAction={kind:'session',status:'awaiting-server-acknowledgement'};
  log('session-request','user-control',{},'accepted',before,clone(semanticPayload(state,fixture)));redraw();
  try{const data=await api('/api/session',{actor:'software_validation'});if(epoch!==capturedEpoch)return;sessionToken=data.sessionToken;sessionId=data.sessionId;const b=clone(semanticPayload(state,fixture));pending=null;state.pendingAction=null;log('session-ack','api',{sessionId},'accepted',b,clone(semanticPayload(state,fixture)));redraw();}
  catch(e){pending=null;state.pendingAction=null;redraw();throw e;}
}
function start(){
  if(state.mode!=='local-review'||state.practiceOpen||pending)return;
  epoch++;$('export-output').textContent='';
  const requestId=id(),caseId=state.caseId;
  act('attempt-start','/api/start',{get sessionToken(){return sessionToken},buildId,caseId,requestId},data=>{
    attached={attemptId:data.attemptId,caseId:data.caseId,ordinal:data.ordinal,priorReveal:data.priorReveal};receipt=null;
    state.attachedAttempt=safeAttempt(attached);state.responsePhase='answering';state.draftOption=null;state.response=null;state.revealedResult=null;
    ledger.push({attemptId:data.attemptId,caseId:data.caseId,ordinal:data.ordinal,priorReveal:data.priorReveal,status:'answering',response:null,commitEventReference:null,revealEventReference:null,softwareGrade:null,target:null,explanation:null,firstExposureHumanEligible:false});
  });
}
async function startWithSession(){
  if(pending||state.mode!=='local-review'||state.practiceOpen)return;
  try{await ensureSession();start();}catch(e){$('status').textContent=`Session error: ${e.message}`;}
}
function commit(kind){
  if(!attached||state.responsePhase!=='answering'||pending)return;
  const response={kind,optionId:kind==='skip'?null:state.draftOption};if(kind==='answer'&&!response.optionId)return;
  act('commit','/api/commit',{sessionToken,buildId,caseId:state.caseId,attemptId:attached.attemptId,requestId:id(),response},data=>{
    receipt=data.receipt;state.responsePhase='committed';state.response=clone(data.response);state.draftOption=null;
    const row=ledger.find(x=>x.attemptId===attached.attemptId);row.status=kind==='skip'?'skipped':'committed';row.response=clone(data.response);row.commitEventReference=data.eventReference;row.commitSequence=data.commitSequence;row.committedAtUtc=data.committedAtUtc;
  });
}
function reveal(){if(!attached||!receipt||state.responsePhase!=='committed'||pending)return;
  act('reveal','/api/reveal',{sessionToken,buildId,caseId:state.caseId,attemptId:attached.attemptId,receipt,requestId:id()},data=>{
    state.responsePhase='revealed';state.revealedResult=safeReveal(data);const row=ledger.find(x=>x.attemptId===attached.attemptId);row.status='revealed';row.revealEventReference=data.eventReference;row.softwareGrade=data.softwareGrade;row.target=clone(data.target);row.explanation=data.explanation;
  });
}
function openPractice(){if(pending)return;const before=clone(semanticPayload(state,fixture));pauseClock();epoch++;const prior=attached;clearLocal();state.mode='local-review';state.practiceOpen=true;state.reviewStatus='worked-practice';if(prior&&sessionToken)api('/api/close',{sessionToken,buildId,attemptId:prior.attemptId,reason:'inspect-other-case'}).catch(()=>{});log('practice-open','user-control',{},'accepted',before,clone(semanticPayload(state,fixture)));redraw();}
function closePractice(){if(!state.practiceOpen||pending)return;mutate('practice-close','user-control',{},()=>{state.practiceOpen=false;state.reviewStatus='source-informed-local-review';});}
function showTarget(r){if(!r)return '';const t=r.target;let content='';if(t.kind==='unique-point')content=`Unique point: (${t.xyz.join(', ')})`;else if(t.kind==='point-set')content=`Two possible outputs; no unique prediction: ${t.points.map(p=>`(${p.join(', ')})`).join(' or ')}`;else if(t.kind==='point')content=`One point at (${t.center.join(', ')}), delta ${t.delta}, radius squared ${t.radiusSquared}`;else content=`Empty; delta ${t.delta}, radiusSquared null, radius null`;return `<div id="target-result"><strong>${content}</strong><p>${r.explanation}</p><p>Software grade: ${r.softwareGrade??'not graded (skip)'}</p></div>`;}
function supportCard(s,index){const point=s.xyz,scale=fixture.rendering.scaleCssPerUnit,yaw=s.cameraYawDegrees??0,pitch=20;let art,label;
  if(point){const p=pointScreen(point,yaw,pitch,scale);art=`<circle cx="${p.x}" cy="${p.y}" r="7" fill="#146eaa"/><text x="8" y="20">point P</text>`;label=`raw xyz (${point.join(', ')}) · decimals (${point.map(x=>decimal(x)).join(', ')})`;}
  else if(s.kind==='empty'){art='<text x="80" y="105">Empty slice</text>';label='Empty slice';}
  else if(s.kind==='point'){art='<circle cx="140" cy="100" r="4" fill="#c15c31"/><text x="8" y="20">one point</text>';label=`point; radiusSquared ${s.radiusSquared} · ${decimal(s.radiusSquared)}`;}
  else{const r=rationalToNumber(s.radius);art=`<ellipse cx="140" cy="100" rx="${50*r}" ry="${50*r}" fill="#83c6db" stroke="#146eaa"/><text x="8" y="20">ball slice</text>`;label=`ball; radius ${s.radius} · ${decimal(s.radius)}, radiusSquared ${s.radiusSquared} · ${decimal(s.radiusSquared)}`;}
  return `<article class="card"><h3>Support ${index+1}: ${s.id}</h3><svg viewBox="0 0 280 200" width="280" height="200" role="img" aria-label="${label}; camera yaw ${yaw} degrees"><path d="M0 100H280 M140 0V200" stroke="#c5d3db"/>${art}</svg><p>${label}</p><p>${point?`Source query ${s.queryId}`:`Slice setting ${s.sliceSetting}`} · camera yaw ${yaw}°, pitch ${pitch}°</p></article>`;
}
function render(packet){const s=packet.semanticPayload,t=s.task,working=s.mode==='local-review'&&!s.practiceOpen,busy=!!s.pendingAction;
  $('mode-label').textContent=s.mode==='saved-tour'?'Scripted software demonstration — no predictions or reveals':'Source-informed local software review; no human participant';
  $('clock').textContent=`${s.cursorSeconds.toFixed(3)} s / 20 s${s.reviewStatus==='end-of-sequence'?' · end-of-sequence':''}`;
  $('instructions').textContent=fixture.instructions.join(' ');$('formula').textContent=fixture.formulas.point+' '+fixture.formulas.ball;
  $('task').innerHTML=`<h2>${t.id} · ${t.category}</h2><p>${t.prompt}</p>${t.facts.map(x=>`<p>${x}</p>`).join('')}`;
  $('cards').innerHTML=t.supports.map(supportCard).join('');
  $('target').innerHTML=`<h2>Target query</h2><p>${t.family==='point4-rotation'?`Source query ${t.target.queryId}`:`Slice setting ${t.target.sliceSetting}`}</p>${s.revealedResult?showTarget(s.revealedResult):'<p id="target-withheld">Target result withheld</p>'}<h3>Answer alternatives</h3>${t.options.map(o=>`<p>${o.id}: ${o.label}</p>`).join('')}`;
  $('practice').hidden=!s.practiceOpen;
  if(s.practiceOpen){const p=s.practice;$('practice').innerHTML=`<h2>${p.label}</h2><p>Source (${p.source.join(', ')})</p><p>Supports: ${p.supports.map(x=>`${x.id} (${x.xyz.join(', ')}) at ${x.queryId}`).join('; ')}</p><p>Worked target (${p.workedTarget.xyz.join(', ')})</p><p>${p.explanation}</p>`;}
  $('choices').innerHTML=t.options.map(o=>`<label class="option"><input type="radio" name="draft" value="${o.id}" ${s.draftOption===o.id?'checked':''} ${!working||busy||s.responsePhase!=='answering'?'disabled':''}> ${o.id}: ${o.label}</label>`).join('');
  $('start').disabled=!working||busy||s.responsePhase!=='none';$('new-attempt').disabled=!working||busy||s.responsePhase==='none';
  $('commit').disabled=!working||busy||s.responsePhase!=='answering'||!s.draftOption;$('skip').disabled=!working||busy||s.responsePhase!=='answering';$('reveal').disabled=!working||busy||s.responsePhase!=='committed';
  $('play').disabled=busy||s.practiceOpen||!s.paused;$('pause').disabled=s.paused;
  for(const name of ['previous','next','checkpoint','replay','reopen','inspect','case-select','practice-open','practice-close','hide-result'])$(name).disabled=busy;
  $('practice-close').disabled=busy||!s.practiceOpen;$('hide-result').disabled=busy||!working||!s.attachedAttempt;
  $('export-ledger').disabled=busy||s.mode==='saved-tour'||s.practiceOpen;$('export-events').disabled=busy||s.mode==='saved-tour'||s.practiceOpen;
  $('case-select').value=s.caseId;$('checkpoint').value=String(Math.floor(s.cursorSeconds/4)*4);
  $('status').textContent=s.pendingAction?.status==='awaiting-server-acknowledgement'?'Awaiting server acknowledgement':s.pendingAction?.status==='unknown'?`Network status unknown. Use Retry same request.`:s.pendingAction?.status==='rejected'?'Server rejected request.':s.responsePhase==='committed'?'Response locked; grading withheld. Reveal is a separate action.':s.responsePhase==='revealed'?`Result revealed. Attempt ${s.attachedAttempt?.ordinal}; prior reveal ${s.attachedAttempt?.priorReveal}.`:working&&s.attachedAttempt?`Attempt ${s.attachedAttempt.ordinal}; prior reveal ${s.attachedAttempt.priorReveal}.`:'';
  $('retry').hidden=s.pendingAction?.status!=='unknown';
}
// Stable accessible controls; event handlers are installed once and never inferred from inspector text.
$('play').onclick=play;$('pause').onclick=pause;$('previous').onclick=()=>restore(Math.max(0,Math.floor((state.cursorSeconds-0.001)/4)*4),'checkpoint-previous');$('next').onclick=()=>restore(Math.min(20,(Math.floor(state.cursorSeconds/4)+1)*4),'checkpoint-next');$('checkpoint').onchange=e=>restore(Number(e.target.value),'checkpoint-direct');$('replay').onclick=()=>{restore(0,'tour-replay');play();};$('reopen').onclick=()=>restore(0,'reopen-saved');
$('inspect').onclick=()=>localReview(state.caseId,'inspect-case');$('case-select').onchange=e=>localReview(e.target.value,'case-select');$('practice-open').onclick=openPractice;$('practice-close').onclick=closePractice;$('hide-result').onclick=()=>localReview(state.caseId,'hide-result');
$('start').onclick=startWithSession;$('new-attempt').onclick=()=>{if(attached&&sessionToken)api('/api/close',{sessionToken,buildId,attemptId:attached.attemptId,reason:'new-review'}).catch(()=>{});const before=clone(semanticPayload(state,fixture));epoch++;clearLocal();log('new-review','user-control',{caseId:state.caseId},'accepted',before,clone(semanticPayload(state,fixture)));redraw();startWithSession();};
$('choices').onchange=e=>{if(e.target.name!=='draft'||state.responsePhase!=='answering'||pending)return;mutate('draft-select','user-control',{optionId:e.target.value},()=>state.draftOption=e.target.value);};$('commit').onclick=()=>commit('answer');$('skip').onclick=()=>commit('skip');$('reveal').onclick=reveal;
$('retry').onclick=()=>{if(!pending||state.pendingAction?.status!=='unknown')return;state.pendingAction={kind:pending.kind,status:'awaiting-server-acknowledgement'};redraw();dispatchPending();};
$('export-ledger').onclick=async()=>{if(state.mode!=='local-review'||state.practiceOpen||pending)return;if(!sessionToken){$('export-output').textContent=json({schema:'gate10-redacted-ledger-v1',attempts:[]});return;}const captured={epoch,mode:state.mode,sessionId};try{const data=await api('/api/export',{sessionToken,buildId});if(!exportResponseIsCurrent(captured,{epoch,mode:state.mode,sessionId}))return;ledger=clone(data.attempts);$('export-output').textContent=json(data);const before=clone(semanticPayload(state,fixture));log('local-export','user-control',{kind:'ledger'},'accepted',before,before);redraw();}catch(e){if(exportResponseIsCurrent(captured,{epoch,mode:state.mode,sessionId}))$('status').textContent=`Export error: ${e.message}`;}};
$('export-events').onclick=()=>{$('export-output').textContent=json({schema:'gate10-ui-events-v1',events});const same=clone(semanticPayload(state,fixture));log('local-export','user-control',{kind:'events'},'accepted',same,same);};
addEventListener('resize',redraw);addEventListener('scroll',redraw,{passive:true});
for(const t of fixture.tasks){const o=document.createElement('option');o.value=t.id;o.textContent=t.id+' · '+t.category;$('case-select').append(o);}redraw();
