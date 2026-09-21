import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root=path.resolve(import.meta.dirname,'../..');
const runId=process.argv[2]??'G3-TESSERACT-001';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const runDir=path.join(root,'hypercube/runs',runId);
const run=read(path.join(runDir,'run.json'));
const buildDir=path.join(root,'hypercube/builds',run.buildId);
const build=read(path.join(buildDir,'build.json'));
const oracle=read(path.join(root,'audit/gate-3/oracle-results.json'));
const predictions=read(path.join(root,'docs/gate-3/independent-predictions.json'));
const checkpoints=read(path.join(runDir,'checkpoints.json'));
const model=await import(pathToFileURL(path.join(buildDir,'model.mjs')).href);
const checks=[];
const check=(name,pass,detail)=>checks.push({name,pass:Boolean(pass),...(detail===undefined?{}:{detail})});
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-10;
const vec=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>near(v,b[i]));
const matrix=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((row,i)=>vec(row,b[i]));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const transpose=m=>m[0].map((_,i)=>m.map(row=>row[i]));
const multiply=(a,b)=>a.map(row=>transpose(b).map(col=>dot(row,col)));
const digest=crypto.createHash('sha256');
const files=build.sourceFiles.map(item=>{
  const bytes=fs.readFileSync(path.join(buildDir,item.path));
  digest.update(item.path);digest.update('\0');digest.update(bytes);digest.update('\0');
  return {path:item.path,pass:sha(bytes)===item.sha256&&bytes.length===item.bytes};
});
const sourceSha256=digest.digest('hex');
check('immutable snapshot files and full content-derived build identity',files.length===8&&files.every(x=>x.pass)&&
  sourceSha256===build.sourceSha256&&sourceSha256===run.sourceSha256&&run.buildId===build.buildId&&run.buildId===`g3-${sourceSha256.slice(0,16)}`,
  {sourceSha256,failedFiles:files.filter(x=>!x.pass)});
const freezeBytes=fs.readFileSync(path.join(root,'docs/gate-3/PRESPEC_FREEZE.json'));
check('run and build bind the unchanged four-file prespec freeze',sha(freezeBytes)===build.prespecFreezeSha256&&
  sha(freezeBytes)===run.prespecFreezeSha256&&build.prespecFiles.length===4&&build.prespecFiles.every(item=>{
    const bytes=fs.readFileSync(path.join(root,item.path));return sha(bytes)===item.sha256&&bytes.length===item.bytes;}));
check('version, renderer, seed, runtime and source dimensions recorded',run.gate==='G3'&&run.durationMs===32000&&run.stepMs===1000&&
  JSON.stringify(run.checkpointTimesMs)===JSON.stringify([0,8000,16000,24000,32000])&&
  run.model.sourceDimension===4&&run.model.boundaryDimension===3&&run.model.skeletonDimension===1&&run.model.vertexAffineSpan===4&&
  run.model.sourceSeed===null&&build.renderer.includes('SVG')&&!!build.nodeVersion&&!!build.dependencyIdentity);
check('source identities and all 32 edges agree with independent enumeration',
  JSON.stringify(model.SOURCE)===JSON.stringify(oracle.source.vertices)&&
  JSON.stringify(model.EDGES)===JSON.stringify(oracle.source.edges)&&
  JSON.stringify(model.MARKED_PAIR)===JSON.stringify(['v1110','v1111'])&&run.model.markedEdgeId===oracle.source.marked.edge);

const checkpointResults=[];
for(let i=0;i<5;i++){
  const expected=predictions.checkpoints[i],stored=checkpoints[i],actual=model.modelAt(expected.timeMs);
  const byId=Object.fromEntries(actual.vertices.map(v=>[v.id,v]));
  const coordinates=expected.rows.every(row=>vec(byId[row.id]?.rotatedSource,row.qPrime)&&vec(byId[row.id]?.projected,row.p));
  const fixtureHashes=stored&&stored.sourceSha256===sha(JSON.stringify({vertices:model.SOURCE,edges:model.EDGES}))&&
    stored.projectionSha256===sha(JSON.stringify(model.geometryState(actual)))&&
    stored.displaySha256===sha(JSON.stringify(model.displayState(actual)))&&
    stored.checkpointSha256===sha(JSON.stringify({ ...model.checkpointState(actual),selectedVertexId:'v1110',
      selectedEdgeId:'e-v1110-v1111',sourceAngleOverride:null,cameraYawOverride:null,compareCondition:'source' }));
  checkpointResults.push({timeMs:expected.timeMs,pass:stored?.simulationTimeMs===expected.timeMs&&
    near(actual.rotation.theta,expected.thetaRadians)&&coordinates&&fixtureHashes&&
    near(actual.pairProjectedDistance,expected.markedProjectionDistance)&&near(actual.pairSourceDistance,2)&&
    actual.projectionSites.length===expected.distinctProjectedLocations});
}
check('all five exact saved states reproduce and all 80 projected rows match independent predictions',
  checkpointResults.every(x=>x.pass),checkpointResults.filter(x=>!x.pass));
check('initial state and run digests bind first saved checkpoint',
  JSON.stringify(read(path.join(runDir,'initial-state.json')))===JSON.stringify(checkpoints[0])&&
  run.sourceIdentitySha256===checkpoints[0].sourceSha256&&
  run.initialProjectionSha256===checkpoints[0].projectionSha256&&
  run.initialCheckpointSha256===checkpoints[0].checkpointSha256);
const R=model.rotationMatrix(Math.PI/4), P=model.modelAt(0).projection.matrix;
const expectedR=[[Math.SQRT1_2,0,0,-Math.SQRT1_2],[0,1,0,0],[0,0,1,0],[Math.SQRT1_2,0,0,Math.SQRT1_2]];
check('full 4×4 rotation, fixed 3×4 P and separate composed PR',matrix(R,expectedR)&&
  matrix(P,[[1,0,0,0],[0,1,0,0],[0,0,1,0]])&&matrix(model.modelAt(8000).projection.composedMatrix,multiply(P,R)));
check('projection fingerprint excludes clock and camera but changes with source angle',
  JSON.stringify(model.geometryState(model.modelAt(0)))===JSON.stringify(model.geometryState(model.modelAt(32000)))&&
  JSON.stringify(model.geometryState(model.modelAt(8000)))===JSON.stringify(model.geometryState(model.modelAt(8000,{cameraYawOverride:2*Math.PI/3})))&&
  JSON.stringify(model.geometryState(model.modelAt(8000)))!==JSON.stringify(model.geometryState(model.modelAt(8000,{sourceAngleOverride:Math.PI/6}))));
check('actual SVG screen positions use fixed center and scale; camera changes only display',(()=>{
  const v=model.modelAt(8000).vertices.find(v=>v.id==='v1110');
  const cy=Math.cos(Math.PI/6),sy=Math.sin(Math.PI/6),cp=Math.cos(Math.PI/9),sp=Math.sin(Math.PI/9);
  const [x,y,z]=v.projected,a=cy*x-sy*z,b=sy*x+cy*z;
  return vec(v.screen,[320+80*a,210-80*(cp*y-sp*b)])&&
    JSON.stringify(model.displayState(model.modelAt(8000)))!==JSON.stringify(model.displayState(model.modelAt(8000,{cameraYawOverride:2*Math.PI/3})));})());
const q=[0.37,-1.2,2.4,-0.81],id='opaque correspondence Ω';
const obs=[0,Math.PI/2].map(theta=>({id,matrix:model.projectionMatrix(theta),projected:model.projected3(q,theta)}));
const recovered=model.reconstruct(obs);
const fixed=model.reconstruct(obs.slice(0,1));
const gram=multiply(transpose(obs.flatMap(o=>o.matrix)),obs.flatMap(o=>o.matrix));
check('solver recovers a nonfixture opaque-ID point from supplied matrices and raw 3D p',
  recovered.rank===4&&vec(recovered.reconstructed,q)&&recovered.residual<=1e-10&&
  fixed.rank===3&&fixed.reconstructed===null&&
  matrix(gram,[[1,0,0,0],[0,2,0,0],[0,0,2,0],[0,0,0,1]]));
check('declared 1e-10 rank threshold treats a near-zero source turn as underdetermined',
  model.matrixRank([...model.projectionMatrix(0),...model.projectionMatrix(1e-12)],1e-10)===3&&
  model.matrixRank([...model.projectionMatrix(0),...model.projectionMatrix(Math.PI/2)],1e-10)===4);
const corrupted=obs.map((o,i)=>({...o,id:i===0?'first-opaque':'second-opaque'}));
let mismatchRejected=false;try{model.reconstruct(corrupted)}catch{mismatchRejected=true}
check('solver rejects mismatched IDs and uses no fixture coordinate encoded in ID',mismatchRejected);
const positives=model.SOURCE.map(v=>model.observabilityFor(v.id));
check('all 16 source correspondences recover with maximum coordinate error and forward residual ≤1e-10',
  positives.length===16&&positives.every(v=>v.rank===4&&v.reconstructed?.length===4&&
    v.truthComparisonAfterReconstruction<=1e-10&&v.residual<=1e-10));
const planned=fs.readFileSync(path.join(runDir,'events.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
check('planned fixture events are marked as predictions, not browser observations',planned.length>=7&&
  planned.every(e=>e.kind==='planned-fixture'&&e.actor==='fixture-generator')&&
  run.eventsKind.includes('planned deterministic fixture'));

const result={checkedAtUtc:new Date().toISOString(),runId,buildId:run.buildId,sourceSha256,
  pass:checks.every(c=>c.pass),passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks};
fs.writeFileSync(path.join(import.meta.dirname,`${runId}-build-audit.json`),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pass:result.pass,passed:result.passed,failed:result.failed,failures:checks.filter(c=>!c.pass)}));
if(!result.pass)process.exitCode=1;
