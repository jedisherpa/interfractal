// Audit actual UI events saved by root; does not synthesize or POST activity.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runId = process.argv[4] || 'G6-LOCAL-003';
const run = JSON.parse(await readFile(resolve(root, `local-models/runs/${runId}/run.json`)));
const activityPath = resolve(root, process.argv[2] || `local-models/runs/${runId}/activity.jsonl`);
const lines = (await readFile(activityPath, 'utf8')).trim().split('\n').filter(Boolean);
const events = lines.map(JSON.parse);
assert.ok(events.length > 0);
const bySession = new Map();
const stableBoundaries = ['sourceSha256', 'localSha256', 'relationsSha256', 'summaryHistorySha256'];
const baseline = Object.fromEntries(stableBoundaries.map(key => [key, events[0].observed[key]]));
const controlOnly = new Set(['local.select', 'local.expand', 'local.collapse', 'trace.inspect',
  'references.compare', 'claims.show', 'relation.inspect', 'representation.set', 'layout.set', 'display.toggle']);
for (const event of events) {
  assert.equal(event.kind, 'observed-ui');
  assert.equal(event.runId, runId);
  assert.equal(event.buildId, run.buildId);
  assert.equal(event.actor, 'unspecified-ui');
  assert.ok(['manual-control', 'automatic-playback', 'programmatic-restore'].includes(event.origin));
  assert.ok(Number.isFinite(Date.parse(event.wallTimeUtc)));
  assert.ok(Number.isInteger(event.seq) && event.seq > 0);
  assert.ok(Number.isFinite(event.simulationTimeBeforeMs));
  assert.ok(Number.isFinite(event.simulationTimeAfterMs));
  assert.ok(event.simulationTimeBeforeMs >= 0 && event.simulationTimeBeforeMs <= 30000);
  assert.ok(event.simulationTimeAfterMs >= 0 && event.simulationTimeAfterMs <= 30000);
  assert.equal(event.simulationTimeBeforeMs % 100, 0);
  assert.equal(event.simulationTimeAfterMs % 100, 0);
  assert.ok(event.before?.checkpointSha256 && event.observed?.checkpointSha256);
  assert.ok(event.before.controls && event.observed.controls);
  assert.ok(event.environment?.viewport);
  for (const key of stableBoundaries) {
    assert.equal(event.before[key], baseline[key], `before ${key} ${event.type}`);
    assert.equal(event.observed[key], baseline[key], `after ${key} ${event.type}`);
  }
  if (!bySession.has(event.sessionId)) bySession.set(event.sessionId, []);
  bySession.get(event.sessionId).push(event);
  if (controlOnly.has(event.type)) {
    for (const key of ['mappingSha256', 'summarySha256', 'receiverSha256'])
      assert.equal(event.before[key], event.observed[key], `${event.type} preserves ${key}`);
  }
  if (event.type === 'reference.set') {
    assert.equal(event.before.receiverSha256, event.observed.receiverSha256);
    assert.equal(event.before.controls.requirementVersion, event.observed.controls.requirementVersion);
  }
  if (event.type === 'summary.repair') {
    assert.equal(event.before.mappingSha256, event.observed.mappingSha256);
    assert.equal(event.observed.controls.summaryVersion, event.observed.controls.requirementVersion === 2 ? 3 : 2);
  }
  if (event.type === 'requirement.set') {
    assert.equal(event.before.mappingSha256, event.observed.mappingSha256);
    assert.equal(event.observed.controls.requirementVersion, event.payload.version);
  }
  if (event.type === 'playback.pause' && event.origin === 'automatic-playback') {
    assert.equal(event.payload.reason, 'end-of-sequence');
    assert.equal(event.simulationTimeAfterMs, 30000);
  }
}
for (const list of bySession.values()) {
  assert.equal(list[0].type, 'replay.open');
  assert.equal(list[0].origin, 'programmatic-restore');
  assert.equal(list[0].simulationTimeAfterMs, 0);
  for (let index = 0; index < list.length; index++)
    assert.equal(list[index].seq, index + 1, `session seq ${list[0].sessionId}`);
}
const types = Object.fromEntries([...new Set(events.map(event => event.type))].sort()
  .map(type => [type, events.filter(event => event.type === type).length]));
const result = { kind: 'gate-6-independent-activity-audit', activityPath, actualEvents: events.length,
  sessions: bySession.size, types, checksPassed: true };
if (process.argv[3]) await writeFile(resolve(process.argv[3]), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ actualEvents: events.length, sessions: bySession.size, checksPassed: true }));
