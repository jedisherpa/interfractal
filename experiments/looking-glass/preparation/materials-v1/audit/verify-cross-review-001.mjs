#!/usr/bin/env node
// Independent comparison of a previously frozen blind derivation to the author key.
// No producer solver or model code is imported.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const base = join(root, 'preparation/materials-v1');
const load = path => JSON.parse(readFileSync(join(base, path), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const blindFreeze = load('audit/BLIND_KEY_FREEZE_001.json');
const freezeChecks = blindFreeze.files.map(item => {
  const bytes = readFileSync(join(root, item.path));
  return { path: item.path, pass: bytes.length === item.bytes && hash(bytes) === item.sha256 };
});
const blind = load('audit/blind-key-001.json');
const key = load('design/AUTHOR_ANSWER_KEY.json');
const world = load('design/world.json');
const allocations = load('design/allocations.json');
const withheld = load('design/withheld-tasks.json');
const plan = load('design/execution-plan.json');
const failures = [];
let developmentAtoms = 0, transferAtoms = 0, structuralFields = 0, evidenceRefs = 0;
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const compare = (label, actual, expected) => { if (!equal(actual, expected)) failures.push({ label, actual, expected }); };
const rules = new Set(world.rules.map(rule => rule.id));
for (const scope of [...blind.packetContexts, blind.union]) {
  const id = scope.contextId;
  const authored = key.development[id];
  const cards = new Set(scope.cardIds);
  const claims = new Set(world.cards.filter(card => cards.has(card.id)).flatMap(card => card.claims.map(claim => claim.id)));
  for (const [taskId, task] of Object.entries(scope.tasks)) {
    const target = authored.tasks[taskId];
    for (const [atom, value] of Object.entries(target.values)) {
      compare(`${id}.${taskId}.${atom}`, task.values[atom], value);
      developmentAtoms++;
      for (const ref of target.canonicalEvidence[atom] ?? []) {
        evidenceRefs++;
        if (!claims.has(ref) && !rules.has(ref)) failures.push({ label: `${id}.${taskId}.${atom}.canonicalEvidence`, invalidRef: ref });
      }
    }
  }
}
for (const scope of blind.withheldContexts) {
  const id = scope.contextId, target = key.transfer[id];
  const context = withheld.contexts.find(item => item.id === id);
  const refs = new Set(context.facts.map(fact => fact.id));
  if (id.startsWith('W06')) {
    for (let i=0;i<4;i++) {
      for (const field of ['physical','demand','commitment','inspection','readiness','output','cost']) {
        const item = scope.bundles[i][field];
        compare(`${id}.bundle${i}.${field}`, field === 'output' || field === 'cost' ? item : item.status, target.values.bundles[i][field]);
        transferAtoms++;
      }
      compare(`${id}.bundle${i}.planIds`, scope.bundles[i].planIds, target.values.bundles[i].planIds);
      structuralFields++;
    }
    compare(`${id}.selection`, scope.selection, target.values.selection);
    transferAtoms++;
  } else for (const [atom,value] of Object.entries(target.values)) {
    compare(`${id}.${atom}`, scope.values[atom], value);
    transferAtoms++;
  }
  const traces = Array.isArray(target.canonicalEvidence) ? { complete: target.canonicalEvidence } : (target.canonicalEvidence ?? {});
  for (const [atom, trace] of Object.entries(traces)) {
    for (const ref of trace) {
      evidenceRefs++;
      if (!refs.has(ref) && !rules.has(ref)) failures.push({label:`${id}.${atom}.canonicalEvidence`, invalidRef:ref});
    }
  }
}
const stage = Object.fromEntries(plan.stages.map(s => [s.id,s]));
const arithmetic = {
  interactiveBase: stage.I.calls*stage.I.maxGeneratedTokensPerCall + stage.E.calls*stage.E.maxGeneratedTokensPerCall + stage.R.calls*stage.R.maxGeneratedTokensPerCall + stage.S.calls*stage.S.maxGeneratedTokensPerCall,
  unionBase: 4096,
  uniqueCalls: stage.I.calls + stage.E.calls + stage.R.calls + stage.S.calls + 1 + 3,
  uniqueCap: 4*4096 + 4*512 + 4*4096 + 4096 + 4096 + 3*4096,
};
if (arithmetic.interactiveBase !== 38912 || arithmetic.uniqueCalls !== 17 || arithmetic.uniqueCap !== 55296) failures.push({label:'budget arithmetic',arithmetic});
for (const comparator of plan.comparators) {
  const expected = { POOL:[16384,20480], UNION:[4096,8192], INTERACTIVE:[38912,43008] }[comparator.id];
  if (!expected || comparator.baseGeneratedTokenCap !== expected[0] || comparator.attributableTotalCap !== expected[1]) failures.push({label:`comparator ${comparator.id} budget`});
}
const report = { schemaVersion:'materials-cross-review/1', status:failures.length || freezeChecks.some(item=>!item.pass)?'FAIL':'PASS', blindFreezeSha256:hash(readFileSync(join(base,'audit/BLIND_KEY_FREEZE_001.json'))), blindKeySha256:hash(readFileSync(join(base,'audit/blind-key-001.json'))), authorKeySha256:hash(readFileSync(join(base,'design/AUTHOR_ANSWER_KEY.json'))), developmentAtoms, transferAtoms, structuralFields, canonicalEvidenceReferencesResolved:evidenceRefs, freezeChecks, arithmetic, failures };
writeFileSync(join(base,'audit/cross-review-001-corrected.json'), JSON.stringify(report,null,2)+'\n', {flag:'wx'});
console.log(JSON.stringify({status:report.status,developmentAtoms,transferAtoms,structuralFields,evidenceRefs,failures:failures.length}));
if(report.status!=='PASS') process.exitCode=1;
