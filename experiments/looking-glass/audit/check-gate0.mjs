// Independent Gate 0 artifact check. This file never imports probe model code.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const experiment = join(dirname(fileURLToPath(import.meta.url)), '..');
const runId = process.argv[2];
if (!/^G0-CUBE-\d{3}$/.test(runId ?? '')) throw new Error('Pass a Gate 0 run ID, for example G0-CUBE-003');
const runDir = join(experiment, 'probe', 'runs', runId);
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const near = (actual, expected, label) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-10, `${label}: ${actual} differs from ${expected}`);

const run = await json(join(runDir, 'run.json'));
const initial = await json(join(runDir, 'initial-state.json'));
const checkpoints = await json(join(runDir, 'checkpoints.json'));
const events = (await readFile(join(runDir, 'events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
const buildDir = join(experiment, 'probe', 'builds', run.buildId);
const build = await json(join(buildDir, 'build.json'));

assert.equal(run.runId, runId);
assert.equal(run.gate, 'G0');
assert.equal(run.buildId, build.buildId);
assert.equal(run.sourceSha256, build.sourceSha256);
assert.equal(run.buildId, `g0-${run.sourceSha256.slice(0, 16)}`);
assert.match(run.dependencyIdentity, /no lockfile or external assets/);
const digest = createHash('sha256');
for (const entry of build.sourceFiles) {
  assert.match(entry.path, /^[a-z0-9.-]+$/i);
  const bytes = await readFile(join(buildDir, entry.path));
  assert.equal(hash(bytes), entry.sha256, `snapshot file ${entry.path}`);
  digest.update(entry.path); digest.update('\0'); digest.update(bytes); digest.update('\0');
}
assert.equal(digest.digest('hex'), run.sourceSha256, 'aggregate snapshot hash');

// The cube is derived from the declared bit-to-sign convention, independently of SOURCE/EDGES.
const expectedVertices = Array.from({length: 8}, (_, n) => {
  const bits = n.toString(2).padStart(3, '0');
  return { id: `v${bits}`, q: [...bits].map(b => b === '0' ? -1 : 1) };
});
const expectedEdges = [];
for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
  if ([...expectedVertices[i].id.slice(1)].filter((bit, k) => bit !== expectedVertices[j].id[k + 1]).length === 1)
    expectedEdges.push(`${expectedVertices[i].id}-${expectedVertices[j].id}`);
}
assert.equal(expectedEdges.length, 12);
assert.deepEqual(run.model.vertices, expectedVertices);
assert.deepEqual(run.model.edges.map(e => e.id), expectedEdges);
for (const edge of run.model.edges) {
  assert.equal(edge.id, `${edge.from}-${edge.to}`);
  assert.ok(expectedEdges.includes(edge.id));
}
assert.deepEqual(run.checkpointTimesMs, [0, 10_000, 20_000]);
assert.equal(run.durationMs, 20_000);
assert.deepEqual(checkpoints.map(c => c.simulationTimeMs), [0, 10_000, 20_000]);

// Precomputed from c = Rx(20 deg) Ry(yaw) (1,1,1), not probe code.
const expected = [
  { t:0, yaw:Math.PI/6, camera:[1.3660254037844386, 0.8145045597227190, 0.6859715142820884] },
  { t:10_000, yaw:Math.PI/4, camera:[1.4142135623730950, 0.9396926207859084, 0.3420201433256688] },
  { t:20_000, yaw:Math.PI/3, camera:[1.3660254037844388, 1.0648806818490980, -0.0019312276307507] },
];
for (let i = 0; i < expected.length; i++) {
  const { t, yaw, camera } = expected[i];
  const { state, stateSha256 } = checkpoints[i];
  assert.equal(state.simulationTimeMs, t);
  assert.equal(state.sourceDimension, 3);
  assert.equal(state.sourceRotation, 'identity');
  assert.equal(state.projection, 'orthographic');
  assert.equal(state.fixedScalePxPerUnit, 138);
  near(state.camera.yaw, yaw, `yaw at ${t}`);
  near(state.camera.pitch, Math.PI/9, `pitch at ${t}`);
  assert.deepEqual(state.vertices.map(v => ({id:v.id,q:v.source})), expectedVertices);
  assert.deepEqual(state.edges.map(e => e.id), expectedEdges);
  for (const point of state.vertices) {
    const [x, y, z] = expectedVertices.find(v => v.id === point.id).q;
    const yawedX = Math.cos(yaw) * x + Math.sin(yaw) * z;
    const yawedZ = -Math.sin(yaw) * x + Math.cos(yaw) * z;
    const expectedCamera = [yawedX, Math.cos(Math.PI/9) * y - Math.sin(Math.PI/9) * yawedZ,
      Math.sin(Math.PI/9) * y + Math.cos(Math.PI/9) * yawedZ];
    expectedCamera.forEach((value, k) => near(point.camera[k], value, `${point.id} camera axis ${k} at ${t}`));
    near(point.screen[0], expectedCamera[0], `${point.id} screen x at ${t}`);
    near(point.screen[1], -expectedCamera[1], `${point.id} screen y at ${t}`);
  }
  const vertex = state.vertices.find(v => v.id === 'v111');
  camera.forEach((x, k) => near(vertex.camera[k], x, `v111 camera axis ${k} at ${t}`));
  near(vertex.screen[0], camera[0], `v111 screen x at ${t}`);
  near(vertex.screen[1], -camera[1], `v111 screen y at ${t}`);
  assert.equal(hash(JSON.stringify(state)), stateSha256, `state hash at ${t}`);
}
assert.deepEqual(initial, checkpoints[0]);
assert.equal(run.initialStateHash, checkpoints[0].stateSha256);
assert.ok(events.length >= 3);
assert.deepEqual(events.map(e => e.sequence), events.map((_, i) => i + 1));
for (const event of events) {
  assert.equal(event.stateSha256, checkpoints.find(c => c.simulationTimeMs === event.simulationTimeMs)?.stateSha256,
    `event checkpoint state at ${event.simulationTimeMs}`);
}
const status = await json(join(experiment, 'PROJECT_STATUS.json'));
assert.equal(status.current_gate, 0);
assert.equal(status.next_gate_approved, false);
assert.deepEqual(status.approvals, []);
const canonicalFiles = ['run.json', 'initial-state.json', 'checkpoints.json', 'events.jsonl'];
const canonical = Object.fromEntries(await Promise.all(canonicalFiles.map(async name => [name, {
  sha256: hash(await readFile(join(runDir, name))),
  size: (await stat(join(runDir, name))).size,
}])));
console.log(JSON.stringify({ result:'pass', runId, buildId:run.buildId, sourceSha256:run.sourceSha256,
  checks:['source snapshot hashes','8 unique vertices and 12 exact edges','independent v111 constants and all-vertex camera checkpoints at 0/10/20 seconds',
    'state and event hashes','Gate 0 boundary'], canonical }, null, 2));
