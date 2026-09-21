import { validateJson } from './schema-validator.mjs';

const roleMap = {
  capacity: ['actor', 'resource'], demand: ['requirement', 'requirementVersion'],
  explores: ['actor', 'plan', 'planVersion'], understands: ['actor', 'plan', 'planVersion'],
  endorses: ['actor', 'plan', 'planVersion'], model_attributes_endorsement: ['actor', 'plan', 'planVersion'],
  resource_commitment: ['actor', 'plan', 'planVersion', 'resource', 'quantity'],
  inspection_report: ['plan', 'planVersion', 'scope', 'reporter'], mandate: ['actor', 'scope', 'complete'],
};
const attestationPredicates = new Set(['understands', 'endorses', 'resource_commitment', 'model_attributes_endorsement']);

// `expected` is trusted host input derived from a frozen run manifest, never from
// the candidate model response. This validates structure/scope, not answer truth.
export function validateSnapshotRecord(record, schema, world, allocations, expected, developmentTasks) {
  const errors = validateJson(record, schema);
  if (errors.length) return errors;
  if (!expected || Array.isArray(expected) || typeof expected !== 'object' ||
      !['initial', 'union', 'revised', 'interactive_final'].includes(expected.phase) ||
      typeof expected.agentId !== 'string' || typeof expected.snapshotId !== 'string' ||
      typeof expected.modelId !== 'string' || typeof expected.modelVersion !== 'string' ||
      !Array.isArray(expected.cardIds) ||
      typeof expected.inputManifestSha256 !== 'string' || typeof expected.settingsManifestSha256 !== 'string') {
    return ['trusted expected context with snapshot/model identity, phase, agentId, cardIds and input/settings hashes is required'];
  }
  if (record.phase === 'pool' || expected.phase === 'pool') errors.push('pool is a deterministic comparator artifact, not a research snapshot');
  if (record.phase !== expected.phase) errors.push('phase differs from trusted expected context');
  if (record.agentId !== expected.agentId) errors.push('agentId differs from trusted expected context');
  if (record.snapshotId !== expected.snapshotId) errors.push('snapshotId differs from trusted expected context');
  if (record.identity.modelId !== expected.modelId || record.identity.modelVersion !== expected.modelVersion) errors.push('model identity differs from trusted expected context');
  if (expected.existingSnapshotIds?.includes(record.snapshotId)) errors.push('snapshotId already exists in trusted immutable registry');
  if (record.inputManifestSha256 !== expected.inputManifestSha256) errors.push('input manifest hash differs from trusted expected context');
  if (record.identity.settingsManifestSha256 !== expected.settingsManifestSha256) errors.push('settings manifest hash differs from trusted expected context');
  if (record.identity.kind !== 'model_output') errors.push('research snapshot identity.kind must be model_output');
  const cards = new Map(world.cards.map(card => [card.id, card]));
  const allIds = new Set(cards.keys());
  const allowed = new Set(expected.cardIds);
  if (allowed.size !== expected.cardIds.length || [...allowed].some(id => !allIds.has(id))) errors.push('trusted context cardIds must be unique known world cards');
  if (expected.phase === 'initial') {
    if (allowed.size !== 6) errors.push('initial trusted context must contain six cards');
    const authoredPacket = allocations.packets.find(packet => packet.agentId === expected.agentId);
    if (!authoredPacket || JSON.stringify(authoredPacket.cardIds) !== JSON.stringify(expected.cardIds)) errors.push('initial agentId/cardIds differ from authored allocation');
  } else if (allowed.size !== allIds.size || [...allIds].some(id => !allowed.has(id))) {
    errors.push('post-initial trusted context must contain full eighteen-card union');
  }
  if (expected.phase === 'revised' && !allocations.packets.some(packet => packet.agentId === expected.agentId)) errors.push('revised agentId must name an authored initial participant');
  const supplied = new Set(record.suppliedCardIds);
  if (supplied.size !== allowed.size || [...supplied].some(id => !allowed.has(id))) errors.push('suppliedCardIds must exactly match trusted context card allowlist');
  if (record.phase === 'initial' || record.phase === 'union') {
    if (record.revision.parentSnapshotIds.length || record.revision.triggerSourceIds.length || record.revision.changedInterpretationIds.length || record.revision.retainedDissentIds.length) errors.push(`${record.phase} snapshot cannot have revision parents/triggers/changes/dissent`);
  }
  if (record.phase === 'revised' || record.phase === 'interactive_final') {
    const parentExpected = expected.parentSnapshotIds;
    if (!Array.isArray(parentExpected) || parentExpected.length !== (record.phase === 'revised' ? 1 : 4) || new Set(parentExpected).size !== parentExpected.length) errors.push(`${record.phase}: trusted parent snapshot IDs missing or wrong cardinality`);
    else if (JSON.stringify(record.revision.parentSnapshotIds) !== JSON.stringify(parentExpected)) errors.push(`${record.phase}: parent snapshot IDs differ from immutable trusted context`);
    if (record.revision.parentSnapshotIds.includes(record.snapshotId)) errors.push('snapshot cannot parent itself');
    if (record.phase === 'revised') {
      if (!Array.isArray(expected.triggerSourceIds) || expected.triggerSourceIds.length === 0) errors.push('revised: trusted trigger IDs required');
      else if (JSON.stringify(record.revision.triggerSourceIds) !== JSON.stringify(expected.triggerSourceIds)) errors.push('revised: trigger IDs differ from trusted context');
    }
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
  const interpretationIds = record.interpretations.map(item => item.id);
  if (new Set(interpretationIds).size !== interpretationIds.length) errors.push('interpretation IDs must be unique within a snapshot');
  for (const id of record.revision.changedInterpretationIds) if (!interpretationIds.includes(id)) errors.push(`changed interpretation ${id} does not resolve in this snapshot`);
  for (const interpretation of record.interpretations) {
    const roles = roleMap[interpretation.predicate];
    if (!roles) errors.push(`${interpretation.id}: unknown predicate`);
    else for (const role of roles) if (!Object.hasOwn(interpretation.arguments, role)) errors.push(`${interpretation.id}: missing argument role ${role}`);
    for (const id of [...interpretation.supportingClaimIds, ...interpretation.conflictingClaimIds]) checkClaimId(id, interpretation.id);
    for (const id of interpretation.supportingClaimIds) if (superseded.has(id)) errors.push(`${interpretation.id}: superseded claim ${id} cannot support current interpretation`);
    const positive = interpretation.supportingClaimIds.length > 0;
    const negative = interpretation.conflictingClaimIds.length > 0;
    const impliedStatus = positive ? (negative ? 'conflicted' : 'supported') : (negative ? 'refuted' : 'unknown');
    if (interpretation.status !== impliedStatus) errors.push(`${interpretation.id}: status ${interpretation.status} differs from evidence pair ${impliedStatus}`);
    if (attestationPredicates.has(interpretation.predicate)) {
      const attribution = interpretation.predicate === 'model_attributes_endorsement';
      const requiredKind = attribution ? 'synthetic_model_artifact' : 'stipulated_source';
      const requiredSourceKind = attribution ? 'model_attribution' : 'source_stipulation';
      if ((positive || negative) && interpretation.sourceKind !== requiredSourceKind) errors.push(`${interpretation.id}: literal ${interpretation.predicate} requires ${requiredSourceKind}, not model inference`);
      for (const [ids, value, polarity] of [[interpretation.supportingClaimIds, true, 'positive'], [interpretation.conflictingClaimIds, false, 'negative']]) {
        const witnesses = ids.map(id => claims.get(id)).filter(Boolean);
        if (ids.length && witnesses.length === 0) errors.push(`${interpretation.id}: ${polarity} literal attestation requires a supplied typed source witness; rules alone are insufficient`);
        for (const claim of witnesses) {
          if (claim.predicate !== interpretation.predicate || claim.value !== value || claim.evidenceKind !== requiredKind || roles.some(role => claim.arguments?.[role] !== interpretation.arguments[role])) errors.push(`${interpretation.id}: ${claim.id} does not ${value ? 'positively support' : 'refute'} this exact predicate, roles, value and evidence kind`);
        }
      }
    }
    if (interpretation.sourceKind === 'model_attribution' && interpretation.predicate !== 'model_attributes_endorsement') errors.push(`${interpretation.id}: model attribution cannot become actor attestation`);
    if (interpretation.sourceKind === 'source_stipulation' && [...interpretation.supportingClaimIds, ...interpretation.conflictingClaimIds].some(id => claims.has(id) && claims.get(id).evidenceKind !== 'stipulated_source')) errors.push(`${interpretation.id}: non-stipulated source labeled as source stipulation`);
  }
  const taskById = new Map(developmentTasks.tasks.map(task => [task.id, task]));
  const expectedIds = record.phase === 'initial' ? developmentTasks.initialTaskIds : developmentTasks.postUnionTaskIds;
  const actualIds = record.taskResponses.map(response => response.taskId);
  if (new Set(actualIds).size !== actualIds.length || actualIds.length !== expectedIds.length || actualIds.some(id => !expectedIds.includes(id))) errors.push(`${record.phase} taskResponses must contain each phase-required task exactly once`);
  for (const response of record.taskResponses) {
    const task = taskById.get(response.taskId);
    if (!expectedIds.includes(response.taskId) || !task) { errors.push(`${response.taskId}: task outside phase task allowlist`); continue; }
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
  const plans = new Map(world.plans.map(plan => [plan.id, plan.version]));
  const d07 = record.taskResponses.find(response => response.taskId === 'D07');
  const d08 = record.taskResponses.find(response => response.taskId === 'D08');
  const actionKeys = record.proposedActions.map(action => `${action.planId}@${action.planVersion}`);
  if (new Set(actionKeys).size !== actionKeys.length) errors.push('proposedActions must not repeat a plan/version');
  for (const action of record.proposedActions) {
    if (plans.get(action.planId) !== action.planVersion) errors.push(`${action.planId}: unknown plan/version`);
    if (action.status === 'supported') {
      if (action.missingDependencies.length) errors.push(`${action.planId}: supported action lists missing dependencies`);
      if (d07?.values[`${action.planId}.readiness`] !== 'supported') errors.push(`${action.planId}: supported action lacks supported D07 readiness`);
      for (const component of ['physical', 'demand', 'commitment', 'inspection']) {
        const atom = `${action.planId}.${component}`;
        if (d07?.values[atom] !== 'supported') errors.push(`${action.planId}: supported action lacks supported D07 ${component}`);
        if (!d07?.evidence[atom]?.length) errors.push(`${action.planId}: supported action lacks cited D07 ${component} evidence`);
      }
      if (d08?.values.selection === 'none_supported') errors.push(`${action.planId}: supported action conflicts with D08 none_supported selection`);
    }
  }
  if (d08 && d08.values.selection !== 'none_supported' && !record.proposedActions.some(action => action.planId === d08.values.selection && action.status === 'supported')) errors.push('D08 selected plan is absent from supported proposedActions');
  return errors;
}
