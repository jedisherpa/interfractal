import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Verify the sealed host evidence byte-for-byte without modifying it.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = join(root, 'evidence/gate-7/CORE_TRIAL_CLOSED.json');
const bytes = await readFile(manifestPath);
const sha256 = value => createHash('sha256').update(value).digest('hex');
assert.equal(sha256(bytes),
  '633f7c56a33ac1c64f49965ecca028a6f2b62fbb3e70f14f96dd9232bff10779');
const manifest = JSON.parse(bytes);
assert.equal(manifest.runId, 'G7-INTERPRET-002');
assert.equal(manifest.buildId, 'g7-90e64952eb028069');
assert.equal(manifest.files.length, 21);
assert.equal(new Set(manifest.files.map(item => item.path)).size, manifest.files.length);
for (const item of manifest.files) {
  assert.ok(item.path.startsWith('evidence/gate-7/'), item.path);
  const path = join(root, item.path);
  assert.equal((await stat(path)).size, item.bytes, `${item.path} bytes`);
  assert.equal(sha256(await readFile(path)), item.sha256, `${item.path} hash`);
}
const json = async name => JSON.parse(await readFile(join(root, `evidence/gate-7/${name}`)));
const observations = await json('browser-observations.json');
const actions = await json('action-trace.json');
const captures = await json('capture-index.json');
const checkpoints = await json('checkpoint-review.json');
const activity = (await readFile(join(root, 'evidence/gate-7/observed-activity.jsonl'), 'utf8'))
  .split('\n').filter(Boolean).map(line => JSON.parse(line));
const counts = manifest.counts;
assert.equal(observations.length, counts.actualBrowserObservations);
assert.equal(actions.length, counts.hostActionCalls);
assert.equal(actions.filter(item => item.success).length, counts.successfulHostActionCalls);
assert.equal(captures.length, counts.originalCaptures);
assert.equal(checkpoints.length, counts.checkpointObservations);
assert.equal(activity.length, counts.activityRows);
assert.equal(activity.filter(item => item.kind === 'observed-browser-action').length, 106);
assert.equal(activity.filter(item => item.kind === 'api-transaction').length, 9);
assert.equal((await json('COLLECTION_NOTES.json')).humanParticipants, 0);
console.log(JSON.stringify({kind: 'gate-7-independent-core-seal-audit',
  manifestSha256: sha256(bytes), files: manifest.files.length,
  counts, observedUiActions: 106, apiTransactions: 9, allPassed: true}, null, 2));
