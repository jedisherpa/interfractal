import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Checks exact immutable bytes. This auditor does not import builder modules.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const freezeHash = '8abb6366f27a42590c89365c4d1f019e5c350dee90bfff77290cdd4783b1469f';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const freezeBytes = await readFile(join(root, 'docs/gate-7/PRESPEC_FREEZE.json'));
assert.equal(sha256(freezeBytes), freezeHash, 'prespec manifest changed');
const fixture = JSON.parse(await readFile(join(root, 'docs/gate-7/task-fixture.json')));
const runId = process.argv[2]?.startsWith('G7-INTERPRET-') ? process.argv[2] : 'G7-INTERPRET-001';
assert.match(runId, /^G7-INTERPRET-00[1-3]$/);
const runDir = join(root, 'interpretation/runs', runId);
const run = JSON.parse(await readFile(join(runDir, 'run.json')));
const buildId = process.argv[2]?.startsWith('g7-') ? process.argv[2] : process.argv[3] ?? run.buildId;
assert.match(buildId, /^g7-[a-f0-9]{16}$/);
assert.equal(run.buildId, buildId, 'run/build mismatch');
const buildDir = join(root, 'interpretation/builds', buildId);
const build = JSON.parse(await readFile(join(buildDir, 'build.json')));
assert.equal(build.buildId, buildId);
assert.equal(build.runId, run.runId);
assert.equal(run.runId, runId);
assert.equal(build.prespecFreezeSha256, freezeHash);
assert.equal(run.prespecFreezeSha256, freezeHash);
assert.equal(build.sourceSha256, run.sourceSha256);
assert.equal(buildId, `g7-${build.sourceSha256.slice(0, 16)}`);

const expectedPublic = ['index.html', 'style.css', 'app.mjs', 'public-cases.json'];
const expectedInternal = ['model.mjs', 'server.mjs', 'build.mjs', 'test.mjs', 'README.md'];
const expectedPrivate = ['private-answer-key.json', 'independent-predictions.json'];
assert.deepEqual(build.publicFiles.map(file => file.path), expectedPublic);
assert.deepEqual(build.internalFiles.map(file => file.path), expectedInternal);
assert.deepEqual(build.privateFiles.map(file => file.path), expectedPrivate);
const digest = createHash('sha256');
for (const file of [...build.publicFiles, ...build.internalFiles, ...build.privateFiles]) {
  const body = await readFile(join(buildDir, file.path));
  assert.equal(sha256(body), file.sha256, `${file.path} build bytes changed`);
  assert.equal(body.length, file.bytes, `${file.path} build size changed`);
  digest.update(file.path); digest.update('\0'); digest.update(body); digest.update('\0');
}
digest.update('PRESPEC_FREEZE.json'); digest.update('\0'); digest.update(freezeBytes);
assert.equal(digest.digest('hex'), build.sourceSha256, 'source identity mismatch');
for (const file of build.privateFiles) {
  const frozen = await readFile(join(root, 'docs/gate-7', file.path));
  assert.equal(sha256(frozen), file.sha256, `${file.path} private copy changed`);
}
const publicBytes = await readFile(join(buildDir, 'public-cases.json'));
assert.equal(sha256(publicBytes), build.publicFixtureSha256);
assert.equal(sha256(publicBytes), run.publicFixtureSha256);
assert.deepEqual(JSON.parse(publicBytes), fixture, 'public fixture differs from frozen task data');
const publicText = (await Promise.all(build.publicFiles.map(file => readFile(join(buildDir, file.path), 'utf8')))).join('\n');
for (const forbidden of ['privateDerivation', 'expectedChoice', 'sourceForCalculation',
  'alternativeSource', 'recoveredV', 'stackedRank', 'compatibleSettings'])
  assert.ok(!publicText.includes(forbidden), `private field exposed in served file: ${forbidden}`);
assert.ok(!publicText.includes('Viewing Q08 first exposes a possible completion of Q07'), 'incorrect cross-case warning');

assert.equal(run.answerCount, 0);
assert.equal(run.revealedCount, 0);
assert.equal(run.humanParticipantCount, 0);
const initial = JSON.parse(await readFile(join(runDir, 'initial-state.json')));
const checkpoints = JSON.parse(await readFile(join(runDir, 'checkpoints.json')));
assert.equal(checkpoints.length, 9);
assert.deepEqual(checkpoints.map(item => item.simulationTimeMs),
  [0, 6000, 12000, 18000, 24000, 30000, 36000, 42000, 48000]);
assert.deepEqual(initial, checkpoints[0]);
assert.ok(checkpoints.every(item => item.answerCount === 0 && item.revealed === false));
assert.equal(checkpoints[8].taskId, 'Q01');
assert.equal(checkpoints[8].condition, 'static');
assert.equal(checkpoints[8].frameIndex, 0);
const planned = (await readFile(join(runDir, 'events.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
assert.ok(planned.every(event => event.kind === 'planned-fixture' && event.actor === 'fixture-generator'),
  'planned events mislabeled as observed');
const computational = JSON.parse(await readFile(join(runDir, 'computational-results.json')));
assert.equal(computational.status, 'passed');

console.log(JSON.stringify({ kind: 'gate-7-independent-build-audit', runId: run.runId,
  buildId, sourceSha256: build.sourceSha256, prespecSha256: freezeHash,
  publicFiles: expectedPublic.length, internalFiles: expectedInternal.length,
  privateFiles: expectedPrivate.length, checkpoints: checkpoints.length, allPassed: true }, null, 2));
