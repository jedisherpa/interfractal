// Conformance of an exact Gate 6 model snapshot against the independent oracle.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { independentGate6Oracle as oracle } from './oracle.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const modulePath = resolve(process.argv[2] || resolve(root, 'local-models/model.mjs'));
const moduleDir = dirname(modulePath);
const m = await import(pathToFileURL(modulePath).href);
const read = path => readFile(resolve(moduleDir, path));
const recordsBytes = await read('fictional-records.json');
const referencesBytes = await read('reference-mappings.json');
const fixtureBytes = await read('fixture.json');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256(recordsBytes), oracle.source.sha256);
assert.equal(sha256(referencesBytes), oracle.references.sha256);
const records = JSON.parse(recordsBytes).records;
const references = JSON.parse(referencesBytes);
const fixture = JSON.parse(fixtureBytes);
const at = (timeMs, overrides = {}) => m.modelAt(timeMs, records, references, fixture, overrides);
assert.match(m.RUN_ID, /^G6-LOCAL-00[123]$/);
assert.equal(m.DURATION_MS, 30000);
assert.equal(m.SAMPLE_MS, 100);
assert.equal(m.STEP_MS, 1000);
assert.deepEqual(m.CHECKPOINTS_MS, [0, 5000, 10000, 15000, 20000, 25000, 30000]);
const predicted = JSON.parse(await readFile(resolve(root, 'docs/gate-6/independent-predictions.json')));

for (const checkpoint of predicted.replayCheckpointStates) {
  const actual = at(checkpoint.timeMs);
  assert.equal(actual.simulationTimeMs, checkpoint.timeMs);
  assert.equal(actual.largerReference.id, checkpoint.largerReferenceId);
  assert.equal(actual.requirement.version, checkpoint.receiverVersion);
  assert.equal(actual.controls.summaryVersion, checkpoint.summaryRevision);
  assert.deepEqual(actual.controls.expandedIds, checkpoint.expandedLocalIds);
  assert.equal(actual.controls.selectedContextId, checkpoint.selectedLocalId);
  assert.equal(actual.controls.traceMode, checkpoint.traceMode);
  assert.equal(actual.controls.traceLocalId, checkpoint.traceLocalId);
  assert.equal(actual.controls.alternativesOpen, checkpoint.compareReferences);
  assert.equal(actual.controls.claimsOpen, checkpoint.showClaims);
  assert.equal(actual.controls.inspectedRelationId, checkpoint.selectedRelationId);
  assert.equal(actual.controls.view, checkpoint.representation);
  assert.equal(actual.controls.layout, checkpoint.layout);
}
for (const timeMs of [0, 5000, 10000, 15000, 20000, 25000])
  assert.deepEqual(m.scheduledAt(timeMs + 4900 < 30000 ? timeMs + 4900 : timeMs), m.scheduledAt(timeMs), `left interval ${timeMs}`);
for (const timeMs of [-1000, 0, 8050, 30000, 31000])
  assert.equal(m.clampTime(timeMs), Math.max(0, Math.min(30000, Math.round(timeMs / 100) * 100)));
for (const bad of [NaN, Infinity, -Infinity]) assert.throws(() => m.clampTime(bad));

const baseline = at(0);
const access = at(0, { referenceId: 'R_EXISTING_ACCESS' });
const roundTrip = at(0, { referenceId: 'R_CAPACITY_60' });
assert.deepEqual(m.checkpointState(roundTrip), m.checkpointState(baseline));
assert.deepEqual(m.sourceState(access), m.sourceState(baseline));
assert.deepEqual(m.localState(access), m.localState(baseline));
assert.deepEqual(m.supportedRelationState(access), m.supportedRelationState(baseline));
assert.deepEqual(m.summaryHistoryState(access), m.summaryHistoryState(baseline));
assert.deepEqual(baseline.contexts.map(c => c.manifest.retainedLocalReference.id),
  ['R_CAPACITY_60', 'R_EXISTING_ACCESS']);
for (const refId of Object.keys(oracle.references.expectedAssignments)) {
  const actual = baseline.assignments[refId];
  const frozen = references.expectedAssignments[refId];
  assert.equal(actual.length, 4);
  for (const item of actual) {
    const original = frozen.find(entry => entry.recordId === item.recordId);
    for (const key of ['recordSha256', 'answer', 'status', 'reason'])
      assert.equal(item[key], original?.[key], `${refId} ${item.recordId} ${key}`);
  }
}
for (const c of baseline.contexts) {
  assert.equal(c.outwardEvaluation.status, 'insufficient-summary');
  assert.deepEqual(c.outwardEvaluation.missingFields.slice(0, 3), oracle.v1.requiredOutwardFields);
  for (const field of fixture.summaryRules.v1ForbiddenFields)
    assert.equal(Object.hasOwn(c.activeSummary, field), false, `v1 ${c.id} leaks ${field}`);
  assert.equal(c.activeSummary.summaryVersion, 1);
}
assert.equal(baseline.contexts[0].activeSummary.criterion.answer, 'yes');
assert.equal(baseline.contexts[1].activeSummary.criterion.answer, 'yes');
assert.equal(baseline.contexts[0].activeSummary.headline, baseline.contexts[1].activeSummary.headline);
assert.equal(access.contexts[0].activeSummary.criterion.answer, 'no');
assert.equal(access.contexts[1].activeSummary.criterion.answer, 'yes');
assert.ok(!access.contexts[0].activeSummary.headline.toLowerCase().includes('capacity'));

for (const [version, timeMs] of [[1, 15000], [2, 20000]]) {
  const state = at(timeMs);
  for (const [index, c] of state.contexts.entries()) {
    const expected = version === 1 ? oracle.receiving.receiver1[index] : oracle.receiving.receiver2[index];
    const outward = c.activeSummary;
    assert.equal(outward.summaryVersion, version + 1);
    assert.equal(outward.candidateCapacityHouseholds, expected.candidateCapacityHouseholds);
    assert.equal(outward.venueEquipmentCostTokens, expected.venueEquipmentCostTokens);
    assert.equal(outward.requiredEquipment.length, expected.requiredEquipment.length);
    assert.equal(outward.receiverVersion, version);
    assert.equal(c.outwardEvaluation.capacityPass, expected.capacityPass);
    assert.equal(c.outwardEvaluation.budgetPass, expected.budgetPass);
    assert.equal(c.outwardEvaluation.numericScreenPass, expected.numericScreenPass);
    assert.equal(c.summaryHistory.length, 3);
    for (const item of c.summaryHistory) assert.equal(item.author, fixture.author);
  }
}
assert.equal(at(20000).largerReference.id, 'R_CAPACITY_60');
assert.equal(at(20000).contexts[0].activeSummary.criterion.answer, 'yes');
assert.equal(at(20000).contexts[0].outwardEvaluation.capacityPass, false);
assert.equal(at(20000).contexts[1].outwardEvaluation.budgetPass, false);

const valid = at(15000).contexts[1].activeSummary;
const invalidPayloads = [
  { ...valid, requiredEquipment: [], requiredEquipmentComplete: false },
  { ...valid, requiredEquipment: valid.requiredEquipment.map(({ evidence, ...rest }) => rest) },
  { ...valid, requiredEquipment: valid.requiredEquipment.map(item => ({ ...item, evidence: [] })) },
  { ...valid, requiredEquipment: valid.requiredEquipment.map(item => ({ ...item, costTokens: null })) },
  Object.fromEntries(Object.entries(valid).filter(([key]) => key !== 'receiverId' && key !== 'receiverVersion')),
  { ...valid, receiverMinimumCapacityHouseholds: null },
];
for (const payload of invalidPayloads)
  assert.equal(m.evaluateOutward(payload).status, 'insufficient-summary', 'incomplete outward evidence must stay insufficient');

const expanded = at(0, { expandedIds: ['G6_LOCAL_HALL', 'G6_LOCAL_FIELD'] });
const collapsed = at(0, { expandedIds: [] });
assert.deepEqual(m.localState(expanded), m.localState(collapsed));
assert.deepEqual(m.summaryState(expanded), m.summaryState(collapsed));
const plain = at(0, { view: 'plain' });
const close = at(0, { layout: 'close' });
for (const candidate of [plain, close]) {
  assert.deepEqual(m.semanticState(candidate), m.semanticState(baseline));
  assert.deepEqual(m.receiverState(candidate), m.receiverState(baseline));
}
assert.equal(baseline.supportedRelations.length, 4);
assert.equal(baseline.claim.id, 'G6-CLAIM-TRANSFER');
assert.equal(baseline.claim.status, 'unsupported');
assert.deepEqual(baseline.claim.evidence, []);
assert.ok(!baseline.supportedRelations.some(relation => relation.id === baseline.claim.id));
assert.deepEqual(at(25000).inspectedRelation.id, 'G6-CLAIM-TRANSFER');

const result = { kind: 'gate-6-exact-model-audit', runId: m.RUN_ID, modulePath, modelSha256: sha256(await readFile(modulePath)),
  sourceSha256: sha256(recordsBytes), referencesSha256: sha256(referencesBytes), fixtureSha256: sha256(fixtureBytes),
  checkpointCount: 7, historicalSourceRecords: 4, referenceTables: 2, localContexts: 2,
  receiverCases: 4, malformedOutwardCases: invalidPayloads.length, supportedRelations: 4, checksPassed: true };
if (process.argv[3]) await writeFile(resolve(process.argv[3]), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
