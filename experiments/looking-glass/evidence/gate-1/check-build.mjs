// Audit an immutable Gate 1 snapshot against the separately checked prespec.
// Usage: node audit/gate-1/check-build.mjs [G1-CUBE-001]
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, '../..');
const runId = process.argv[2] || 'G1-CUBE-001';
const runDir = join(project, 'calibration/runs', runId);
const run = JSON.parse(readFileSync(join(runDir, 'run.json')));
const buildDir = join(project, 'calibration/builds', run.buildId);
const build = JSON.parse(readFileSync(join(buildDir, 'build.json')));
const frozen = JSON.parse(readFileSync(join(project, 'docs/gate-1/independent-predictions.json')));
const g0 = JSON.parse(readFileSync(join(project, 'evidence/gate-0/GATE_0_FREEZE.json')));
const model = await import(pathToFileURL(join(buildDir, 'model.mjs')).href);
const tolerance = 1e-10;
const checks = [];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const jsha = value => sha(JSON.stringify(value));
const load = path => readFileSync(path);
function check(name, fn) {
  try { fn(); checks.push({ name, status: 'pass' }); }
  catch (error) { checks.push({ name, status: 'fail', detail: error.message }); }
}
function near(a, b, label) {
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= tolerance, `${label}: got ${a}, expected ${b}`);
}
function vector(a, b, label) {
  assert.equal(a.length, b.length, `${label} length`);
  a.forEach((x, i) => near(x, b[i], `${label}[${i}]`));
}
function compareVertices(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label} vertex count`);
  for (let i = 0; i < actual.length; i++) {
    assert.equal(actual[i].id, expected[i].id, `${label} vertex ${i}`);
    vector(actual[i].originalSource, expected[i].originalSource, `${label}/${actual[i].id}/original`);
    vector(actual[i].rotatedSource, expected[i].rotatedSource, `${label}/${actual[i].id}/rotated`);
    vector(actual[i].shadow, expected[i].shadow, `${label}/${actual[i].id}/shadow`);
    vector(actual[i].cameraCoordinates, expected[i].displayCamera, `${label}/${actual[i].id}/camera`);
    vector(actual[i].screen, expected[i].sourceViewScreen, `${label}/${actual[i].id}/source screen`);
  }
}
function groupKey(xy) { return xy.map(n => Math.abs(n) <= tolerance ? '0' : String(Math.round(n / tolerance))).join(','); }
function compareSites(actual, expected, label) {
  const byKey = new Map(actual.map(site => [groupKey(site.xy), site]));
  assert.equal(actual.length, expected.length, `${label} site count`);
  assert.equal(byKey.size, actual.length, `${label} unique sites`);
  for (const item of expected) {
    const found = byKey.get(groupKey(item.xy));
    assert.ok(found, `${label} missing site ${item.xy}`);
    vector(found.xy, item.xy, `${label} site position`);
    assert.deepEqual(found.sourceIds, item.sourceIds, `${label} IDs at ${item.xy}`);
    assert.equal(found.multiplicity, item.multiplicity, `${label} multiplicity at ${item.xy}`);
  }
}
function segmentKey(points) { return points.map(groupKey).sort().join('|'); }
function compareSegments(actual, expected, label) {
  const byKey = new Map(actual.map(item => [segmentKey(item.endpoints), item]));
  assert.equal(actual.length, expected.length, `${label} segment count`);
  assert.equal(byKey.size, actual.length, `${label} unique segments`);
  for (const item of expected) {
    const found = byKey.get(segmentKey(item.endpoints));
    assert.ok(found, `${label} missing segment ${JSON.stringify(item.endpoints)}`);
    assert.deepEqual(found.sourceEdgeIds, item.sourceEdgeIds, `${label} edge IDs`);
    assert.equal(found.multiplicity, item.multiplicity, `${label} multiplicity`);
  }
}

check('build manifest identifies exact immutable source bytes', () => {
  assert.equal(run.runId, runId);
  assert.equal(build.buildId, run.buildId);
  assert.equal(run.sourceSha256, build.sourceSha256);
  const digest = createHash('sha256');
  for (const file of build.sourceFiles) {
    assert.ok(!file.path.includes('/') && !file.path.includes('..'), 'source path must be local filename');
    const bytes = load(join(buildDir, file.path));
    assert.equal(sha(bytes), file.sha256, file.path);
    digest.update(file.path); digest.update('\0'); digest.update(bytes); digest.update('\0');
  }
  assert.equal(digest.digest('hex'), build.sourceSha256);
  assert.equal(run.buildId, `g1-${build.sourceSha256.slice(0, 16)}`);
  assert.equal(run.baseRevision, '6fb4ecbd516aa9a9dc23710c7ffcda4e8c65b819');
  assert.match(build.dependencyIdentity, /node-builtins-only/);
});
check('all 61 frozen Gate 0 files retain their hashes', () => {
  assert.equal(g0.files.length, 61);
  for (const file of g0.files) assert.equal(sha(load(join(project, file.path))), file.sha256, file.path);
});
check('source graph and canonical fixture identity', () => {
  assert.equal(run.gate, 'G1');
  assert.equal(run.model.dimension, 3);
  assert.equal(run.model.seed, null);
  assert.equal(run.durationMs, 40000);
  assert.equal(run.stepMs, 1000);
  assert.deepEqual(run.checkpointTimesMs, [0, 10000, 20000, 30000, 40000]);
  assert.equal(run.eventsKind, 'planned deterministic fixture, not observed browser controls');
  assert.deepEqual(run.model.vertices.map(v => ({ id: v.id, xyz: v.q })), frozen.sourceVertices);
  assert.deepEqual(run.model.edges, frozen.sourceEdges);
  assert.deepEqual(run.model.selectedVertexIds, ['v110', 'v111']);
});
const checkpoints = JSON.parse(load(join(runDir, run.checkpointsFile)));
check('canonical fixture state hashes and all five prespecified checkpoints', () => {
  assert.equal(checkpoints.length, 5);
  for (let i = 0; i < 5; i++) {
    const actual = checkpoints[i], expected = frozen.checkpoints[i], state = actual.state;
    assert.equal(actual.simulationTimeMs, expected.simulationTimeMs);
    assert.equal(state.simulationTimeMs, expected.simulationTimeMs);
    near(state.sourceRotation.theta, expected.sourceAngleRadians, `${i} theta`);
    near(state.camera.yaw, expected.cameraYawRadians, `${i} yaw`);
    near(state.camera.pitch, expected.cameraPitchRadians, `${i} pitch`);
    assert.equal(state.sourceDimension, 3);
    assert.equal(state.sourceObject, 'ordinary-3d-wire-cube');
    compareVertices(state.vertices, expected.vertices, `checkpoint ${i}`);
    near(state.pairSourceDistance, expected.trackedPairSourceDistance, `${i} source distance`);
    near(state.pairShadowDistance, expected.trackedPairShadowDistance, `${i} shadow distance`);
    compareSites(state.shadowSites, expected.shadowSites, `checkpoint ${i}`);
    assert.deepEqual(state.edges.filter(edge => edge.shadowCollapsed).map(edge => edge.id), expected.collapsedSourceEdgeIds);
    compareSegments(state.nonzeroShadowSegments, expected.nonzeroShadowSegments, `checkpoint ${i}`);
    assert.equal(actual.stateSha256, jsha(state), `${i} state hash`);
    assert.equal(actual.geometrySha256, jsha(model.geometryState(state)), `${i} geometry hash`);
    assert.equal(jsha(model.modelAt(expected.simulationTimeMs)), actual.stateSha256, `${i} snapshot model state`);
  }
  assert.equal(run.initialStateHash, checkpoints[0].stateSha256);
  assert.equal(run.initialGeometryHash, checkpoints[0].geometrySha256);
  assert.equal(checkpoints[0].geometrySha256, checkpoints[4].geometrySha256, 'source return geometry hash');
  assert.notEqual(checkpoints[0].stateSha256, checkpoints[4].stateSha256, 'time distinguishes full state');
});
check('initial state and planned events are labeled fixture, not browser evidence', () => {
  const initial = JSON.parse(load(join(runDir, run.initialStateFile)));
  assert.deepEqual(initial, checkpoints[0]);
  const events = load(join(runDir, run.eventsFile)).toString('utf8').trimEnd().split('\n').map(JSON.parse);
  assert.equal(events.length, 7);
  assert.deepEqual(events.map(event => event.sequence), [1, 2, 3, 4, 5, 6, 7]);
  for (const event of events) {
    assert.equal(event.kind, 'planned-fixture');
    assert.equal(event.actor, 'fixture-generator');
    assert.equal(event.wallTimestamp, null);
  }
});
check('exact snapshot: inverse and off-checkpoint camera/source interventions', () => {
  for (const degrees of [0, 15, 45, 90]) for (const vertex of frozen.sourceVertices) {
    const angle = degrees * Math.PI / 180;
    vector(model.rotateSource(model.rotateSource(vertex.xyz, angle), -angle), vertex.xyz, `${vertex.id}@${degrees}`);
  }
  const before = model.modelAt(10000);
  const cameraOnly = model.modelAt(10000, { cameraYawOverride: 2 * Math.PI / 3 });
  assert.equal(jsha(model.geometryState(cameraOnly)), jsha(model.geometryState(before)), 'camera-only geometry hash');
  assert.notEqual(jsha(cameraOnly), jsha(before), 'camera-only full state hash');
  compareVertices(cameraOnly.vertices.map((v, i) => ({ ...v,
    cameraCoordinates: before.vertices[i].cameraCoordinates, screen: before.vertices[i].screen })),
  frozen.checkpoints[1].vertices, 'camera-only source and shadow');
  assert.ok(cameraOnly.vertices.some((v, i) => v.screen.some((n, j) => Math.abs(n - before.vertices[i].screen[j]) > tolerance)), 'source screen changed');
  const sourceOnly = model.modelAt(10000, { sourceAngleOverride: Math.PI / 6 });
  near(sourceOnly.pairShadowDistance, 1, 'source-only shadow distance');
  near(sourceOnly.camera.yaw, Math.PI / 6, 'source-only yaw');
  near(sourceOnly.camera.pitch, Math.PI / 9, 'source-only pitch');
  vector(sourceOnly.vertices.find(v => v.id === 'v110').rotatedSource, frozen.counterfactuals.sourceOnlyAt10000.v110Rotated, 'source-only v110');
  vector(sourceOnly.vertices.find(v => v.id === 'v111').rotatedSource, frozen.counterfactuals.sourceOnlyAt10000.v111Rotated, 'source-only v111');
});
check('fixed orthographic pane mapping and simulation clamping', () => {
  for (const checkpoint of checkpoints) {
    const state = checkpoint.state;
    assert.deepEqual(state.paneMapping.source.viewBox, [0, 0, 500, 360]);
    assert.deepEqual(state.paneMapping.shadow.viewBox, [0, 0, 500, 360]);
    assert.equal(state.fixedScalePxPerUnit, 95);
  }
  assert.equal(model.clampTime(-1), 0);
  assert.equal(model.clampTime(40001), 40000);
  assert.equal(model.clampTime(10000.4), 10000);
  assert.equal(model.clampTime(10000.6), 10001);
});

const canonical = ['run.json', run.initialStateFile, run.eventsFile, run.checkpointsFile];
const canonicalFiles = canonical.map(path => ({ path: `calibration/runs/${runId}/${path}`, sha256: sha(load(join(runDir, path))) }));
const result = { schema: 'looking-glass-gate-1-build-audit-v1', generatedAtUtc: new Date().toISOString(),
  scope: 'Exact preserved build/run bytes and independent numeric expectations; browser observations audited separately',
  runId, buildId: run.buildId, sourceSha256: build.sourceSha256, canonicalFiles,
  checks, passed: checks.filter(item => item.status === 'pass').length,
  failed: checks.filter(item => item.status === 'fail').length };
writeFileSync(join(here, `${runId}-build-audit.json`), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ runId, buildId: run.buildId, passed: result.passed, failed: result.failed,
  failures: checks.filter(item => item.status === 'fail') }, null, 2));
if (result.failed) process.exitCode = 1;
