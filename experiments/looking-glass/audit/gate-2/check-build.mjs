// Independent exact-build audit: the expected calculations below do not import model.mjs.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root=path.resolve(import.meta.dirname,'../..');
const runId=process.argv[2]??'G2-HOPF-002';
const runDir=path.join(root,'correspondence/runs',runId);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const run=read(path.join(runDir,'run.json'));
const buildDir=path.join(root,'correspondence/builds',run.buildId);
const build=read(path.join(buildDir,'build.json'));
const predictions=read(path.join(root,'docs/gate-2/independent-predictions.json'));
const checkpointStates=read(path.join(runDir,'checkpoints.json'));
const model=await import(pathToFileURL(path.join(buildDir,'model.mjs')).href);
const assertions=[];
const check=(name,pass,detail)=>assertions.push({name,pass:Boolean(pass),...(detail===undefined?{}:{detail})});
const near=(a,b)=>Math.abs(a-b)<=1e-10;
const vec=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>near(x,b[i]));
const canon=v=>JSON.stringify(v);
const sq=v=>v.reduce((s,x)=>s+x*x,0);
const expectedSource=(p,chart,gamma)=>{
  const [X,Y,Z]=p,u=Math.cos(gamma),v=Math.sin(gamma);
  const z1=chart==='N'?[Math.sqrt((1+Z)/2),0]:[X/Math.sqrt(2*(1-Z)),Y/Math.sqrt(2*(1-Z))];
  const z2=chart==='N'?[X/Math.sqrt(2*(1+Z)),-Y/Math.sqrt(2*(1+Z))]:[Math.sqrt((1-Z)/2),0];
  return [u*z1[0]-v*z1[1],v*z1[0]+u*z1[1],u*z2[0]-v*z2[1],v*z2[0]+u*z2[1]];
};
const expectedHopf=([a,b,c,d])=>[2*(a*c+b*d),2*(b*c-a*d),a*a+b*b-c*c-d*d];
const expectedProjection=([a,b,c,d])=>1-d<=1e-12?null:[a/(1-d),b/(1-d),c/(1-d)];

let digest=crypto.createHash('sha256'), fileHashes=[];
for(const item of build.sourceFiles){
  const bytes=fs.readFileSync(path.join(buildDir,item.path));
  const value=sha(bytes); fileHashes.push({path:item.path,expected:item.sha256,actual:value});
  digest.update(item.path);digest.update('\0');digest.update(bytes);digest.update('\0');
}
const sourceSha=digest.digest('hex');
check('all immutable build files match manifest',fileHashes.every(x=>x.actual===x.expected),fileHashes.filter(x=>x.actual!==x.expected));
check('build ID, source digest and run binding',sourceSha===build.sourceSha256&&sourceSha===run.sourceSha256&&build.buildId===run.buildId&&build.buildId===`g2-${sourceSha.slice(0,16)}`,
  {sourceSha,runSha:run.sourceSha256,buildId:build.buildId});

const baseChecks=[];
for(const base of predictions.bases){
  const actual=model.modelAt(0,{baseId:base.id});
  const fiber=actual.fibers.find(x=>x.id===base.id);
  const expectedChart=base.canonicalSamplingChart==='north'?'N':'S';
  const errors=[];
  for(let j=0;j<128;j++){
    const sample=fiber.samples[j], q=expectedSource(base.xyz,expectedChart,2*Math.PI*j/128),P=expectedProjection(q);
    if(sample.index!==j||!vec(sample.q,q)||!vec(sample.h,base.xyz)||!near(sq(sample.q),1)||
      (P===null?sample.representation.kind!=='infinity'||sample.representation.point!==null:!vec(sample.representation.point,P))){
      errors.push({j,q:sample.q,expectedQ:q,h:sample.h,expectedH:base.xyz,representation:sample.representation,expectedP:P});
    }
  }
  baseChecks.push({id:base.id,count:fiber.samples.length,errors:errors.slice(0,3),errorCount:errors.length});
}
check('8×128 exact build samples match independent source/base/stereo algebra',baseChecks.length===8&&baseChecks.every(x=>x.count===128&&x.errorCount===0),baseChecks.filter(x=>x.errorCount));
check('stable eight base IDs retained',model.BASES.map(x=>x.id).join(',')===predictions.bases.map(x=>x.id).join(','));

const checkpoints=[];
for(const expected of predictions.replayCheckpoints){
  const actual=model.modelAt(expected.tMs);
  const stored=checkpointStates.find(x=>x.simulationTimeMs===expected.tMs);
  checkpoints.push({tMs:expected.tMs,q:actual.sourcePoint,h:actual.hopfPoint,P:actual.selectedRepresentation.point,
    matchesIndependent:vec(actual.sourcePoint,expected.sourceQ)&&vec(actual.hopfPoint,expected.hopfBase)&&vec(actual.selectedRepresentation.point,expected.stereographicR3),
    exactModel:!!stored&&canon(stored.state.model)===canon(actual),
    exactStateHash:!!stored&&sha(canon(typeof model.checkpointFingerprintState==='function'?model.checkpointFingerprintState(stored.state):stored.state))===stored.stateSha256,
    exactGeometryHash:!!stored&&sha(canon(model.geometryState(stored.state.model)))===stored.geometrySha256,
    exactMappingHash:!!stored&&sha(canon(typeof model.mappingFingerprintState==='function'?model.mappingFingerprintState(stored.state.mapping):stored.state.mapping))===stored.mappingSha256,
    exactRecordsHash:!!stored&&sha(canon(stored.state.mapping.records))===stored.recordsSha256});
}
check('five independent checkpoint q/h/P predictions',checkpoints.length===5&&checkpoints.every(x=>x.matchesIndependent),checkpoints.filter(x=>!x.matchesIndependent));
check('five saved checkpoint model/state/geometry hashes reproduce exactly',checkpoints.length===5&&checkpoints.every(x=>x.exactModel&&x.exactStateHash&&x.exactGeometryHash),checkpoints.filter(x=>!x.exactModel||!x.exactStateHash||!x.exactGeometryHash));
check('five saved mapping hashes reproduce exactly',checkpoints.length===5&&checkpoints.every(x=>x.exactMappingHash),checkpoints.filter(x=>!x.exactMappingHash));
check('five saved records hashes reproduce exactly',checkpoints.length===5&&checkpoints.every(x=>x.exactRecordsHash),checkpoints.filter(x=>!x.exactRecordsHash));
check('initial-state and run hashes agree with first checkpoint',
  canon(read(path.join(runDir,'initial-state.json')))===canon(checkpointStates[0])&&
  run.initialStateHash===checkpointStates[0].stateSha256&&run.initialGeometryHash===checkpointStates[0].geometrySha256);

const front=[0,1,0],north=model.fiberPoint(front,0,'N'),southPhase=model.chartCompensatedPhase(front,0,'N','S');
check('front chart compensation preserves actual q/h/P',near(southPhase,-Math.PI/2)&&vec(north,model.fiberPoint(front,southPhase,'S'))&&vec(model.hopf(north),front)&&vec(model.stereographic(north).point,predictions.chartSwitch.expectedProjection),{southPhase});
const invalid=[];
for(const [p,chart] of [[[0,0,1],'S'],[[0,0,-1],'N']]){
  let rejected=false;try{model.localSection(p,chart)}catch(error){rejected=error instanceof RangeError}
  invalid.push(rejected);
}
check('invalid pole charts reject',invalid.every(Boolean));

const custom=predictions.customSelection;
const customP=model.baseFromLatLon(custom.latitudeDegrees,custom.longitudeDegrees);
const customState=model.modelAt(0,{baseId:'custom',basePoint:customP,chart:'N',phaseOverride:0});
check('custom base and source agree with prespec',vec(customP,custom.expectedBase)&&vec(customState.sourcePoint,custom.expectedSourceQ)&&vec(customState.selectedRepresentation.point,custom.expectedProjection));
check('custom selection adds one 128-sample fiber without changing fixed eight',customState.fibers.length===8&&customState.selectedSamples.length===128&&customState.fibers.every((fiber,i)=>fiber.id===predictions.bases[i].id));

const southState=model.modelAt(0,{baseId:'south',chart:'S'}),southSamples=southState.selectedSamples;
const clippedSegment=typeof model.clipSegmentToBall==='function' ? model.clipSegmentToBall([0,0,3],[0,0,6]) : null;
check('south source pole retained and ±4 crossings exist',
  southSamples[32].representation.kind==='infinity'&&vec(southSamples[32].q,[0,0,0,1])&&
  southSamples[31].representation.point[2]>4&&southSamples[33].representation.point[2]<-4);
check('ball clipping intersects south continuation at radius 4',
  clippedSegment?.end?.every((x,i)=>near(x,[0,0,4][i]))===true,
  {clipFunctionExported:typeof model.clipSegmentToBall==='function'});
const cameraPrediction=([x,y,z],yaw=Math.PI/6,pitch=Math.PI/9)=>{
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const x1=cy*x-sy*z,z1=sy*x+cy*z,y1=cp*y-sp*z1,depth=sp*y+cp*z1;
  return {screen:[x1,-y1],depth};
};
const cameraCases=[[1,0,0],[0,1,0],[0,0,1],[0,0,4],[.7071067811865475,2.414213562373095,0]];
const cameraDifferences=cameraCases.map(p=>{
  const actual=model.cameraProject(p),expected=cameraPrediction(p);
  return {p,actual,expected,pass:vec(actual.screen,expected.screen)&&near(actual.depth,expected.depth)};
});
check('declared camera yaw/pitch signs and basis vectors',cameraDifferences.every(x=>x.pass),cameraDifferences.filter(x=>!x.pass));
const camBase=model.modelAt(6000),camTurn=model.modelAt(6000,{cameraYawOverride:2*Math.PI/3});
check('camera yaw changes only display camera',canon(model.geometryState(camBase))===canon(model.geometryState(camTurn))&&
  camBase.camera.yaw!==camTurn.camera.y&&vec(camBase.sourcePoint,camTurn.sourcePoint));

const fixture=read(path.join(buildDir,'fictional-records.json'));
const map=read(path.join(buildDir,'reference-mappings.json'));
const mappingModulePath=path.join(buildDir,'mapping.mjs');
if(fs.existsSync(mappingModulePath)){
  const mappingModule=await import(pathToFileURL(mappingModulePath).href);
  const derived=[];
  for(const id of ['R_CAPACITY_60','R_EXISTING_ACCESS']){
    const actual=mappingModule.mappingState(fixture,map,id);
    derived.push({id,matches:canon(actual.assignments)===canon(map.expectedAssignments[id]),referenceMatches:actual.reference.id===id,
      recordsMatch:canon(actual.records)===canon(fixture.records)});
  }
  check('runtime rules derive both exact frozen assignment tables',derived.every(x=>x.matches&&x.referenceMatches&&x.recordsMatch),derived);
  const sourceVenue=fixture.records.find(x=>x.id==='venue-hall');
  const missingCapacity=structuredClone(sourceVenue); delete missingCapacity.facts.capacityHouseholds;
  const missingAccess=structuredClone(sourceVenue); delete missingAccess.facts.alreadyWheelchairAccessible;
  const capacityUnknown=mappingModule.deriveAssignment(missingCapacity,'R_CAPACITY_60',fixture.records);
  const accessUnknown=mappingModule.deriveAssignment(missingAccess,'R_EXISTING_ACCESS',fixture.records);
  let invalidReferenceRejected=false;try{mappingModule.mappingState(fixture,map,'R_UNKNOWN')}catch(error){invalidReferenceRejected=error instanceof RangeError}
  check('missing facts stay unknown/unmapped and invalid reference rejects',
    capacityUnknown.status==='unmapped'&&capacityUnknown.answer==='unknown'&&capacityUnknown.baseId===null&&
    accessUnknown.status==='unmapped'&&accessUnknown.answer==='unknown'&&accessUnknown.baseId===null&&invalidReferenceRejected,
    {capacityUnknown,accessUnknown,invalidReferenceRejected});
}
check('build fixtures byte-identical to frozen docs',
  fs.readFileSync(path.join(buildDir,'fictional-records.json')).equals(fs.readFileSync(path.join(root,'docs/gate-2/fictional-records.json')))&&
  fs.readFileSync(path.join(buildDir,'reference-mappings.json')).equals(fs.readFileSync(path.join(root,'docs/gate-2/reference-mappings.json'))));
check('run source fixture and mapping hashes match build',run.attention.recordFixtureSha256===sha(fs.readFileSync(path.join(buildDir,'fictional-records.json')))&&
  run.attention.mappingFixtureSha256===sha(fs.readFileSync(path.join(buildDir,'reference-mappings.json'))));
check('saved mapping contains complete immutable records and expected assignments',
  checkpointStates.every(c=>canon(c.state.mapping.records)===canon(fixture.records)&&
    canon(c.state.mapping.assignments)===canon(map.expectedAssignments.R_CAPACITY_60)));

const result={runId,buildId:run.buildId,checkedAtUtc:new Date().toISOString(),assertions,summary:{passed:assertions.filter(x=>x.pass).length,total:assertions.length,failed:assertions.filter(x=>!x.pass).map(x=>x.name)},checkpoints};
const output=path.join(import.meta.dirname,`${runId}-build-audit.json`);
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file:output,...result.summary}));
if(result.summary.failed.length)process.exitCode=1;
