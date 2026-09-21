// Independent audit of root-operated browser evidence. No browser control here.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=path.resolve(import.meta.dirname,'../..');
const runId='G2-HOPF-003';
const run=JSON.parse(fs.readFileSync(path.join(root,'correspondence/runs',runId,'run.json')));
const model=await import(pathToFileURL(path.join(root,'correspondence/builds',run.buildId,'model.mjs')).href);
const mapping=await import(pathToFileURL(path.join(root,'correspondence/builds',run.buildId,'mapping.mjs')).href);
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const observations=read('evidence/gate-2/browser-observations.json');
const trace=read('evidence/gate-2/browser-trace.json');
const captures=read('evidence/gate-2/capture-index.json');
const fixture=read('docs/gate-2/fictional-records.json');
const rules=read('docs/gate-2/reference-mappings.json');
const predictions=read('docs/gate-2/independent-predictions.json');
const checkpoints=read(`correspondence/runs/${runId}/checkpoints.json`);
const logPath=path.join(root,'evidence/gate-2/activity-snapshot.jsonl');
const events=fs.existsSync(logPath)?fs.readFileSync(logPath,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const assertions=[];
const check=(name,pass,detail)=>assertions.push({name,pass:Boolean(pass),...(detail===undefined?{}:{detail})});
const near=(a,b)=>typeof a==='number'&&typeof b==='number'&&Math.abs(a-b)<=1e-10;
const vec=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>near(x,b[i]));
const byLabel=Object.fromEntries(observations.map(x=>[x.label,x]));
const at=label=>byLabel[label]?.inspector;
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const h=object=>sha(JSON.stringify(object));
const expectedSource=(p,chart,gamma)=>{
  const [X,Y,Z]=p,u=Math.cos(gamma),v=Math.sin(gamma);
  const z1=chart==='N'?[Math.sqrt((1+Z)/2),0]:[X/Math.sqrt(2*(1-Z)),Y/Math.sqrt(2*(1-Z))];
  const z2=chart==='N'?[X/Math.sqrt(2*(1+Z)),-Y/Math.sqrt(2*(1+Z))]:[Math.sqrt((1-Z)/2),0];
  return [u*z1[0]-v*z1[1],v*z1[0]+u*z1[1],u*z2[0]-v*z2[1],v*z2[0]+u*z2[1]];
};
const expectedHopf=([a,b,c,d])=>[2*(a*c+b*d),2*(b*c-a*d),a*a+b*b-c*c-d*d];
const expectedP=([a,b,c,d])=>1-d<=1e-12?null:[a/(1-d),b/(1-d),c/(1-d)];

const identityFailures=[],viewportDrift=[],mathFailures=[],sampleFailures=[],fingerprintFailures=[],sourceFailures=[];
for(const obs of observations){
  const i=obs.inspector,p=i.basePoint,q=expectedSource(p,i.chart,i.phase),base=expectedHopf(q),P=expectedP(q);
  if(i.runId!==runId||i.buildId!==run.buildId||i.renderer!=='SVG')identityFailures.push(obs.label);
  if(obs.viewport.width!==i.viewport.width||obs.viewport.height!==i.viewport.height||
    obs.viewport.dpr!==i.viewport.devicePixelRatio)viewportDrift.push({label:obs.label,actual:obs.viewport,inspector:i.viewport});
  if(!vec(i.sourcePoint,q)||!vec(i.hopfPoint,base)||!vec(i.hopfPoint,p)||!near(i.sourceNorm,1)||
    (P===null?i.representation.kind!=='infinity'||i.representation.point!==null:!vec(i.representation.point,P)))mathFailures.push(obs.label);
  const expectedMap=mapping.mappingState(fixture,rules,i.referenceId);
  const recordHashes=fixture.records.map(r=>({id:r.id,sha256:r.contentSha256}));
  if(i.mappingSha256!==h(model.mappingFingerprintState(expectedMap))||i.recordsSha256!==h(fixture.records)||!eq(i.recordHashes,recordHashes))sourceFailures.push(obs.label);
  if(![i.modelSha256,i.geometrySha256,i.stateSha256,i.mappingSha256,i.recordsSha256].every(x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)))fingerprintFailures.push(obs.label);
  if(i.selectedSamples?.length!==128||i.sampling?.samplesPerFiber!==128||i.sampling?.sampledBaseIds?.length!==8)mathFailures.push(`${obs.label}:sampling`);
  if(i.selectedSamples?.length===128){
    const samplingChart=p[2]<=-1+1e-12?'S':'N';
    for(let j=0;j<128;j++){
      const sample=i.selectedSamples[j],expectedQ=expectedSource(p,samplingChart,2*Math.PI*j/128),
        expectedH=expectedHopf(expectedQ),projected=expectedP(expectedQ),
        kind=projected===null?'infinity':Math.hypot(...projected)<=4?'inside':'clipped';
      if(sample.index!==j||!vec(sample.q,expectedQ)||!vec(sample.h,expectedH)||sample.representation.kind!==kind||
        (projected===null?sample.representation.point!==null:!vec(sample.representation.point,projected))){
        sampleFailures.push({label:obs.label,index:j});break;
      }
    }
  }
}
check('all browser observations carry exact run/build and renderer',observations.length>0&&identityFailures.length===0,{count:observations.length,failures:identityFailures});
check('browser inspector viewport is current at each observation',viewportDrift.length===0,{consistent:observations.length-viewportDrift.length,total:observations.length,mismatches:viewportDrift});
check('all browser observations agree with independent q/h/P equations',mathFailures.length===0,{count:observations.length,failures:mathFailures});
check('all 128 selected fiber samples in every observation agree numerically',sampleFailures.length===0,{checked:observations.length*128,failures:sampleFailures});
check('all browser mapping and records hashes agree with source-derived rules',sourceFailures.length===0,{count:observations.length,failures:sourceFailures});
check('all browser observations expose complete SHA-256 fingerprints',fingerprintFailures.length===0,{checked:observations.length,failures:fingerprintFailures});

const clockLabels=[['S0-east-start-top',0],['S1-east-six-top',6000],['checkpoint-12000',12000],['checkpoint-18000',18000],['checkpoint-24000',24000]];
check('five actually operated checkpoint observations match frozen q/h/P',clockLabels.every(([label,t])=>{
  const i=at(label),exp=predictions.replayCheckpoints.find(x=>x.tMs===t);
  return !!i&&i.simulationTimeMs===t&&vec(i.sourcePoint,exp.sourceQ)&&vec(i.hopfPoint,exp.hopfBase)&&
    vec(i.representation.point,exp.stereographicR3);
}),clockLabels.map(([label,t])=>({label,present:!!at(label),t:at(label)?.simulationTimeMs})));
check('same-browser checkpoint hashes restore exactly after Library and reload',
  at('S0-east-start-top')?.stateSha256===at('S0-fixed-stable')?.stateSha256&&
  at('S1-east-six-top')?.stateSha256===at('library-reopen-six')?.stateSha256&&
  at('S1-east-six-top')?.stateSha256===at('reload-six')?.stateSha256&&
  at('checkpoint-24000')?.stateSha256===at('full-replay-ended')?.stateSha256);
const start=at('S0-east-start-top'),mid=at('S1-east-six-top'),half=at('checkpoint-12000'),end=at('checkpoint-24000');
check('phase changes q while east base holds and 24s numerically returns',!!start&&!!mid&&!!half&&!!end&&
  vec(start.hopfPoint,mid.hopfPoint)&&vec(mid.hopfPoint,half.hopfPoint)&&
  vec(half.sourcePoint,start.sourcePoint.map(x=>-x))&&vec(end.sourcePoint,start.sourcePoint));

const north=at('front-north-chart'),south=at('front-south-chart'),northAgain=at('front-north-chart-restored');
check('actual front chart N→S→N compensates phase and keeps source',!!north&&!!south&&!!northAgain&&
  near(north.phase,0)&&near(south.phase,-Math.PI/2)&&near(northAgain.phase,0)&&
  vec(north.sourcePoint,south.sourcePoint)&&vec(north.sourcePoint,northAgain.sourcePoint)&&
  vec(north.representation.point,south.representation.point));
check('actual unavailable pole chart is disabled with reason',!!byLabel['north-chart-unavailable']&&
  byLabel['north-chart-unavailable'].visible.chartDisabled===true&&
  /south chart unavailable at north pole/.test(byLabel['north-chart-unavailable'].visible.chart));
const southZero=at('south-phase-0'),infinity=at('south-infinity'),southPi=at('south-phase-180'),south3Pi=at('south-phase-270');
check('actual south pole keeps source, infinity and broken clipped line',!!southZero&&!!infinity&&!!southPi&&!!south3Pi&&
  vec(southZero.representation.point,[0,0,1])&&infinity.representation.kind==='infinity'&&infinity.representation.point===null&&
  vec(infinity.sourcePoint,[0,0,0,1])&&vec(southPi.representation.point,[0,0,-1])&&vec(south3Pi.representation.point,[0,0,0])&&
  [southZero,infinity,southPi,south3Pi].every(i=>i.pathReports.south.infinityBreaks===2&&i.pathReports.south.boundaryPoints===2));
const latlon=at('custom-lat30-lon60');
check('actual custom 30°/60° selection matches independent prespec',!!latlon&&vec(latlon.basePoint,predictions.customSelection.expectedBase)&&
  vec(latlon.sourcePoint,predictions.customSelection.expectedSourceQ)&&vec(latlon.representation.point,predictions.customSelection.expectedProjection)&&
  latlon.selectedSamples.length===128);
const pickEvent=events.find(x=>x.type==='base.surface.select');
const picked=at('custom-surface-pick');
let inverse=null;
if(pickEvent){const [u,v]=pickEvent.intended.screen,X=(u-320)/148,Z=-(v-210)/148;inverse=[X,Math.sqrt(1-X*X-Z*Z),Z];}
check('actual SVG surface pick uses logged coordinates and +Y inverse',!!picked&&!!pickEvent&&!!inverse&&
  vec(picked.basePoint,inverse)&&vec(pickEvent.observed.basePoint,inverse)&&
  Math.abs(pickEvent.intended.screen[0]-394)<=2&&Math.abs(pickEvent.intended.screen[1]-136)<=2,
  {screen:pickEvent?.intended?.screen,predicted:inverse,observed:picked?.basePoint});

const before=at('camera-before-six'),turned=at('camera-yaw120'),restored=at('camera-restore-six');
check('actual camera turn isolates q/h/P/mapping and checkpoint restores exactly',!!before&&!!turned&&!!restored&&
  near(before.camera.yaw,Math.PI/6)&&near(turned.camera.yaw,2*Math.PI/3)&&
  before.geometrySha256===turned.geometrySha256&&before.mappingSha256===turned.mappingSha256&&
  vec(before.sourcePoint,turned.sourcePoint)&&vec(before.hopfPoint,turned.hopfPoint)&&
  vec(before.representation.point,turned.representation.point)&&before.stateSha256===restored.stateSha256);
const failedHall=at('capacity-hall-marker');
check('first Hall coordinate attempt is retained as a missed hit',!!failedHall&&failedHall.selectedRecordId===null&&
  byLabel['capacity-hall-marker'].visible.detail.startsWith('Select a record'));
const hallCap=at('hall-marker-confirmed'),hallAccess=at('hall-access-confirmed'),hallBack=at('hall-capacity-confirmed-restored');
check('actual reference Hall yes→no→yes keeps record/math and restores mapping',!!hallCap&&!!hallAccess&&!!hallBack&&
  hallCap.referenceId==='R_CAPACITY_60'&&hallAccess.referenceId==='R_EXISTING_ACCESS'&&hallBack.referenceId==='R_CAPACITY_60'&&
  hallCap.selectedRecordId==='venue-hall'&&hallAccess.selectedRecordId==='venue-hall'&&hallBack.selectedRecordId==='venue-hall'&&
  hallCap.recordsSha256===hallAccess.recordsSha256&&hallCap.recordsSha256===hallBack.recordsSha256&&
  hallCap.geometrySha256===hallAccess.geometrySha256&&hallCap.geometrySha256===hallBack.geometrySha256&&
  hallCap.mappingSha256!==hallAccess.mappingSha256&&hallCap.mappingSha256===hallBack.mappingSha256&&
  byLabel['S5-hall-access-confirmed'].visible.detail.includes('portable ramp'));
check('actual plain/unmapped comparison retains four records and weather context',!!byLabel['S5-unmapped-weather']&&
  fixture.records.every(r=>byLabel['S5-unmapped-weather'].visible.plain.includes(r.id)&&byLabel['S5-unmapped-weather'].visible.plain.includes(r.contentSha256))&&
  byLabel['S5-unmapped-weather'].visible.plain.includes('unmapped')&&
  byLabel['references-compared']?.visible.plain.includes('Compare with'));

const eventErrors=[],bySession=new Map();
for(const [index,e] of events.entries()){
  const previous=bySession.get(e.sessionId)??0;
  bySession.set(e.sessionId,e.sequence);
  if(e.sequence!==previous+1||e.runId!==runId||e.buildId!==run.buildId||!['manual-control','automatic-playback','programmatic-restore'].includes(e.origin)||
    e.actor!=='unspecified-ui'||!e.before?.stateSha256||!e.observed?.stateSha256)eventErrors.push(index+1);
}
check('observed UI events are ordered per session, identity-bound and origin-labeled',events.length>0&&eventErrors.length===0,{events:events.length,sessions:bySession.size,failures:eventErrors});
check('automatic end pause is distinguishable from manual pause',events.some(e=>e.type==='playback.pause'&&e.origin==='automatic-playback'&&e.intended.reason==='end-of-sequence')&&
  events.some(e=>e.type==='playback.pause'&&e.origin==='manual-control'));

const captureErrors=[];
const captureFiles=[];
for(const item of captures){
  const file=path.join(root,'evidence/gate-2',item.path),obs=byLabel[item.observationLabel];
  if(!fs.existsSync(file)||!obs||item.runId!==runId||item.buildId!==run.buildId||item.stateSha256!==obs.inspector.stateSha256||
    item.simulationTimeMs!==obs.inspector.simulationTimeMs||sha(fs.readFileSync(file))!==item.sha256||
    fs.statSync(file).size!==item.bytes)captureErrors.push(item.label);
  else captureFiles.push({label:item.label,path:item.path,sha256:sha(fs.readFileSync(file)),bytes:fs.statSync(file).size,imagePixels:item.imagePixels});
}
check('original captures bind actual observations/run/build/state',captures.length>0&&captureErrors.length===0,{count:captures.length,failures:captureErrors});
check('root browser trace records actual inspected states',trace.length>0&&trace.every(x=>x.runId===runId&&x.buildId===run.buildId&&byLabel[x.label]));

const result={runId,buildId:run.buildId,checkedAtUtc:new Date().toISOString(),observationCount:observations.length,eventCount:events.length,
  captureFiles,assertions,summary:{passed:assertions.filter(x=>x.pass).length,total:assertions.length,failed:assertions.filter(x=>!x.pass).map(x=>x.name)}};
const output=path.join(import.meta.dirname,`${runId}-browser-audit.json`);
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file:output,...result.summary}));
if(result.summary.failed.length)process.exitCode=1;
