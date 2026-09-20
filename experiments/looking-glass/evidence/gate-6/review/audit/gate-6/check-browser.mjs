// Audit root's saved actual browser observations. This script never drives a browser.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { independentGate6Oracle as oracle } from './oracle.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runId = process.argv[3] || 'G6-LOCAL-003';
const observations = JSON.parse(await readFile(resolve(root, 'evidence/gate-6/browser-observations.json')));
const frozen = JSON.parse(await readFile(resolve(root, 'docs/gate-2/reference-mappings.json')));
const run = JSON.parse(await readFile(resolve(root, `local-models/runs/${runId}/run.json`)));
const actual = observations.filter(o => o.state?.runId === runId);
assert.ok(actual.length > 0);
const first = actual[0];
const baselineHashes = Object.fromEntries(['sourceSha256', 'localSha256', 'relationsSha256', 'summaryHistorySha256']
  .map(key => [key, first.state[key]]));
const summaries = [];
for (const o of actual) {
  const s = o.state, full = s.fullState, env = s.environment, controls = full.controls;
  assert.equal(o.url, 'http://127.0.0.1:43999/', `URL ${o.label}`);
  assert.equal(o.title, 'Gate 6 · Local views across scales', `title ${o.label}`);
  assert.equal(s.runId, run.runId);
  assert.equal(s.buildId, run.buildId);
  assert.equal(full.simulationTimeMs % 100, 0);
  assert.ok(full.simulationTimeMs >= 0 && full.simulationTimeMs <= 30000);
  assert.deepEqual(env.viewport, o.outer.viewport, `viewport ${o.label}`);
  assert.deepEqual(env.scroll, o.outer.scroll, `scroll ${o.label}`);
  assert.deepEqual(env.scenes, o.outer.sceneRects, `scene rects ${o.label}`);
  assert.equal(env.documentClientWidth, o.outer.documentClientWidth);
  assert.equal(env.documentScrollWidth, o.outer.documentScrollWidth);
  assert.ok(env.documentScrollWidth <= env.documentClientWidth + 1, `horizontal overflow ${o.label}`);
  assert.deepEqual(o.diagnostics.viewport, env.viewport);
  assert.deepEqual(o.diagnostics.scenes, env.scenes);
  assert.deepEqual(o.diagnostics.scroll, env.scroll);
  assert.equal(env.scenes['local-view'].visible, controls.view === 'graph');
  assert.equal(env.scenes['plain-view'].visible, controls.view === 'plain');
  for (const [key, expected] of Object.entries(baselineHashes)) assert.equal(s[key], expected, `${key} ${o.label}`);
  assert.equal(full.sourceRecords.length, 4);
  for (const record of full.sourceRecords)
    assert.equal(record.contentSha256, oracle.source.recordSha256[record.id], `record ${record.id} ${o.label}`);
  assert.deepEqual(full.contexts.map(c => c.id), ['G6_LOCAL_HALL', 'G6_LOCAL_FIELD']);
  assert.deepEqual(full.contexts.map(c => c.manifest.retainedLocalReference.id),
    ['R_CAPACITY_60', 'R_EXISTING_ACCESS']);
  assert.deepEqual(full.contexts.map(c => c.manifest.recordRefs.map(r => r.recordId)),
    [['venue-hall', 'weather-context'], ['venue-field', 'weather-context']]);
  assert.equal(full.supportedRelations.length, 4);
  assert.equal(full.claim.id, 'G6-CLAIM-TRANSFER');
  assert.equal(full.claim.status, 'unsupported');
  assert.deepEqual(full.claim.evidence, []);
  assert.equal(full.claim.includedInSupportedGraph, false);
  assert.ok(!full.supportedRelations.some(r => r.id === full.claim.id));
  for (const [referenceId, expected] of Object.entries(frozen.expectedAssignments)) {
    const observed = full.assignments[referenceId];
    assert.equal(observed.length, 4);
    for (const item of observed) {
      const original = expected.find(row => row.recordId === item.recordId);
      for (const key of ['recordSha256', 'answer', 'status', 'baseId', 'reason'])
        assert.equal(item[key], original?.[key], `${referenceId} ${item.recordId} ${key} ${o.label}`);
    }
  }
  assert.equal(full.largerReference.id, controls.referenceId);
  assert.equal(full.requirement.version, controls.requirementVersion);
  assert.equal(full.requirement.minimumCapacityHouseholds, controls.requirementVersion === 1 ? 60 : 70);
  assert.equal(full.requirement.maximumVenueEquipmentCostTokens, 8);
  for (const [index, context] of full.contexts.entries()) {
    assert.equal(context.activeSummary.summaryVersion, controls.summaryVersion);
    assert.equal(context.activeSummary.reference.id, controls.referenceId);
    assert.equal(context.expanded, controls.expandedIds.includes(context.id));
    const expectedAnswer = oracle.references.expectedAssignments[controls.referenceId][index === 0 ? 'venue-hall' : 'venue-field'];
    assert.equal(context.outerCriterion.answer, expectedAnswer);
    assert.equal(context.activeSummary.criterion.answer, expectedAnswer);
    if (controls.summaryVersion === 1) {
      assert.equal(context.outwardEvaluation.status, 'insufficient-summary');
      assert.equal(context.outwardEvaluation.numericScreenPass, null);
      assert.deepEqual(context.outwardEvaluation.missingFields.slice(0, 3), oracle.v1.requiredOutwardFields);
      for (const field of ['candidateCapacityHouseholds', 'venueEquipmentCostTokens', 'requiredEquipment',
        'numericScreenPass', 'capacityPass', 'budgetPass'])
        assert.equal(Object.hasOwn(context.activeSummary, field), false, `v1 leak ${field} ${o.label}`);
    } else {
      const expected = (controls.requirementVersion === 1 ? oracle.receiving.receiver1 : oracle.receiving.receiver2)[index];
      assert.equal(context.activeSummary.candidateCapacityHouseholds, expected.candidateCapacityHouseholds);
      assert.equal(context.activeSummary.venueEquipmentCostTokens, expected.venueEquipmentCostTokens);
      assert.equal(context.activeSummary.requiredEquipment.length, expected.requiredEquipment.length);
      assert.equal(context.outwardEvaluation.capacityPass, expected.capacityPass);
      assert.equal(context.outwardEvaluation.budgetPass, expected.budgetPass);
      assert.equal(context.outwardEvaluation.numericScreenPass, expected.numericScreenPass);
      assert.equal(context.activeSummary.availability, 'unknown-not-supplied');
    }
  }
  if (controls.view === 'graph' && !controls.claimsOpen && !controls.inspectorOpen && !controls.sourceListOpen)
    assert.ok(!o.visibleText.includes('CLAIMED TRANSFER · UNSUPPORTED'), `closed claim visible ${o.label}`);
  if (controls.view === 'graph' && controls.claimsOpen)
    assert.ok(o.visibleText.includes('CLAIMED TRANSFER · UNSUPPORTED'), `open claim absent ${o.label}`);
  summaries.push({ index: o.index, label: o.label, timeMs: full.simulationTimeMs,
    referenceId: controls.referenceId, receiverVersion: controls.requirementVersion,
    summaryVersion: controls.summaryVersion, representation: controls.view,
    claimsOpen: controls.claimsOpen, checkpointSha256: s.checkpointSha256 });
}
const checkpoints = [0, 5000, 10000, 15000, 20000, 25000, 30000].map(ms => {
  const observation = actual.find(o => o.label === `baseline-checkpoint-${ms}`);
  assert.ok(observation, `actual baseline ${ms}`);
  assert.equal(observation.state.fullState.simulationTimeMs, ms);
  return observation;
});
const c0 = checkpoints[0], c10 = checkpoints[2], c30 = checkpoints[6];
assert.deepEqual(c0.state.semantic, c10.state.semantic);
assert.deepEqual(c0.state.semantic, c30.state.semantic);
assert.notEqual(c0.state.checkpointSha256, c10.state.checkpointSha256);
assert.notEqual(c0.state.checkpointSha256, c30.state.checkpointSha256);
const result = { kind: 'gate-6-independent-browser-audit', runId: run.runId, buildId: run.buildId,
  observationCount: actual.length, checkpointBaselines: checkpoints.length, summaries, checksPassed: true };
if (process.argv[2]) await writeFile(resolve(process.argv[2]), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ observationCount: actual.length, checkpointBaselines: checkpoints.length, checksPassed: true }));
