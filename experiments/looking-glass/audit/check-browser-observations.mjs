// Checks root's recorded browser observations against frozen Gate 0 checkpoints.
// This does not operate the browser or independently attest how observations were captured.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const experiment = join(dirname(fileURLToPath(import.meta.url)), '..');
const runId = process.argv[2];
if (!/^G0-CUBE-\d{3}$/.test(runId ?? '')) throw new Error('Pass a Gate 0 run ID');
const json = async path => JSON.parse(await readFile(path,'utf8'));
const run = await json(join(experiment,'probe','runs',runId,'run.json'));
const checkpoints = await json(join(experiment,'probe','runs',runId,'checkpoints.json'));
const observations = (await json(join(experiment,'evidence','gate-0','browser-observations.json'))).filter(x=>x.state?.runId === runId);
const byLabel = label => {
  const value = observations.find(x=>x.label===label);
  assert.ok(value,`Missing browser observation ${label}`);
  assert.equal(value.state.buildId,run.buildId);
  return value;
};
const canonicalState = state => {
  const { runId:_runId, buildId:_buildId, playback:_playback, ...geometry } = state;
  return geometry;
};
const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const checkpoint = (label,t) => {
  const value=byLabel(label);
  const reference=checkpoints.find(x=>x.simulationTimeMs===t);
  assert.equal(value.state.simulationTimeMs,t,label);
  assert.equal(value.state.playback.playing,false,label);
  assert.equal(value.state.playback.mode,'saved-run',label);
  assert.deepEqual(canonicalState(value.state),reference.state,label);
  assert.equal(sha256(canonicalState(value.state)),reference.stateSha256,label);
  return value;
};

const s0=checkpoint('S0-initial',0);
const s1=checkpoint('S1-midpoint',10_000);
checkpoint('S2-final',20_000);
const s3=checkpoint('S3-replay-midpoint',10_000);
assert.deepEqual(canonicalState(s1.state),canonicalState(s3.state),'replayed midpoint state');
assert.deepEqual(s1.diagnostics.viewport,s3.diagnostics.viewport,'same viewport for screenshot comparison');
assert.equal(s0.diagnostics.rendererUsed,'SVG 2D projected from computed 3D points');
const pause1=byLabel('midplay-pause-first-reading');
const pause2=byLabel('midplay-pause-second-reading');
assert.equal(pause1.state.playback.playing,false);
assert.equal(pause2.state.playback.playing,false);
assert.deepEqual(canonicalState(pause1.state),canonicalState(pause2.state),'paused state drift');
assert.ok(Date.parse(pause2.wallTimestamp)-Date.parse(pause1.wallTimestamp) >= 1000,'pause readings at least 1 second apart');
assert.equal(byLabel('keyboard-step-1000').state.simulationTimeMs,1000);
assert.equal(byLabel('look-around-intended-120').state.playback.mode,'exploration');
assert.ok(Math.abs(byLabel('look-around-intended-120').state.camera.yaw-2*Math.PI/3) < 1e-10);
checkpoint('exploration-reset',0);
checkpoint('run-library-open-paused',0);
checkpoint('reload-open-paused',0);
const final=byLabel('natural-replay-completed');
assert.equal(final.state.simulationTimeMs,20_000);
assert.equal(final.state.playback.playing,false);
console.log(JSON.stringify({result:'pass',runId,buildId:run.buildId,observations:observations.length,
  checks:['original browser states match canonical 0/10/20 seconds and exact hashes','midpoint replay equals original with same viewport','pause stable beyond 1s','Step +1000ms','120-degree exploration and reset','Run Library/reload open paused','natural replay completes paused'],
  screenshotFiles:[s0.screenshot,s1.screenshot,byLabel('S2-final').screenshot,s3.screenshot]},null,2));
