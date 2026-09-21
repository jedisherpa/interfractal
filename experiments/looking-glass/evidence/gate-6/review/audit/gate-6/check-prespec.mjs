// Cross-check Astra's predeclared fixture/predictions against frozen Gate 2 bytes
// and the separately derived local oracle. No implementation modules are imported.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { independentGate6Oracle as oracle } from './oracle.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = path => readFile(resolve(root, path));
const fixture = JSON.parse(await read('docs/gate-6/fixture.json'));
const predictions = JSON.parse(await read('docs/gate-6/independent-predictions.json'));
const freeze = JSON.parse(await read('docs/gate-6/PRESPEC_FREEZE.json'));
const source = JSON.parse(await read('docs/gate-2/fictional-records.json'));
const reference = JSON.parse(await read('docs/gate-2/reference-mappings.json'));
const byId = Object.fromEntries(source.records.map(record => [record.id, record]));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (_, child) => child && !Array.isArray(child) && typeof child === 'object'
  ? Object.fromEntries(Object.keys(child).sort().map(key => [key, child[key]])) : child);
assert.equal(freeze.files.length, 5);
for (const file of freeze.files) {
  const bytes = await read(file.path);
  assert.equal(sha256(bytes), file.sha256, `frozen prespec ${file.path}`);
  assert.equal(bytes.length, file.bytes, `frozen prespec length ${file.path}`);
}
const sourceHashes = Object.fromEntries(fixture.sourcePins.map(pin => [pin.path, pin.sha256]));
assert.equal(sourceHashes[oracle.source.path], oracle.source.sha256);
assert.equal(sourceHashes[oracle.references.path], oracle.references.sha256);
assert.deepEqual(predictions.sourcePins, fixture.sourcePins);
for (const pin of fixture.sourcePins) {
  const bytes = await read(pin.path);
  assert.equal(sha256(bytes), pin.sha256, `source pin ${pin.path}`);
  assert.equal(bytes.length, pin.bytes, `source length ${pin.path}`);
}
assert.equal(fixture.sourceRecordCount, 4);
for (const recordRef of fixture.sourceRecordRefs) assert.equal(recordRef.contentSha256, byId[recordRef.recordId]?.contentSha256);
assert.deepEqual(fixture.sourceRecordRefs.map(ref => ref.recordId), source.records.map(record => record.id));
for (const identity of fixture.sourceReferenceIdentities) {
  const original = reference.referenceDefinitions.find(item => item.id === identity.id);
  assert.ok(original, `reference ${identity.id}`);
  assert.equal(identity.version, original.version);
  assert.equal(identity.mappingVersion, original.mappingVersion);
  assert.equal(identity.definitionSha256, sha256(canonical(original)));
}
for (const local of fixture.localContexts) {
  const { contentSha256, ...content } = local;
  assert.equal(sha256(canonical(content)), contentSha256, `local manifest ${local.id}`);
  assert.deepEqual(local.recordRefs.map(ref => ref.recordId), [local.selectedVenueId, 'weather-context']);
  for (const ref of local.recordRefs) assert.equal(ref.contentSha256, byId[ref.recordId]?.contentSha256);
  assert.deepEqual(local.alternativeReferences, fixture.sourceReferenceIdentities);
  assert.ok(fixture.sourceReferenceIdentities.some(ref => ref.id === local.retainedLocalReference.id));
}
assert.deepEqual(fixture.localContexts.map(local => [local.id, local.retainedLocalReference.id]),
  [['G6_LOCAL_HALL', 'R_CAPACITY_60'], ['G6_LOCAL_FIELD', 'R_EXISTING_ACCESS']]);
assert.deepEqual(predictions.localContextContentHashes,
  fixture.localContexts.map(local => ({ localId: local.id, contentSha256: local.contentSha256 })));

const depsById = Object.fromEntries(fixture.dependencies.map(dep => [dep.id, dep]));
assert.equal(fixture.dependencies.length, 3);
for (const dep of fixture.dependencies) {
  assert.equal(dep.availability, 'unknown-not-supplied');
  for (const evidence of dep.evidence) {
    const original = byId[evidence.recordId];
    assert.equal(evidence.contentSha256, original?.contentSha256);
    if (evidence.field !== '*') {
      let value = original;
      for (const part of evidence.field.split('.')) value = value?.[part];
      assert.notEqual(value, undefined, `${dep.id} ${evidence.recordId}.${evidence.field}`);
    }
  }
}
assert.equal(depsById.G6_DEP_RAMP.costTokens, oracle.receiving.receiver1[0].requiredEquipment[0].tokens);
assert.equal(depsById.G6_DEP_GENERATOR.costTokens, oracle.receiving.receiver1[1].requiredEquipment[0].tokens);
assert.equal(depsById.G6_DEP_SHELTER.costTokens, oracle.receiving.receiver1[1].requiredEquipment[1].tokens);
assert.equal(depsById.G6_DEP_SHELTER.evidence.filter(item => item.field === 'facts.fieldShelterCostTokens').length, 1);
assert.equal(fixture.receiverRequirements.length, 2);
assert.deepEqual(fixture.receiverRequirements.map(r => [r.version, r.minimumCapacityHouseholds, r.maximumVenueEquipmentCostTokens]),
  [[1, 60, 8], [2, 70, 8]]);
assert.deepEqual(fixture.receiverRequirements[1].changedFields,
  [{ field: 'minimumCapacityHouseholds', before: 60, after: 70 }]);
assert.deepEqual(fixture.summaryRules.v1ForbiddenFields,
  ['candidateCapacityHouseholds', 'venueEquipmentCostTokens', 'requiredEquipment',
    'acceptedForCostAndCapacityScreen', 'numericScreenPass', 'capacityPass', 'budgetPass']);
assert.equal(fixture.summaryRules.v1RequiredReceiverStatus, 'insufficient-summary');
assert.deepEqual(predictions.initialOutward.missingRequiredFields, oracle.v1.requiredOutwardFields);
for (const expected of predictions.repairedLocalResults) {
  const index = expected.localId === 'G6_LOCAL_HALL' ? 0 : 1;
  for (const [version, actual] of [oracle.receiving.receiver1[index], oracle.receiving.receiver2[index]].entries()) {
    const predicted = expected.receiverResults[version];
    assert.equal(expected.venueEquipmentCostTokens, actual.venueEquipmentCostTokens);
    assert.equal(expected.candidateCapacityHouseholds, actual.candidateCapacityHouseholds);
    assert.equal(predicted.capacityPass, actual.capacityPass);
    assert.equal(predicted.budgetPass, actual.budgetPass);
    assert.equal(predicted.numericScreenPass, actual.numericScreenPass);
  }
}
for (const [refId, assignments] of Object.entries(predictions.fullReferenceAssignments)) {
  const frozen = reference.expectedAssignments[refId];
  for (const predicted of assignments) {
    const original = frozen.find(item => item.recordId === predicted.recordId);
    for (const key of ['recordSha256', 'answer', 'status', 'baseId', 'reason'])
      assert.equal(predicted[key], original?.[key], `${refId} ${predicted.recordId} ${key}`);
  }
}
assert.equal(fixture.supportedRelations.length, 4);
assert.deepEqual(fixture.supportedRelations.map(relation => relation.id), predictions.relations.supportedRelationIds);
assert.equal(fixture.unsupportedClaim.id, 'G6-CLAIM-TRANSFER');
assert.equal(fixture.unsupportedClaim.status, 'unsupported');
assert.deepEqual(fixture.unsupportedClaim.evidence, []);
assert.equal(fixture.unsupportedClaim.includedInSupportedGraph, false);
for (const relation of fixture.supportedRelations) {
  assert.equal(relation.status, 'supported');
  assert.ok(relation.evidence.length > 0);
  for (const item of relation.evidence) assert.equal(item.contentSha256, byId[item.recordId]?.contentSha256);
}
const revisions = Object.fromEntries(fixture.summaryRevisionHistory.map(item => [item.id, item]));
assert.equal(Object.keys(revisions).length, 6);
for (const local of fixture.localContexts) for (const revision of [1, 2, 3]) {
  const item = revisions[`${local.id}-SUMMARY-${revision}`];
  assert.equal(item?.localId, local.id);
  assert.equal(item.previousRevisionId, revision === 1 ? null : `${local.id}-SUMMARY-${revision - 1}`);
  assert.equal(item.trigger.version, revision === 3 ? 2 : 1);
  assert.equal(item.author, fixture.author);
  for (const ref of item.sourceRecordRefs) assert.equal(ref.contentSha256, byId[ref.recordId]?.contentSha256);
}
assert.deepEqual(predictions.replayCheckpointStates.map(item => item.timeMs), [0, 5000, 10000, 15000, 20000, 25000, 30000]);
for (const index of [0, 2, 6]) {
  const { timeMs, ...state } = predictions.replayCheckpointStates[index];
  const { timeMs: baselineMs, ...baseline } = predictions.replayCheckpointStates[0];
  assert.deepEqual(state, baseline, `baseline semantic state at ${timeMs}`);
}
assert.deepEqual(fixture.comparisonRoutes.map(route => [route.id, route.expectedNavigationActions, route.expectedCorrectionActions]),
  [['N1', 3, 1], ['N2', 2, 0]]);

const result = { kind: 'gate-6-independent-prespec-cross-check', sourcePins: fixture.sourcePins,
  recordCount: 4, referenceCount: 2, localCount: 2, dependencyCount: 3, supportedRelationCount: 4,
  summaryRevisionCount: 6, checkpointCount: 7, checksPassed: true };
await writeFile(resolve(root, 'audit/gate-6/prespec-cross-check.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));
