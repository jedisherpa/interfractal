// Verify the host's closed, actual-browser evidence manifest byte for byte.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const closed = JSON.parse(await readFile(resolve(root, 'evidence/gate-6/CORE_EVIDENCE_CLOSED.json')));
const run = JSON.parse(await readFile(resolve(root, `local-models/runs/${closed.runId}/run.json`)));
assert.equal(closed.runId, 'G6-LOCAL-003');
assert.equal(closed.buildId, run.buildId);
assert.equal(closed.finalSimulationTimeMs, 0);
assert.equal(closed.finalPlaying, false);
assert.equal(closed.finalModeText, 'PAUSED · SAVED RUN');
assert.equal(closed.files.length, 15);
for (const file of closed.files) {
  const bytes = await readFile(resolve(root, file.path));
  assert.equal(bytes.length, file.bytes, `${file.path} bytes`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, `${file.path} SHA`);
}
const observations = JSON.parse(await readFile(resolve(root, 'evidence/gate-6/browser-observations.json')));
const actions = JSON.parse(await readFile(resolve(root, 'evidence/gate-6/action-trace.json')));
const captures = JSON.parse(await readFile(resolve(root, 'evidence/gate-6/capture-index.json')));
const events = (await readFile(resolve(root, 'evidence/gate-6/observed-activity.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
assert.equal(observations.length, closed.observations);
assert.equal(actions.length, closed.rootActions);
assert.equal(actions.filter(action => action.success).length, closed.successfulRootActionCalls);
assert.equal(captures.length, closed.originalCaptures);
assert.equal(events.length, closed.observedEvents);
assert.equal(new Set(events.map(event => event.sessionId)).size, Object.keys(closed.sessions).length);
for (const [id, expected] of Object.entries(closed.sessions))
  assert.equal(events.filter(event => event.sessionId === id).length, expected);
const result = { kind: 'gate-6-independent-closed-core-integrity', runId: closed.runId,
  buildId: closed.buildId, fileCount: closed.files.length, observations: closed.observations,
  rootActions: closed.rootActions, captures: closed.originalCaptures, observedEvents: closed.observedEvents,
  sessions: Object.keys(closed.sessions).length, checksPassed: true };
await writeFile(resolve(root, 'audit/gate-6/G6-LOCAL-003-core-integrity-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
