import {clone,canonical,hash,fieldOrder,ordered,sourceHashes,makeRevision,allCertificates,initialState,checkpointState,derive,fullAnswer} from './model.mjs';
const $=id=>document.getElementById(id),json=x=>JSON.stringify(x,null,2);
const fixture=await fetch('/fixture.json',{cache:'no-store'}).then(r=>r.json()),build=await fetch('/build.json',{cache:'no-store'}).then(r=>r.json());
const hashes=await sourceHashes(fixture),certificates=await allCertificates(fixture);
const registry={};
registry.S0=await makeRevision(fixture,hashes,{id:'S0',parentId:null,fieldsBefore:[],requestedFields:[],triggerReceiverId:'R_COUNT',provenance:'scripted_demonstration',originEventReference:'initial-state'});
registry.S1=await makeRevision(fixture,hashes,{id:'S1',parentId:'S0',fieldsBefore:[],requestedFields:['calibration'],triggerReceiverId:'R_RELEASE',provenance:'scripted_demonstration',originEventReference:`${build.runId}-script:3`});
registry.S2=await makeRevision(fixture,hashes,{id:'S2',parentId:'S1',fieldsBefore:['calibration'],requestedFields:['authorization'],triggerReceiverId:'R_RELEASE',provenance:'scripted_demonstration',originEventReference:`${build.runId}-script:4`});
let state=initialState(fixture),localIds=[],nextLocal=1,canonicalSeen=new Set(['S0']),events=[],eventTasks=[],sequence=0,revision=0,lastPacket=null,timer=null,clockBase=0,lastBoundary=0,busy=false;
const choose=()=>{const ids=new Set([...canonicalSeen,...(state.mode==='local-exploration'?localIds:[]),state.revisionId]);return Object.fromEntries(Object.entries(registry).filter(([id])=>ids.has(id)));};
const semanticNow=()=>derive(fixture,clone(state),clone(choose()),certificates,hashes).semanticPayload;
function event(type,origin,intended,result,before,after){
  const n=++sequence,entry={schema:'gate11-event-v1',sequence:n,eventId:`${build.runId}-ui:${n}`,atUtc:new Date().toISOString(),runId:build.runId,buildId:build.buildId,documentId:'local-document',cursorSeconds:state.cursorSeconds,origin,actor:origin==='user-control'?'source_informed_software_ui':'scripted_demonstration',provenance:origin==='user-control'?'source_informed_software':'scripted_demonstration',type,intended,result,beforeSemanticFingerprint:null,afterSemanticFingerprint:null};
  events.push(entry);const task=Promise.all([hash(before),hash(after)]).then(([a,b])=>{entry.beforeSemanticFingerprint=a;entry.afterSemanticFingerprint=b;});eventTasks.push(task);return task;
}
function stopClock(){if(timer){clearInterval(timer);timer=null;}state.paused=true;}
function enterLocal(){stopClock();state.mode='local-exploration';state.endReason=null;}
function transition(type,intended,change){if(busy)return;const before=semanticNow();change();const after=semanticNow();event(type,'user-control',intended,'accepted',before,after);redraw();}
function currentCertificate(){return certificates.find(c=>c.receiverId===state.receiverId&&canonical(c.fields)===canonical(registry[state.revisionId].fieldsAfter));}
function applyScheduled(e){const before=semanticNow();state.cursorSeconds=e.seconds;
  if(e.type==='receiver-select')state.receiverId=e.payload.receiverId;
  else if(e.type==='witness-open')state.witnessPair=clone(e.payload.pair);
  else if(e.type==='repair-apply'){state.revisionId=e.payload.revisionId;canonicalSeen.add(state.revisionId);state.repairDraft=[];}
  else if(e.type==='representation-select')state.representation=e.payload.representation;
  else if(e.type==='canonical-restore'){const restored=initialState(fixture);restored.cursorSeconds=24;restored.paused=false;state=restored;$('export-output').textContent='';}
  else if(e.type==='tour-stop'){stopClock();state.endReason='end-of-sequence';}
  event(e.type,e.origin,clone(e.payload),'accepted',before,semanticNow());
}
function advanceClock(sampledNow){if(state.paused)return;const seconds=Math.min(24,(sampledNow-clockBase)/1000);
  for(const e of fixture.savedTour.events)if(e.seconds>lastBoundary&&e.seconds<=seconds)applyScheduled(e);
  if(seconds>=24){lastBoundary=24;state.cursorSeconds=24;return;}
  lastBoundary=Math.floor(seconds/4)*4;state.cursorSeconds=seconds;
}
function measure(packet){const selector=packet.semanticPayload.representation==='plain'?'#plain table':'#diagram svg',scene=document.querySelector(selector)?.getBoundingClientRect();packet.viewport={width:innerWidth,height:innerHeight,scrollX,scrollY,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,horizontalOverflow:document.documentElement.scrollWidth>innerWidth};packet.scene={representation:packet.semanticPayload.representation,width:scene?.width??0,height:scene?.height??0};}
async function publish(){const n=++revision,s=clone(state),r=clone(choose()),d=derive(fixture,s,r,certificates,hashes),semanticPayload=clone(d.semanticPayload),informationPayload=clone(d.informationPayload);
  const [semanticFingerprint,informationHash]=await Promise.all([hash(semanticPayload),hash(informationPayload)]);if(n!==revision)return;
  const packet={schema:'gate11-published-snapshot-v1',runId:build.runId,buildId:build.buildId,snapshotRevision:n,semanticPayload,semanticFingerprint,informationPayload,informationHash,payloadHash:await hash(semanticPayload.payload),sourceFamilyHash:hashes.family};if(n!==revision)return;
  render(packet);measure(packet);$('inspector').textContent=json(packet);lastPacket=packet;
}
function redraw(){if(!state.paused)advanceClock(performance.now());publish().catch(e=>$('status').textContent=`Snapshot error: ${e.message}`);}
function metadataRefresh(){if(!state.paused){redraw();return;}if(!lastPacket)return;const packet={...lastPacket,snapshotRevision:++revision};measure(packet);$('inspector').textContent=json(packet);lastPacket=packet;}
function restore(seconds,type){if(busy)return;const before=semanticNow();stopClock();state=checkpointState(fixture,seconds);canonicalSeen=new Set(['S0',...(seconds>=12?['S1']:[]),...(seconds>=16?['S2']:[])]);lastBoundary=seconds;$('export-output').textContent='';const after=semanticNow();event(type,'user-control',{seconds},'accepted',before,after);redraw();}
function play(){if(busy||!state.paused)return;if(state.mode!=='saved-tour')restore(0,'tour-reopen');const before=semanticNow();state.paused=false;state.endReason=null;clockBase=performance.now()-state.cursorSeconds*1000;lastBoundary=Math.floor(state.cursorSeconds/4)*4;timer=setInterval(redraw,80);event('tour-play','user-control',{},'accepted',before,semanticNow());redraw();}
function pause(){if(state.paused)return;advanceClock(performance.now());if(state.paused){redraw();return;}const before=semanticNow();stopClock();event('tour-pause','user-control',{},'accepted',before,semanticNow());redraw();}
async function applyRepair(){if(busy)return;const requested=clone(state.repairDraft),parent=registry[state.revisionId];let selected;
  try{selected=ordered(requested);}catch{const same=semanticNow();event('repair-apply','user-control',{requestedFields:requested},'rejected',same,same);return;}
  const before=semanticNow();enterLocal();busy=true;redraw();const id=`L${nextLocal++}`,originEventReference=`${build.runId}-ui:${sequence+1}`;
  try{const revisionRecord=await makeRevision(fixture,hashes,{id,parentId:parent.id,parentReferenceOnly:!parent.id.startsWith('L'),fieldsBefore:parent.fieldsAfter,requestedFields:selected,triggerReceiverId:state.receiverId,provenance:'source_informed_software',originEventReference});
    registry[id]=revisionRecord;localIds.push(id);state.revisionId=id;state.repairDraft=[];const after=semanticNow();event('repair-apply','user-control',{parentId:parent.id,revisionId:id,requestedFields:selected,effectiveAddedFields:revisionRecord.effectiveAddedFields,sourceRecordFieldPaths:revisionRecord.envelopes[state.worldId].sourceRecordFieldPaths,outcome:revisionRecord.outcome},'accepted',before,after);
  }catch(e){const same=semanticNow();event('repair-apply','user-control',{requestedFields:selected,error:e.message},'rejected',before,same);$('status').textContent=`Repair rejected: ${e.message}`;}
  busy=false;redraw();
}
function relations(info){const rows=[['summarizes','LOT source','Receiver summary'],['supplied-to','Receiver summary',info.receiver.id]];for(const name of Object.keys(info.payload.additions)){rows.push(['depends-on',info.receiver.id,name]);rows.push(['sourced-from',name,info.payload.additions[name].sourceRef.logicalRecordId]);}return rows;}
function render(packet){const s=packet.semanticPayload,i=packet.informationPayload,rev=i.revision,c=i.globalCertificate,rows=relations(i);
  $('identity').textContent=`${build.runId} · ${build.buildId} · ${s.mode} · ${s.cursorSeconds.toFixed(3)} / 24 seconds${s.endReason?' · '+s.endReason:''}`;
  $('clock').textContent=`${s.cursorSeconds.toFixed(3)} s / 24 s`;
  $('receiver').value=s.receiverId;$('world').value=s.worldId;$('representation').value=s.representation;$('checkpoint').value=String(Math.floor(s.cursorSeconds/4)*4);
  const visible=i.revisionHistory;$('revision').innerHTML=visible.map(r=>`<option value="${r.id}">${r.id} · [${r.fieldsAfter.join(', ')}] · ${r.outcome}</option>`).join('');$('revision').value=s.revisionId;
  $('repair-checkboxes').innerHTML=fixture.repairMenu.map(m=>`<label><input type="checkbox" value="${m.id}" ${s.repairDraft.includes(m.id)?'checked':''} ${busy?'disabled':''}> ${m.label}</label>`).join('');
  $('receiver-result').textContent=`${i.receiver.id}: ${i.receiverResult.status}${i.receiverResult.answer?` — ${i.receiverResult.answer}`:''}; possible ${i.receiverResult.possibleAnswers.join(' / ')}. ${i.receiverResult.reason} Missing potentially relevant: ${i.receiverResult.missingRelevant.join(', ')||'none'}.`;
  $('global-result').textContent=`${c.globallySufficient?'Globally sufficient':'Globally insufficient'} over four worlds. Fields [${rev.fieldsAfter.join(', ')}]. Partition ${c.blocks.map(b=>`{${b.worldIds.join(',')}}→${b.answers.join('/')}`).join('; ')}. Conflicting pairs: ${c.conflictingPairs.map(x=>x.join('/')).join(', ')||'none'}.`;
  $('shortcut').textContent=`Wrong shortcut / not the receiver evaluator: old count answer reused for release disagrees in ${i.wrongShortcut.disagreementWorlds.join(', ')}.`;
  $('payload').textContent=json(i.payload);$('envelope').textContent=json(i.sourceEnvelope);
  $('witness-panel').hidden=!s.witnessPair;$('witness').textContent=s.witnessPair?json(i.selectedWitness):'';
  $('source-panel').hidden=!s.fullSourceOpen;$('source').textContent=s.fullSourceOpen?json(i.fullSource):'';
  $('certificate-panel').hidden=!s.certificateOpen;$('certificates').textContent=s.certificateOpen?json(i.allCertificates):'';
  $('revisions').textContent=json(visible.map(r=>({id:r.id,parentId:r.parentId,parentReferenceOnly:r.parentReferenceOnly,fieldsBefore:r.fieldsBefore,requestedFields:r.requestedFields,effectiveAddedFields:r.effectiveAddedFields,fieldsAfter:r.fieldsAfter,provenance:r.provenance,sourceFamilyHash:r.sourceFamilyHash,contentHash:r.contentHash,outcome:r.outcome})));
  const priorResult=i.parentResult;
  $('repair-outcome').textContent=rev.id==='S0'?'Initial summary.':`${rev.id}: ${rev.outcome}${priorResult&&priorResult.answer===i.receiverResult.answer&&priorResult.status===i.receiverResult.status?'; unchanged-decision':''}; copied fields ${rev.effectiveAddedFields.join(', ')||'none'}.`;
  const lineY=46, svgRows=rows.map((r,j)=>`<g><rect x="16" y="${lineY+j*32-18}" width="688" height="27" rx="4" fill="${j%2?'#e5f0f6':'#f7fbfd'}"/><text x="28" y="${lineY+j*32}">${r[1]} ── ${r[0]} ──▶ ${r[2]}</text></g>`).join('');
  $('diagram').innerHTML=`<h2>Typed relation diagram</h2><svg viewBox="0 0 720 300" role="img" aria-label="Typed relations: ${rows.map(r=>r.join(' ')).join('; ')}">${svgRows}</svg><p>Edges state declared relations only; position and distance add no evidence.</p>`;
  $('plain').innerHTML=`<h2>Plain typed relations</h2><table><thead><tr><th>From</th><th>Relation</th><th>To</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r[1]}</td><td>${r[0]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>`;
  $('diagram').hidden=s.representation!=='diagram';$('plain').hidden=s.representation!=='plain';
  for(const id of ['receiver','world','representation','revision','witness-open','witness-pair','witness-close','source-open','source-close','certificate-open','certificate-close','apply','play','pause','previous','next','checkpoint','replay','reopen','export'])$(id).disabled=busy;
  $('play').disabled=busy||!s.paused;$('pause').disabled=busy||s.paused;$('witness-close').disabled=busy||!s.witnessPair;$('source-close').disabled=busy||!s.fullSourceOpen;$('certificate-close').disabled=busy||!s.certificateOpen;
  $('status').textContent=busy?'Applying source-backed repair…':`Information SHA-256 ${packet.informationHash}; source family SHA-256 ${hashes.family}.`;
}
async function exportLocal(){if(busy)return;const before=semanticNow();await event('local-export','user-control',{kind:'local-record'},'accepted',before,before);await Promise.all(eventTasks);
  const d=derive(fixture,clone(state),clone(choose()),certificates,hashes);
  const record={schema:'gate11-local-export-v1',runId:build.runId,buildId:build.buildId,provenance:'source_informed_software',humanParticipants:0,includedThroughSequence:sequence,selectedRevisionId:state.revisionId,selectedRevision:clone(registry[state.revisionId]),receiverId:state.receiverId,evaluatorInput:clone(d.common.payload),receiverResult:clone(d.common.receiverResult),globalCertificate:clone(d.common.globalCertificate),sourceHashes:clone(hashes),sourceEnvelope:clone(d.common.sourceEnvelope),canonicalParentsReferenceOnly:true,localRevisionHistory:localIds.map(id=>clone(registry[id])),allCertificates:clone(certificates),events:clone(events)};
  $('export-output').textContent=json(record);await new Promise(requestAnimationFrame);metadataRefresh();
}
for(const world of fixture.worlds){const o=document.createElement('option');o.value=world.id;o.textContent=world.id;$('world').append(o);}
for(const seconds of fixture.savedTour.checkpointSeconds){const o=document.createElement('option');o.value=seconds;o.textContent=`${seconds} s`;$('checkpoint').append(o);}
for(const a of fixture.worldOrder)for(const b of fixture.worldOrder)if(a<b){const o=document.createElement('option');o.value=`${a},${b}`;o.textContent=`${a} / ${b}`;$('witness-pair').append(o);}$('witness-pair').value='W10,W11';
$('receiver').onchange=e=>transition('receiver-select',{receiverId:e.target.value},()=>{enterLocal();state.receiverId=e.target.value;});
$('world').onchange=e=>transition('world-select',{worldId:e.target.value},()=>{enterLocal();state.worldId=e.target.value;});
$('representation').onchange=e=>transition('representation-select',{representation:e.target.value},()=>{enterLocal();state.representation=e.target.value;});
$('revision').onchange=e=>transition('revision-select',{revisionId:e.target.value},()=>{enterLocal();state.revisionId=e.target.value;state.repairDraft=[];});
$('witness-open').onclick=()=>transition('witness-open',{pair:$('witness-pair').value.split(',')},()=>{enterLocal();state.witnessPair=$('witness-pair').value.split(',');});
$('witness-pair').onchange=e=>transition('witness-select',{pair:e.target.value.split(',')},()=>{enterLocal();state.witnessPair=e.target.value.split(',');});
$('witness-close').onclick=()=>transition('witness-close',{},()=>{enterLocal();state.witnessPair=null;});
$('source-open').onclick=()=>transition('source-open',{},()=>{enterLocal();state.fullSourceOpen=true;});$('source-close').onclick=()=>transition('source-close',{},()=>{enterLocal();state.fullSourceOpen=false;});
$('certificate-open').onclick=()=>transition('certificate-open',{},()=>{enterLocal();state.certificateOpen=true;});$('certificate-close').onclick=()=>transition('certificate-close',{},()=>{enterLocal();state.certificateOpen=false;});
$('repair-checkboxes').onchange=e=>{if(e.target.type!=='checkbox')return;transition('repair-draft-select',{field:e.target.value,checked:e.target.checked},()=>{enterLocal();const set=new Set(state.repairDraft);e.target.checked?set.add(e.target.value):set.delete(e.target.value);state.repairDraft=ordered([...set]);});};$('apply').onclick=applyRepair;
$('play').onclick=play;$('pause').onclick=pause;$('previous').onclick=()=>restore(Math.max(0,(Math.ceil(state.cursorSeconds/4)-1)*4),'tour-checkpoint-previous');$('next').onclick=()=>restore(Math.min(24,(Math.floor(state.cursorSeconds/4)+1)*4),'tour-checkpoint-next');$('checkpoint').onchange=e=>restore(Number(e.target.value),'tour-checkpoint-direct');$('replay').onclick=()=>{restore(0,'tour-replay');play();};$('reopen').onclick=()=>restore(0,'tour-reopen');$('export').onclick=exportLocal;
addEventListener('resize',()=>state.paused?metadataRefresh():redraw());addEventListener('scroll',()=>state.paused?metadataRefresh():redraw(),{passive:true});$('inspector-details').addEventListener('toggle',()=>requestAnimationFrame(metadataRefresh));
redraw();
