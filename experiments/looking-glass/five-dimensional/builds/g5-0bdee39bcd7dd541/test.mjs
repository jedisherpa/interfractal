import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname,resolve,join,basename } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { SOURCE5, SOURCE4, EDGES5, EDGES4, PROJECT5, CAMERA, SCALE,
  rotation5, rotationXW, rotationYV, projectionMatrix5, shapeAt, slice5,
  modelAt, matrixRank, reconstruct, observationsFor, anglesAt, clampTime,
  CHECKPOINTS_MS, checkpointState, sourceState, rotationState, projectionState,
  comparatorState, sliceState } from './model.mjs';

const near = (a,b,t=1e-10) => assert.ok(Math.abs(a-b) <= t, `${a} ≠ ${b}`);
const nearVector = (a,b,t=1e-10) => { assert.equal(a.length,b.length); a.forEach((x,i) => near(x,b[i],t)); };
const dot = (a,b) => a.reduce((s,x,i) => s+x*b[i],0);
const distance = (a,b) => Math.hypot(...a.map((x,i)=>x-b[i]));
const apply = (m,q) => m.map(row => dot(row,q));
const mul = (a,b) => a.map(row => b[0].map((_,j) => row.reduce((s,x,k) => s+x*b[k][j],0)));
const transpose = m => m[0].map((_,i) => m.map(row => row[i]));
const I = n => Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>+(i===j)));
assert.equal(SOURCE5.length,32); assert.equal(EDGES5.length,80);
assert.equal(SOURCE4.length,16); assert.equal(EDGES4.length,32);
assert.equal(new Set(SOURCE5.map(v=>v.id)).size,32);
assert.equal(new Set(EDGES5.map(e=>e.id)).size,80);
for (const e of EDGES5) {
  const a=SOURCE5.find(v=>v.id===e.from), b=SOURCE5.find(v=>v.id===e.to);
  assert.equal(a.q.filter((x,i)=>x!==b.q[i]).length,1);
}
assert.equal(matrixRank(SOURCE5.map(v=>v.q.map((x,i)=>x-SOURCE5[0].q[i])).slice(1),5),5);
const grid=[-60,0,30,45,90].map(x=>x*Math.PI/180);
for(const a of grid)for(const b of grid){
  const R=rotation5(a,b), rt=transpose(R), inv=rotation5(-a,-b);
  mul(rt,R).forEach((row,i)=>nearVector(row,I(5)[i]));
  mul(inv,R).forEach((row,i)=>nearVector(row,I(5)[i]));
  mul(rotationXW(a),rotationYV(b)).forEach((row,i)=>nearVector(row,R[i]));
  const rotated=SOURCE5.map(v=>apply(R,v.q));
  for(let i=0;i<32;i++){
    near(dot(rotated[i],rotated[i]),5);
    nearVector(apply(inv,rotated[i]),SOURCE5[i].q);
    for(let j=i+1;j<32;j++)near(distance(rotated[i],rotated[j]),distance(SOURCE5[i].q,SOURCE5[j].q));
  }
}
for (const [a,b] of [[0,0],[Math.PI/4,0],[Math.PI/4,Math.PI/4],[Math.PI/2,Math.PI/2],[-.8,.4]]) {
  const R=rotation5(a,b);
  const product=mul(transpose(R),R);
  product.forEach((row,i)=>nearVector(row,I(5)[i]));
  const reversed=mul(rotationXW(a),rotationYV(b));
  R.forEach((row,i)=>nearVector(row,reversed[i]));
  for (const q of [[1,2,3,4,5],[-1,-1,-1,-1,-1]]) {
    nearVector(apply(rotation5(-a,-b),apply(R,q)),q);
    nearVector(apply(PROJECT5,apply(R,q)),apply(projectionMatrix5(a,b),q));
    near(dot(q,q),dot(apply(R,q),apply(R,q)));
  }
}
for (const [a,b,expected4,expected5,collapsed4,collapsed5] of [
  [0,0,8,8,8,32],[Math.PI/4,0,12,12,0,16],[Math.PI/4,Math.PI/4,12,18,0,0]
]) {
  const s4=shapeAt(4,a),s5=shapeAt(5,a,b);
  assert.equal(s4.metrics.uniqueProjectedSites,expected4);
  assert.equal(s5.metrics.uniqueProjectedSites,expected5);
  assert.equal(s4.metrics.collapsedEdges,collapsed4);
  assert.equal(s5.metrics.collapsedEdges,collapsed5);
  assert.equal(s4.camera.yaw,CAMERA.yaw); assert.equal(s5.fixedScaleSvgUnitsPerR3Unit,SCALE);
}
const base=shapeAt(5,0,0), turnW=shapeAt(5,Math.PI/4,0), turnV=shapeAt(5,0,Math.PI/4);
const p=(s,id)=>s.vertices.find(v=>v.id===id).projected;
assert.notDeepEqual(p(turnW,'v00000'),p(base,'v00000'));
assert.notDeepEqual(p(turnV,'v00000'),p(base,'v00000'));
near(p(turnW,'v00000')[1],p(base,'v00000')[1]);
near(p(turnV,'v00000')[0],p(base,'v00000')[0]);
near(slice5(.5,0).radius,Math.sqrt(.75));
near(slice5(0,.5).radius,slice5(.5,0).radius);
assert.equal(slice5(1,0).kind,'point'); assert.equal(slice5(0,1).kind,'point');
assert.equal(slice5(1.25,0).kind,'empty'); assert.equal(slice5(1.25,0).radius,null);
assert.equal(slice5(1-1e-12,0).kind,'solid'); assert.equal(slice5(1+1e-12,0).kind,'empty');
for (const bad of [NaN,Infinity,-Infinity]) assert.throws(()=>slice5(bad,0));
assert.equal(anglesAt(0).alpha,0); near(anglesAt(10_000).alpha,Math.PI/2);
near(anglesAt(20_000).beta,Math.PI/2); near(anglesAt(30_000).alpha,0);
near(anglesAt(40_000).beta,0); assert.equal(clampTime(8050),8100);
assert.equal(clampTime(-1),0); assert.equal(clampTime(50_000),40_000);
const views4=[[0,0],[Math.PI/2,0]];
const views5Exact=[[0,0],[Math.PI/2,0],[0,Math.PI/2]];
for (const {id,q} of SOURCE5) {
  const hidden=reconstruct(observationsFor(id,views4));
  assert.equal(hidden.rank,4); assert.equal(hidden.reconstructed,null);
  const solved=reconstruct(observationsFor(id,views5Exact));
  assert.equal(solved.rank,5); nearVector(solved.reconstructed,q); near(solved.residual,0);
}
const arbitrary=[.2,-.4,.6,-.8,1.1],probe=views5Exact.map(([a,b])=>({id:'probe',matrix:projectionMatrix5(a,b),
  projected:apply(projectionMatrix5(a,b),arbitrary)}));
nearVector(reconstruct(probe).reconstructed,arbitrary);
const first=modelAt(0), changedSlice=modelAt(0,{sliceWOverride:.5});
assert.deepEqual(first.source5.vertices.map(v=>v.projected),changedSlice.source5.vertices.map(v=>v.projected));
const changedCamera=modelAt(0,{cameraYawOverride:2*Math.PI/3});
assert.deepEqual(first.source5.vertices.map(v=>v.projected),changedCamera.source5.vertices.map(v=>v.projected));
assert.notDeepEqual(first.source5.vertices.map(v=>v.screen),changedCamera.source5.vertices.map(v=>v.screen));
assert.notDeepEqual(checkpointState(modelAt(CHECKPOINTS_MS[0])),checkpointState(modelAt(CHECKPOINTS_MS[1])));
assert.deepEqual(sourceState(),sourceState());
assert.deepEqual(rotationState(first),rotationState(changedSlice));
assert.deepEqual(projectionState(first),projectionState(changedSlice));
assert.deepEqual(comparatorState(first),comparatorState(changedSlice));
assert.notDeepEqual(sliceState(first),sliceState(changedSlice));
assert.deepEqual(rotationState(first),rotationState(changedCamera));
assert.deepEqual(projectionState(first),projectionState(changedCamera));
assert.deepEqual(comparatorState(first),comparatorState(changedCamera));
assert.deepEqual(sliceState(first),sliceState(changedCamera));
assert.notDeepEqual(checkpointState(first),checkpointState(modelAt(0,{selectedVertexId:'v11111'})));
assert.notDeepEqual(checkpointState(first),checkpointState(modelAt(0,{observationCondition:'hidden'})));
assert.notDeepEqual(checkpointState(first),checkpointState(modelAt(0,{task:{id:'T1',stage:'baseline overlap'}})));
assert.notDeepEqual(checkpointState(first),checkpointState(modelAt(0,{inspectorOpen:true})));
assert.equal(checkpointState(first).mode,'saved-run');
assert.equal(checkpointState(modelAt(0,{task:{id:'T1',stage:'baseline overlap'}})).mode,'exploration');
const testDir=dirname(fileURLToPath(import.meta.url));
const experimentDir=basename(dirname(testDir))==='builds'?resolve(testDir,'../../..'):resolve(testDir,'..');
const baselinePath=join(experimentDir,'hypercube/builds/g3-6c31bc16aeca4460/model.mjs');
const baselineBytes=await readFile(baselinePath);
assert.equal(createHash('sha256').update(baselineBytes).digest('hex'),'e9be25d2aaf9f625a3d3cd7784d70abb0739399da832fea307d9bff1c3b7bc2c');
const baseline=await import(pathToFileURL(baselinePath).href);
for(const angle of [0,30,45,90].map(x=>x*Math.PI/180)){
  const now=shapeAt(4,angle),old=baseline.modelAt(0,{sourceAngleOverride:angle});
  assert.deepEqual(now.sourceVertices.map(v=>v.id),old.vertices.map(v=>v.id));
  assert.deepEqual(now.sourceEdges.map(e=>e.id),old.edges.map(e=>e.id));
  for(const v of now.vertices)nearVector(v.projected,old.vertices.find(x=>x.id===v.id).projected);
}
console.log('Gate 5 model tests passed: 32/80, 4D comparator, rotations, strict slices, rank-4/5 recovery and controls.');
