import { RUN_ID, DURATION_MS, SAMPLE_MS, STEP_MS, CHECKPOINTS_MS, clampTime, modelAt, semanticState,
  checkpointState, sourceState, localState, supportedRelationState, mappingState, summaryState, summaryHistoryState, receiverState } from './model.mjs';

const $ = id => document.getElementById(id);
let run, fixture, references, gateFixture, simulationTimeMs = 0, overrides = {}, playing = false, sequence = 0;
let playbackToken = 0, startWallMs = 0, startSimulationTimeMs = 0, renderToken = 0, logQueue = Promise.resolve(), statePayload=null,dprQuery=null;
const sessionId = crypto.randomUUID();
const diagnostics = { renderer: 'HTML local objects and plain table; no spatial-dimension inference', activityLog: 'Pending first observed UI event' };
const state = () => modelAt(simulationTimeMs, fixture.records, references, gateFixture, overrides);
const digest = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))))]
  .map(x => x.toString(16).padStart(2, '0')).join('');
const hashes = async s => ({ sourceSha256: await digest(sourceState(s)),localSha256:await digest(localState(s)),
  relationsSha256:await digest(supportedRelationState(s)),mappingSha256:await digest(mappingState(s)),
  summarySha256:await digest(summaryState(s)),summaryHistorySha256:await digest(summaryHistoryState(s)),
  receiverSha256:await digest(receiverState(s)),checkpointSha256: await digest(checkpointState(s)),
  displaySha256: await digest({ view:s.controls.view,layout:s.controls.layout,inspectorOpen:s.controls.inspectorOpen }) });
const environment = () => ({ viewport:{width:innerWidth,height:innerHeight,devicePixelRatio},scroll:{x:scrollX,y:scrollY},
  documentScrollWidth:document.documentElement.scrollWidth,documentClientWidth:document.documentElement.clientWidth,
  inspectorOpen:$('inspector').open, sourceListOpen:$('record-list').open,
  scenes:Object.fromEntries(['local-view','plain-view','link-map','inspector'].map(id=>{const e=$(id),r=e.getBoundingClientRect(),cs=getComputedStyle(e);return [id,{x:r.x,y:r.y,width:r.width,height:r.height,visible:cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0}];})),
  cardRects:Object.fromEntries([...document.querySelectorAll('.context-card')].map(e=>[e.dataset.contextId,
    {x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}])) });
function stopPlayback(){playing=false;playbackToken++;}
function log(type,payload,origin,before){
  const after=state(), seq=++sequence, at=new Date().toISOString();
  logQueue=logQueue.catch(()=>{}).then(async()=>{
    const [b,a]=await Promise.all([hashes(before),hashes(after)]);
    const event={kind:'observed-ui',sessionId,runId:RUN_ID,buildId:run.buildId,seq,actor:'unspecified-ui',origin,type,
      wallTimeUtc:at,simulationTimeBeforeMs:before.simulationTimeMs,simulationTimeAfterMs:after.simulationTimeMs,
      mode:playing?'playing':Object.keys(overrides).length?'exploration':'canonical-paused',
      payload,before:{...b,controls:before.controls},observed:{...a,controls:after.controls},environment:environment()};
    const response=await fetch('/api/activity',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event)});
    if(!response.ok)throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    diagnostics.activityLog=`Saved event ${seq}: ${type}`; refreshDiagnostics();
  }).catch(error=>{diagnostics.activityLog=`Could not save event ${seq}: ${String(error)}`;refreshDiagnostics();});
}
function setControl(type,patch,payload={}){
  const before=state();stopPlayback();overrides={...overrides,...patch};
  log(type,{...payload,patch},'manual-control',before);render();
}
function restore(ms,type='playback.seek',origin='manual-control'){
  const before=state();stopPlayback();overrides={};simulationTimeMs=clampTime(ms);
  log(type,{requestedSimulationTimeMs:ms,simulationTimeMs,quantizationMs:SAMPLE_MS,restoreCanonicalControls:true},origin,before);render();
}
function frame(token){
  if(!playing||token!==playbackToken)return;
  const next=clampTime(startSimulationTimeMs+performance.now()-startWallMs);
  if(next!==simulationTimeMs){simulationTimeMs=next;render();}
  if(simulationTimeMs>=DURATION_MS){const before=state();stopPlayback();log('playback.pause',{reason:'end-of-sequence'},'automatic-playback',before);render();return;}
  requestAnimationFrame(()=>frame(token));
}
function play(){
  if(playing)return;
  const before=state();if(simulationTimeMs>=DURATION_MS)simulationTimeMs=0;
  overrides={};playing=true;startWallMs=performance.now();startSimulationTimeMs=simulationTimeMs;
  const token=++playbackToken;log('playback.play',{fromSimulationTimeMs:simulationTimeMs,canonicalControls:true},'manual-control',before);
  render();requestAnimationFrame(()=>frame(token));
}
function pause(){if(!playing)return;const before=state();stopPlayback();log('playback.pause',{reason:'button'},'manual-control',before);render();}
const text = (id,value)=>{$(id).textContent=value;};
const elt=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e;};
function renderCard(c,s){
  const card=elt('article','context-card');card.dataset.contextId=c.id;
  if(s.controls.selectedContextId===c.id)card.classList.add('selected');
  const top=elt('div','card-top');const heading=elt('div');heading.append(elt('span','eyebrow',`LOCAL REFERENCE · ${c.manifest.retainedLocalReference.id}@1`),elt('h2','',c.label));
  top.append(heading,elt('span','badge',`source ${c.manifest.selectedVenueId}`));card.append(top);
  card.append(elt('p','summary',c.activeSummary.headline));
  const status=elt('div','status');status.append(elt('span','',`Outer ${s.largerReference.id}@1: ${c.activeSummary.criterion.answer}`),
    elt('span','',`Receiver@${s.requirement.version}: ${c.outwardEvaluation.status==='insufficient-summary'?'insufficient summary':c.outwardEvaluation.numericScreenPass?'numeric screen pass':'numeric screen fail'}`));
  card.append(status);
  const actions=elt('div','card-actions');
  const select=elt('button','',s.controls.selectedContextId===c.id?'Selected':'Select plan');select.id=`select-${c.id}`;
  select.addEventListener('click',()=>setControl('local.select',{selectedContextId:c.id},{localId:c.id,representation:s.controls.view}));
  const expand=elt('button','',c.expanded?'Collapse':'Expand source');expand.id=`expand-${c.id}`;
  expand.addEventListener('click',()=>setControl(c.expanded?'local.collapse':'local.expand',{expandedIds:c.expanded?s.controls.expandedIds.filter(x=>x!==c.id):[...new Set([...s.controls.expandedIds,c.id])]},{localId:c.id,representation:s.controls.view}));
  actions.append(select,expand);card.append(actions);
  const details=elt('div','details');
  if(c.expanded){
    details.append(elt('p','',`Records: ${c.records.map(r=>`${r.id}@${r.version}`).join(' + ')}. Local ${c.manifest.retainedLocalReference.id}: ${c.localCriterion.answer}.`));
    details.append(elt('p','',`Dependencies: hire ${c.dependency.hire.costTokens} + ${c.dependency.requiredEquipment.map(e=>`${e.label} ${e.costTokens}`).join(' + ')} = ${c.dependency.venueEquipmentCostTokens} tokens.`));
    const graph=elt('div','dependency-graph');graph.append(elt('span','control-label','REQUIRES → '));
    for(const e of c.dependency.requiredEquipment){const relation=s.supportedRelations.find(r=>r.to===e.id);
      const b=elt('button','dependency-node',`${e.kind}: ${e.label} ${e.costTokens}`);
      b.id=`graph-relation-${relation.id}`;
      b.addEventListener('click',()=>setControl('relation.inspect',{inspectedRelationId:relation.id},{relationId:relation.id,representation:'graph'}));
      graph.append(b);}
    details.append(graph);
    details.append(elt('p','',`Availability unknown. Source pointers and histories are in the inspector.`));
  }else details.append(elt('p','',`Collapsed outward object · ${c.manifest.recordRefs.length} constituent records recoverable.`));
  card.append(details);return card;
}
function renderPlain(s){
  const rows=$('plain-rows');rows.replaceChildren();
  for(const c of s.contexts){const tr=elt('tr');
    const first=elt('td','',c.label+' ');
    const select=elt('button','',s.controls.selectedContextId===c.id?'Selected':'Select');select.id=`plain-select-${c.id}`;
    select.addEventListener('click',()=>setControl('local.select',{selectedContextId:c.id},{localId:c.id,representation:'plain'}));
    const expand=elt('button','',c.expanded?'Collapse':'Expand');expand.id=`plain-expand-${c.id}`;
    expand.addEventListener('click',()=>setControl(c.expanded?'local.collapse':'local.expand',{expandedIds:c.expanded?s.controls.expandedIds.filter(x=>x!==c.id):[...new Set([...s.controls.expandedIds,c.id])]},{localId:c.id,representation:'plain'}));
    first.append(select,expand);tr.append(first);
    for(const value of [`${s.largerReference.id}@1: ${c.activeSummary.criterion.answer}`,
      c.activeSummary.headline+(c.expanded?` · source detail: hire ${c.dependency.hire.costTokens}, ${c.dependency.requiredEquipment.map(e=>`${e.label} ${e.costTokens}`).join(', ')}`:''),
      c.outwardEvaluation.status==='insufficient-summary'?'insufficient summary':`${c.activeSummary.venueEquipmentCostTokens}/8; ${c.outwardEvaluation.numericScreenPass?'pass':'fail'}`]) tr.append(elt('td','',value));
    rows.append(tr);
  }
  const links=$('plain-links');links.replaceChildren(elt('span','',`Relations: `));
  for(const relation of [...s.supportedRelations.filter(r=>r.type==='shares-source'||s.controls.expandedIds.includes(r.from)),...(s.controls.claimsOpen?[s.claim]:[])]){
    const button=elt('button',relation.status==='unsupported'?'unsupported':'',`${relation.type} · ${relation.status}`);
    button.id=`plain-relation-${relation.id}`;
    button.addEventListener('click',()=>setControl('relation.inspect',{inspectedRelationId:relation.id},{relationId:relation.id,representation:'plain'}));
    links.append(button);
  }
}
function refreshDiagnostics(){const env=environment();text('diagnostics',JSON.stringify({...diagnostics,...env},null,2));
  if(statePayload){statePayload.environment=env;text('state-json',JSON.stringify(statePayload,null,2));}}
async function render(){
  const token=++renderToken,s=state();
  $('inspector').open=s.controls.inspectorOpen;$('record-list').open=s.controls.sourceListOpen;
  text('mode-chip',playing?'PLAYING':Object.keys(overrides).length?'PAUSED · EXPLORATION':'PAUSED · SAVED RUN');
  text('time-readout',`${(simulationTimeMs/1000).toFixed(1)}s / 30s`);$('scrub').value=String(simulationTimeMs);
  text('play-pause',playing?'Pause':'Play');
  for(const [id,active] of [['ref-capacity',s.largerReference.id==='R_CAPACITY_60'],['ref-access',s.largerReference.id==='R_EXISTING_ACCESS'],
    ['requirement-v1',s.requirement.version===1],['requirement-v2',s.requirement.version===2],
    ['summary-v1',s.controls.summaryVersion===1],['summary-v2',s.controls.summaryVersion>=2],
    ['view-local',s.controls.view==='graph'],['view-plain',s.controls.view==='plain'],
    ['link-shared-weather',s.controls.inspectedRelationId==='G6_REL_SHARED_SOURCE'],['link-invented-funds',s.controls.inspectedRelationId==='G6-CLAIM-TRANSFER'],
    ['references-compare',s.controls.alternativesOpen],['claims-show',s.controls.claimsOpen],['layout-close',s.controls.layout==='close']])$(id).classList.toggle('active',active);
  $('local-view').hidden=s.controls.view==='plain';$('plain-view').hidden=s.controls.view!=='plain';
  $('context-row').classList.toggle('close',s.controls.layout==='close');$('local-view').classList.toggle('close',s.controls.layout==='close');
  $('link-invented-funds').hidden=!s.controls.claimsOpen;$('wire-unsupported').hidden=!s.controls.claimsOpen;
  $('wire-unsupported-label').hidden=!s.controls.claimsOpen;
  $('wire-unsupported').style.display=s.controls.claimsOpen?'':'none';
  $('wire-unsupported-label').style.display=s.controls.claimsOpen?'':'none';
  text('question',`Receiver@${s.requirement.version}: ≥${s.requirement.minimumCapacityHouseholds} households · listed venue + equipment ≤${s.requirement.maximumVenueEquipmentCostTokens} tokens`);
  text('finding',s.controls.summaryVersion===1?
    'Outward summaries answer only the selected partial reference. The receiving screen is insufficient until dependencies and cost are disclosed.':
    s.requirement.version===2?'Receiver@2 raises the capacity threshold to 70; Gate 2 capacity reference remains at 60. Hall now fails capacity. Field still exceeds the cost limit.':
      'Hall costs 6 tokens with a ramp. Field costs 9 with a generator and rain shelter. Availability of equipment is unknown.');
  $('context-row').replaceChildren(...s.contexts.map(c=>renderCard(c,s)));
  text('link-readout',s.inspectedRelation?`${s.inspectedRelation.id} · ${s.inspectedRelation.type} · ${s.inspectedRelation.status} · evidence ${JSON.stringify(s.inspectedRelation.evidence)}`:'Select a typed relation to inspect its evidence. Lines and distance are arbitrary.');
  $('wire-shared').classList.toggle('active',s.controls.inspectedRelationId==='G6_REL_SHARED_SOURCE');
  $('wire-unsupported').classList.toggle('active',s.controls.inspectedRelationId==='G6-CLAIM-TRANSFER');
  const selected=s.contexts.find(c=>c.id===s.controls.selectedContextId), traced=s.contexts.find(c=>c.id===s.controls.traceLocalId);
  const focus=s.controls.traceMode==='budget'&&traced?`${traced.label}: hire ${traced.dependency.hire.costTokens} + ${traced.dependency.requiredEquipment.map(e=>`${e.label} ${e.costTokens} (${e.evidence.map(p=>p.recordId+'.'+p.field).join(', ')})`).join(' + ')} = ${traced.dependency.venueEquipmentCostTokens}; receiver limit 8.`:
    s.controls.traceMode==='requirement'?`Requirement revision: ${s.trace.affected.map(a=>`${a.recordId}.${a.field}`).join(', ')}. Hall capacity pass true→false; Field true→true.`:
    selected?`${selected.label} selected; expand then inspect its budget trace.`:'No local selected.';
  text('focus-detail',focus+(s.controls.alternativesOpen?` Alternatives: ${s.referenceDefinitions.map(r=>`${r.id}@${r.version} “${r.wording}”`).join(' / ')}. Hall retains capacity; Field retains access.`:'')+
    (s.inspectedRelation?` Inspected ${s.inspectedRelation.id}: ${s.inspectedRelation.type}, ${s.inspectedRelation.status}; evidence ${JSON.stringify(s.inspectedRelation.evidence)}; included in supported graph ${s.inspectedRelation.includedInSupportedGraph ?? true}.`:''));
  renderPlain(s);
  const h=await hashes(s);if(token!==renderToken)return;
  text('source-digest',h.sourceSha256);text('checkpoint-digest',h.checkpointSha256);text('display-digest',h.displaySha256);
  statePayload={runId:RUN_ID,buildId:run.buildId,...h,semantic:semanticState(s),
    fullState:s, sourceFixture:fixture, referenceFixture:references,gateFixture,
    digestContract:'SHA-256(JSON.stringify(value)); semantic boundary excludes viewport, DPR, wall time, session and UI activity. Checkpoint includes clock and UI controls.',
    environment:environment()};refreshDiagnostics();requestAnimationFrame(refreshDiagnostics);
}
function renderSources(){
  const target=$('source-records');target.replaceChildren();
  for(const r of fixture.records){target.append(elt('article','',`${r.id}@${r.version} · ${r.label} · ${r.contentSha256} · ${JSON.stringify(r.facts)}`));}
  text('reference-tables',references.referenceDefinitions.map(ref=>`${ref.id}@${ref.version} · ${ref.wording}\n${fixture.records.map(r=>`${r.id}: ${references.expectedAssignments[ref.id].find(a=>a.recordId===r.id).answer ?? 'unmapped'} · ${references.expectedAssignments[ref.id].find(a=>a.recordId===r.id).reason}`).join('\n')}`).join('\n\n'));
}
function bind(){
  $('ref-capacity').addEventListener('click',()=>setControl('reference.set',{referenceId:'R_CAPACITY_60'},{referenceId:'R_CAPACITY_60'}));
  $('ref-access').addEventListener('click',()=>setControl('reference.set',{referenceId:'R_EXISTING_ACCESS'},{referenceId:'R_EXISTING_ACCESS'}));
  $('requirement-v1').addEventListener('click',()=>setControl('requirement.set',{requirementVersion:1,summaryVersion:state().controls.summaryVersion===1?1:2,traceMode:'requirement'},{version:1}));
  $('requirement-v2').addEventListener('click',()=>setControl('requirement.set',{requirementVersion:2,summaryVersion:3,traceMode:'requirement'},{version:2,attribution:'synthetic receiving task capacity 60→70'}));
  $('summary-v1').addEventListener('click',()=>setControl('summary.set',{summaryVersion:1},{version:1}));
  $('summary-v2').addEventListener('click',()=>setControl('summary.repair',{summaryVersion:state().requirement.version===2?3:2},{disclose:['cost','typed equipment obligations','unknown availability']}));
  $('view-local').addEventListener('click',()=>setControl('representation.set',{view:'graph'},{representation:'graph'}));
  $('view-plain').addEventListener('click',()=>setControl('representation.set',{view:'plain'},{representation:'plain'}));
  $('trace-inspect').addEventListener('click',()=>{const s=state(),id=s.controls.selectedContextId;
    if(!id||!s.controls.expandedIds.includes(id)){log('trace.inspect.rejected',{reason:'Select and expand a local first',selectedContextId:id},'manual-control',s);diagnostics.activityLog='Select and expand a local before inspecting its budget trace.';refreshDiagnostics();return;}
    setControl('trace.inspect',{traceMode:'budget',traceLocalId:id},{localId:id,type:'budget',representation:s.controls.view});});
  $('references-compare').addEventListener('click',()=>setControl('references.compare',{alternativesOpen:!state().controls.alternativesOpen},{completeDefinitions:true}));
  $('claims-show').addEventListener('click',()=>setControl('claims.show',{claimsOpen:!state().controls.claimsOpen},{show:!state().controls.claimsOpen}));
  $('layout-close').addEventListener('click',()=>setControl('layout.set',{layout:state().controls.layout==='ordinary'?'close':'ordinary'},{metricSignificance:false}));
  $('link-shared-weather').addEventListener('click',()=>setControl('relation.inspect',{inspectedRelationId:'G6_REL_SHARED_SOURCE'},{relationId:'G6_REL_SHARED_SOURCE'}));
  $('link-invented-funds').addEventListener('click',()=>setControl('relation.inspect',{inspectedRelationId:'G6-CLAIM-TRANSFER'},{relationId:'G6-CLAIM-TRANSFER'}));
  $('wire-shared').addEventListener('click',()=>setControl('relation.inspect',{inspectedRelationId:'G6_REL_SHARED_SOURCE'},{relationId:'G6_REL_SHARED_SOURCE',via:'drawn-relation'}));
  $('wire-unsupported').addEventListener('click',()=>setControl('relation.inspect',{inspectedRelationId:'G6-CLAIM-TRANSFER'},{relationId:'G6-CLAIM-TRANSFER',via:'drawn-relation'}));
  $('replay').addEventListener('click',()=>{restore(0,'playback.replay-from-start');play();});
  $('play-pause').addEventListener('click',()=>playing?pause():play());
  $('step-back').addEventListener('click',()=>restore(simulationTimeMs-STEP_MS,'playback.step'));
  $('step-forward').addEventListener('click',()=>restore(simulationTimeMs+STEP_MS,'playback.step'));
  $('scrub').addEventListener('change',e=>restore(Number(e.target.value),'playback.seek'));
  for(const ms of CHECKPOINTS_MS){const b=elt('button','',`${ms/1000}s`);b.id=`checkpoint-${ms}`;b.addEventListener('click',()=>restore(ms,'checkpoint.restore'));$('checkpoints').append(b);}
  for(const [id,key] of [['inspector','inspectorOpen'],['record-list','sourceListOpen']])$(id).addEventListener('toggle',()=>{if(state().controls[key]!==$(id).open)setControl('display.toggle',{[key]:$(id).open},{panel:id,open:$(id).open});else refreshDiagnostics();});
  addEventListener('resize',refreshDiagnostics);addEventListener('scroll',refreshDiagnostics,{passive:true});
  const watchDpr=()=>{if(dprQuery)dprQuery.removeEventListener('change',onDpr);dprQuery=matchMedia(`(resolution: ${devicePixelRatio}dppx)`);dprQuery.addEventListener('change',onDpr);};
  const onDpr=()=>{refreshDiagnostics();watchDpr();};watchDpr();
  let startupFrames=0;const startup=()=>{refreshDiagnostics();if(++startupFrames<60)requestAnimationFrame(startup);};requestAnimationFrame(startup);
  setInterval(()=>{if(!document.hidden)refreshDiagnostics();},250);
}
async function init(){
  const [r,f,refs,g]=await Promise.all(['/api/run','/fictional-records.json','/reference-mappings.json','/fixture.json'].map(url=>fetch(url).then(x=>{if(!x.ok)throw Error(`${url}: ${x.status}`);return x.json();})));
  run=r;fixture=f;references=refs;gateFixture=g;
  text('run-id',`${RUN_ID} · ${run.buildId}`);text('build-readout',`${run.buildId} · ${run.sourceSha256.slice(0,16)}`);
  text('recovery-command',`node local-models/builds/${run.buildId}/server.mjs`);
  renderSources();bind();render();log('replay.open',{requestedRunId:RUN_ID,requestedBuildId:run.buildId,pausedAtMs:0},'programmatic-restore',state());
}
init().catch(error=>{text('mode-chip','LOAD ERROR');text('diagnostics',String(error));});
