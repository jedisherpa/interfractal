import { readFile, mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUN_ID, DURATION_MS, STEP_MS, SAMPLE_MS, CHECKPOINTS_MS, CAMERA, SCALE,
  modelAt, sourceState, sliceState, projectionState, movieState, geometryState,
  checkpointState, displayState } from './model.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const experimentDir = resolve(dir, '..');
const sha256 = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const freezePath = join(experimentDir, 'docs/gate-4/PRESPEC_FREEZE.json');
const freezeBytes = await readFile(freezePath);
const freeze = JSON.parse(freezeBytes);
for (const file of freeze.files) {
  const actual = sha256(await readFile(join(experimentDir, file.path)));
  if (actual !== file.sha256) throw new Error(`Frozen prespec hash mismatch: ${file.path}`);
}
const sourceFiles = ['index.html', 'style.css', 'app.mjs', 'model.mjs', 'server.mjs', 'build.mjs', 'test.mjs', 'README.md'];
const sourceContents = await Promise.all(sourceFiles.map(name => readFile(join(dir, name))));
const sourceDigest = createHash('sha256');
sourceFiles.forEach((name, i) => { sourceDigest.update(name); sourceDigest.update('\0'); sourceDigest.update(sourceContents[i]); sourceDigest.update('\0'); });
const sourceSha256 = sourceDigest.digest('hex');
const buildId = `g4-${sourceSha256.slice(0, 16)}`;
const buildDir = join(dir, 'builds', buildId), runDir = join(dir, 'runs', RUN_ID);
const exists = path => access(path).then(() => true, () => false);
if (await exists(join(runDir, 'run.json'))) {
  const prior = JSON.parse(await readFile(join(runDir, 'run.json'), 'utf8'));
  if (prior.buildId !== buildId) throw new Error(`${RUN_ID} is immutable and belongs to ${prior.buildId}; use a new candidate ID`);
  console.log(`Existing immutable run ${RUN_ID} uses ${buildId}`); process.exit(0);
}
// This standalone file contains 3D frame data only. The live model uses a separate
// 4D rotation/projection path. The browser's mimic panel reads this saved file.
const frames = Array.from({ length: DURATION_MS / SAMPLE_MS + 1 }, (_, index) => {
  const timeMs = index * SAMPLE_MS;
  const h = timeMs <= 20_000 ? timeMs / 20_000 : (40_000 - timeMs) / 20_000;
  return { timeMs, center: [-0.5 * Math.sin((Math.PI / 2) * h), 0, 0], radius: 1 };
});
const trace = { schemaVersion: 'gate-4-stored-3d-v1', description: 'Saved 3D ball frames, 100 ms spacing; display reader needs only time, center and radius', frames };
const traceBytes = JSON.stringify(trace, null, 2) + '\n';
const movieTraceSha256 = sha256(traceBytes);
const fixture = simulationTimeMs => {
  const s = modelAt(simulationTimeMs, { movieFrame: frames[simulationTimeMs / SAMPLE_MS] });
  return { simulationTimeMs, state: s, sourceSha256: sha256(sourceState()),
    sliceSha256: sha256(sliceState(s)), projectionSha256: sha256(projectionState(s)),
    movieSha256: sha256(movieState(s)), geometrySha256: sha256(geometryState(s)),
    checkpointSha256: sha256(checkpointState(s)), displaySha256: sha256(displayState(s)) };
};
const checkpoints = CHECKPOINTS_MS.map(fixture);
const maxTraceError = Math.max(...frames.map((frame, index) => {
  const s = modelAt(index * SAMPLE_MS, { movieFrame: frame });
  return Math.max(s.movie.comparison.centerDistance, s.movie.comparison.radiusDifference);
}));
if (maxTraceError > 1e-10) throw new Error(`Stored 3D trace mismatch ${maxTraceError}`);
const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: experimentDir, encoding: 'utf8' }).trim();
await mkdir(buildDir, { recursive: true });
for (const name of sourceFiles) await copyFile(join(dir, name), join(buildDir, name));
const builtAtUtc = new Date().toISOString();
const build = { buildId, sourceSha256, sourceFiles: sourceFiles.map((path, i) => ({ path, sha256: sha256(sourceContents[i]), bytes: sourceContents[i].length })),
  gitHead, uncommittedSourceIdentity: sourceSha256,
  dependencyIdentity: 'Node.js builtins only; no packages, lockfile or external assets',
  nodeVersion: process.version, builtAtUtc, prespecFreezeSha256: sha256(freezeBytes),
  prespecFrozenAtUtc: freeze.frozenAtUtc, prespecFiles: freeze.files,
  movieTraceSha256, movieFrameCount: frames.length, movieSampleMs: SAMPLE_MS,
  renderer: 'SVG of analytic 3D slice and orthographic projection; stored 3D frames read from JSON' };
await writeFile(join(buildDir, 'build.json'), JSON.stringify(build, null, 2) + '\n', { flag: 'wx' });
await mkdir(runDir, { recursive: true });
const run = { runId: RUN_ID, gate: 'G4', status: 'planned deterministic fixture; actual browser observations recorded separately',
  experimentVersion: 'gate-4-charter-v1', modelVersion: 'gate-4-model-v1', eventSchemaVersion: 'gate-4-record-v1',
  generatorVersion: 'gate-4-builder-v1', testId: 'G4-ball-slice-projection-ambiguity-stored-3d-movie',
  hypothesis: 'An analytic 4D-ball slice changes with w while its projection stays fixed; a known slice distinguishes two declared hidden-center candidates; a saved 3D animation reproduces the prescribed sampled projection movie.',
  buildId, sourceSha256, gitHead, uncommittedSourceIdentity: sourceSha256,
  dependencyIdentity: build.dependencyIdentity, nodeVersion: process.version, builtAtUtc,
  prespecFreezeSha256: build.prespecFreezeSha256, prespecFrozenAtUtc: build.prespecFrozenAtUtc,
  prespecFiles: freeze.files, durationMs: DURATION_MS, stepMs: STEP_MS, sampleMs: SAMPLE_MS,
  checkpointTimesMs: CHECKPOINTS_MS, sourceDescriptors: sourceState().descriptors,
  movieTraceFile: 'movie-3d.json', movieTraceSha256, movieFrameCount: frames.length,
  maxBuilderTraceError: maxTraceError, sourceSeed: null,
  model: { primarySourceId: 'ball-center', ambiguityCandidateIds: ['ball-plus', 'ball-minus'],
    movieSourceId: 'ball-plus', sourceDimension: 4, sourceBoundaryDimension: 3,
    primarySlice: 'w=s; strict u=1-(s-c)^2 branch', projection: 'orthographic xyz, independent of primary slice',
    canonicalCamera: CAMERA, display: { renderer: build.renderer, viewBox: [0, 0, 640, 420],
      center: [320, 210], scale: SCALE, noAutoFit: true, noJitter: true } },
  initialSourceSha256: checkpoints[0].sourceSha256, initialSliceSha256: checkpoints[0].sliceSha256,
  initialProjectionSha256: checkpoints[0].projectionSha256, initialMovieSha256: checkpoints[0].movieSha256,
  initialCheckpointSha256: checkpoints[0].checkpointSha256, initialDisplaySha256: checkpoints[0].displaySha256,
  initialStateFile: 'initial-state.json', checkpointsFile: 'checkpoints.json', eventsFile: 'events.jsonl',
  eventsKind: 'planned deterministic fixture; not observed browser controls' };
const events = [
  { seq: 1, kind: 'planned-fixture', type: 'replay.open', simulationTimeMs: 0, actor: 'fixture-generator',
    origin: 'planned-fixture', intended: { openingState: 'paused-at-start', runId: RUN_ID, buildId } },
  ...checkpoints.map((cp, i) => ({ seq: i + 2, kind: 'planned-fixture', type: 'checkpoint.expected',
    simulationTimeMs: cp.simulationTimeMs, actor: 'fixture-generator', origin: 'planned-fixture',
    expected: { sliceSha256: cp.sliceSha256, projectionSha256: cp.projectionSha256,
      movieSha256: cp.movieSha256, checkpointSha256: cp.checkpointSha256 } })),
  { seq: checkpoints.length + 2, kind: 'planned-fixture', type: 'playback.pause', simulationTimeMs: DURATION_MS,
    actor: 'fixture-generator', origin: 'automatic-playback', intended: { reason: 'end-of-sequence' } }
];
await writeFile(join(runDir, 'movie-3d.json'), traceBytes, { flag: 'wx' });
await writeFile(join(runDir, 'run.json'), JSON.stringify(run, null, 2) + '\n', { flag: 'wx' });
await writeFile(join(runDir, 'initial-state.json'), JSON.stringify(checkpoints[0], null, 2) + '\n', { flag: 'wx' });
await writeFile(join(runDir, 'checkpoints.json'), JSON.stringify(checkpoints, null, 2) + '\n', { flag: 'wx' });
await writeFile(join(runDir, 'events.jsonl'), events.map(e => JSON.stringify(e)).join('\n') + '\n', { flag: 'wx' });
console.log(JSON.stringify({ runId: RUN_ID, buildId, sourceSha256, movieTraceSha256,
  launch: `node ${join(buildDir, 'server.mjs')}` }, null, 2));
