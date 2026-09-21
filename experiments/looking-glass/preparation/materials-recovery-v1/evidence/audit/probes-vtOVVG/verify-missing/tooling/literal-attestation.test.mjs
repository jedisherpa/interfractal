import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { readJson } from './package-utils.mjs';
import { validateSnapshotRecord } from './snapshot-contract.mjs';

const base = resolve(import.meta.dirname, '..');
const fixture = readJson(join(import.meta.dirname, 'fixtures/SYNTHETIC_VALID_NOT_RESEARCH_OUTPUT.json'));
const world = readJson(join(base, 'design/world.json'));
const allocations = readJson(join(base, 'design/allocations.json'));
const development = readJson(join(base, 'design/development-tasks.json'));
const schema = readJson(join(base, 'design/snapshot.schema.json'));
const expected = {
  phase: 'initial', agentId: 'A1', snapshotId: fixture.snapshotId,
  modelId: fixture.identity.modelId, modelVersion: fixture.identity.modelVersion,
  cardIds: allocations.packets[0].cardIds,
  inputManifestSha256: fixture.inputManifestSha256,
  settingsManifestSha256: fixture.identity.settingsManifestSha256,
};
const cases = [
  { predicate: 'understands', arguments: { actor: 'ARA', plan: 'P12', planVersion: 1 }, sourceKind: 'source_stipulation', evidenceKind: 'stipulated_source', positive: 'F-C04-1', negative: 'F-SYN-UNDERSTANDS-N' },
  { predicate: 'endorses', arguments: { actor: 'ARA', plan: 'P12', planVersion: 1 }, sourceKind: 'source_stipulation', evidenceKind: 'stipulated_source', positive: 'F-SYN-ENDORSES-P', negative: 'F-C04-2' },
  { predicate: 'resource_commitment', arguments: { actor: 'ARA', plan: 'P12', planVersion: 1, resource: 'press', quantity: 6 }, sourceKind: 'source_stipulation', evidenceKind: 'stipulated_source', positive: 'F-C04-3', negative: 'F-SYN-COMMITMENT-N' },
  { predicate: 'model_attributes_endorsement', arguments: { actor: 'ARA', plan: 'P12', planVersion: 1 }, sourceKind: 'model_attribution', evidenceKind: 'synthetic_model_artifact', positive: 'F-SYN-ATTRIBUTION-P', negative: 'F-SYN-ATTRIBUTION-N' },
];
const testWorld = structuredClone(world);
const card = testWorld.cards.find(item => item.id === 'C04');
for (const item of cases) for (const [polarity, value] of [['positive', true], ['negative', false]]) {
  const id = item[polarity];
  if (!card.claims.some(claim => claim.id === id)) card.claims.push({ id, predicate: item.predicate, arguments: item.arguments, value, evidenceKind: item.evidenceKind, lineageId: id });
}
function record(item, polarity, sourceIds, sourceKind = item.sourceKind) {
  const result = structuredClone(fixture);
  result.interpretations = [{
    id: `I-SYN-${item.predicate}-${polarity}`, version: 1,
    predicate: item.predicate, arguments: item.arguments,
    status: polarity === 'positive' ? 'supported' : 'refuted',
    supportingClaimIds: polarity === 'positive' ? sourceIds : [],
    conflictingClaimIds: polarity === 'negative' ? sourceIds : [],
    sourceKind, speechAct: null, alternatives: [], confidence: null,
  }];
  return result;
}
const validate = value => validateSnapshotRecord(value, schema, testWorld, allocations, expected, development);
assert.deepEqual(validate(fixture), []);
for (const item of cases) for (const polarity of ['positive', 'negative']) {
  const ruleOnly = record(item, polarity, ['R07'], 'model_inference');
  assert.match(validate(ruleOnly).join(' '), /requires a supplied typed source witness; rules alone are insufficient/, `${item.predicate}/${polarity}: rule-only must fail`);
  const ruleOnlyWithProperKind = record(item, polarity, ['R07']);
  assert.match(validate(ruleOnlyWithProperKind).join(' '), /requires a supplied typed source witness/, `${item.predicate}/${polarity}: sourceKind cannot replace witness`);
  const witnessed = record(item, polarity, [item[polarity], 'R07']);
  assert.deepEqual(validate(witnessed), [], `${item.predicate}/${polarity}: exact supplied claim plus rule must pass`);
  const mislabeledInference = record(item, polarity, [item[polarity]], 'model_inference');
  assert.match(validate(mislabeledInference).join(' '), /requires (source_stipulation|model_attribution), not model inference/, `${item.predicate}/${polarity}: model inference cannot attest`);
}
const wrongKindWorld = structuredClone(testWorld);
wrongKindWorld.cards.find(item => item.id === 'C04').claims.find(claim => claim.id === 'F-SYN-ENDORSES-P').evidenceKind = 'synthetic_model_artifact';
assert.match(validateSnapshotRecord(record(cases[1], 'positive', ['F-SYN-ENDORSES-P']), schema, wrongKindWorld, allocations, expected, development).join(' '), /evidence kind/);
const grantFiveAsLiteralSix = record(cases[2], 'positive', ['F-C04-3', 'R05']);
grantFiveAsLiteralSix.interpretations[0].arguments.quantity = 5;
assert.match(validate(grantFiveAsLiteralSix).join(' '), /exact predicate, roles, value and evidence kind/);
process.stdout.write('literal attestation polarity and witness checks passed (synthetic; zero research outputs)\n');
