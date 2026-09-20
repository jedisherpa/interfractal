// Exercise the frozen snapshot against independent nonfixture equations.
// audit/gate-4/oracle.mjs remains implementation-free.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runId = process.argv[2] || 'G4-SLICES-001';
const run = JSON.parse(await readFile(resolve(root, `slices/runs/${runId}/run.json`)));
const model = await import(pathToFileURL(resolve(root, `slices/builds/${run.buildId}/model.mjs`)).href);
const trace = JSON.parse(await readFile(resolve(root, `slices/runs/${runId}/movie-3d.json`)));
const close = (a, b) => assert.ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-10,
  `${a} differs from ${b}`);
const vec = (a, b) => { assert.equal(a.length, b.length); a.forEach((v, i) => close(v, b[i])); };
const digest = obj => createHash('sha256').update(JSON.stringify(obj)).digest('hex');
let sliceCases = 0;
for (const c of [0, 0.5, -0.5]) for (const d of [-1.25, -1 - 1e-6, -1, -1 + 1e-6, -.5, 0, .5, 1 - 1e-6, 1, 1 + 1e-6, 1.25]) {
  const s = c + d, u = 1 - d * d, actual = model.sliceAt(s, c);
  assert.equal(actual.kind, u > 0 ? 'solid' : u === 0 ? 'point' : 'empty');
  close(actual.deltaW, d); close(actual.discriminant, u);
  if (u < 0) { assert.equal(actual.radius, null); assert.equal(actual.center3, null); }
  else { close(actual.radius, Math.sqrt(u)); vec(actual.center3, [0, 0, 0]); }
  sliceCases++;
}
for (const bad of [NaN, Infinity, -Infinity]) {
  assert.throws(() => model.sliceAt(bad));
  assert.throws(() => model.sliceAt(0, bad));
  assert.throws(() => model.clampTime(bad));
}
for (const [requested, expected] of [[-100, 0], [8049, 8000], [8050, 8100], [40500, 40000]])
  assert.equal(model.clampTime(requested), expected);
const projectionSha = digest(model.projectionState(model.modelAt(8000)));
const sourceSha = digest(model.sourceState());
let frameCases = 0, maxTraceError = 0;
for (let k = 0; k <= 400; k++) {
  const t = k * 100, h = t <= 20000 ? t / 20000 : (40000 - t) / 20000;
  const expectedS = 1.25 * h, expectedTheta = Math.PI / 2 * h;
  const frame = trace.frames[k], actual = model.modelAt(t, { movieFrame: frame });
  close(actual.slice.levelW, expectedS);
  close(actual.movie.sourceAngleRadians, expectedTheta);
  const expectedCenter = [-.5 * Math.sin(expectedTheta), 0, 0];
  vec(actual.movie.sourceProjection.center3, expectedCenter);
  const error = Math.max(...frame.center.map((v, i) => Math.abs(v - expectedCenter[i])));
  maxTraceError = Math.max(maxTraceError, error);
  assert.equal(actual.movie.stored3dFrame, frame);
  assert.equal(digest(model.sourceState()), sourceSha);
  assert.equal(digest(model.projectionState(actual)), projectionSha);
  frameCases++;
}
const base = model.modelAt(20000, { movieFrame: trace.frames[200] });
const camera = model.modelAt(20000, { cameraYawOverride: 2 * Math.PI / 3, movieFrame: trace.frames[200] });
const slice = model.modelAt(20000, { sliceLevelOverride: -0.5, movieFrame: trace.frames[200] });
const heldOut = model.modelAt(20000, { movieAngleOverride: -Math.PI / 2, movieFrame: trace.frames[200] });
assert.equal(digest(model.sourceState()), sourceSha);
assert.equal(digest(model.sliceState(base)), digest(model.sliceState(camera)));
assert.equal(digest(model.sliceState(base)), digest(model.sliceState(heldOut)));
assert.notEqual(digest(model.sliceState(base)), digest(model.sliceState(slice)));
assert.equal(digest(model.projectionState(base)), digest(model.projectionState(camera)));
assert.equal(digest(model.projectionState(base)), digest(model.projectionState(slice)));
assert.equal(digest(model.projectionState(base)), digest(model.projectionState(heldOut)));
assert.equal(digest(model.movieState(base)), digest(model.movieState(camera)));
assert.equal(digest(model.movieState(base)), digest(model.movieState(slice)));
assert.notEqual(digest(model.movieState(base)), digest(model.movieState(heldOut)));
vec(heldOut.movie.sourceProjection.center3, [0.5, 0, 0]);
vec(heldOut.movie.stored3dFrame.center, [-0.5, 0, 0]);
close(heldOut.movie.comparison.centerDistance, 1);
const ambiguous = model.ambiguityAt(0).candidates;
const known = model.ambiguityAt(.5).candidates;
close(ambiguous[0].selectedSlice.radius, ambiguous[1].selectedSlice.radius);
assert.equal(known[0].selectedSlice.kind, 'solid');
assert.equal(known[1].selectedSlice.kind, 'point');
const optionOpen = model.modelAt(8000, { movieFrame: trace.frames[80], displayOptions: { inspectorOpen: true } });
const optionClosed = model.modelAt(8000, { movieFrame: trace.frames[80] });
assert.notEqual(digest(model.checkpointState(optionOpen)), digest(model.checkpointState(optionClosed)));
assert.equal(digest(model.sliceState(optionOpen)), digest(model.sliceState(optionClosed)));
const result = { kind: 'frozen-model-nonfixture-audit', runId: run.runId, buildId: run.buildId,
  sliceCases, frameCases, maxTraceError, invalidInputCases: 9, seekQuantizationCases: 4,
  isolatedControls: ['ordinary camera', 'primary slice', 'movie angle', 'inspector display option'],
  ambiguityKnownPlane: 'solid versus point', heldOutRaw3DCenterDistance: heldOut.movie.comparison.centerDistance,
  pass: true, scope: 'Frozen model API and trace only; no actual browser control or image result.' };
await writeFile(resolve(root, `audit/gate-4/${runId}-model-audit.json`), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
