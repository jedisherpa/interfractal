// Compare saved observations from the same real browser across restore/reopen/reload.
// This reads evidence only and never drives the app or synthesizes events.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runId = process.argv[3] || 'G6-LOCAL-003';
const observations = JSON.parse(await readFile(resolve(root, 'evidence/gate-6/browser-observations.json')));
const run = JSON.parse(await readFile(resolve(root, `local-models/runs/${runId}/run.json`)));
const times = [0, 5000, 10000, 15000, 20000, 25000, 30000];
const phases = ['baseline', 'restored', 'reopened', 'reloaded'];
const observed = Object.fromEntries(phases.map(phase => [phase, []]));
for (const ms of times) {
  const rows = phases.map(phase => {
    const label = `${phase}-checkpoint-${ms}`;
    const matches = observations.filter(item => item.label === label && item.state?.runId === runId);
    assert.equal(matches.length, 1, `one actual observation for ${label}`);
    const row = matches[0];
    assert.equal(row.state.buildId, run.buildId, `${label} build`);
    assert.equal(row.state.fullState.simulationTimeMs, ms, `${label} time`);
    observed[phase].push({ observation: row.index, checkpointSha256: row.state.checkpointSha256 });
    return row;
  });
  for (const row of rows.slice(1)) {
    for (const key of ['checkpointSha256', 'sourceSha256', 'localSha256', 'relationsSha256',
      'mappingSha256', 'summarySha256', 'receiverSha256', 'summaryHistorySha256'])
      assert.equal(row.state[key], rows[0].state[key], `${ms} ${row.label} ${key}`);
    assert.deepEqual(row.state.semantic, rows[0].state.semantic, `${ms} ${row.label} semantic`);
  }
}
assert.equal(new Set(observed.baseline.map(row => row.checkpointSha256)).size, times.length);
const result = { kind: 'gate-6-independent-checkpoint-repeat-audit', runId,
  buildId: run.buildId, timesMs: times, phases: observed, checksPassed: true };
if (process.argv[2]) await writeFile(resolve(process.argv[2]), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ times: times.length, phases: phases.length, checksPassed: true }));
