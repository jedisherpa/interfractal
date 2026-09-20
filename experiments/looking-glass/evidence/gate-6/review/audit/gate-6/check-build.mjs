import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const buildDir = resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Pass the immutable local-models/builds/g6-... directory');
const read = path => readFile(join(buildDir, path));
const json = async path => JSON.parse(await read(path));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = value => sha256(JSON.stringify(value));
const m = await import(pathToFileURL(join(buildDir, 'model.mjs')).href);
const build = await json('build.json');
const runDir = resolve(root, `local-models/runs/${m.RUN_ID}`);
const run = JSON.parse(await readFile(join(runDir, 'run.json')));
const checkpoints = JSON.parse(await readFile(join(runDir, 'checkpoints.json')));
const initial = JSON.parse(await readFile(join(runDir, 'initial-state.json')));
const events = (await readFile(join(runDir, 'events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
const freezeBytes = await readFile(resolve(root, 'docs/gate-6/PRESPEC_FREEZE.json'));
const freeze = JSON.parse(freezeBytes);
assert.equal(sha256(freezeBytes), '2241afcb9c3bcdffacfbc277d92c918d4c3678baa41e0f906467cfa81b020570');
assert.equal(build.prespecFreezeSha256, sha256(freezeBytes));
assert.equal(run.prespecFreezeSha256, sha256(freezeBytes));
assert.equal(build.baseRevision, freeze.baseRevision);
assert.equal(run.baseRevision, freeze.baseRevision);
assert.equal(build.buildId, run.buildId);
assert.equal(build.sourceSha256, run.sourceSha256);
assert.equal(build.sourceFiles.length, 11);
const digest = createHash('sha256');
for (const file of build.sourceFiles) {
  const bytes = await read(file.path);
  assert.equal(sha256(bytes), file.sha256, `source ${file.path}`);
  assert.equal(bytes.length, file.bytes, `source bytes ${file.path}`);
  digest.update(file.path); digest.update('\0'); digest.update(bytes); digest.update('\0');
}
const sourceSha256 = digest.digest('hex');
assert.equal(sourceSha256, build.sourceSha256);
assert.equal(build.buildId, `g6-${sourceSha256.slice(0, 16)}`);
assert.equal(buildDir.split('/').at(-1), build.buildId);
assert.deepEqual(build.prespecFiles, freeze.files);
assert.deepEqual(run.prespecFiles, freeze.files);
assert.deepEqual(build.sourcePins, freeze.sourcePins);
assert.deepEqual(run.sourcePins, freeze.sourcePins);
assert.match(build.dependencyIdentity, /no package, lockfile/);
assert.equal(run.sourceSeed, null);

const records = (await json('fictional-records.json')).records;
const references = await json('reference-mappings.json');
const fixture = await json('fixture.json');
const fingerprints = state => ({
  sourceSha256: hash(m.sourceState(state)), localSha256: hash(m.localState(state)),
  relationsSha256: hash(m.supportedRelationState(state)), mappingSha256: hash(m.mappingState(state)),
  summarySha256: hash(m.summaryState(state)), summaryHistorySha256: hash(m.summaryHistoryState(state)),
  receiverSha256: hash(m.receiverState(state)), semanticSha256: hash(m.semanticState(state)),
  checkpointSha256: hash(m.checkpointState(state)),
});
assert.deepEqual(checkpoints.map(cp => cp.simulationTimeMs), [0, 5000, 10000, 15000, 20000, 25000, 30000]);
assert.deepEqual(initial, checkpoints[0]);
for (const checkpoint of checkpoints) {
  const state = m.modelAt(checkpoint.simulationTimeMs, records, references, fixture);
  assert.deepEqual(checkpoint.state, state, `checkpoint ${checkpoint.simulationTimeMs} state`);
  for (const [key, value] of Object.entries(fingerprints(state)))
    assert.equal(checkpoint[key], value, `checkpoint ${checkpoint.simulationTimeMs} ${key}`);
}
const { simulationTimeMs: t0, ...c0 } = checkpoints[0].state;
for (const index of [2, 6]) {
  const { simulationTimeMs, ...other } = checkpoints[index].state;
  assert.deepEqual(m.semanticState(other), m.semanticState(c0));
  assert.equal(simulationTimeMs, index === 2 ? 10000 : 30000);
}
assert.equal(events.length, 9);
assert.ok(events.every(event => event.kind === 'planned-fixture' && event.origin === 'planned-fixture'));
assert.equal(events.at(-1).intended.reason, 'end-of-sequence');
assert.equal(run.eventsKind, 'planned deterministic fixture; not observed browser controls');
assert.equal(run.activityFile, 'activity.jsonl');
assert.equal(run.runId, m.RUN_ID);

const result = { kind: 'gate-6-independent-build-audit', buildId: build.buildId, sourceSha256,
  runId: run.runId, prespecFreezeSha256: sha256(freezeBytes), sourceFileCount: build.sourceFiles.length,
  checkpointCount: checkpoints.length, plannedFixtureEvents: events.length, checksPassed: true };
if (process.argv[3]) await writeFile(resolve(process.argv[3]), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
