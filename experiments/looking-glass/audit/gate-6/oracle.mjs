// Independent Gate 6 expectations from the frozen Gate 2 source and reference files.
// This module deliberately imports nothing from local-models/ or docs/gate-6/.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = relative => readFileSync(resolve(root, relative));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (_, child) => child && !Array.isArray(child) && typeof child === 'object'
  ? Object.fromEntries(Object.keys(child).sort().map(key => [key, child[key]])) : child);

const sourceBytes = read('docs/gate-2/fictional-records.json');
const referenceBytes = read('docs/gate-2/reference-mappings.json');
assert.equal(sha256(sourceBytes), 'c58b2e2fe35a1bbc8995978a2efe59073c29f8cb14b445bb6b45716e4a606c36');
assert.equal(sha256(referenceBytes), '45d519af661c38b46d73bad00c179491e4c2be7ce13648a45f8e80d8c81a50d8');
const source = JSON.parse(sourceBytes);
const references = JSON.parse(referenceBytes);
assert.equal(sha256(read(source.sourceDocument.path)), source.sourceDocument.sha256);
const byId = Object.fromEntries(source.records.map(record => [record.id, record]));
assert.deepEqual(Object.keys(byId).sort(), ['venue-field', 'venue-hall', 'venue-studio', 'weather-context']);
assert.deepEqual(references.referenceDefinitions.map(reference => reference.id), ['R_CAPACITY_60', 'R_EXISTING_ACCESS']);
for (const record of source.records) {
  const { contentSha256, ...content } = record;
  assert.equal(sha256(canonical(content)), contentSha256, `Gate 2 record hash: ${record.id}`);
}

const weather = byId['weather-context'];
const expectedAssignments = {
  R_CAPACITY_60: { 'venue-hall': 'yes', 'venue-field': 'yes', 'venue-studio': 'no', 'weather-context': null },
  R_EXISTING_ACCESS: { 'venue-hall': 'no', 'venue-field': 'yes', 'venue-studio': 'yes', 'weather-context': null },
};
for (const [referenceId, expected] of Object.entries(expectedAssignments)) {
  const frozen = references.expectedAssignments[referenceId];
  assert.equal(frozen.length, 4);
  for (const assignment of frozen) {
    const record = byId[assignment.recordId];
    assert.equal(assignment.recordSha256, record.contentSha256);
    assert.equal(assignment.answer, expected[record.id]);
    assert.equal(assignment.status, expected[record.id] === null ? 'unmapped' : 'mapped');
  }
}

function equipment(venue) {
  const items = [];
  if (venue.facts.requiredAccessEquipment) items.push({ kind: 'access', name: venue.facts.requiredAccessEquipment.name,
    tokens: venue.facts.requiredAccessEquipment.costTokens,
    evidence: [`${venue.id}.facts.requiredAccessEquipment`] });
  if (venue.facts.requiredPowerEquipment) items.push({ kind: 'power', name: venue.facts.requiredPowerEquipment.name,
    tokens: venue.facts.requiredPowerEquipment.costTokens,
    evidence: [`${venue.id}.facts.requiredPowerEquipment`] });
  if (venue.facts.shelterRequiredInRain && weather.facts.rainCertain) {
    items.push({ kind: 'rain-shelter', name: 'rain shelter', tokens: venue.facts.shelterCostTokens,
      evidence: [`${venue.id}.facts.shelterRequiredInRain`, `${venue.id}.facts.shelterCostTokens`, 'weather-context.facts.rainCertain'] });
  }
  return items;
}

function receiver(venueId, minimumCapacityHouseholds) {
  const venue = byId[venueId];
  const requiredEquipment = equipment(venue);
  const venueEquipmentCostTokens = venue.facts.hireTokens + requiredEquipment.reduce((sum, item) => sum + item.tokens, 0);
  const capacityPass = venue.facts.capacityHouseholds >= minimumCapacityHouseholds;
  const budgetPass = venueEquipmentCostTokens <= 8;
  return { venueId, minimumCapacityHouseholds, candidateCapacityHouseholds: venue.facts.capacityHouseholds,
    hireTokens: venue.facts.hireTokens, requiredEquipment, venueEquipmentCostTokens,
    capacityPass, budgetPass, numericScreenPass: capacityPass && budgetPass,
    equipmentAvailability: 'unknown-not-supplied' };
}

const receiving = {
  receiver1: [receiver('venue-hall', 60), receiver('venue-field', 60)],
  receiver2: [receiver('venue-hall', 70), receiver('venue-field', 70)],
};
assert.deepEqual(receiving.receiver1.map(result => [result.venueEquipmentCostTokens, result.capacityPass, result.budgetPass]),
  [[6, true, true], [9, true, false]]);
assert.deepEqual(receiving.receiver2.map(result => [result.venueEquipmentCostTokens, result.capacityPass, result.budgetPass]),
  [[6, false, true], [9, true, false]]);

// A receiver confined to the declared v1 outward fields cannot infer omitted costs or obligations.
const requiredOutwardFields = ['candidateCapacityHouseholds', 'venueEquipmentCostTokens', 'requiredEquipment'];
const v1AllowedFields = ['localId', 'label', 'reference', 'venueId', 'source', 'criterionAnswer', 'criterionReason',
  'summaryRule', 'summaryVersion', 'dependencyDetail', 'localManifestPointer'];
assert.deepEqual(requiredOutwardFields.filter(field => v1AllowedFields.includes(field)), []);

const result = {
  audit: 'gate-6-independent-oracle',
  source: { path: 'docs/gate-2/fictional-records.json', sha256: sha256(sourceBytes),
    recordSha256: Object.fromEntries(source.records.map(record => [record.id, record.contentSha256])) },
  references: { path: 'docs/gate-2/reference-mappings.json', sha256: sha256(referenceBytes),
    definitions: references.referenceDefinitions.map(({ id, version, mappingVersion, wording, scope, author, criteria }) =>
      ({ id, version, mappingVersion, wording, scope, author, criteria })),
    expectedAssignments },
  receiving,
  v1: { status: 'insufficient-summary', requiredOutwardFields,
    principle: 'The receiver sees only the declared outward payload; omission is not false or zero.' },
  invariants: [
    'R_CAPACITY_60@1 remains at 60 when derivative receiver minimum changes to 70.',
    'Both local manifests retain their chosen references across larger-view reference switches.',
    'The identical weather-context source identity supports shares-source; no source supports Hall-to-Field transfer.',
    'Layout proximity cannot alter relation support, receiver results or source identity.'
  ],
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(`Gate 6 oracle passed: four record hashes, two reference tables, Hall 6/8, Field 9/8, receiver 60→70.\n`);
}
export { result as independentGate6Oracle };
