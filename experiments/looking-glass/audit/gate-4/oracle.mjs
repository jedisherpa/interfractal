// Independent Gate 4 oracle. Deliberately imports no slices/ implementation.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const prediction = JSON.parse(await readFile(resolve(base, 'docs/gate-4/independent-predictions.json')));
const tolerance = 1e-10;
const close = (actual, expected, label) => {
  assert.ok(Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} differs from ${expected}`);
};
const vector = (actual, expected, label) => {
  assert.equal(actual.length, expected.length, `${label} length`);
  actual.forEach((value, index) => close(value, expected[index], `${label}[${index}]`));
};
const slice = (c, s) => {
  assert.ok(Number.isFinite(c) && Number.isFinite(s));
  const d = s - c;
  const u = 1 - d * d;
  return { c, s, d, u, kind: u > 0 ? 'solid' : u === 0 ? 'point' : 'empty',
    radius: u < 0 ? null : Math.sqrt(u), center3: u < 0 ? null : [0, 0, 0] };
};
const envelope = t => t <= 20000 ? t / 20000 : (40000 - t) / 20000;
const angle = t => Math.PI / 2 * envelope(t);
const screen = ([x, y, z]) => {
  const yaw = Math.PI / 6, pitch = Math.PI / 9;
  const a = Math.cos(yaw) * x - Math.sin(yaw) * z;
  const b = Math.sin(yaw) * x + Math.cos(yaw) * z;
  const vertical = Math.cos(pitch) * y - Math.sin(pitch) * b;
  return [320 + 80 * a, 210 - 80 * vertical];
};
const compareSlice = (actual, expected, label) => {
  assert.equal(actual.kind, expected.kind, `${label} kind`);
  close(actual.d, expected.offset, `${label} offset`);
  close(actual.u, expected.radicand, `${label} radicand`);
  assert.equal(actual.radius === null, expected.radius === null, `${label} null radius`);
  if (actual.radius !== null) close(actual.radius, expected.radius, `${label} radius`);
  if (actual.center3 === null) assert.equal(expected.center3, null, `${label} null center`);
  else vector(actual.center3, expected.center3, `${label} center`);
};

for (const [i, expected] of prediction.analyticCases.entries())
  compareSlice(slice(expected.c, expected.s), expected, `analytic case ${i}`);
const checkpoints = prediction.checkpoints.map((expected, index) => {
  const t = expected.timeMs;
  const primary = slice(0, 1.25 * envelope(t));
  compareSlice(primary, expected.primarySlice, `checkpoint ${expected.id}`);
  vector(expected.primaryProjection.center3, [0, 0, 0], `checkpoint ${expected.id} projection center`);
  close(expected.primaryProjection.radius, 1, `checkpoint ${expected.id} projection radius`);
  const theta = angle(t);
  const center4 = [-0.5 * Math.sin(theta), 0, 0, 0.5 * Math.cos(theta)];
  close(theta, expected.movie.thetaRadians, `checkpoint ${expected.id} angle`);
  vector(center4, expected.movie.rotatedCenter4, `checkpoint ${expected.id} rotated center`);
  vector(center4.slice(0, 3), expected.movie.projectedCenter3, `checkpoint ${expected.id} projected center`);
  vector(screen(center4.slice(0, 3)), expected.movieProjectedCenterScreen, `checkpoint ${expected.id} screen center`);
  assert.equal(expected.storedFrameIndex, t / 100);
  return { id: expected.id, timeMs: t, sliceKind: primary.kind, sliceRadius: primary.radius,
    movieCenter3: center4.slice(0, 3), movieScreenCenter: screen(center4.slice(0, 3)) };
});
assert.equal(checkpoints.length, 7);
const initialPlus = slice(0.5, 0), initialMinus = slice(-0.5, 0);
const knownPlus = slice(0.5, 0.5), knownMinus = slice(-0.5, 0.5);
compareSlice(initialPlus, prediction.ambiguity.initial.plus, 'ambiguity initial plus');
compareSlice(initialMinus, prediction.ambiguity.initial.minus, 'ambiguity initial minus');
compareSlice(knownPlus, prediction.ambiguity.intervened.plus, 'ambiguity known plus');
compareSlice(knownMinus, prediction.ambiguity.intervened.minus, 'ambiguity known minus');
assert.equal(initialPlus.radius, initialMinus.radius);
assert.equal(knownPlus.kind, 'solid');
assert.equal(knownMinus.kind, 'point');
assert.equal(prediction.ambiguity.cameraOnly.rawCandidatesStillEqual, true);

const movieFrames = Array.from({ length: 401 }, (_, k) => {
  const timeMs = 100 * k;
  return { timeMs, center: [-0.5 * Math.sin(angle(timeMs)), 0, 0], radius: 1 };
});
const heldOutModel = [0.5, 0, 0], heldOutStored = movieFrames[200].center;
const heldOutDistance = Math.hypot(...heldOutModel.map((v, i) => v - heldOutStored[i]));
vector(heldOutModel, prediction.heldOut.modelCenter3, 'held-out model center');
vector(heldOutStored, prediction.heldOut.storedCenter3, 'held-out stored center');
close(heldOutDistance, prediction.heldOut.rawCenterDistance, 'held-out distance');
vector(screen(heldOutModel), prediction.heldOut.modelScreenCenter, 'held-out model screen');
vector(screen(heldOutStored), prediction.heldOut.storedScreenCenter, 'held-out stored screen');
vector(screen(heldOutModel).map((v, i) => v - screen(heldOutStored)[i]),
  prediction.heldOut.screenDeltaModelMinusStored, 'held-out screen delta');
const result = { kind: 'independent-equation-oracle', implementationImported: false,
  predictionFile: 'docs/gate-4/independent-predictions.json', tolerance,
  analyticCases: prediction.analyticCases.length, checkpoints,
  initialAmbiguityEqual: initialPlus.radius === initialMinus.radius,
  knownPlaneDistinguishesDeclaredPair: knownPlus.kind !== knownMinus.kind,
  movieFrameCount: movieFrames.length, heldOutDistance,
  heldOutScreenDelta: screen(heldOutModel).map((v, i) => v - screen(heldOutStored)[i]),
  status: 'prespecified equations independently verified; no implementation or browser result' };
await writeFile(resolve(base, 'audit/gate-4/oracle-results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
