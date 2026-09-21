import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCE, EDGES, RUN_ID, CHECKPOINTS_MS, CAMERA, MARKED_PAIR, modelAt, angleAt, rotateSource, geometryState, canonicalState } from './model.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const calibrationDir = basename(dirname(dir)) === 'builds' ? resolve(dir, '../..') : dir;
const experimentDir = resolve(calibrationDir, '..');
const runDir = join(calibrationDir, 'runs', RUN_ID);
const run = JSON.parse(await readFile(join(runDir, 'run.json'), 'utf8'));
const checkpoints = JSON.parse(await readFile(join(runDir, 'checkpoints.json'), 'utf8'));
const expected = JSON.parse(await readFile(join(experimentDir, 'docs/gate-1/independent-predictions.json'), 'utf8'));
const sha256 = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : canonicalState(value)).digest('hex');
const near = (actual, target) => assert.ok(Math.abs(actual - target) < 1e-10, `${actual} ≠ ${target}`);
const vectorNear = (actual, target) => { assert.equal(actual.length, target.length); actual.forEach((value, i) => near(value, target[i])); };
const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));
const key = ids => [...ids].sort().join('|');

assert.equal(SOURCE.length, 8);
assert.equal(new Set(SOURCE.map(v => v.id)).size, 8);
assert.equal(EDGES.length, 12);
assert.equal(new Set(EDGES.map(e => e.id)).size, 12);
assert.deepEqual(SOURCE, expected.sourceVertices.map(v => ({ id: v.id, q: v.xyz })));
assert.deepEqual(EDGES, expected.sourceEdges);
assert.deepEqual(MARKED_PAIR, ['v110', 'v111']);
assert.deepEqual(CHECKPOINTS_MS, [0, 10_000, 20_000, 30_000, 40_000]);
assert.equal(run.runId, RUN_ID);
assert.equal(run.baseRevision, '6fb4ecbd516aa9a9dc23710c7ffcda4e8c65b819');
assert.equal(run.buildId, `g1-${run.sourceSha256.slice(0, 16)}`);
assert.equal(run.eventsKind, 'planned deterministic fixture, not observed browser controls');
assert.equal(checkpoints.length, 5);
near(CAMERA.yaw, Math.PI / 6);
near(CAMERA.pitch, Math.PI / 9);

for (const [index, prediction] of expected.checkpoints.entries()) {
  const timeMs = prediction.simulationTimeMs;
  const state = modelAt(timeMs);
  near(angleAt(timeMs), prediction.sourceAngleRadians);
  near(state.camera.yaw, prediction.cameraYawRadians);
  near(state.camera.pitch, prediction.cameraPitchRadians);
  near(state.pairSourceDistance, prediction.trackedPairSourceDistance);
  near(state.pairShadowDistance, prediction.trackedPairShadowDistance);
  assert.equal(state.vertices.length, 8);
  assert.equal(state.edges.length, 12);
  assert.equal(state.shadowSites.length, prediction.distinctShadowSiteCount);
  assert.deepEqual(state.edges.filter(e => e.shadowCollapsed).map(e => e.id), prediction.collapsedSourceEdgeIds);
  assert.equal(state.nonzeroShadowSegments.length, prediction.nonzeroShadowSegments.length);
  const byId = Object.fromEntries(state.vertices.map(v => [v.id, v]));
  for (const vertex of prediction.vertices) {
    const actual = byId[vertex.id];
    vectorNear(actual.originalSource, vertex.originalSource);
    vectorNear(actual.rotatedSource, vertex.rotatedSource);
    vectorNear(actual.shadow, vertex.shadow);
    vectorNear(actual.cameraCoordinates, vertex.displayCamera);
    vectorNear(actual.screen, vertex.sourceViewScreen);
    near(distance(actual.rotatedSource, [0, 0, 0]), Math.sqrt(3));
  }
  for (const edge of state.edges) near(distance(byId[edge.from].rotatedSource, byId[edge.to].rotatedSource), 2);
  for (let i = 0; i < state.vertices.length; i++) for (let j = i + 1; j < state.vertices.length; j++)
    near(distance(state.vertices[i].originalSource, state.vertices[j].originalSource), distance(state.vertices[i].rotatedSource, state.vertices[j].rotatedSource));
  for (const site of prediction.shadowSites) {
    const actual = state.shadowSites.find(value => key(value.sourceIds) === key(site.sourceIds));
    assert.ok(actual, `Missing shadow site ${key(site.sourceIds)}`);
    vectorNear(actual.xy, site.xy);
    assert.equal(actual.multiplicity, site.multiplicity);
  }
  for (const segment of prediction.nonzeroShadowSegments) {
    const actual = state.nonzeroShadowSegments.find(value => key(value.sourceEdgeIds) === key(segment.sourceEdgeIds));
    assert.ok(actual, `Missing segment ${key(segment.sourceEdgeIds)}`);
    assert.equal(actual.multiplicity, segment.multiplicity);
    const same = actual.endpoints.every((point, i) => distance(point, segment.endpoints[i]) < 1e-10);
    const reverse = actual.endpoints.every((point, i) => distance(point, segment.endpoints[1 - i]) < 1e-10);
    assert.ok(same || reverse, `Segment endpoints mismatch: ${key(segment.sourceEdgeIds)}`);
  }
  assert.deepEqual(state, checkpoints[index].state);
  assert.equal(sha256(state), checkpoints[index].stateSha256);
  assert.equal(sha256(geometryState(state)), checkpoints[index].geometrySha256);
}
assert.equal(sha256(modelAt(0)), run.initialStateHash);
assert.equal(sha256(geometryState(modelAt(0))), sha256(geometryState(modelAt(40_000))));
assert.notEqual(sha256(modelAt(0)), sha256(modelAt(40_000)));
assert.equal(sha256(geometryState(modelAt(10_000))), sha256(geometryState(modelAt(10_000, { cameraYawOverride: 2 * Math.PI / 3 }))));
assert.notDeepEqual(modelAt(10_000).vertices.map(v => v.screen), modelAt(10_000, { cameraYawOverride: 2 * Math.PI / 3 }).vertices.map(v => v.screen));
near(modelAt(10_000, { sourceAngleOverride: Math.PI / 6 }).pairShadowDistance, 1);
near(modelAt(10_000, { sourceAngleOverride: Math.PI / 6 }).camera.yaw, CAMERA.yaw);
for (const degrees of [0, 15, 45, 90]) for (const vertex of SOURCE)
  vectorNear(rotateSource(rotateSource(vertex.q, degrees * Math.PI / 180), -degrees * Math.PI / 180), vertex.q);
assert.equal(modelAt(1000).simulationTimeMs, 1000);
assert.equal(modelAt(40_000).simulationTimeMs, 40_000);

const buildDir = join(calibrationDir, 'builds', run.buildId);
const build = JSON.parse(await readFile(join(buildDir, 'build.json'), 'utf8'));
const digest = createHash('sha256');
for (const entry of build.sourceFiles) {
  const bytes = await readFile(join(buildDir, entry.path));
  assert.equal(sha256(bytes), entry.sha256);
  digest.update(entry.path); digest.update('\0'); digest.update(bytes); digest.update('\0');
}
assert.equal(digest.digest('hex'), run.sourceSha256);
const runPath = join(runDir, 'run.json');
const before = { hash: sha256(await readFile(runPath)), modified: (await stat(runPath)).mtimeMs };
if (dir === calibrationDir) {
  const repeat = spawnSync(process.execPath, [join(dir, 'build.mjs')], { encoding: 'utf8' });
  assert.equal(repeat.status, 0, repeat.stderr);
}
assert.deepEqual({ hash: sha256(await readFile(runPath)), modified: (await stat(runPath)).mtimeMs }, before);
console.log(`PASS ${RUN_ID}: 5 independent checkpoints, 8 vertices, 12 edges, overlap multiplicity, inverse and camera/source isolation, frozen build/run`);
