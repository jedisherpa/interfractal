import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASES, CHECKPOINTS_MS, SAMPLE_COUNT, CAMERA, CLIP_RADIUS, norm, hopf, localSection,
  phaseMultiply, fiberPoint, chartValid, chartCompensatedPhase, stereographic, sampleFiber,
  modelAt, geometryState } from './model.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const near = (a,b,eps=1e-10) => { assert.ok(Math.abs(a-b)<eps,`${a} != ${b}`); };
const vectorNear = (a,b,eps=1e-10) => { assert.equal(a.length,b.length); a.forEach((v,i)=>near(v,b[i],eps)); };
const sort = value => Array.isArray(value) ? value.map(sort) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,sort(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(sort(value))).digest('hex');
const fixture = JSON.parse(await readFile(join(dir,'fictional-records.json'),'utf8'));
const maps = JSON.parse(await readFile(join(dir,'reference-mappings.json'),'utf8'));
assert.deepEqual(BASES.map(b=>b.id),['north','south','east','west','front','back','seam-plus','seam-minus']);
assert.equal(SAMPLE_COUNT,128); assert.equal(CLIP_RADIUS,4);
for (const base of BASES) {
  near(norm(base.p),1);
  const chart = base.id === 'south' ? 'S' : 'N';
  const samples = sampleFiber(base.p,chart);
  assert.equal(samples.length,128);
  for (const sample of samples) { near(norm(sample.q),1); vectorNear(sample.h,base.p); }
  const s = localSection(base.p,chart); near(norm(s),1); vectorNear(hopf(s),base.p);
  for (const gamma of [0,.3,Math.PI,5.2]) vectorNear(hopf(phaseMultiply(s,gamma)),base.p);
}
assert.equal(chartValid([0,0,1],'S'),false);
assert.equal(chartValid([0,0,-1],'N'),false);
const front=[0,1,0], gammaS=chartCompensatedPhase(front,0,'N','S');
near(gammaS,-Math.PI/2);
vectorNear(fiberPoint(front,0,'N'),fiberPoint(front,gammaS,'S'));
vectorNear(fiberPoint(front,0,'N'),fiberPoint(front,chartCompensatedPhase(front,gammaS,'S','N'),'N'));
const southSamples=sampleFiber([0,0,-1],'S');
assert.equal(southSamples[32].representation.kind,'infinity');
assert.deepEqual(southSamples[32].q.map(v=>Math.abs(v)<1e-12?0:v),[0,0,0,1]);
vectorNear(stereographic(fiberPoint([0,0,-1],0,'S')).point,[0,0,1]);
vectorNear(stereographic(fiberPoint([0,0,-1],Math.PI,'S')).point,[0,0,-1]);
near(norm(BASES[6].p.map((v,i)=>v-BASES[7].p[i])),2e-6,1e-12);
for (const ms of CHECKPOINTS_MS) {
  const m=modelAt(ms);
  near(norm(m.sourcePoint),1); vectorNear(m.hopfPoint,[1,0,0]);
  near(m.phase,2*Math.PI*ms/24000);
  assert.deepEqual(m.camera,CAMERA);
  assert.equal(m.fibers.length,8);
  assert.equal(m.selectedSamples.length,128);
}
assert.deepEqual(geometryState(modelAt(6000,{cameraYawOverride:1})),geometryState(modelAt(6000)));
for (const record of fixture.records) {
  const {contentSha256,...content}=record;
  assert.equal(hash(content),contentSha256,`source record ${record.id} hash mismatch`);
}
assert.deepEqual(maps.expectedAssignments.R_CAPACITY_60.map(a=>a.answer??a.status),['yes','yes','no','unmapped']);
assert.deepEqual(maps.expectedAssignments.R_EXISTING_ACCESS.map(a=>a.answer??a.status),['no','yes','yes','unmapped']);
for (const id of ['R_CAPACITY_60','R_EXISTING_ACCESS']) for (const a of maps.expectedAssignments[id]) {
  const record=fixture.records.find(r=>r.id===a.recordId);
  assert.ok(record); assert.equal(a.recordSha256,record.contentSha256);
  if (a.status==='mapped') {
    const yes=id==='R_CAPACITY_60'?record.facts.capacityHouseholds>=60:record.facts.alreadyWheelchairAccessible===true;
    assert.equal(a.answer,yes?'yes':'no'); assert.equal(a.baseId,yes?'east':'west');
  } else assert.equal(record.kind,'context');
}
console.log('Gate 2 model/fixture checks passed: S³ normalization, Hopf images, phase invariance, chart transition, poles/infinity, seam, camera independence, checkpoint family, immutable record hashes and two declared mappings.');
