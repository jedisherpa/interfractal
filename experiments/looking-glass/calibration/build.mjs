import { readFile, mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUN_ID, DURATION_MS, CHECKPOINTS_MS, SOURCE, EDGES, CAMERA, MARKED_PAIR, modelAt, geometryState, canonicalState } from './model.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const files = ['index.html', 'style.css', 'app.mjs', 'model.mjs', 'server.mjs', 'build.mjs', 'test.mjs'];
const sourceDigest = createHash('sha256');
const bytes = [];
for (const file of files) {
  const content = await readFile(join(dir, file));
  bytes.push(content);
  sourceDigest.update(file); sourceDigest.update('\0'); sourceDigest.update(content); sourceDigest.update('\0');
}
const sourceSha256 = sourceDigest.digest('hex');
const buildId = `g1-${sourceSha256.slice(0, 16)}`;
const buildDir = join(dir, 'builds', buildId);
const runDir = join(dir, 'runs', RUN_ID);
const sha256 = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : canonicalState(value)).digest('hex');
const exists = path => access(path).then(() => true, () => false);
if (await exists(join(runDir, 'run.json'))) {
  const old = JSON.parse(await readFile(join(runDir, 'run.json'), 'utf8'));
  if (old.buildId !== buildId) throw new Error(`${RUN_ID} is immutable and belongs to ${old.buildId}. Increment the candidate run ID for changed source.`);
  console.log(`Existing immutable run ${RUN_ID} uses ${buildId}`);
  process.exit(0);
}
await mkdir(buildDir, { recursive: true });
for (let i = 0; i < files.length; i++) await copyFile(join(dir, files[i]), join(buildDir, files[i]));
const builtAt = new Date().toISOString();
const build = { buildId, sourceSha256, sourceFiles: files.map((path, i) => ({ path, sha256: sha256(bytes[i]) })), dependencyIdentity: 'node-builtins-only; no lockfile or external assets', nodeVersion: process.version, builtAt };
await writeFile(join(buildDir, 'build.json'), JSON.stringify(build, null, 2) + '\n', { flag: 'wx' });
await mkdir(runDir, { recursive: true });
const checkpoints = CHECKPOINTS_MS.map(simulationTimeMs => {
  const state = modelAt(simulationTimeMs);
  return { simulationTimeMs, state, stateSha256: sha256(state), geometrySha256: sha256(geometryState(state)) };
});
const run = {
  runId: RUN_ID, gate: 'G1', experimentVersion: 'G1-calibration-v1', testId: 'G1-cube-source-shadow-calibration',
  hypothesis: 'A fixed-camera cube source turn changes its 2D shadow predictably while selected source points remain distinct; camera exploration changes only the 3D display.',
  baseRevision: '6fb4ecbd516aa9a9dc23710c7ffcda4e8c65b819', buildId, sourceSha256,
  dependencyIdentity: build.dependencyIdentity, builtAt, durationMs: DURATION_MS, stepMs: 1_000,
  checkpointTimesMs: CHECKPOINTS_MS,
  model: { type: 'ordinary-3d-wire-cube', dimension: 3, generatorVersion: 'cube-v1', seed: null,
    vertices: SOURCE, edges: EDGES, selectedVertexIds: MARKED_PAIR,
    sourceTransform: 'Ry(theta) column vector; theta=pi*t/40000 to 20s, then pi*(40000-t)/40000',
    displayCamera: { ...CAMERA, order: 'Rx(pitch)·Ry(yaw)·rotatedSource', frozenInCanonicalRun: true },
    shadowProjection: 'P=(x′,y′)', displayProjection: 'orthographic screen=(cx,−cy)',
    scalePxPerUnit: 95, clipping: 'none', autoRescale: false, renderer: 'SVG 2D; two responsive side-by-side views' },
  initialStateHash: checkpoints[0].stateSha256, initialGeometryHash: checkpoints[0].geometrySha256,
  initialStateFile: 'initial-state.json', eventsFile: 'events.jsonl', checkpointsFile: 'checkpoints.json',
  eventsKind: 'planned deterministic fixture, not observed browser controls',
  resultsStatus: 'Numerical and actual browser observations are recorded separately.'
};
const planned = (sequence, type, simulationTimeMs, intended) => ({
  sequence, kind: 'planned-fixture', type, simulationTimeMs, wallTimestamp: null, actor: 'fixture-generator', intended,
  expected: { sourceTheta: modelAt(simulationTimeMs).sourceRotation.theta, camera: modelAt(simulationTimeMs).camera,
    stateSha256: sha256(modelAt(simulationTimeMs)), geometrySha256: sha256(geometryState(modelAt(simulationTimeMs))) }
});
const events = [planned(1, 'replay.open', 0, { openingState: 'paused-at-start' }),
  ...CHECKPOINTS_MS.map((t, i) => planned(i + 2, 'source.rotation.set', t, { source: 'canonical-path' })),
  planned(7, 'playback.pause', DURATION_MS, { source: 'canonical-path' })];
await writeFile(join(runDir, 'run.json'), JSON.stringify(run, null, 2) + '\n', { flag: 'wx' });
await writeFile(join(runDir, 'initial-state.json'), JSON.stringify(checkpoints[0], null, 2) + '\n', { flag: 'wx' });
await writeFile(join(runDir, 'checkpoints.json'), JSON.stringify(checkpoints, null, 2) + '\n', { flag: 'wx' });
await writeFile(join(runDir, 'events.jsonl'), events.map(event => JSON.stringify(event)).join('\n') + '\n', { flag: 'wx' });
console.log(JSON.stringify({ runId: RUN_ID, buildId, sourceSha256, launch: `node ${join(buildDir, 'server.mjs')}` }, null, 2));
