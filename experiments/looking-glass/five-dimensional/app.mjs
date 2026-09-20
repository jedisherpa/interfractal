import { RUN_ID, DURATION_MS, SAMPLE_MS, STEP_MS, CHECKPOINTS_MS, CAMERA, SOURCE5, clampTime,
  SELECTED_IDS, modelAt, sourceState, rotationState, projectionState, comparatorState, sliceState,
  geometryState, displayState, checkpointState,
  displayProjection, observationsFor, reconstruct } from './model.mjs';

const $ = id => document.getElementById(id), NS = 'http://www.w3.org/2000/svg';
const sessionId = crypto.randomUUID();
let run, simulationTimeMs = 0, alphaOverride = null, betaOverride = null, cameraYawOverride = null;
let sliceWOverride = null, sliceVOverride = null, inspectorOpen = false, playing = false;
let selectedVertexId = 'v00000', rankCondition = 'base', task = { id: 'none', sourceActions: 0, inspectActions: 0, stage: 'none' };
const sessionCounters={sourceActions:0,inspect4Actions:0,inspect5Actions:0,cameraActions:0,taskResets:0};
let sequence = 0, playbackToken = 0, renderToken = 0, environmentFrame = 0, dprQuery, suppressInspectorToggle = false;
let startWallMs = 0, startSimulationTimeMs = 0, logQueue = Promise.resolve();
const diagnostics = { renderer: 'SVG wireframes and analytic 3D ball slice; fixed scale, no jitter', activityLog: 'Pending first event' };
const fmt = n => n === null ? '∅' : Math.abs(n) < 1e-12 ? '0' : Number(n).toFixed(6);
const vec = a => `(${a.map(fmt).join(', ')})`;
const deg = r => (r*180/Math.PI).toFixed(1);
const mode = () => [alphaOverride,betaOverride,cameraYawOverride,sliceWOverride,sliceVOverride].every(x => x === null) &&
  selectedVertexId==='v00000' && rankCondition==='base' && task.id==='none' && task.stage==='none' && !inspectorOpen ?
  'saved-run' : 'exploration';
const state = () => modelAt(simulationTimeMs, { alphaOverride,betaOverride,cameraYawOverride,sliceWOverride,sliceVOverride,inspectorOpen,
  selectedVertexId,observationCondition:rankCondition,task:{id:task.id,stage:task.stage} });
const el = (tag, attrs = {}, text = null) => { const e=document.createElementNS(NS,tag);
  for (const [k,v] of Object.entries(attrs)) e.setAttribute(k,String(v)); if (text !== null) e.textContent=text; return e; };
function environment() {
  const sceneRects={};
  for (const id of ['scene-4','scene-5','scene-slice']) {
    const node=$(id), r=node.getBoundingClientRect(), style=getComputedStyle(node);
    sceneRects[id]={x:r.x,y:r.y,width:r.width,height:r.height,
      visible:style.display!=='none' && style.visibility!=='hidden' && r.width>0 && r.height>0};
  }
  return { viewport:{width:innerWidth,height:innerHeight,devicePixelRatio:devicePixelRatio},sceneRects,
    inspectorOpen:document.querySelector('details.inspector').open,
    documentScrollWidth:document.documentElement.scrollWidth,
    documentClientWidth:document.documentElement.clientWidth };
}
function refreshEnvironment() {
  const current=environment();
  try { const visible=JSON.parse($('state-json').textContent); Object.assign(visible,current);
    $('state-json').textContent=JSON.stringify(visible,null,2); } catch { /* before first render */ }
  $('diagnostics').textContent=JSON.stringify({...diagnostics,...current},null,2);
}
function scheduleEnvironmentRefresh() { if (environmentFrame) return;
  environmentFrame=requestAnimationFrame(()=>{environmentFrame=0;refreshEnvironment();}); }
function watchDpr() { if (dprQuery) dprQuery.removeEventListener('change',onDprChange);
  dprQuery=matchMedia(`(resolution: ${devicePixelRatio}dppx)`); dprQuery.addEventListener('change',onDprChange); }
function onDprChange() { refreshEnvironment(); watchDpr(); }
function passiveEnvironmentRefresh() { watchDpr(); let frames=0; const startup=()=>{refreshEnvironment();if(++frames<60)requestAnimationFrame(startup);};
  requestAnimationFrame(startup); setInterval(()=>{if(!document.hidden)refreshEnvironment();},250); }
function capture() { return {s:state(),playing,mode:mode(),task:{...task},sessionCounters:{...sessionCounters},selectedVertexId,rankCondition,environment:environment()}; }
async function digest(value) { const bytes=new TextEncoder().encode(JSON.stringify(value));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join(''); }
async function hashes(c) { const [sourceSha256,rotationSha256,projectionSha256,comparatorSha256,sliceSha256,
  geometrySha256,checkpointSha256,displaySha256]=await Promise.all([
  digest(sourceState()),digest(rotationState(c.s)),digest(projectionState(c.s)),digest(comparatorState(c.s)),digest(sliceState(c.s)),
  digest(geometryState(c.s)),digest(checkpointState(c.s)),digest(displayState(c.s))]);
  return {sourceSha256,rotationSha256,projectionSha256,comparatorSha256,sliceSha256,
    geometrySha256,checkpointSha256,displaySha256}; }
function metricSummary(m){return {vertexCount:m.vertexCount,edgeCount:m.edgeCount,
  uniqueProjectedSites:m.uniqueProjectedSites,collapsedEdges:m.collapsedEdges,
  nonzeroProjectedEdges:m.nonzeroProjectedEdges,
  exactScreenSiteCount:m.screen.exactScreenSiteCount,
  coincidentMarkerExcess:m.screen.coincidentMarkerExcess,
  glyphOverlapPairCount:m.screen.glyphOverlapPairCount};}
function summary(c) { const s=c.s; return {simulationTimeMs:s.simulationTimeMs,mode:c.mode,playing:c.playing,
  sourceAngles:{alpha:s.source5.rotation.alpha,beta:s.source5.rotation.beta},camera:s.camera,
  slice:s.slice,controls:s.controls,comparison:{four:metricSummary(s.comparator4.metrics),five:metricSummary(s.source5.metrics)},
  selectedVertexId:c.selectedVertexId,rankCondition:c.rankCondition,task:c.task,
  sessionCounters:c.sessionCounters,...c.environment}; }
function record(type,payload,origin,before=capture()) {
  const after=capture(), seq=++sequence, wallTimeUtc=new Date().toISOString();
  logQueue=logQueue.catch(()=>{}).then(async()=>{
    const [bh,ah]=await Promise.all([hashes(before),hashes(after)]);
    const event={seq,kind:'observed-ui',sessionId,runId:RUN_ID,buildId:run.buildId,
      actor:'unspecified-ui',origin,type,payload,wallTimeUtc,
      simTimeBeforeMs:before.s.simulationTimeMs,simTimeAfterMs:after.s.simulationTimeMs,
      mode:after.mode,before:{...summary(before),...bh},observed:{...summary(after),...ah}};
    const response=await fetch('/api/activity',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event)});
    if(!response.ok)throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    diagnostics.activityLog=`Saved event ${seq} · ${type} · ${origin}`;refreshEnvironment();
  }).catch(error=>{diagnostics.activityLog=`Could not save event ${seq}: ${String(error)}`;refreshEnvironment();});
}
function drawWireframe(svg,shape,marked) {
  svg.replaceChildren(); svg.append(el('rect',{x:0,y:0,width:640,height:420,fill:'transparent'}));
  const byId=Object.fromEntries(shape.vertices.map(v=>[v.id,v]));
  const edges=[...shape.edges].sort((a,b)=>{
    const az=(byId[a.from].cameraCoordinates[2]+byId[a.to].cameraCoordinates[2])/2;
    const bz=(byId[b.from].cameraCoordinates[2]+byId[b.to].cameraCoordinates[2])/2;
    return bz-az;
  });
  for (const edge of edges) {
    const a=byId[edge.from],b=byId[edge.to];
    svg.append(el('line',{x1:a.screen[0],y1:a.screen[1],x2:b.screen[0],y2:b.screen[1],
      stroke:edge.collapsed?'#dcac72':shape.dimension===5?'#8bc8cc':'#d7ba84',
      'stroke-width':edge.collapsed?2:1.25,'stroke-opacity':edge.collapsed?.85:.52}));
  }
  for (const v of [...shape.vertices].sort((a,b)=>b.cameraCoordinates[2]-a.cameraCoordinates[2])) {
    const isMarked=marked.includes(v.id);
    svg.append(el('circle',{cx:v.screen[0],cy:v.screen[1],r:4,
      fill:isMarked?'#f5ce83':shape.dimension===5?'#cae9e1':'#e8e0c5',
      stroke:'#18343a','stroke-width':1}));
  }
  const a=byId[marked[0]];
  if(a)svg.append(el('text',{x:a.screen[0]+8,y:a.screen[1]-8,fill:'#ffe0a6','font-size':12},'A'));
}
function drawSlice(svg,slice,camera) {
  svg.replaceChildren(); svg.append(el('rect',{x:0,y:0,width:640,height:420,fill:'transparent'}));
  const origin=displayProjection([0,0,0],camera).screen;
  for(const [point,color,label] of [[[1.5,0,0],'#c58e79','x'],[[0,1.5,0],'#9bcaae','y'],[[0,0,1.5],'#91b3d8','z']]){
    const end=displayProjection(point,camera).screen;
    svg.append(el('line',{x1:origin[0],y1:origin[1],x2:end[0],y2:end[1],stroke:color,'stroke-width':1.3,'stroke-opacity':.7}));
    svg.append(el('text',{x:end[0]+4,y:end[1]-4,fill:color,'font-size':12},label));
  }
  if(slice.kind==='empty') {svg.append(el('text',{x:320,y:210,'text-anchor':'middle',fill:'#f4c599','font-size':23},'EMPTY · NO POINTS'));return;}
  if(slice.kind==='point') {svg.append(el('circle',{cx:320,cy:210,r:13,fill:'none',stroke:'#f3c483','stroke-width':2,'stroke-dasharray':'3 3'}));
    svg.append(el('circle',{cx:320,cy:210,r:3,fill:'#fff0c9'}));
    svg.append(el('text',{x:341,y:190,fill:'#f3d7af','font-size':14},'one location'));return;}
  svg.append(el('circle',{cx:320,cy:210,r:80*slice.radius,fill:'#c99257','fill-opacity':.25,stroke:'#f7d4a0','stroke-width':2.5}));
  for(const [axisA,axisB,opacity] of [[0,1,.65],[0,2,.48],[1,2,.42]]){
    const points=Array.from({length:65},(_,i)=>{const p=[0,0,0],a=2*Math.PI*i/64;
      p[axisA]=slice.radius*Math.cos(a);p[axisB]=slice.radius*Math.sin(a);
      return displayProjection(p,camera).screen;});
    svg.append(el('path',{d:`M ${points.map(p=>`${p[0]} ${p[1]}`).join(' L ')} Z`,fill:'none',stroke:'#d8eeee','stroke-opacity':opacity,'stroke-width':1.2}));
  }
}
function rankReport(id) {
  const views=rankCondition==='base'?[[0,0]]:rankCondition==='hidden'?[[0,0],[Math.PI/2,0]]:[[0,0],[Math.PI/2,0],[0,Math.PI/2]];
  const obs=observationsFor(id,views), result=reconstruct(obs), truth=SOURCE5.find(v=>v.id===id).q;
  return {condition:rankCondition,sourceId:id,knownCorrespondence:true,observations:obs,...result,
    truthComparisonAfterSolve:result.reconstructed?Math.max(...truth.map((x,i)=>Math.abs(x-result.reconstructed[i]))):null};
}
function inspectResult(s) {
  const target=s.source5.vertices.find(v=>v.id==='v00000');
  const five=s.source5.projectionSites.find(site=>site.projected.every((x,i)=>Math.abs(x-target.projected[i])<=1e-10));
  const target4=s.comparator4.vertices.find(v=>v.id==='v0000');
  const four=s.comparator4.projectionSites.find(site=>site.projected.every((x,i)=>Math.abs(x-target4.projected[i])<=1e-10));
  return {four:{projected:four.projected,sourceIds:four.sourceIds},five:{projected:five.projected,sourceIds:five.sourceIds}};
}
async function render() {
  const token=++renderToken,c=capture(),s=c.s, four=s.comparator4.metrics,five=s.source5.metrics;
  $('mode-chip').textContent=playing?'PLAYING':mode()==='saved-run'?'PAUSED · SAVED RUN':'PAUSED · EXPLORATION';
  $('time-readout').textContent=`${(simulationTimeMs/1000).toFixed(1)}s / 40s`;
  $('alpha-value').textContent=`${deg(s.source5.rotation.alpha)}°`;$('beta-value').textContent=`${deg(s.source5.rotation.beta)}°`;
  $('camera-value').textContent=`${deg(s.camera.yaw)}°`;
  $('alpha').value=String(Math.round(s.source5.rotation.alpha*180/Math.PI));
  $('beta').value=String(Math.round(s.source5.rotation.beta*180/Math.PI));
  $('camera').value=String(Math.round(s.camera.yaw*180/Math.PI));
  $('slice-w-value').textContent=fmt(s.slice.constraints.w);$('slice-v-value').textContent=fmt(s.slice.constraints.v);
  $('slice-w').value=String(s.slice.constraints.w);$('slice-v').value=String(s.slice.constraints.v);
  $('scrub').value=String(simulationTimeMs);$('seek-number').value=String(simulationTimeMs/1000);
  $('seek-readout').textContent=`${(simulationTimeMs/1000).toFixed(1)}s`;
  $('playback-readout').textContent=playing?'Source turns playing':'Clock paused';
  drawWireframe($('scene-4'),s.comparator4,['v0000','v0001']);
  drawWireframe($('scene-5'),s.source5,SELECTED_IDS);
  for(const [n,m] of [[4,four],[5,five]]){
    $(`metric-${n}`).textContent=`${m.uniqueProjectedSites} sites · ${m.collapsedEdges} collapsed edges`;
    $(`facts-${n}`).textContent=`${m.vertexCount} source vertices · ${m.edgeCount} edges · ${m.nonzeroProjectedEdges} nonzero projected edges · ${m.screen.glyphOverlapPairCount} radius-4 glyph-overlap pairs · ${m.screen.coincidentMarkerExcess} exact coincident-marker excess.`;
  }
  const selected=s.source5.vertices.find(v=>v.id===selectedVertexId);
  $('vertex-select').value=selectedVertexId;
  $('vertex-facts').textContent=`${selected.id}: source ${vec(selected.originalSource)} → rotated ${vec(selected.rotatedSource)} → raw xyz ${vec(selected.projected)} → screen ${vec(selected.screen)}.`;
  const rank=rankReport(selectedVertexId);
  $('rank-facts').textContent=`Known raw xyz views: ${rank.observations.length}; stacked rank ${rank.rank}/5; ${rank.reconstructed?`solved ${vec(rank.reconstructed)}, residual ${fmt(rank.residual)}, later truth error ${fmt(rank.truthComparisonAfterSolve)}`:'v remains hidden; no unique 5D solution'}.`;
  $('rank-base').classList.toggle('active',rankCondition==='base');
  $('rank-hidden').classList.toggle('active',rankCondition==='hidden');$('rank-reveal').classList.toggle('active',rankCondition==='reveal');
  drawSlice($('scene-slice'),s.slice,s.camera);
  $('slice-kind').textContent=s.slice.kind==='empty'?'EMPTY · NO POINTS':s.slice.kind==='point'?'POINT · ONE LOCATION':'SOLID 3D BALL';
  $('slice-facts').textContent=`w=${fmt(s.slice.constraints.w)}, v=${fmt(s.slice.constraints.v)}; 1−w²−v²=${fmt(s.slice.discriminant)}; radius ${fmt(s.slice.radius)}. Full xyz projection of the 5D ball remains radius 1.`;
  $('comparison-facts').textContent=`4D: ${four.vertexCount} vertices, ${four.edgeCount} edges, ${four.uniqueProjectedSites} unique raw xyz sites, ${four.collapsedEdges} collapsed edges, ${four.screen.glyphOverlapPairCount} glyph-overlap pairs. 5D: ${five.vertexCount}, ${five.edgeCount}, ${five.uniqueProjectedSites}, ${five.collapsedEdges}, ${five.screen.glyphOverlapPairCount}. Task ${task.id}, stage ${task.stage}: ${task.sourceActions} source-turn actions and ${task.inspectActions} marked-site inspections actually used in this session.`;
  $('task-status').textContent=`${task.id==='none'?'Choose T1 or T2':`${task.id} · ${task.stage}`} · source-turn actions ${task.sourceActions} · inspect actions ${task.inspectActions}. Session totals: ${JSON.stringify(sessionCounters)}. Marked-site state: ${JSON.stringify(inspectResult(s))}`;
  const h=await hashes(c);if(token!==renderToken)return;
  $('source-digest').textContent=h.sourceSha256;$('geometry-digest').textContent=h.geometrySha256;
  $('checkpoint-digest').textContent=h.checkpointSha256;$('display-digest').textContent=h.displaySha256;
  $('state-json').textContent=JSON.stringify({...summary(c),...h,model:s,rank,markedSite:inspectResult(s),
    fingerprintContract:'SHA-256(JSON.stringify(value)); separate source/rotation/projection/comparator/slice and checkpoint/display. Checkpoint excludes wall time, session, playback flag, viewport and historical task action counters.',
    renderer:diagnostics.renderer},null,2);
  refreshEnvironment();
}
function stopPlayback(){playing=false;playbackToken++;}
function pause(origin='manual-control',reason='pause button'){if(!playing)return;const before=capture();stopPlayback();
  record('playback.pause',{reason},origin,before);render();}
function frame(token){if(!playing||token!==playbackToken)return;
  const next=clampTime(startSimulationTimeMs+performance.now()-startWallMs);
  if(next!==simulationTimeMs){simulationTimeMs=next;render();}
  if(simulationTimeMs>=DURATION_MS){pause('automatic-playback','end-of-sequence');return;}
  requestAnimationFrame(()=>frame(token));}
function resetOptions(){selectedVertexId='v00000';rankCondition='base';
  if(inspectorOpen){suppressInspectorToggle=true;inspectorOpen=false;document.querySelector('details.inspector').open=false;}}
function play(){if(playing)return;const before=capture();if(simulationTimeMs>=DURATION_MS)simulationTimeMs=0;
  alphaOverride=betaOverride=cameraYawOverride=sliceWOverride=sliceVOverride=null;
  resetOptions();
  task={id:'none',sourceActions:0,inspectActions:0,stage:'none'};
  playing=true;startWallMs=performance.now();startSimulationTimeMs=simulationTimeMs;
  const token=++playbackToken;record('playback.play',{fromSimulationTimeMs:simulationTimeMs,canonicalControls:true},'manual-control',before);
  render();requestAnimationFrame(()=>frame(token));}
function restore(ms,type='playback.seek',origin='manual-control'){
  const before=capture();stopPlayback();alphaOverride=betaOverride=cameraYawOverride=sliceWOverride=sliceVOverride=null;
  resetOptions();
  task={id:'none',sourceActions:0,inspectActions:0,stage:'none'};
  const requestedSimulationTimeMs=ms;simulationTimeMs=clampTime(ms);
  record(type,{requestedSimulationTimeMs,clampedBeforeRoundingMs:Math.max(0,Math.min(DURATION_MS,ms)),
    requestedDeltaMs:type==='playback.step'?STEP_MS:null,simulationTimeMs,
    quantizationMs:SAMPLE_MS,restoreCanonicalControls:true},origin,before);render();}
function setAngles(alpha,beta,type='source.rotation.set',taskStage=null){const before=capture();stopPlayback();
  const prior=before.s.source5.rotation;
  alphaOverride=alpha;betaOverride=beta;
  if(Math.abs(prior.alpha-alpha)>1e-12||Math.abs(prior.beta-beta)>1e-12){sessionCounters.sourceActions++;if(task.id!=='none')task.sourceActions++;}
  if(taskStage)task.stage=taskStage;
  record(type,{requestedAlpha:alpha,requestedBeta:beta,previousAlpha:prior.alpha,previousBeta:prior.beta,
    actualAlpha:state().source5.rotation.alpha,actualBeta:state().source5.rotation.beta,
    changedPlane:Math.abs(prior.alpha-alpha)>1e-12&&Math.abs(prior.beta-beta)>1e-12?'both':
      Math.abs(prior.alpha-alpha)>1e-12?'x–w':Math.abs(prior.beta-beta)>1e-12?'y–v':'none',
    taskId:task.id,sourceActions:task.sourceActions,taskStage:task.stage},'manual-control',before);render();}
function setSlice(w,v,type='slice.set'){const before=capture();stopPlayback();sliceWOverride=w;sliceVOverride=v;
  record(type,{w,v,kind:state().slice.kind,radius:state().slice.radius},'manual-control',before);render();}
function setTask(id){const before=capture();stopPlayback();simulationTimeMs=0;
  alphaOverride=betaOverride=0;cameraYawOverride=sliceWOverride=sliceVOverride=null;
  resetOptions();sessionCounters.taskResets++;
  task={id,sourceActions:0,inspectActions:0,stage:id==='T1'?'baseline overlap':'start 0°/0°'};
  record('task.reset',{taskId:id,alpha:0,beta:0,camera:CAMERA,slice:[0,0],selectedVertexId},'manual-control',before);render();}
function inspectSite(targetDimension){const before=capture();stopPlayback();if(task.id!=='none')task.inspectActions++;
  if(targetDimension===4)sessionCounters.inspect4Actions++;else sessionCounters.inspect5Actions++;
  const site=targetDimension===4?inspectResult(state()).four:inspectResult(state()).five;
  record('task.inspect',{taskId:task.id,targetDimension,stage:task.stage,sourceActions:task.sourceActions,
    inspectActions:task.inspectActions,site},'manual-control',before);render();}
async function loadEvidence(){const target=$('evidence-links');target.replaceChildren();
  try{const response=await fetch('/api/evidence',{cache:'no-store'});if(!response.ok)throw new Error();
    const evidence=await response.json();target.append(document.createTextNode((evidence.status||'')+' '));
    for(const shot of evidence.screenshots||[]){const a=document.createElement('a');a.href=shot.url;a.textContent=shot.label;a.target='_blank';a.rel='noopener';target.append(a,document.createTextNode(' · '));}
    if(evidence.resultsUrl){const a=document.createElement('a');a.href=evidence.resultsUrl;a.textContent='Gate 5 results';a.target='_blank';a.rel='noopener';target.append(a);}
  }catch{target.textContent='Browser evidence pending.';}}
async function init(){const response=await fetch('/api/run');if(!response.ok)throw new Error(`Run HTTP ${response.status}`);
  run=await response.json();if(run.runId!==RUN_ID||run.durationMs!==DURATION_MS)throw new Error('Run/build mismatch');
  $('run-id').textContent=RUN_ID;$('library-current').textContent=`${RUN_ID} · ${run.buildId} · opens paused`;
  $('build-readout').textContent=`Build ${run.buildId} · ${run.dependencyIdentity}`;
  $('recovery-command').textContent=`node /Users/paul/BTC-Learning/experiments/looking-glass/five-dimensional/builds/${run.buildId}/server.mjs`;
  Object.assign(diagnostics,{buildId:run.buildId,runId:RUN_ID,uiSessionId:sessionId,activityActor:'unspecified-ui'});
  for(const ms of CHECKPOINTS_MS){const b=document.createElement('button');b.textContent=`${ms/1000}s`;
    b.dataset.checkpoint=String(ms);b.addEventListener('click',()=>restore(ms,'checkpoint.restore'));$('checkpoints').append(b);}
  for(const source of SOURCE5){const o=document.createElement('option');o.value=source.id;o.textContent=source.id;$('vertex-select').append(o);}
  $('play').addEventListener('click',play);$('pause').addEventListener('click',()=>pause());
  $('replay').addEventListener('click',()=>{restore(0,'replay.start');play();});
  $('library-replay').addEventListener('click',()=>{restore(0,'replay.start');play();});
  $('step').addEventListener('click',()=>restore(simulationTimeMs+STEP_MS,'playback.step'));
  $('reset').addEventListener('click',()=>restore(0,'experiment.reset'));
  $('scrub').addEventListener('input',e=>restore(Number(e.target.value),'playback.seek'));
  $('seek-button').addEventListener('click',()=>{const seconds=Number($('seek-number').value);
    if(!Number.isFinite(seconds)){diagnostics.seekError='Finite seconds required';refreshEnvironment();return;}
    restore(seconds*1000,'playback.seek');});
  $('alpha').addEventListener('input',e=>setAngles(Number(e.target.value)*Math.PI/180,state().source5.rotation.beta));
  $('beta').addEventListener('input',e=>setAngles(state().source5.rotation.alpha,Number(e.target.value)*Math.PI/180));
  $('camera').addEventListener('input',e=>{const before=capture();stopPlayback();cameraYawOverride=Number(e.target.value)*Math.PI/180;
    if(Math.abs(before.s.camera.yaw-cameraYawOverride)>1e-12)sessionCounters.cameraActions++;
    record('camera.set',{yaw:cameraYawOverride},'manual-control',before);render();});
  $('task-baseline').addEventListener('click',()=>setTask('T1'));
  $('task-start').addEventListener('click',()=>setTask('T2'));
  $('task-alpha').addEventListener('click',()=>setAngles(Math.PI/4,0,'comparison.source-turn','after x–w 45°'));
  $('task-beta').addEventListener('click',()=>setAngles(Math.PI/4,Math.PI/4,'comparison.source-turn','after y–v 45°'));
  $('inspect-4').addEventListener('click',()=>inspectSite(4));
  $('inspect-5').addEventListener('click',()=>inspectSite(5));
  $('vertex-select').addEventListener('change',e=>{const before=capture();stopPlayback();selectedVertexId=e.target.value;
    record('vertex.select',{vertexId:selectedVertexId},'manual-control',before);render();});
  $('rank-base').addEventListener('click',()=>{const before=capture();stopPlayback();rankCondition='base';
    record('observation.compare',{condition:'rank-3-base',result:rankReport(selectedVertexId)},'manual-control',before);render();});
  $('rank-hidden').addEventListener('click',()=>{const before=capture();stopPlayback();rankCondition='hidden';
    record('observation.compare',{condition:'rank-4-v-hidden',result:rankReport(selectedVertexId)},'manual-control',before);render();});
  $('rank-reveal').addEventListener('click',()=>{const before=capture();stopPlayback();rankCondition='reveal';
    record('observation.compare',{condition:'rank-5-v-revealed',result:rankReport(selectedVertexId)},'manual-control',before);render();});
  $('slice-w').addEventListener('input',e=>setSlice(Number(e.target.value),state().slice.constraints.v));
  $('slice-v').addEventListener('input',e=>setSlice(state().slice.constraints.w,Number(e.target.value)));
  for(const [id,w,v] of [['slice-a',.5,0],['slice-b',0,.5],['slice-point-w',1,0],['slice-point-v',0,1],['slice-empty',1.25,0]])
    $(id).addEventListener('click',()=>setSlice(w,v,'slice.preset'));
  window.addEventListener('resize',()=>{render();scheduleEnvironmentRefresh();});
  window.addEventListener('scroll',scheduleEnvironmentRefresh,{passive:true});
  document.addEventListener('scroll',scheduleEnvironmentRefresh,{passive:true,capture:true});
  document.querySelector('details.inspector').addEventListener('toggle',()=>{
    if(suppressInspectorToggle){suppressInspectorToggle=false;scheduleEnvironmentRefresh();return;}
    const before=capture();stopPlayback();before.environment.inspectorOpen=inspectorOpen;
    inspectorOpen=document.querySelector('details.inspector').open;
    scheduleEnvironmentRefresh();requestAnimationFrame(scheduleEnvironmentRefresh);
    record('display.options.set',{inspectorOpen},'manual-control',before);render();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();loadEvidence();refreshEnvironment();}});
  record('replay.open',{runId:RUN_ID,buildId:run.buildId,openingState:'paused-at-start'},'programmatic-restore');
  render();passiveEnvironmentRefresh();loadEvidence();
}
init().catch(error=>{diagnostics.loadError=String(error);$('mode-chip').textContent='RUN LOAD ERROR';refreshEnvironment();});
