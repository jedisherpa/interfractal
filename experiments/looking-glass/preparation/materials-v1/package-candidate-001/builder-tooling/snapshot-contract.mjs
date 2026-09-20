import { validateJson } from './schema-validator.mjs';

const roleMap = {
  capacity: ['actor', 'resource'], demand: ['requirement', 'requirementVersion'],
  explores: ['actor', 'plan', 'planVersion'], understands: ['actor', 'plan', 'planVersion'],
  endorses: ['actor', 'plan', 'planVersion'], model_attributes_endorsement: ['actor', 'plan', 'planVersion'],
  resource_commitment: ['actor', 'plan', 'planVersion', 'resource', 'quantity'],
  inspection_report: ['plan', 'planVersion', 'scope', 'reporter'], mandate: ['actor', 'scope', 'complete'],
};
const attestationPredicates = new Set(['understands', 'endorses', 'resource_commitment', 'model_attributes_endorsement']);

export function validateSnapshotRecord(record, schema, world, allowedCardIds, developmentTasks) {
  const errors = validateJson(record, schema);
  if (errors.length) return errors;
  const cards = new Map(world.cards.map(card => [card.id, card]));
  const allowed = new Set(allowedCardIds);
  const supplied = new Set(record.suppliedCardIds);
  if (record.phase === 'initial') {
    if (supplied.size !== allowed.size || [...supplied].some(id => !allowed.has(id))) errors.push('initial suppliedCardIds must exactly match packet allowlist');
    if (record.revision.parentSnapshotIds.length || record.revision.triggerSourceIds.length || record.revision.changedInterpretationIds.length) errors.push('initial snapshot cannot have revision parents/triggers/changes');
  }
  const coverage = record.sourceCoverage.map(item => item.cardId);
  if (new Set(coverage).size !== coverage.length || coverage.length !== supplied.size || coverage.some(id => !supplied.has(id))) errors.push('sourceCoverage must cover each supplied card exactly once');
  const claims = new Map([...supplied].flatMap(id => (cards.get(id)?.claims ?? []).map(claim => [claim.id, claim])));
  const allClaims = new Map(world.cards.flatMap(card => (card.claims ?? []).map(claim => [claim.id, claim])));
  const superseded = new Set([...claims.values()].flatMap(claim => claim.supersedes ?? []));
  const publicRuleIds = new Set(world.rules.map(rule => rule.id));
  const checkClaimId = (id, location) => {
    if (publicRuleIds.has(id)) return;
    if (!allClaims.has(id)) errors.push(`${location}: unknown claim ${id}`);
    else if (!claims.has(id)) errors.push(`${location}: claim ${id} outside supplied cards`);
  };
  for (const interpretation of record.interpretations) {
    const roles = roleMap[interpretation.predicate];
    if (!roles) errors.push(`${interpretation.id}: unknown predicate`);
    else for (const role of roles) if (!Object.hasOwn(interpretation.arguments, role)) errors.push(`${interpretation.id}: missing argument role ${role}`);
    for (const id of [...interpretation.supportingClaimIds, ...interpretation.conflictingClaimIds]) checkClaimId(id, interpretation.id);
    for (const id of interpretation.supportingClaimIds) if (superseded.has(id)) errors.push(`${interpretation.id}: superseded claim ${id} cannot support current interpretation`);
    const positive = interpretation.supportingClaimIds.length > 0;
    const negative = interpretation.conflictingClaimIds.length > 0;
    if (interpretation.status === 'unknown' && (positive || negative)) errors.push(`${interpretation.id}: unknown cannot carry positive or negative evidence`);
    if (interpretation.status === 'supported' && !positive) errors.push(`${interpretation.id}: supported lacks positive evidence`);
    if (interpretation.status === 'refuted' && !negative) errors.push(`${interpretation.id}: refuted lacks negative evidence`);
    if (interpretation.status === 'conflicted' && (!positive || !negative)) errors.push(`${interpretation.id}: conflicted requires both evidence directions`);
    if (attestationPredicates.has(interpretation.predicate)) {
      for (const id of interpretation.supportingClaimIds) {
        const claim = claims.get(id);
        if (!claim) continue;
        if (claim.predicate !== interpretation.predicate || claim.value !== true || roles.some(role => claim.arguments?.[role] !== interpretation.arguments[role])) errors.push(`${interpretation.id}: ${id} does not positively support this exact predicate and roles`);
      }
      for (const id of interpretation.conflictingClaimIds) {
        const claim = claims.get(id);
        if (!claim) continue;
        if (claim.predicate !== interpretation.predicate || claim.value !== false || roles.some(role => claim.arguments?.[role] !== interpretation.arguments[role])) errors.push(`${interpretation.id}: ${id} does not refute this exact predicate and roles`);
      }
    }
    if (interpretation.sourceKind === 'model_attribution' && interpretation.predicate !== 'model_attributes_endorsement') errors.push(`${interpretation.id}: model attribution cannot become actor attestation`);
    if (interpretation.sourceKind === 'source_stipulation' && [...interpretation.supportingClaimIds, ...interpretation.conflictingClaimIds].some(id => claims.get(id)?.evidenceKind !== 'stipulated_source')) errors.push(`${interpretation.id}: non-stipulated source labeled as source stipulation`);
  }
  for (const action of record.proposedActions) if (action.status === 'supported' && action.missingDependencies.length) errors.push(`${action.planId}: supported action lists missing dependencies`);
  if (record.phase === 'initial') {
    const taskById = new Map(developmentTasks.tasks.map(task => [task.id, task]));
    const expectedIds = developmentTasks.initialTaskIds;
    const actualIds = record.taskResponses.map(response => response.taskId);
    if (new Set(actualIds).size !== actualIds.length || actualIds.length !== expectedIds.length || actualIds.some(id => !expectedIds.includes(id))) errors.push('initial taskResponses must contain each initial-access task exactly once');
    for (const response of record.taskResponses) {
      const task = taskById.get(response.taskId);
      if (!expectedIds.includes(response.taskId) || !task) { errors.push(`${response.taskId}: task outside initial-access allowlist`); continue; }
      const expectedAtoms = Object.keys(task.scoringAtoms);
      for (const [field, object] of [['values', response.values], ['evidence', response.evidence]]) {
        const keys = Object.keys(object);
        if (keys.length !== expectedAtoms.length || keys.some(key => !expectedAtoms.includes(key))) errors.push(`${response.taskId}: ${field} keys differ from scoring atoms`);
      }
      for (const [atom, spec] of Object.entries(task.scoringAtoms)) {
        const value = response.values[atom];
        if (spec === 'integer|null') {
          if (value !== null && !Number.isInteger(value)) errors.push(`${response.taskId}.${atom}: expected integer|null; unknown is null, not false`);
        } else if (spec === 'integer') {
          if (!Number.isInteger(value)) errors.push(`${response.taskId}.${atom}: expected integer`);
        } else if (!spec.split('|').includes(value)) errors.push(`${response.taskId}.${atom}: outside allowed value enum`);
        for (const id of response.evidence[atom] ?? []) checkClaimId(id, response.taskId);
      }
    }
  }
  return errors;
}
