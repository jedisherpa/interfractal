// Compare the actual prespecified graph/plain routes. Saved evidence only.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runId = process.argv[3] || 'G6-LOCAL-003';
const run = JSON.parse(await readFile(resolve(root, `local-models/runs/${runId}/run.json`)));
const observations = JSON.parse(await readFile(resolve(root, 'evidence/gate-6/browser-observations.json')));
const actions = JSON.parse(await readFile(resolve(root, 'evidence/gate-6/action-trace.json')));
const byLabel = label => {
  const observation = observations.find(item => item.label === label && item.state?.runId === runId);
  assert.ok(observation, `observation ${label}`);
  return observation;
};
const action = (label, id) => {
  const item = actions.find(entry => entry.label === label);
  assert.ok(item, `action ${label}`);
  assert.equal(item.success, true, `action success ${label}`);
  assert.equal(item.control.id, id, `control ${label}`);
  assert.equal(item.afterObservation, byLabel(label).index);
  return item;
};
const assertSemanticParity = (left, right) => {
  const a = byLabel(left).state, b = byLabel(right).state;
  for (const key of ['sourceSha256', 'localSha256', 'relationsSha256', 'mappingSha256',
    'summarySha256', 'summaryHistorySha256', 'receiverSha256'])
    assert.equal(a[key], b[key], `${left} vs ${right}: ${key}`);
};
const routes = [];
for (const mode of ['graph', 'plain']) {
  const setupReset = action(`N1-${mode}-setup-reset`, 'checkpoint-0');
  const setupMode = action(`N1-${mode}-setup-mode`, mode === 'graph' ? 'view-local' : 'view-plain');
  const select = action(`N1-${mode}-1-select`, mode === 'graph' ? 'select-G6_LOCAL_FIELD' : 'plain-select-G6_LOCAL_FIELD');
  const expand = action(`N1-${mode}-2-expand`, mode === 'graph' ? 'expand-G6_LOCAL_FIELD' : 'plain-expand-G6_LOCAL_FIELD');
  const trace = action(`N1-${mode}-3-trace`, 'trace-inspect');
  const repair = action(`N1-${mode}-4-repair`, 'summary-v2');
  const setup = byLabel(`N1-${mode}-setup-mode`), traced = byLabel(`N1-${mode}-3-trace`),
    endpoint = byLabel(`N1-${mode}-4-repair`);
  const base = setup.state.fullState.controls;
  assert.equal(base.view, mode);
  assert.equal(base.selectedContextId, null);
  assert.deepEqual(base.expandedIds, []);
  assert.equal(base.referenceId, 'R_CAPACITY_60');
  assert.equal(base.requirementVersion, 1);
  assert.equal(base.summaryVersion, 1);
  assert.equal(base.inspectorOpen, false);
  assert.equal(base.layout, 'ordinary');
  assert.equal(traced.state.fullState.controls.traceLocalId, 'G6_LOCAL_FIELD');
  assert.equal(traced.state.fullState.controls.traceMode, 'budget');
  for (const text of ['Field local context', 'hire 3', 'generator 3', 'rain shelter 3', '= 9',
    'venue-field.facts.requiredPowerEquipment', 'venue-field.facts.shelterCostTokens', 'weather-context.facts.rainCertain'])
    assert.ok(traced.visibleText.includes(text), `N1 ${mode} missing ${text}`);
  assert.equal(endpoint.state.fullState.controls.summaryVersion, 2);
  assert.equal(endpoint.state.fullState.contexts[1].activeSummary.venueEquipmentCostTokens, 9);
  assert.equal(endpoint.state.fullState.contexts[1].outwardEvaluation.numericScreenPass, false);
  routes.push({ task: 'N1', mode, setupActions: 2, navigationActions: 3, correctionActions: 1,
    scrollActions: actions.filter(item => item.label.startsWith(`N1-${mode}-`) && item.control.kind === 'scroll').length,
    failedActions: [setupReset, setupMode, select, expand, trace, repair].filter(item => !item.success).length,
    startObservation: setup.index, endpointObservation: endpoint.index, endpointSucceeded: true });
}
assertSemanticParity('N1-graph-setup-mode', 'N1-plain-setup-mode');
assertSemanticParity('N1-graph-4-repair', 'N1-plain-4-repair');
for (const mode of ['graph', 'plain']) {
  action(`N2-${mode}-setup-reset`, 'checkpoint-0');
  action(`N2-${mode}-setup-mode`, mode === 'graph' ? 'view-local' : 'view-plain');
  action(`N2-${mode}-1-show`, 'claims-show');
  action(`N2-${mode}-2-inspect`, mode === 'graph' ? 'link-invented-funds' : 'plain-relation-G6-CLAIM-TRANSFER');
  const setup = byLabel(`N2-${mode}-setup-mode`), endpoint = byLabel(`N2-${mode}-2-inspect`);
  assert.equal(setup.state.fullState.controls.selectedContextId, null);
  assert.equal(setup.state.fullState.controls.claimsOpen, false);
  assert.equal(setup.state.fullState.controls.view, mode);
  assert.equal(endpoint.state.fullState.controls.claimsOpen, true);
  assert.equal(endpoint.state.fullState.controls.inspectedRelationId, 'G6-CLAIM-TRANSFER');
  for (const text of ['G6-CLAIM-TRANSFER', 'transfers-resource', 'unsupported', 'evidence []', 'included in supported graph false'])
    assert.ok(endpoint.visibleText.includes(text), `N2 ${mode} missing ${text}`);
  assert.deepEqual(endpoint.state.fullState.claim.evidence, []);
  assert.equal(endpoint.state.fullState.claim.includedInSupportedGraph, false);
  routes.push({ task: 'N2', mode, setupActions: 2, navigationActions: 2, correctionActions: 0,
    scrollActions: actions.filter(item => item.label.startsWith(`N2-${mode}-`) && item.control.kind === 'scroll').length,
    failedActions: 0, startObservation: setup.index, endpointObservation: endpoint.index, endpointSucceeded: true });
}
assertSemanticParity('N2-graph-setup-mode', 'N2-plain-setup-mode');
assertSemanticParity('N2-graph-2-inspect', 'N2-plain-2-inspect');
const result = { kind: 'gate-6-independent-route-comparison', runId,
  buildId: run.buildId, routes, limits: 'Prespecified successful control counts; no human usability or time-savings inference.', checksPassed: true };
if (process.argv[2]) await writeFile(resolve(process.argv[2]), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ routes: routes.map(r => [r.task, r.mode, r.navigationActions, r.correctionActions]), checksPassed: true }));
