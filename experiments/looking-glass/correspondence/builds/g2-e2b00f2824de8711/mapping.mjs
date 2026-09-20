// Transparent, partial candidate rules over unchanged fictional records.
export function deriveAssignment(record, referenceId, records) {
  if (record.kind !== 'venue') return { recordId: record.id, recordSha256: record.contentSha256, status: 'unmapped', answer: null,
    baseId: null, displayPhaseRad: null, relevant: false,
    reason: 'Weather, shelter and budget context are outside this single capacity/access criterion. Retain all facts in the plain listing.' };
  const venueIndex = records.filter(r => r.kind === 'venue').findIndex(r => r.id === record.id);
  const phase = venueIndex * Math.PI / 2;
  const unknown = reason => ({ recordId: record.id, recordSha256: record.contentSha256, status: 'unmapped', answer: 'unknown',
    baseId: null, displayPhaseRad: null, relevant: false, reason });
  if (referenceId === 'R_CAPACITY_60') {
    const n = record.facts?.capacityHouseholds;
    if (!Number.isFinite(n)) return unknown('Venue capacity is not supplied; this partial criterion remains unknown and has no forced position.');
    const yes = n >= 60;
    return { recordId: record.id, recordSha256: record.contentSha256, status: 'mapped', answer: yes ? 'yes' : 'no',
      baseId: yes ? 'east' : 'west', displayPhaseRad: phase, relevant: true,
      reason: `${n} households ${yes ? 'meets the 60-household threshold.' : 'is below the 60-household threshold.'}` };
  }
  if (referenceId !== 'R_EXISTING_ACCESS') throw new RangeError(`Unknown reference ${referenceId}`);
  const access = record.facts?.alreadyWheelchairAccessible;
  if (access !== true && (access !== false || !record.facts?.requiredAccessEquipment?.name || !Number.isFinite(record.facts.requiredAccessEquipment.costTokens)))
    return unknown('Existing wheelchair access or the required equipment fact is not supplied; this partial criterion remains unknown and has no forced position.');
  const yes = access === true;
  return { recordId: record.id, recordSha256: record.contentSha256, status: 'mapped', answer: yes ? 'yes' : 'no',
    baseId: yes ? 'east' : 'west', displayPhaseRad: phase, relevant: true,
    reason: yes ? 'Supplied access fact: already accessible; no added access equipment required.' :
      `Supplied access fact: a ${record.facts.requiredAccessEquipment.name} costing ${record.facts.requiredAccessEquipment.costTokens} tokens is required.` };
}
export function mappingState(recordsFixture, mappingFixture, referenceId) {
  const reference = mappingFixture.referenceDefinitions.find(item => item.id === referenceId);
  if (!reference) throw new RangeError(`Unknown reference ${referenceId}`);
  const records = recordsFixture.records;
  return { reference, records, assignments: records.map(record => deriveAssignment(record,referenceId,records)) };
}
