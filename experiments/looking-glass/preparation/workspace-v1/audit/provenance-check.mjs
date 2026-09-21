#!/usr/bin/env node
// Independent source-derived atom inventory and proof-boundary audit.
// The blind derivation was frozen before author-key comparison; this script also
// checks every cited claim against the currently active scoped source, not only IDs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const workspace = resolve(import.meta.dirname, '..');
const materials = resolve(workspace, '../materials-v1');
const design = join(materials, 'design');
const read = name => readFileSync(join(design, name));
const json = name => JSON.parse(read(name));
const sha256 = b => createHash('sha256').update(b).digest('hex');
const world = json('world.json');
const allocations = json('allocations.json');
const devTasks = json('development-tasks.json');
const withheld = json('withheld-tasks.json');
const author = json('AUTHOR_ANSWER_KEY.json');
const blind = JSON.parse(readFileSync(join(materials, 'audit/blind-key-001.json')));
for (const [name, expected] of Object.entries(author.sourcePins)) assert.equal(sha256(read(name)), expected, name);
const factsFor = cards => {
  const all = cards.flatMap(card => (card.claims ?? []).map(claim => ({ ...claim, occurredTick: card.occurredTick })));
  const inTime = all.filter(fact => fact.occurredTick <= world.cutoffTick);
  const superseded = new Set(inTime.flatMap(fact => fact.supersedes ?? []));
  return new Map(inTime.filter(fact => !superseded.has(fact.id)).map(fact => [fact.id, fact]));
};
const byCard = new Map(world.cards.map(card => [card.id, card]));
const rules = new Set(world.rules.map(rule => rule.id));
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const rows = [], findings = [];
const modeFor = (task, atom) => task === 'D07' ? `plan-${atom.split('.')[1]}` : ({D01:'active-scalar',D02:'active-scalar',D03:'directed-attestation',D04:'directed-attestation',D05:'directed-attestation-or-complete-mandate',D06:'same-plan-version-scope-inspection',D08:'supported-only-choice',D09:'lineage-deduplication',D10:'surface-versus-directed-relation'})[task];
function citeCheck(cites, active, label) {
  for (const id of cites ?? []) {
    if (rules.has(id)) continue;
    if (!active.has(id)) findings.push({ kind: 'nonactive-or-out-of-scope-citation', atom: label, id });
  }
}
for (const prior of [...blind.packetContexts, blind.union]) {
  const scope = prior.contextId;
  const current = author.development[scope];
  const cards = scope === 'UNION' ? world.cards : allocations.packets.find(packet => packet.agentId === scope).cardIds.map(id => byCard.get(id));
  const active = factsFor(cards);
  assert.deepEqual(prior.cardIds, cards.map(card => card.id));
  for (const [task, sourceTask] of Object.entries(prior.tasks)) {
    const target = current.tasks[task];
    const expectedAtoms = Object.keys(devTasks.tasks.find(item => item.id === task).scoringAtoms);
    assert.deepEqual(Object.keys(target.values).sort(), expectedAtoms.sort(), `${scope}/${task} atom inventory`);
    for (const atom of expectedAtoms) {
      const value = target.values[atom], sourceValue = sourceTask.values[atom];
      if (!equal(value, sourceValue)) findings.push({ kind: 'source-derived-value-disagreement', scope, task, atom, value, sourceValue });
      const sourceTrace = sourceTask.atoms[atom];
      const canonical = target.canonicalEvidence?.[atom] ?? [];
      citeCheck(canonical, active, `${scope}/${task}/${atom}`);
      citeCheck(sourceTrace.evidence, active, `${scope}/${task}/${atom}:blind`);
      rows.push({ scope, task, atom, value, sourceDerivedValue: sourceValue, traceRule: modeFor(task, atom), sourceDerivedEvidence: sourceTrace.evidence ?? [], sourceDerivedMissingDependencies: sourceTrace.missingDependencies ?? [], authorCanonicalEvidence: canonical, authorHasNamedMissingDependencies: false });
    }
  }
}
assert.equal(rows.length, 194);
for (const prior of blind.withheldContexts) {
  const scope = prior.contextId, context = withheld.contexts.find(item => item.id === scope), target = author.transfer[scope];
  assert.ok(context && target);
  const active = new Map(context.facts.filter(f => !(context.facts.some(g => (g.supersedes ?? []).includes(f.id)))).map(f => [f.id, f]));
  if (!scope.startsWith('W06')) {
    for (const atom of Object.keys(withheld.tasks.find(item => item.id === scope).scoringAtoms)) {
      const value = target.values[atom], sourceValue = prior.values[atom], sourceTrace = prior.atoms[atom];
      if (!equal(value, sourceValue)) findings.push({ kind: 'source-derived-value-disagreement', scope, atom, value, sourceValue });
      const canonical = target.canonicalEvidence?.[atom] ?? null;
      citeCheck(canonical, active, `${scope}/${atom}`);
      citeCheck(sourceTrace.evidence, active, `${scope}/${atom}:blind`);
      rows.push({ scope, task: scope, atom, value, sourceDerivedValue: sourceValue, traceRule: atom === 'linEndorsesV1' ? 'exact-directed-version-one-endorsement' : atom === 'utterancePredicate' ? 'bound-claim-predicate' : ['readiness','selection'].includes(atom) ? 'four-valued-conjunction-and-supported-only-choice' : `exact-catalog-${atom}`, sourceDerivedEvidence: sourceTrace.evidence ?? [], sourceDerivedMissingDependencies: sourceTrace.missingDependencies ?? [], authorCanonicalEvidence: canonical, authorHasNamedMissingDependencies: false });
    }
  } else {
    const proofContext = {
      capacity: context.facts.filter(f => f.predicate === 'capacity').map(f => f.id),
      demand: context.facts.filter(f => f.predicate === 'demand').map(f => f.id),
      grants: Object.fromEntries(context.plans.map(plan => [plan.id, context.facts.filter(f => f.predicate === 'resource_commitment' && f.arguments.plan === plan.id && f.arguments.planVersion === plan.version).map(f => f.id)])),
    };
    assert.deepEqual(target.values.bundles.map(b => b.planIds), context.allowedBundles);
    assert.deepEqual(prior.bundles.map(b => b.planIds), context.allowedBundles);
    for (let index = 0; index < 4; index++) {
      const bundle = target.values.bundles[index], derived = prior.bundles[index];
      for (const atom of ['physical','demand','commitment','inspection','readiness','output','cost']) {
        const value = bundle[atom], sourceValue = atom === 'output' || atom === 'cost' ? derived[atom] : derived[atom].status;
        if (!equal(value, sourceValue)) findings.push({ kind: 'source-derived-value-disagreement', scope, bundle: bundle.planIds, atom, value, sourceValue });
        const trace = atom === 'output' || atom === 'cost' ? { evidence: [], missingDependencies: [] } : derived[atom];
        rows.push({ scope, task: 'W06', bundle: bundle.planIds, atom, value, sourceDerivedValue: sourceValue, traceRule: atom === 'physical' ? 'sum-quantity-by-exact-resource-id' : atom === 'output' || atom === 'cost' ? 'sum-selected-catalog-plan-fields' : atom === 'readiness' ? 'four-valued-conjunction' : atom === 'commitment' ? 'exact-plan-version-actor-resource-grants' : atom === 'demand' ? 'sum-output-versus-active-demand' : 'inspection-not-required', sourceDerivedEvidence: trace.evidence ?? [], sourceDerivedMissingDependencies: trace.missingDependencies ?? [], authorCanonicalEvidence: null, contextLevelCanonicalEvidence: target.canonicalEvidence, sourceCatalogPlanIds: bundle.planIds, contextFacts: proofContext });
      }
    }
    const value = target.values.selection, sourceValue = prior.selection;
    if (!equal(value, sourceValue)) findings.push({ kind: 'source-derived-value-disagreement', scope, atom: 'selection', value, sourceValue });
    rows.push({ scope, task: 'W06', atom: 'selection', value, sourceDerivedValue: sourceValue, traceRule: 'supported-ready-bundles-only-minimum-cost-then-ID', sourceDerivedEvidence: prior.selectionEvidence, sourceDerivedMissingDependencies: [], authorCanonicalEvidence: null, contextLevelCanonicalEvidence: target.canonicalEvidence, contextFacts: proofContext });
    citeCheck(target.canonicalEvidence, active, `${scope}:flat-canonical`);
  }
}
assert.equal(rows.length, 292);
const summary = {
  schemaVersion: 'workspace-provenance-source-trace/1',
  scope: 'Frozen source-only blind derivation, active source facts and independent proof-boundary inspection; synthetic authored materials, zero research data.',
  sourcePins: Object.fromEntries(Object.entries(author.sourcePins).map(([name]) => [name, sha256(read(name))])),
  counts: { development: 194, transfer: 98, total: rows.length, valueDisagreements: findings.filter(x => x.kind === 'source-derived-value-disagreement').length, nonactiveCitations: findings.filter(x => x.kind === 'nonactive-or-out-of-scope-citation').length, transferAtomsWithoutPerAtomCanonicalEvidence: rows.filter(x => x.task.startsWith('W') && x.authorCanonicalEvidence === null).length },
  findings, rows,
};
mkdirSync(join(workspace, 'evidence/audit'), { recursive: true });
const output = join(workspace, 'evidence/audit/provenance-atom-matrix.json');
writeFileSync(output, `${JSON.stringify(summary, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ output, counts: summary.counts, findings: findings.slice(0, 12) })}\n`);
if (findings.length) process.exitCode = 1;
