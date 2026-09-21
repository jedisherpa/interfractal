import { readFile, mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUN_ID, DURATION_MS, STEP_MS, CHECKPOINTS_MS, CAMERA, SCALE, SOURCE, EDGES,
  MARKED_PAIR, modelAt, geometryState, checkpointState, displayState } from './model.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const experimentDir = resolve(dir, '..');
const freezePath = join(experimentDir, 'docs/gate-3/PRESPEC_FREEZE.json');
const prespecBytes = await readFile(freezePath);
const freeze = JSON.parse(prespecBytes);
const sha256 = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
for (const file of freeze.files) {
  const actual = sha256(await readFile(join(experimentDir, file.path)));
  if (actual !== file.sha256) throw new Error(`Frozen prespec hash mismatch: ${file.path}`);
}
const files = ['index.html', 'style.css', 'app.mjs', 'model.mjs', 'server.mjs', 'build.mjs', 'test.mjs', 'README.md'];
const content = await Promise.all(files.map(name => readFile(join(dir, name))));
const sourceDigest = createHash('sha256');
files.forEach((name, i) => { sourceDigest.update(name); sourceDigest.update('\0'); sourceDigest.update(content[i]); sourceDigest.update('\0'); });
const sourceSha256 = sourceDigest.digest('hex'), buildId = `g3-${sourceSha256.slice(0, 16)}`;
const buildDir = join(dir, 'builds', buildId), runDir = join(dir, 'runs', RUN_ID);
const exists = path => access(path).then(() => true, () => false);
if (await exists(join(runDir, 'run.json'))) {
  const prior = JSON.parse(await readFile(join(runDir, 'run.json'), 'utf8'));
  if (prior.buildId !== buildId) throw new Error(`${RUN_ID} is immutable and belongs to ${prior.buildId}; change candidate run ID for changed source`);
  console.log(`Existing immutable run ${RUN_ID} uses ${buildId}`); process.exit(0);
}
const sourceIdentity = { vertices: SOURCE, edges: EDGES };
const canonicalEdgeId = `e-${MARKED_PAIR[0]}-${MARKED_PAIR[1]}`;
const fixture = simulationTimeMs => {
  const s = modelAt(simulationTimeMs);
  const checkpoint = { ...checkpointState(s), selectedVertexId: MARKED_PAIR[0], selectedEdgeId: canonicalEdgeId,
    sourceAngleOverride: null, cameraYawOverride: null, compareCondition: 'source' };
  return { simulationTimeMs, state: s, selectedVertexId: MARKED_PAIR[0], selectedEdgeId: canonicalEdgeId,
    sourceSha256: sha256(sourceIdentity), projectionSha256: sha256(geometryState(s)),
    checkpointSha256: sha256(checkpoint), displaySha256: sha256(displayState(s)) };
};
const checkpoints = CHECKPOINTS_MS.map(fixture);
const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: experimentDir, encoding: 'utf8' }).trim();
await mkdir(buildDir, { recursive: true });
for (const name of files) await copyFile(join(dir, name), join(buildDir, name));
const builtAtUtc = new Date().toISOString();
const build = { buildId, sourceSha256, sourceFiles: files.map((path, i) => ({ path, sha256: sha256(content[i]), bytes: content[i].length })),
  gitHead, uncommittedSourceIdentity: sourceSha256, dependencyIdentity: 'Node.js builtins only; no packages, lockfile or external assets',
  nodeVersion: process.version, builtAtUtc, prespecFreezeSha256: sha256(prespecBytes),
  prespecFrozenAtUtc: freeze.frozenAtUtc, prespecFiles: freeze.files,
  renderer: 'SVG view of calculated R³ points; no WebGL dependency' };
await writeFile(join(buildDir, 'build.json'), JSON.stringify(build, null, 2) + '\n', { flag: 'wx' });
await mkdir(runDir, { recursive: true });
const run = { runId: RUN_ID, gate: 'G3', status: 'planned deterministic fixture; actual browser observations recorded separately',
  experimentVersion: 'gate-3-charter-v1', modelVersion: 'gate-3-model-v1', eventSchemaVersion: 'gate-3-record-v1', generatorVersion: 'gate-3-builder-v1',
  testId: 'G3-known-4D-hypercube-projection-and-observability',
  hypothesis: 'A known x–w source turn separates an initially coincident pair in the xyz projection; a fixed or camera-only source view leaves w underdetermined, while known 0°+90° source views recover q from raw projected coordinates and correspondences.',
  buildId, sourceSha256, gitHead, uncommittedSourceIdentity: sourceSha256,
  dependencyIdentity: build.dependencyIdentity, nodeVersion: process.version, builtAtUtc,
  prespecFreezeSha256: build.prespecFreezeSha256, prespecFrozenAtUtc: build.prespecFrozenAtUtc, prespecFiles: freeze.files,
  durationMs: DURATION_MS, stepMs: STEP_MS, checkpointTimesMs: CHECKPOINTS_MS,
  model: { sourceObject: 'solid [-1,1]^4; wireframe displays its one-dimensional edge skeleton',
    sourceDimension: 4, boundaryDimension: 3, skeletonDimension: 1, vertexAffineSpan: 4,
    vertices: SOURCE.length, edges: EDGES.length, markedPair: MARKED_PAIR,
    markedEdgeId: canonicalEdgeId, sourceRotation: 'column-vector Rxw(theta), applied first',
    projection: 'orthographic P selects rotated x,y,z', camera: CAMERA,
    display: { renderer: build.renderer, viewBox: [0,0,640,420], center: [320,210], scale: SCALE,
      noAutoFit: true, noJitter: true }, sourceSeed: null },
  sourceIdentitySha256: checkpoints[0].sourceSha256,
  initialProjectionSha256: checkpoints[0].projectionSha256,
  initialCheckpointSha256: checkpoints[0].checkpointSha256,
  initialDisplaySha256: checkpoints[0].displaySha256,
  initialStateFile: 'initial-state.json', eventsFile: 'events.jsonl', checkpointsFile: 'checkpoints.json',
  eventsKind: 'planned deterministic fixture; not observed browser controls' };
const events = [
  { seq: 1, kind: 'planned-fixture', type: 'replay.open', simulationTimeMs: 0, actor: 'fixture-generator', origin: 'planned-fixture', intended: { openingState: 'paused-at-start' } },
  ...checkpoints.map((cp, i) => ({ seq: i + 2, kind: 'planned-fixture', type: 'checkpoint.expected', simulationTimeMs: cp.simulationTimeMs,
    actor: 'fixture-generator', origin: 'planned-fixture', expected: { projectionSha256: cp.projectionSha256, checkpointSha256: cp.checkpointSha256 } })),
  { seq: checkpoints.length + 2, kind: 'planned-fixture', type: 'playback.pause', simulationTimeMs: DURATION_MS,
    actor: 'fixture-generator', origin: 'automatic-playback', intended: { reason: 'end-of-sequence' } }
];
await writeFile(join(runDir, 'run.json'), JSON.stringify(run, null, 2) + '\n', { flag: 'wx' });
await writeFile(join(runDir, 'initial-state.json'), JSON.stringify(checkpoints[0], null, 2) + '\n', { flag: 'wx' });
await writeFile(join(runDir, 'checkpoints.json'), JSON.stringify(checkpoints, null, 2) + '\n', { flag: 'wx' });
await writeFile(join(runDir, 'events.jsonl'), events.map(e => JSON.stringify(e)).join('\n') + '\n', { flag: 'wx' });
console.log(JSON.stringify({ runId: RUN_ID, buildId, sourceSha256, launch: `node ${join(buildDir, 'server.mjs')}` }, null, 2));
