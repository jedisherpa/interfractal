// Check root's actual browser records. This script does not operate a browser.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, '../..');
const runId = 'G1-CUBE-003';
const runDir = join(project, 'calibration/runs', runId);
const run = JSON.parse(readFileSync(join(runDir, 'run.json')));
const checkpoints = JSON.parse(readFileSync(join(runDir, 'checkpoints.json')));
const evidenceDir = join(project, 'evidence/gate-1');
const record = JSON.parse(readFileSync(join(evidenceDir, 'browser-observations.json')));
const observations = record.observations;
const model = await import(pathToFileURL(join(project, 'calibration/builds', run.buildId, 'model.mjs')).href);
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const checks = [];
const tol = 1e-10;
function check(name, work) {
  try { work(); checks.push({ name, status: 'pass' }); }
  catch (error) { checks.push({ name, status: 'fail', detail: error.message }); }
}
function near(a, b, label) { assert.ok(Number.isFinite(a) && Math.abs(a - b) <= tol, `${label}: got ${a}, expected ${b}`); }
function vector(a, b, label) { assert.equal(a.length, b.length, `${label} length`); a.forEach((n, i) => near(n, b[i], `${label}[${i}]`)); }
function byLabel(label) {
  const found = observations.find(item => item.label === label);
  assert.ok(found, `Missing observation ${label}`);
  return found;
}
function core(state) {
  const { runId: _run, buildId: _build, stateSha256: _stateHash, geometrySha256: _geometryHash,
    shadowGroups: _groups, playback: _playback, ...canonical } = state;
  return canonical;
}
function checkpoint(label, time) {
  const item = byLabel(label);
  const expected = checkpoints.find(c => c.simulationTimeMs === time);
  assert.equal(item.state.simulationTimeMs, time, label);
  assert.deepEqual(item.state.playback, { playing: false, mode: 'saved-run' }, label);
  assert.deepEqual(core(item.state), expected.state, label);
  assert.equal(item.state.stateSha256, expected.stateSha256, label);
  assert.equal(item.state.geometrySha256, expected.geometrySha256, label);
  return item;
}

check('browser record provenance and all 26 inspector states self-hash', () => {
  assert.equal(record.runId, runId);
  assert.equal(record.actor, 'browser-automation');
  assert.equal(observations.length, 26);
  assert.equal(new Set(observations.map(item => item.label)).size, observations.length);
  for (const item of observations) {
    assert.equal(item.actor, 'browser-automation', item.label);
    assert.ok(Number.isFinite(Date.parse(item.wallTimestamp)), `${item.label} timestamp`);
    assert.equal(item.state.runId, runId, item.label);
    assert.equal(item.state.buildId, run.buildId, item.label);
    assert.equal(item.diagnostics.runId, runId, item.label);
    assert.equal(item.diagnostics.buildId, run.buildId, item.label);
    assert.equal(item.diagnostics.rendererUsed, 'SVG 2D projected from computed 3D points', item.label);
    assert.equal(item.diagnostics.activityActor, 'unspecified-ui', item.label);
    assert.equal(item.state.stateSha256, sha(core(item.state)), `${item.label} state SHA-256`);
    assert.equal(item.state.geometrySha256, sha(model.geometryState(core(item.state))), `${item.label} geometry SHA-256`);
    assert.ok(item.viewport.width > 0 && item.viewport.height > 0, `${item.label} viewport`);
    if (item.state.playback.mode === 'saved-run')
      assert.deepEqual(core(item.state), model.modelAt(item.state.simulationTimeMs), `${item.label} exact canonical state`);
  }
});
check('all five browser checkpoints match saved fixture exactly', () => {
  checkpoint('initial-0s', 0);
  checkpoint('checkpoint-10000', 10000);
  checkpoint('checkpoint-20000', 20000);
  checkpoint('checkpoint-30000', 30000);
  checkpoint('checkpoint-40000', 40000);
  assert.equal(byLabel('initial-0s').state.geometrySha256, byLabel('checkpoint-40000').state.geometrySha256,
    'source-return geometry; full state time differs');
  assert.notEqual(byLabel('initial-0s').state.stateSha256, byLabel('checkpoint-40000').state.stateSha256,
    'full state includes simulation time');
});
check('pause holds coordinates beyond two wall seconds; step and end clamp', () => {
  const a = byLabel('paused-A'), b = byLabel('paused-B');
  assert.equal(a.state.playback.playing, false);
  assert.equal(b.state.playback.playing, false);
  assert.ok(Date.parse(b.wallTimestamp) - Date.parse(a.wallTimestamp) >= 2000, 'pause hold >= 2 s');
  assert.deepEqual(core(a.state), core(b.state), 'paused model drift');
  assert.equal(byLabel('step-plus-1s').state.simulationTimeMs, a.state.simulationTimeMs + 1000);
  assert.equal(byLabel('step-at-end').state.simulationTimeMs, 40000);
  assert.equal(byLabel('scrub-15000').state.simulationTimeMs, 15000);
  checkpoint('reset-0', 0);
});
check('camera-only intervention preserves exact geometry and changes only display view', () => {
  const before = checkpoint('checkpoint-10000', 10000).state;
  const after = byLabel('camera-only-120').state;
  assert.deepEqual(after.playback, { playing: false, mode: 'exploration' });
  near(after.sourceRotation.theta, Math.PI / 4, 'theta');
  near(after.camera.yaw, 2 * Math.PI / 3, 'yaw');
  near(after.camera.pitch, Math.PI / 9, 'pitch');
  assert.equal(after.geometrySha256, before.geometrySha256);
  assert.notEqual(after.stateSha256, before.stateSha256);
  let changed = 0;
  for (let i = 0; i < 8; i++) {
    const a = after.vertices[i], b = before.vertices[i];
    assert.equal(a.id, b.id);
    for (const field of ['originalSource', 'rotatedSource', 'shadow']) vector(a[field], b[field], `${a.id}/${field}`);
    if (a.screen.some((value, j) => Math.abs(value - b.screen[j]) > tol)) changed++;
  }
  assert.ok(changed > 0, 'source view changed');
  checkpoint('restored-after-camera', 10000);
});
check('source-only intervention changes shadow at fixed camera and restores', () => {
  const before = checkpoint('checkpoint-10000', 10000).state;
  const after = byLabel('source-only-30').state;
  assert.deepEqual(after.playback, { playing: false, mode: 'exploration' });
  near(after.sourceRotation.theta, Math.PI / 6, 'source theta');
  near(after.camera.yaw, before.camera.yaw, 'yaw retained');
  near(after.camera.pitch, before.camera.pitch, 'pitch retained');
  near(after.pairShadowDistance, 1, 'shadow distance');
  assert.notEqual(after.geometrySha256, before.geometrySha256);
  const byId = Object.fromEntries(after.vertices.map(v => [v.id, v]));
  vector(byId.v110.rotatedSource, [1.3660254037844386, 1, -0.3660254037844386], 'v110 rotated');
  vector(byId.v111.rotatedSource, [0.3660254037844386, 1, 1.3660254037844386], 'v111 rotated');
  checkpoint('restored-after-source', 10000);
});
check('uninterrupted 40-second replay ends at saved source return', () => {
  const start = byLabel('full-replay-start'), running = byLabel('full-replay-running');
  const returning = checkpoint('full-replay-returning', 40000);
  const ended = checkpoint('full-replay-ended', 40000);
  assert.equal(start.state.playback.playing, true);
  assert.equal(running.state.playback.playing, true);
  assert.ok(running.state.simulationTimeMs > start.state.simulationTimeMs);
  assert.equal(returning.state.stateSha256, ended.state.stateSha256);
  assert.ok(Date.parse(ended.wallTimestamp) - Date.parse(start.wallTimestamp) >= 30000, 'playback duration evidence');
});
check('Run Library and page reload open paused zero and reproduce midpoint', () => {
  checkpoint('library-open-paused', 0);
  checkpoint('library-midpoint', 10000);
  checkpoint('reload-open-paused', 0);
  checkpoint('reload-midpoint', 10000);
  checkpoint('checkpoint-0-final', 0);
  assert.notEqual(byLabel('initial-0s').diagnostics.uiSessionId, byLabel('reload-open-paused').diagnostics.uiSessionId,
    'reload creates new UI session');
  assert.deepEqual(core(byLabel('checkpoint-10000').state), core(byLabel('reload-midpoint').state),
    'reopened model checkpoint');
});
check('actual activity log has ordered session events and matching intervention evidence', () => {
  const activity = readFileSync(join(runDir, 'activity.jsonl'), 'utf8').trimEnd().split('\n').map(JSON.parse);
  assert.ok(activity.length >= 23, 'at least observed 23 semantic events');
  const bySession = new Map();
  for (const event of activity) {
    assert.equal(event.kind, 'observed-ui');
    assert.equal(event.actor, 'unspecified-ui');
    assert.equal(event.runId, runId);
    assert.equal(event.buildId, run.buildId);
    assert.ok(Number.isFinite(Date.parse(event.wallTimestamp)), 'event wall timestamp');
    assert.ok(event.intended && event.before && event.observed, 'event fields');
    assert.equal(event.previousSimulationTimeMs, event.before.simulationTimeMs);
    assert.equal(event.observedSimulationTimeMs, event.observed.simulationTimeMs);
    const previous = bySession.get(event.sessionId) || 0;
    assert.equal(event.sequence, previous + 1, `${event.sessionId} sequence`);
    bySession.set(event.sessionId, event.sequence);
  }
  assert.ok(bySession.size >= 2, 'reload session');
  for (const [label, type] of [['initial-0s', 'replay.open'], ['step-plus-1s', 'playback.step'],
    ['camera-only-120', 'camera.set'], ['source-only-30', 'source.rotation.set'],
    ['scrub-15000', 'playback.seek'], ['reset-0', 'calibration.reset'],
    ['reload-open-paused', 'replay.open']]) {
    const state = byLabel(label).state;
    assert.ok(activity.some(event => event.type === type && event.sessionId === byLabel(label).diagnostics.uiSessionId
      && event.observed.stateSha256 === state.stateSha256 && event.observed.geometrySha256 === state.geometrySha256),
    `${label} missing matching ${type} event`);
  }
  assert.ok(activity.some(event => event.type === 'playback.pause' && event.observed.simulationTimeMs === 40000),
    'automatic end pause');
});
check('capture files and console record are present with bounded provenance', () => {
  const captures = JSON.parse(readFileSync(join(evidenceDir, 'capture-index.json'))).captures;
  assert.equal(captures.length, 7, 'seven indexed actual captures');
  for (const capture of captures) {
    const bytes = readFileSync(join(evidenceDir, capture.path));
    assert.equal(bytes[0], 0xff, `${capture.path} JPEG`);
    assert.equal(bytes[1], 0xd8, `${capture.path} JPEG`);
    assert.equal(bytes[bytes.length - 2], 0xff, `${capture.path} JPEG end`);
    assert.equal(bytes[bytes.length - 1], 0xd9, `${capture.path} JPEG end`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), capture.sha256, `${capture.path} SHA-256`);
    assert.equal(capture.runId, runId, `${capture.path} run`);
    assert.equal(capture.buildId, run.buildId, `${capture.path} build`);
    const observed = byLabel(capture.label);
    assert.equal(capture.stateSha256, observed.state.stateSha256, `${capture.path} state`);
    assert.equal(capture.simulationTimeMs, observed.state.simulationTimeMs, `${capture.path} time`);
    assert.deepEqual(capture.viewport, observed.viewport, `${capture.path} viewport`);
  }
  const consoleRecord = JSON.parse(readFileSync(join(evidenceDir, 'browser-console.json')));
  assert.equal(consoleRecord.entries.length, 0, 'recorded warnings/errors in specified tab/scope');
});

const activityForLimitations = readFileSync(join(runDir, 'activity.jsonl'), 'utf8').trimEnd().split('\n').map(JSON.parse);
const endPause = activityForLimitations.find(event => event.type === 'playback.pause' && event.observed.simulationTimeMs === 40000);
const contractLimitations = [];
if (endPause && !('origin' in endPause) && !('automatic' in endPause) && !('trigger' in endPause))
  contractLimitations.push({ id: 'automatic-pause-origin', status: 'recording-contract-deviation',
    requirement: 'Automatic playback events are identified as such.',
    observed: 'The t=40000 playback.pause event has no automatic/manual origin discriminator.',
    implication: 'External root control trace and browser states support auto-stop in this trial; raw in-app activity alone cannot establish its origin.' });
const result = { schema: 'looking-glass-gate-1-browser-audit-v1', generatedAtUtc: new Date().toISOString(),
  scope: 'Independent checks of root-recorded DOM inspector states, activity log and original image files; no browser controls performed by auditor',
  runId, buildId: run.buildId, observationCount: observations.length,
  screenshots: JSON.parse(readFileSync(join(evidenceDir, 'capture-index.json'))).captures.map(item => item.path),
  contractLimitations, checks, passed: checks.filter(item => item.status === 'pass').length,
  failed: checks.filter(item => item.status === 'fail').length };
writeFileSync(join(here, `${runId}-browser-audit.json`), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ runId, buildId: run.buildId, observations: observations.length,
  passed: result.passed, failed: result.failed, failures: checks.filter(item => item.status === 'fail') }, null, 2));
if (result.failed) process.exitCode = 1;
