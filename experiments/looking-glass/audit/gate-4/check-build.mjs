// Audit a frozen candidate's bytes and generated numerical records.
// Analytic comparisons below are derived directly; no implementation import.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runId = process.argv[2] || 'G4-SLICES-001';
const runDir = resolve(root, 'slices/runs', runId);
const read = async path => JSON.parse(await readFile(path));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-10;
const vec = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((n, i) => near(n, b[i]));
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), ...(detail === undefined ? {} : { detail }) });
const [run, prediction, freezeBytes] = await Promise.all([
  read(resolve(runDir, 'run.json')),
  read(resolve(root, 'docs/gate-4/independent-predictions.json')),
  readFile(resolve(root, 'docs/gate-4/PRESPEC_FREEZE.json'))
]);
const buildDir = resolve(root, 'slices/builds', run.buildId);
const [build, checkpoints, initial, traceBytes, plannedText] = await Promise.all([
  read(resolve(buildDir, 'build.json')),
  read(resolve(runDir, 'checkpoints.json')),
  read(resolve(runDir, 'initial-state.json')),
  readFile(resolve(runDir, 'movie-3d.json')),
  readFile(resolve(runDir, 'events.jsonl'), 'utf8')
]);
const freeze = JSON.parse(freezeBytes);
check('prespec freeze byte and four file hashes',
  sha(freezeBytes) === 'da6838373c450bef6cd657f12b29395001a81b4fec1aac97ceb99e7f3a298a15' &&
  sha(freezeBytes) === run.prespecFreezeSha256 && sha(freezeBytes) === build.prespecFreezeSha256 &&
  freeze.files.length === 4 && (await Promise.all(freeze.files.map(async file => {
    const bytes = await readFile(resolve(root, file.path));
    return bytes.length === file.bytes && sha(bytes) === file.sha256;
  }))).every(Boolean));
const digest = createHash('sha256');
const sourceChecks = [];
for (const file of build.sourceFiles) {
  const bytes = await readFile(resolve(buildDir, file.path));
  sourceChecks.push({ path: file.path, pass: bytes.length === file.bytes && sha(bytes) === file.sha256 });
  digest.update(file.path); digest.update('\0'); digest.update(bytes); digest.update('\0');
}
const sourceSha256 = digest.digest('hex');
check('immutable source manifest and content-derived build identity',
  sourceChecks.length === 8 && sourceChecks.every(file => file.pass) &&
  sourceSha256 === run.sourceSha256 && sourceSha256 === build.sourceSha256 &&
  run.buildId === build.buildId && run.buildId === `g4-${sourceSha256.slice(0, 16)}`,
  { sourceSha256, failedFiles: sourceChecks.filter(file => !file.pass) });
check('real Gate 3 base, candidate, metadata and seven checkpoints',
  run.gitHead === '144abb15c3252f0ef6a2dbd2d3c45333ecf6aaef' &&
  run.runId === runId && run.gate === 'G4' && run.durationMs === 40000 &&
  run.sampleMs === 100 && run.stepMs === 1000 &&
  JSON.stringify(run.checkpointTimesMs) === JSON.stringify([0, 8000, 16000, 20000, 24000, 32000, 40000]) &&
  run.sourceSeed === null && !!run.nodeVersion && !!run.dependencyIdentity &&
  run.model.sourceDimension === 4 && run.model.primarySourceId === 'ball-center' &&
  run.model.movieSourceId === 'ball-plus' && build.renderer.includes('SVG'));
check('source descriptors preserve three distinct 4D balls',
  JSON.stringify(run.sourceDescriptors.map(s => [s.id, s.center4, s.radius, s.dimension])) ===
  JSON.stringify([['ball-center', [0,0,0,0], 1, 4], ['ball-plus', [0,0,0,.5], 1, 4], ['ball-minus', [0,0,0,-.5], 1, 4]]));
const trace = JSON.parse(traceBytes);
let maxTraceError = 0;
const traceFramesGood = trace.frames.length === 401 && trace.frames.every((frame, k) => {
  const t = 100 * k, h = t <= 20000 ? t / 20000 : (40000 - t) / 20000;
  const expected = [-.5 * Math.sin(Math.PI / 2 * h), 0, 0];
  const error = Math.max(...frame.center.map((v, i) => Math.abs(v - expected[i])), Math.abs(frame.radius - 1));
  maxTraceError = Math.max(maxTraceError, error);
  return Object.keys(frame).join(',') === 'timeMs,center,radius' && frame.timeMs === t &&
    vec(frame.center, expected) && frame.radius === 1;
});
check('standalone serialized 3D trace SHA, exact schema and all 401 frames',
  trace.schemaVersion === 'gate-4-stored-3d-v1' && traceFramesGood &&
  maxTraceError <= 1e-10 && sha(traceBytes) === run.movieTraceSha256 &&
  sha(traceBytes) === build.movieTraceSha256 && run.movieFrameCount === 401 &&
  build.movieFrameCount === 401 && build.movieSampleMs === 100,
  { traceSha256: sha(traceBytes), maxTraceError });
const checkpointChecks = checkpoints.map((entry, i) => {
  const expected = prediction.checkpoints[i], t = expected.timeMs, s = entry.state;
  const slice = s.slice, movie = s.movie, frame = trace.frames[t / 100];
  const raw = expected.primarySlice;
  return { id: expected.id, pass:
    entry.simulationTimeMs === t && s.simulationTimeMs === t &&
    near(slice.levelW, raw.s) && near(slice.sourceCenterW, raw.c) &&
    near(slice.deltaW, raw.offset) && near(slice.discriminant, raw.radicand) &&
    slice.kind === raw.kind && (slice.radius === null ? raw.radius === null : near(slice.radius, raw.radius)) &&
    (slice.center3 === null ? raw.center3 === null : vec(slice.center3, raw.center3)) &&
    vec(s.projection.center3, [0, 0, 0]) && near(s.projection.radius, 1) &&
    JSON.stringify(s.projection.matrix) === JSON.stringify(prediction.primaryProjection.P) &&
    near(movie.sourceAngleRadians, expected.movie.thetaRadians) &&
    vec(movie.rotatedCenter4, expected.movie.rotatedCenter4) &&
    vec(movie.sourceProjection.center3, expected.movie.projectedCenter3) &&
    movie.sourceProjection.radius === 1 && movie.index === t / 100 &&
    JSON.stringify(movie.stored3dFrame) === JSON.stringify(frame) &&
    near(movie.comparison.centerDistance, 0) && near(movie.comparison.radiusDifference, 0) &&
    s.camera.yaw === Math.PI / 6 && s.camera.pitch === Math.PI / 9 &&
    Object.values(s.controls).every(v => v === null) &&
    entry.sourceSha256 === run.initialSourceSha256 &&
    entry.projectionSha256 === run.initialProjectionSha256 };
});
check('seven fixture checkpoints match independent raw slice/projection/movie predictions',
  checkpointChecks.length === 7 && checkpointChecks.every(c => c.pass), checkpointChecks);
check('initial state and digest metadata bind checkpoint zero',
  JSON.stringify(initial) === JSON.stringify(checkpoints[0]) &&
  run.initialSliceSha256 === checkpoints[0].sliceSha256 &&
  run.initialMovieSha256 === checkpoints[0].movieSha256 &&
  run.initialCheckpointSha256 === checkpoints[0].checkpointSha256 &&
  new Set(checkpoints.map(c => c.checkpointSha256)).size === 7);
const events = plannedText.trim().split('\n').map(JSON.parse);
check('fixture is labeled planned, separate from actual browser activity',
  events.length >= 9 && events.every(e => e.kind === 'planned-fixture' && e.actor === 'fixture-generator') &&
  run.eventsKind.includes('planned deterministic fixture'));
const outcome = { checkedAtUtc: new Date().toISOString(), kind: 'immutable-candidate-numerical-and-source-audit',
  runId, buildId: run.buildId, sourceSha256, traceSha256: sha(traceBytes),
  pass: checks.every(c => c.pass), passed: checks.filter(c => c.pass).length,
  failed: checks.filter(c => !c.pass).length, checks,
  scope: 'Static source/trace/fixture and independent numerical checks. No actual browser control or image result.' };
await writeFile(resolve(root, `audit/gate-4/${runId}-build-audit.json`), JSON.stringify(outcome, null, 2) + '\n');
console.log(JSON.stringify({ pass: outcome.pass, passed: outcome.passed, failed: outcome.failed,
  failures: checks.filter(c => !c.pass) }));
if (!outcome.pass) process.exitCode = 1;
