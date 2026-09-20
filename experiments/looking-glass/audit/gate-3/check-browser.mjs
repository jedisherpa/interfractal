// Read-only audit of root's actual browser observations; no implementation import.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'../..');
const evidence=path.join(root,'evidence/gate-3');
const runId=process.argv[2]??'G3-TESSERACT-002';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const observations=read(path.join(evidence,'browser-observations.json')).observations.filter(o=>o.diagnostics?.runId===runId);
const captures=read(path.join(evidence,'capture-index.json')).captures.filter(c=>c.runId===runId);
const oracle=read(path.join(root,'audit/gate-3/oracle-results.json'));
const run=read(path.join(root,'hypercube/runs',runId,'run.json'));
const expectedQ=Object.fromEntries(oracle.source.vertices.map(v=>[v.id,v.q]));
const close=(a,b,tol=1e-10)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol;
const vec=(a,b,tol=1e-10)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,i)=>close(value,b[i],tol));
const rect=(a,b,tol=1e-6)=>a&&b&&['x','y','width','height'].every(key=>close(a[key],b[key],tol));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const checks=[];
const check=(name,pass,detail)=>checks.push({name,pass:Boolean(pass),...(detail===undefined?{}:{detail})});
function jpegDimensions(bytes){
  let pos=2;
  while(pos<bytes.length-9){
    if(bytes[pos]!==0xff){pos++;continue;}
    const marker=bytes[pos+1];pos+=2;
    if(marker===0xd8||marker===0xd9||marker===0x01||marker>=0xd0&&marker<=0xd7)continue;
    const length=bytes.readUInt16BE(pos);
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))
      return {height:bytes.readUInt16BE(pos+3),width:bytes.readUInt16BE(pos+5)};
    pos+=length;
  }
  return null;
}
check('observations bind exact run/build and actual browser URL',observations.length>0&&observations.every(o=>
  o.diagnostics.buildId===run.buildId&&String(o.url).includes('127.0.0.1:43996')),{count:observations.length});
const mathErrors=[];
for(const o of observations){
  const m=o.inspector?.model,theta=o.inspector?.sourceTheta;
  if(!m||!Number.isFinite(theta)||m.vertices?.length!==16||m.edges?.length!==32){mathErrors.push({index:o.index,reason:'missing full model'});continue;}
  const c=Math.cos(theta),s=Math.sin(theta),cy=Math.cos(m.camera.yaw),sy=Math.sin(m.camera.yaw),cp=Math.cos(m.camera.pitch),sp=Math.sin(m.camera.pitch);
  for(const v of m.vertices){
    const q=expectedQ[v.id];
    if(!q){mathErrors.push({index:o.index,id:v.id,reason:'unknown ID'});continue;}
    const [x,y,z,w]=q,rotated=[c*x-s*w,y,z,s*x+c*w],p=rotated.slice(0,3);
    const a=cy*p[0]-sy*p[2],b=sy*p[0]+cy*p[2],screen=[320+80*a,210-80*(cp*p[1]-sp*b)];
    if(!vec(v.originalSource,q)||!vec(v.rotatedSource,rotated)||!vec(v.projected,p)||!vec(v.screen,screen))
      mathErrors.push({index:o.index,id:v.id,reason:'source/rotation/projection/screen mismatch'});
  }
  if(!vec(m.projection.matrix[0],[1,0,0,0])||m.rotation.matrix?.length!==4||!close(m.pairSourceDistance,2))
    mathErrors.push({index:o.index,reason:'matrix or source pair mismatch'});
}
check('every recorded 16-vertex source, 4D rotation, raw 3D shadow and SVG screen position matches independent equations',
  mathErrors.length===0,{checkedObservations:observations.length,errors:mathErrors.slice(0,10),errorCount:mathErrors.length});
const environmentErrors=observations.filter(o=>!o.outer?.viewport||!o.inspector?.viewport||
  !close(o.outer.viewport.width,o.inspector.viewport.width,1e-6)||
  !close(o.outer.viewport.height,o.inspector.viewport.height,1e-6)||
  !close(o.outer.viewport.devicePixelRatio,o.inspector.viewport.devicePixelRatio,1e-6)||
  !rect(o.outer.sceneRect,o.inspector.sceneRect)||
  o.inspector.documentScrollWidth>o.inspector.documentClientWidth+1).map(o=>({index:o.index,label:o.label,
    actualRect:o.outer?.sceneRect,inspectorRect:o.inspector?.sceneRect,
    viewport:o.outer?.viewport,inspectorViewport:o.inspector?.viewport,
    scrollWidth:o.inspector?.documentScrollWidth,clientWidth:o.inspector?.documentClientWidth}));
check('fresh viewport, DPR, scene rectangle and bounded page width at each actual observation',environmentErrors.length===0,
  {checked:observations.length,mismatches:environmentErrors});
const checkpointTimes=[0,8000,16000,24000,32000];
const checkpointResults=checkpointTimes.map((t,i)=>{
  const candidates=observations.filter(o=>o.inspector?.simulationTimeMs===t&&o.inspector?.mode==='saved-run'&&!o.inspector?.playing);
  const expected=oracle.checkpoints[i];
  return {timeMs:t,pass:candidates.some(o=>close(o.inspector.sourceTheta,expected.thetaRad)&&
    close(o.inspector.pairProjectedDistance,expected.pairShadowDistance)&&
    o.inspector.model.projectionSites.length===(i===1||i===3?12:8)&&
    vec(o.inspector.model.vertices.find(v=>v.id==='v1110')?.projected,expected.AShadow)&&
    vec(o.inspector.model.vertices.find(v=>v.id==='v1111')?.projected,expected.BShadow)),count:candidates.length};
});
check('five actual paused checkpoints match independent A/B distances and projected sites',checkpointResults.every(x=>x.pass),checkpointResults);
const named=label=>observations.find(o=>o.label===label||o.label===`003-${label}`);
const t04base=named('T04 baseline restore 8s'),t04camera=named('T04 camera yaw 120 at unchanged 8s'),
  t04restoreCamera=named('T04 restore 8s after camera'),t04source=named('T04 source turn 30 at unchanged 8s'),
  t04restoreSource=named('T04 restore 8s after source');
check('actual camera/source controls isolate variables and both 8s restores recover same browser checkpoint hash',
  !!(t04base&&t04camera&&t04restoreCamera&&t04source&&t04restoreSource)&&
  t04base.inspector.simulationTimeMs===8000&&t04camera.inspector.simulationTimeMs===8000&&t04source.inspector.simulationTimeMs===8000&&
  close(t04camera.inspector.camera.yaw,2*Math.PI/3)&&close(t04source.inspector.sourceTheta,Math.PI/6)&&
  t04base.inspector.projectionSha256===t04camera.inspector.projectionSha256&&
  t04base.inspector.projectionSha256!==t04source.inspector.projectionSha256&&
  close(t04source.inspector.pairProjectedDistance,1)&&
  t04base.inspector.checkpointSha256===t04restoreCamera.inspector.checkpointSha256&&
  t04base.inspector.checkpointSha256===t04restoreSource.inspector.checkpointSha256);
const ranks=observations.map(o=>({index:o.index,data:o.inspector?.observability})).filter(x=>x.data);
const rankErrors=ranks.filter(({data:d})=>d.oneViewRank!==3||d.cameraOnlyRank!==3||d.cameraOnlyScreenRank>3||
  d.knownSourceViewsRank!==4||d.statusFixed!=='underdetermined'||d.statusCameraOnly!=='underdetermined'||
  d.maxCoordinateErrorAfterSolve>1e-10||d.maxForwardResidual>1e-10||d.all16?.length!==16);
check('actual inspector reports rank-three negative cases and rank-four all-16 recovery within tolerance',ranks.length>0&&rankErrors.length===0,
  {checked:ranks.length,errors:rankErrors.map(x=>x.index)});
const selectedB=named('T03 select distinct B at zero'),selectedOtherEdge=named('T03 select other collapsed w-edge'),
  selectedUnique=named('T08 actual unique SVG A hit at 8s');
check('actual rendered site/list selection preserves both overlapping IDs and a collapsed edge',
  !!(selectedB&&selectedOtherEdge&&selectedUnique)&&
  selectedB.inspector.selectedVertexId==='v1111'&&selectedB.inspector.model.projectionSites.some(s=>
    s.sourceIds.includes('v1110')&&s.sourceIds.includes('v1111'))&&
  selectedOtherEdge.inspector.selectedEdgeId==='e-v0000-v0001'&&selectedOtherEdge.inspector.selectedEdge.collapsed===true&&
  selectedUnique.inspector.selectedVertexId==='v1110');
const paused=named('T07 manual Pause after advancing'),held=named('T07 paused hold after explicit 1300ms wait'),
  stepped=named('T07 Step +1s after pause'),scrubbed=named('T07 actual scrub 12.5s'),
  endpoint=named('T07 Step at endpoint clamps'),reverseBefore=named('C2-active-reverse / before image'),
  reverseAfter=named('C2-active-reverse / after image'),naturalEnd=named('replay-natural-end / after image'),
  reopened=named('T07 8s restored after library reopen'),reloaded=named('T07 8s restored after browser reload');
check('actual pause/step/scrub/end/reverse playback and library/reload recovery behave as declared',
  !!(paused&&held&&stepped&&scrubbed&&endpoint&&reverseBefore&&reverseAfter&&naturalEnd&&reopened&&reloaded&&t04base)&&
  paused.inspector.simulationTimeMs===held.inspector.simulationTimeMs&&
  stepped.inspector.simulationTimeMs===paused.inspector.simulationTimeMs+1000&&
  scrubbed.inspector.simulationTimeMs===12500&&endpoint.inspector.simulationTimeMs===32000&&
  reverseBefore.inspector.playing&&reverseAfter.inspector.playing&&
  reverseBefore.inspector.simulationTimeMs>16000&&reverseAfter.inspector.simulationTimeMs>reverseBefore.inspector.simulationTimeMs&&
  reverseAfter.inspector.sourceTheta<reverseBefore.inspector.sourceTheta&&
  naturalEnd.inspector.simulationTimeMs===32000&&!naturalEnd.inspector.playing&&
  t04base.inspector.checkpointSha256===reopened.inspector.checkpointSha256&&
  t04base.inspector.checkpointSha256===reloaded.inspector.checkpointSha256);
const sizes=new Set(observations.map(o=>`${o.outer?.viewport?.width}x${o.outer?.viewport?.height}`));
check('actual fixed, wide and narrow viewport conditions were observed',
  ['1280x720','1280x900','960x720'].every(size=>sizes.has(size)),{sizes:[...sizes]});
const captureErrors=[];
const verifiedCaptures=[];
for(const c of captures){
  const file=path.join(evidence,c.path),before=observations.find(o=>o.index===c.beforeObservation),
    after=observations.find(o=>o.index===c.afterObservation);
  try{
    const bytes=fs.readFileSync(file),dimensions=jpegDimensions(bytes),hash=sha(bytes);
    verifiedCaptures.push({label:c.label,path:c.path,sha256:hash,bytes:bytes.length,dimensions});
    if(!dimensions||!before||!after||before.diagnostics?.runId!==runId||after.diagnostics?.runId!==runId||
      c.buildId!==run.buildId||c.simulationTimeMs!==before.inspector.simulationTimeMs||
      (c.sha256&&c.sha256!==hash)||(c.bytes&&c.bytes!==bytes.length)||
      (c.imageDimensions&&!vec([dimensions.width,dimensions.height],[c.imageDimensions.width,c.imageDimensions.height]))||
      (c.timeIntervalMs&&!vec(c.timeIntervalMs,[before.inspector.simulationTimeMs,after.inspector.simulationTimeMs],0))||
      (c.viewportBefore&&!vec([c.viewportBefore.width,c.viewportBefore.height],[before.outer.viewport.width,before.outer.viewport.height],0))||
      (c.viewportAfter&&!vec([c.viewportAfter.width,c.viewportAfter.height],[after.outer.viewport.width,after.outer.viewport.height],0))||
      (c.sceneRectBefore&&!rect(c.sceneRectBefore,before.outer.sceneRect))||
      (c.sceneRectAfter&&!rect(c.sceneRectAfter,after.outer.sceneRect)))
      captureErrors.push({label:c.label,reason:'binding/dimension/hash mismatch',dimensions,hash});
  }catch(error){captureErrors.push({label:c.label,error:String(error)});}
}
check('original JPEG captures exist and bind to same run/build/observation; supplied hashes/dimensions match',captures.length>0&&captureErrors.length===0,
  {count:captures.length,errors:captureErrors});
const activityPath=fs.existsSync(path.join(evidence,`${runId}-activity-snapshot.jsonl`))
  ? path.join(evidence,`${runId}-activity-snapshot.jsonl`)
  : path.join(evidence,'activity-snapshot.jsonl');
if(fs.existsSync(activityPath)){
  const lines=fs.readFileSync(activityPath,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  const bySession=new Map();
  for(const event of lines){const a=bySession.get(event.sessionId)??[];a.push(event);bySession.set(event.sessionId,a);}
  const bad=[];
  for(const [session,events] of bySession){for(let i=0;i<events.length;i++){
    const e=events[i];
    if(e.runId!==runId||e.buildId!==run.buildId||e.actor!=='unspecified-ui'||
      !['manual-control','automatic-playback','programmatic-restore'].includes(e.origin)||
      (i&&e.seq<=events[i-1].seq))bad.push({session,seq:e.seq,type:e.type});
  }}
  const automaticEnd=lines.find(e=>e.type==='playback.pause'&&e.origin==='automatic-playback');
  const hasManualStart=lines.some(e=>e.type==='playback.play'&&e.origin==='manual-control');
  const hasInitialOpen=lines.some(e=>e.type==='replay.open'&&e.origin==='programmatic-restore');
  check('append-only observed events bind run/build and increase per UI session with explicit origins',lines.length>0&&bad.length===0&&
    !!automaticEnd&&hasManualStart&&hasInitialOpen,
    {events:lines.length,sessions:bySession.size,errors:bad});
  check('automatic end event uses frozen end-of-sequence reason',automaticEnd?.payload?.reason==='end-of-sequence',
    {actualReason:automaticEnd?.payload?.reason??null});
}else check('observed activity snapshot exists',false,{path:activityPath});

const result={checkedAtUtc:new Date().toISOString(),runId,buildId:run.buildId,observationCount:observations.length,
  captureCount:captures.length,verifiedCaptures,pass:checks.every(x=>x.pass),passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks};
fs.writeFileSync(path.join(import.meta.dirname,`${runId}-browser-audit.json`),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pass:result.pass,passed:result.passed,failed:result.failed,
  failures:checks.filter(x=>!x.pass).map(x=>({name:x.name,detail:x.detail}))}));
if(!result.pass)process.exitCode=1;
