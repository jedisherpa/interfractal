import {readFile, writeFile, copyFile, mkdir, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RUN_ID, DURATION_MS, SAMPLE_MS, STEP_MS, CHECKPOINTS_MS, tourAt,
  publicFixture, validateFixture} from './model.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(dir, '..');
const docsDir = join(root, 'docs/gate-7');
const BASE_REVISION = '39d97a4d2829e1b4bec45b0afce90c758a6e05c8';
const PRESPEC_SHA256 = '8abb6366f27a42590c89365c4d1f019e5c350dee90bfff77290cdd4783b1469f';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const exists = path => access(path).then(() => true, () => false);
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const freezePath = join(docsDir, 'PRESPEC_FREEZE.json');
if (!await exists(freezePath)) throw new Error('Gate 7 prespec freeze is required before building');
const freezeBytes = await readFile(freezePath), freeze = JSON.parse(freezeBytes);
if (sha(freezeBytes) !== PRESPEC_SHA256) throw new Error('Gate 7 prespec freeze byte pin mismatch');
if (freeze.baseRevision !== BASE_REVISION || !Array.isArray(freeze.files) || freeze.files.length !== 6)
  throw new Error('Gate 7 freeze must pin six prespec files');
for (const entry of freeze.files) {
  const bytes = await readFile(join(root, entry.path));
  if (sha(bytes) !== entry.sha256 || bytes.length !== entry.bytes)
    throw new Error(`Frozen prespec mismatch: ${entry.path}`);
}
const source = await readJson(join(docsDir, 'task-fixture.json'));
const key = await readJson(join(docsDir, 'private-answer-key.json'));
validateFixture(source, key);
const publicCases = publicFixture(source);
const publicBytes = Buffer.from(JSON.stringify(publicCases, null, 2) + '\n');
await writeFile(join(dir, 'public-cases.json'), publicBytes);

const computationalText = execFileSync(process.execPath, [join(dir, 'test.mjs')],
  {cwd: root, encoding: 'utf8', maxBuffer: 4_000_000});
const computational = JSON.parse(computationalText);
if (computational.status !== 'passed') throw new Error('Gate 7 computational checks did not pass');

const publicNames = ['index.html', 'style.css', 'app.mjs', 'public-cases.json'];
const internalNames = ['model.mjs', 'server.mjs', 'build.mjs', 'test.mjs', 'README.md'];
const privateNames = ['private-answer-key.json', 'independent-predictions.json'];
const sourcePaths = [...publicNames, ...internalNames];
const sourceBytes = await Promise.all(sourcePaths.map(name => readFile(join(dir, name))));
const privateBytes = await Promise.all(privateNames.map(name => readFile(join(docsDir, name))));
const digest = createHash('sha256');
sourcePaths.forEach((name, i) => {digest.update(name); digest.update('\0'); digest.update(sourceBytes[i]); digest.update('\0');});
privateNames.forEach((name, i) => {digest.update(name); digest.update('\0'); digest.update(privateBytes[i]); digest.update('\0');});
digest.update('PRESPEC_FREEZE.json'); digest.update('\0'); digest.update(freezeBytes);
const sourceSha256 = digest.digest('hex'), buildId = `g7-${sourceSha256.slice(0, 16)}`;
const buildDir = join(dir, 'builds', buildId), runDir = join(dir, 'runs', RUN_ID);
if (await exists(join(runDir, 'run.json'))) {
  const prior = await readJson(join(runDir, 'run.json'));
  if (prior.buildId !== buildId || prior.sourceSha256 !== sourceSha256)
    throw new Error(`${RUN_ID} is preserved with ${prior.buildId}; use next candidate ID and retain this run`);
  console.log(JSON.stringify({runId: RUN_ID, buildId, sourceSha256, unchanged: true,
    launch: `${process.execPath} ${join(buildDir, 'server.mjs')}`}, null, 2));
  process.exit(0);
}
if (await exists(join(buildDir, 'build.json')))
  throw new Error(`Partial build ${buildId} exists; inspect it before retrying`);

const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
const builtAtUtc = new Date().toISOString();
const manifest = (names, bytes) => names.map((path, i) =>
  ({path, sha256: sha(bytes[i]), bytes: bytes[i].length}));
const build = {
  schemaVersion: 'gate7-build-v1', buildId, sourceSha256, runId: RUN_ID,
  publicFiles: manifest(publicNames, sourceBytes.slice(0, publicNames.length)),
  internalFiles: manifest(internalNames, sourceBytes.slice(publicNames.length)),
  privateFiles: manifest(privateNames, privateBytes),
  gitHead, baseRevision: BASE_REVISION, nodeVersion: process.version, nodeExecutable: process.execPath,
  dependencyIdentity: 'Node.js built-ins and browser HTML/SVG only; no package, lockfile or external asset',
  builtAtUtc, prespecFreezeSha256: sha(freezeBytes), prespecFiles: freeze.files,
  publicFixtureSha256: sha(publicBytes),
  renderer: 'Browser HTML/SVG; fixed-scale orthographic yaw then pitch, display depth dropped; raw xyz table separate',
  finiteObservationRule: 'Static, sequence and frame choice use identical task frame objects; no interpolation'
};
const checkpoints = CHECKPOINTS_MS.map(ms => {
  const state = tourAt(ms);
  const task = publicCases.tasks.find(item => item.id === state.taskId);
  const frameSetSha256 = sha(JSON.stringify(task.frames));
  const informationSha256 = sha(JSON.stringify({taskId: task.id, facts: task.availableFacts,
    prompt: task.prompt, options: task.options, frames: task.frames}));
  const checkpointSha256 = sha(JSON.stringify({...state, frameSetSha256}));
  return {...state, selectedPointId: task.selectedPointId || null,
    frameSetSha256, informationSha256, checkpointSha256};
});
const run = {
  schemaVersion: 'gate7-run-v1', runId: RUN_ID, gate: 'G7',
  status: 'planned deterministic software demonstration; browser activity and human participation are separate',
  buildId, sourceSha256, gitHead, baseRevision: BASE_REVISION,
  nodeVersion: process.version, nodeExecutable: process.execPath, builtAtUtc,
  prespecFreezeSha256: build.prespecFreezeSha256, publicFixtureSha256: build.publicFixtureSha256,
  fixtureId: publicCases.fixtureId, fixtureVersion: publicCases.schema,
  experimentVersion: 'gate7-prespec-v1', modelVersion: 'gate7-model-v1',
  eventSchemaVersion: 'gate7-record-v1', generatorVersion: 'gate7-builder-v1',
  renderer: build.renderer, durationMs: DURATION_MS, sampleMs: SAMPLE_MS, stepMs: STEP_MS,
  checkpointTimesMs: CHECKPOINTS_MS, taskCount: publicCases.tasks.length,
  answerCount: 0, revealedCount: 0, humanParticipantCount: 0,
  actor: 'unattributed_local', sourceSeed: null,
  initialStateFile: 'initial-state.json', checkpointsFile: 'checkpoints.json',
  eventsFile: 'events.jsonl', activityFile: 'activity.jsonl',
  computationalResultsFile: 'computational-results.json',
  eventsKind: 'planned deterministic fixture; not observed browser controls',
  initialCheckpointSha256: checkpoints[0].checkpointSha256,
  fingerprintAlgorithm: 'SHA-256 of UTF-8 JSON.stringify of declared public boundary in fixed property order'
};
const planned = [{seq: 1, kind: 'planned-fixture', actor: 'fixture-generator',
  type: 'replay.open', simulationTimeMs: 0, intended: {paused: true, runId: RUN_ID, buildId}},
  ...checkpoints.map((cp, i) => ({seq: i + 2, kind: 'planned-fixture', actor: 'fixture-generator',
    type: 'checkpoint.expected', simulationTimeMs: cp.simulationTimeMs,
    expected: {checkpointSha256: cp.checkpointSha256, taskId: cp.taskId,
      condition: cp.condition, frameIndex: cp.frameIndex}})),
  {seq: checkpoints.length + 2, kind: 'planned-fixture', actor: 'fixture-generator',
    type: 'playback.pause', simulationTimeMs: DURATION_MS, intended: {reason: 'end-of-sequence'}}];

await mkdir(buildDir, {recursive: true});
for (const name of sourcePaths) await copyFile(join(dir, name), join(buildDir, name));
for (const name of privateNames) await copyFile(join(docsDir, name), join(buildDir, name));
await writeFile(join(buildDir, 'build.json'), JSON.stringify(build, null, 2) + '\n', {flag: 'wx'});
await mkdir(runDir, {recursive: true});
for (const [name, value] of [['run.json', run], ['initial-state.json', checkpoints[0]],
  ['checkpoints.json', checkpoints], ['computational-results.json', computational]])
  await writeFile(join(runDir, name), JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
await writeFile(join(runDir, 'events.jsonl'), planned.map(e => JSON.stringify(e)).join('\n') + '\n', {flag: 'wx'});
await writeFile(join(runDir, 'activity.jsonl'), '', {flag: 'wx'});
console.log(JSON.stringify({runId: RUN_ID, buildId, sourceSha256,
  prespecFreezeSha256: build.prespecFreezeSha256,
  launch: `${process.execPath} ${join(buildDir, 'server.mjs')}`}, null, 2));
