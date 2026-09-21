import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Verifies the actual local activity log's provenance and event shape. It does
// not infer a human actor or manufacture missing browser actions.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runId = process.argv[2] ?? 'G7-INTERPRET-002';
assert.match(runId, /^G7-INTERPRET-00[1-3]$/);
const runDir = join(root, 'interpretation/runs', runId);
const run = JSON.parse(await readFile(join(runDir, 'run.json')));
const closedCopy = join(root, 'evidence/gate-7/observed-activity.jsonl');
const lines = (await readFile(closedCopy, 'utf8')).split('\n').filter(Boolean);
const events = lines.map((line, index) => {
  try { return JSON.parse(line); }
  catch { throw new Error(`invalid activity JSON at line ${index + 1}`); }
});
const hash = value => value == null ? null : createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bySession = new Map();
const counts = { ui: 0, api: 0, types: {} };
for (const [index, event] of events.entries()) {
  const label = `activity line ${index + 1}`;
  assert.equal(event.runId, runId, `${label} run`);
  assert.equal(event.buildId, run.buildId, `${label} build`);
  assert.ok(Number.isFinite(Date.parse(event.wallTimeUtc)), `${label} wall time`);
  assert.match(event.sessionId, /^[-a-zA-Z0-9]{8,128}$/, `${label} session`);
  counts.types[event.type] = (counts.types[event.type] ?? 0) + 1;
  if (event.kind === 'api-transaction') {
    counts.api++;
    assert.equal(event.schemaVersion, 'gate7-api-transaction-v1');
    assert.ok(['submit', 'skip', 'reveal', 'reset'].includes(event.type), `${label} API type`);
    assert.equal(event.seq, undefined, `${label} API row masquerades as UI sequence`);
    assert.equal(event.origin, undefined, `${label} API row masquerades as UI origin`);
    assert.equal(event.before, undefined);
    assert.equal(event.after, undefined);
    assert.ok(event.provenance?.includes('HTTP transaction only'));
    continue;
  }
  assert.equal(event.kind, 'observed-browser-action', `${label} kind`);
  counts.ui++;
  assert.equal(event.schemaVersion, 'gate7-ui-event-v1');
  assert.ok(Number.isInteger(event.seq) && event.seq >= 1, `${label} sequence`);
  assert.ok(['user-control', 'replay', 'automatic'].includes(event.origin), `${label} origin`);
  assert.ok(['unattributed_local', 'software_validation'].includes(event.actor), `${label} actor`);
  assert.equal(typeof event.type, 'string');
  assert.equal(typeof event.taskId, 'string');
  assert.equal(typeof event.condition, 'string');
  assert.equal(event.simulationTimeMs, event.after?.simulationTimeMs, `${label} cursor`);
  assert.equal(event.taskId, event.after.taskId, `${label} task boundary`);
  assert.equal(event.condition, event.after.condition, `${label} condition boundary`);
  assert.equal(event.beforeSha256, hash(event.before), `${label} before hash`);
  assert.equal(event.afterSha256, hash(event.after), `${label} after hash`);
  if (!bySession.has(event.sessionId)) bySession.set(event.sessionId, []);
  bySession.get(event.sessionId).push(event);
}
for (const [sessionId, session] of bySession) {
  const sorted = [...session].sort((a, b) => a.seq - b.seq);
  assert.equal(new Set(sorted.map(event => event.seq)).size, sorted.length, `${sessionId} duplicate sequence`);
  assert.equal(sorted[0].seq, 1, `${sessionId} missing initial event`);
  for (let i = 1; i < sorted.length; i++) {
    assert.equal(sorted[i].seq, sorted[i - 1].seq + 1, `${sessionId} sequence gap`);
    assert.equal(sorted[i].beforeSha256, sorted[i - 1].afterSha256,
      `${sessionId} boundary chain at seq ${sorted[i].seq}`);
  }
}
console.log(JSON.stringify({ kind: 'gate-7-independent-activity-audit', runId,
  buildId: run.buildId, rows: events.length, uiEvents: counts.ui,
  apiTransactions: counts.api, sessions: bySession.size, types: counts.types,
  allPassed: true }, null, 2));
