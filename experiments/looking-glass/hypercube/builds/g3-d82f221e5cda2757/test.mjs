import assert from 'node:assert/strict';
import { RUN_ID, DURATION_MS, CHECKPOINTS_MS, CAMERA, SOURCE, EDGES, MARKED_PAIR,
  angleAt, rotateXW, projectionMatrix, projected3, displayProjection, modelAt,
  matrixRank, reconstruct, observabilityFor, geometryState, displayState } from './model.mjs';

const near = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a-b) <= tolerance, `${a} versus ${b}`);
const vecNear = (a, b, tolerance = 1e-10) => a.forEach((v, i) => near(v, b[i], tolerance));
const dot = (a, b) => a.reduce((sum, v, i) => sum + v*b[i], 0);
const qById = Object.fromEntries(SOURCE.map(v => [v.id, v.q]));
assert.equal(RUN_ID, 'G3-TESSERACT-002');
assert.equal(SOURCE.length, 16); assert.equal(EDGES.length, 32);
assert.equal(new Set(SOURCE.map(v => v.id)).size, 16);
assert.equal(new Set(EDGES.map(e => e.id)).size, 32);
for (const edge of EDGES) {
  assert.equal(qById[edge.from].filter((v, i) => v !== qById[edge.to][i]).length, 1);
  near(Math.hypot(...qById[edge.from].map((v, i) => v-qById[edge.to][i])), 2);
}
const affineBasis = [
  qById.v1000.map((v,i) => v-qById.v0000[i]),
  qById.v0100.map((v,i) => v-qById.v0000[i]),
  qById.v0010.map((v,i) => v-qById.v0000[i]),
  qById.v0001.map((v,i) => v-qById.v0000[i])];
assert.equal(matrixRank(affineBasis), 4);
for (const v of SOURCE) near(dot(v.q,v.q), 4);
for (const theta of [0, Math.PI/8, Math.PI/4, Math.PI/2, Math.PI]) {
  for (const v of SOURCE) {
    const rotated = rotateXW(v.q, theta);
    near(dot(rotated,rotated), 4);
    vecNear(rotateXW(rotated,-theta), v.q);
    const independentlyMultiplied = projectionMatrix(theta).map(row => dot(row,v.q));
    vecNear(projected3(v.q,theta), independentlyMultiplied);
  }
  for (let i=0;i<SOURCE.length;i++) for (let j=i+1;j<SOURCE.length;j++) {
    const a=SOURCE[i].q,b=SOURCE[j].q;
    near(Math.hypot(...a.map((x,k)=>x-b[k])),Math.hypot(...rotateXW(a,theta).map((x,k)=>x-rotateXW(b,theta)[k])));
  }
}
assert.deepEqual(CHECKPOINTS_MS,[0,8000,16000,24000,32000]);
for (const [ms,theta] of [[0,0],[8000,Math.PI/4],[16000,Math.PI/2],[24000,Math.PI/4],[32000,0]]) near(angleAt(ms),theta);
const aId=MARKED_PAIR[0],bId=MARKED_PAIR[1];
assert.deepEqual(qById[aId].slice(0,3),qById[bId].slice(0,3));
near(Math.abs(qById[aId][3]-qById[bId][3]),2);
const at0=modelAt(0),at90=modelAt(16000);
near(at0.pairProjectedDistance,0);near(at90.pairProjectedDistance,2);
near(at0.pairSourceDistance,2);near(at90.pairSourceDistance,2);
assert.ok(at0.projectionSites.some(s=>s.sourceIds.includes(aId)&&s.sourceIds.includes(bId)));
assert.ok(at90.projectionSites.every(s=>!(s.sourceIds.includes(aId)&&s.sourceIds.includes(bId))));
// Independent checkpoint coordinates for A=(1,1,1,-1), B=(1,1,1,1).
for (const [ms,xA,xB] of [[0,1,1],[8000,Math.SQRT2,0],[16000,1,-1],[24000,Math.SQRT2,0],[32000,1,1]]) {
  const s=modelAt(ms),byId=Object.fromEntries(s.vertices.map(v=>[v.id,v]));
  vecNear(byId[aId].projected,[xA,1,1]);vecNear(byId[bId].projected,[xB,1,1]);
}
const fixedRows=projectionMatrix(0), twoRows=[...fixedRows,...projectionMatrix(Math.PI/2)];
assert.equal(matrixRank(fixedRows),3);
assert.equal(matrixRank([...fixedRows,...fixedRows]),3);
assert.equal(matrixRank(twoRows),4);
const fixed=reconstruct([{id:aId,theta:0,matrix:projectionMatrix(0),projected:projected3(qById[aId],0)}]);
assert.equal(fixed.rank,3);assert.equal(fixed.reconstructed,null);
for (const v of SOURCE) {
  const solve=reconstruct([{id:v.id,theta:0,matrix:projectionMatrix(0),projected:projected3(v.q,0)},
    {id:v.id,theta:Math.PI/2,matrix:projectionMatrix(Math.PI/2),projected:projected3(v.q,Math.PI/2)}]);
  assert.equal(solve.rank,4);vecNear(solve.reconstructed,v.q);near(solve.residual,0);
}
assert.equal(observabilityFor(aId).rank,4);
const cam={...CAMERA,yaw:CAMERA.yaw+0.25};
assert.deepEqual(geometryState(modelAt(8000)),geometryState(modelAt(8000,{cameraYawOverride:cam.yaw})));
assert.notDeepEqual(displayState(modelAt(8000)),displayState(modelAt(8000,{cameraYawOverride:cam.yaw})));
const sourceChange=modelAt(8000,{sourceAngleOverride:Math.PI/3});
assert.deepEqual(sourceChange.camera,CAMERA);
assert.notDeepEqual(geometryState(sourceChange),geometryState(modelAt(8000)));
const p=[1,2,3], c=displayProjection(p,CAMERA);
near(c.cameraCoordinates[0],Math.cos(CAMERA.yaw)*p[0]-Math.sin(CAMERA.yaw)*p[2]);
near(c.cameraCoordinates[1],Math.cos(CAMERA.pitch)*p[1]-Math.sin(CAMERA.pitch)*(Math.sin(CAMERA.yaw)*p[0]+Math.cos(CAMERA.yaw)*p[2]));
console.log('Gate 3 model checks passed: 16/32, affine rank 4, invariants, checkpoints, camera isolation, rank 3 negative and rank 4 recovery.');
