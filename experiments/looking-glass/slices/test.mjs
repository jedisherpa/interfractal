import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { RUN_ID, DURATION_MS, SAMPLE_MS, CHECKPOINTS_MS, SOURCE_DESCRIPTORS,
  clampTime, sliceAt, fixedProjection, ambiguityAt, movieAngleAt, rotateXW,
  modelAt, sourceState, sliceState, projectionState, movieState, checkpointState } from './model.mjs';

const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) <= tolerance, `${a} ≠ ${b}`);
const dir = dirname(fileURLToPath(import.meta.url));
let checks = 0;
assert.equal(RUN_ID, 'G4-SLICES-002');
assert.deepEqual(SOURCE_DESCRIPTORS.map(v => v.id), ['ball-center', 'ball-plus', 'ball-minus']);
assert.equal(sourceState().descriptors.length, 3); checks++;
for (const sign of [-1, 1]) {
  const center = sliceAt(0); assert.equal(center.kind, 'solid'); close(center.radius, 1);
  const inside = sliceAt(sign * .5); assert.equal(inside.kind, 'solid'); close(inside.radius, Math.sqrt(3) / 2);
  const boundary = sliceAt(sign); assert.equal(boundary.kind, 'point'); assert.equal(boundary.radius, 0);
  const outside = sliceAt(sign * 1.25); assert.equal(outside.kind, 'empty'); assert.equal(outside.radius, null); assert.equal(outside.center3, null);
  assert.equal(sliceAt(sign * (1 - 1e-6)).kind, 'solid');
  assert.equal(sliceAt(sign * (1 + 1e-6)).kind, 'empty'); checks++;
}
assert.throws(() => sliceAt(Infinity));
assert.throws(() => clampTime(NaN));
assert.equal(clampTime(8_049), 8_000); assert.equal(clampTime(8_050), 8_100);
assert.equal(clampTime(-1), 0); assert.equal(clampTime(40_900), DURATION_MS); checks++;
assert.deepEqual(CHECKPOINTS_MS, [0, 8_000, 16_000, 20_000, 24_000, 32_000, 40_000]);
const kinds = CHECKPOINTS_MS.map(t => modelAt(t).slice.kind);
assert.deepEqual(kinds, ['solid', 'solid', 'point', 'empty', 'point', 'solid', 'solid']);
for (const t of CHECKPOINTS_MS) assert.deepEqual(modelAt(t).projection, fixedProjection()); checks++;
const ambiguityInitial = ambiguityAt(0);
const [plus0, minus0] = ambiguityInitial.candidates;
assert.deepEqual(plus0.fixedProjection.center3, minus0.fixedProjection.center3);
assert.equal(plus0.fixedProjection.radius, minus0.fixedProjection.radius);
assert.deepEqual(plus0.fixedProjection.matrix, minus0.fixedProjection.matrix);
close(plus0.initialSlice.radius, minus0.initialSlice.radius);
const [plusAfter, minusAfter] = ambiguityAt(.5).candidates;
assert.equal(plusAfter.selectedSlice.kind, 'solid'); close(plusAfter.selectedSlice.radius, 1);
assert.equal(minusAfter.selectedSlice.kind, 'point'); assert.equal(minusAfter.selectedSlice.radius, 0); checks++;
const q = [0.3, -.4, .2, .5];
for (const theta of [-Math.PI / 2, -.4, 0, .7, Math.PI / 2]) {
  const r = rotateXW(q, theta);
  close(Math.hypot(...r), Math.hypot(...q));
  const restored = rotateXW(r, -theta);
  restored.forEach((n, i) => close(n, q[i]));
} checks++;
for (let index = 0; index <= DURATION_MS / SAMPLE_MS; index++) {
  const t = index * SAMPLE_MS;
  const theta = movieAngleAt(t);
  const external3dFrame = { timeMs: t, center: [-.5 * Math.sin(theta), 0, 0], radius: 1 };
  const s = modelAt(t, { movieFrame: external3dFrame });
  close(s.movie.comparison.centerDistance, 0);
  close(s.movie.comparison.radiusDifference, 0);
  assert.equal(s.movie.stored3dFrame, external3dFrame);
} checks++;
const stored20 = { timeMs: 20_000, center: [-.5, 0, 0], radius: 1 };
const regular20 = modelAt(20_000, { movieFrame: stored20 });
const heldOut = modelAt(20_000, { movieFrame: stored20, movieAngleOverride: -Math.PI / 2 });
close(regular20.movie.comparison.centerDistance, 0);
close(heldOut.movie.comparison.centerDistance, 1);
close(heldOut.movie.sourceProjection.center3[0], .5);
assert.deepEqual(regular20.slice, heldOut.slice);
assert.deepEqual(regular20.projection, heldOut.projection);
assert.equal(heldOut.movie.stored3dFrame, stored20); checks++;
const cameraOnly = modelAt(8_000, { cameraYawOverride: 2 * Math.PI / 3 });
assert.deepEqual(sliceState(cameraOnly), sliceState(modelAt(8_000)));
assert.deepEqual(projectionState(cameraOnly), projectionState(modelAt(8_000)));
assert.deepEqual(movieState(cameraOnly), movieState(modelAt(8_000)));
assert.notDeepEqual(checkpointState(cameraOnly), checkpointState(modelAt(8_000))); checks++;
try {
  const trace = JSON.parse(await readFile(join(dir, 'runs', RUN_ID, 'movie-3d.json'), 'utf8'));
  assert.equal(trace.frames.length, 401);
  assert.deepEqual(Object.keys(trace.frames[0]), ['timeMs', 'center', 'radius']);
  trace.frames.forEach((frame, i) => {
    assert.equal(frame.timeMs, i * SAMPLE_MS);
    assert.equal(frame.radius, 1);
    const s = modelAt(frame.timeMs, { movieFrame: frame });
    close(s.movie.comparison.centerDistance, 0);
  });
  checks++;
} catch (error) { if (error.code !== 'ENOENT') throw error; }
console.log(JSON.stringify({ runId: RUN_ID, testsPassed: checks, status: 'model and trace checks passed' }, null, 2));
