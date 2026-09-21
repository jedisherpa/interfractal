import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname, join, resolve, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {RUN_ID,DURATION_MS,SAMPLE_MS,STEP_MS,CHECKPOINTS_MS,clampTime,modelAt,
  sourceState,localState,supportedRelationState,mappingState,summaryState,
  summaryHistoryState,receiverState,semanticState,checkpointState,evaluateOutward} from './model.mjs';

const dir=dirname(fileURLToPath(import.meta.url));
const root=basename(dirname(dir))==='builds'?resolve(dir,'../../..'):resolve(dir,'..');
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?
  Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
const canonical=value=>JSON.stringify(stable(value));
const [source,refs,gate]=await Promise.all(['fictional-records.json','reference-mappings.json','fixture.json']
  .map(name=>readJson(join(dir,name))));
assert.equal(RUN_ID,'G6-LOCAL-001');
assert.equal(DURATION_MS,30000);assert.equal(SAMPLE_MS,100);assert.equal(STEP_MS,1000);
assert.deepEqual(CHECKPOINTS_MS,[0,5000,10000,15000,20000,25000,30000]);
assert.equal(clampTime(5050),5100);assert.equal(clampTime(-100),0);assert.equal(clampTime(40000),30000);
for(const invalid of [NaN,Infinity,-Infinity])assert.throws(()=>clampTime(invalid));

for(const pin of gate.sourcePins){
  const historical=await readFile(join(root,pin.path));
  const copy=await readFile(join(dir,basename(pin.path)));
  assert.equal(sha(historical),pin.sha256,`historical ${pin.path}`);
  assert.equal(historical.length,pin.bytes);
  assert.deepEqual(copy,historical,`local copy of ${pin.path}`);
}
assert.equal(source.records.length,4);
for(const record of source.records){
  const {contentSha256,...body}=record;
  assert.equal(sha(canonical(body)),contentSha256,`record ${record.id}`);
  assert.equal(gate.sourceRecordRefs.find(r=>r.recordId===record.id)?.contentSha256,contentSha256);
}
for(const local of gate.localContexts){
  const {contentSha256,...body}=local;
  assert.equal(sha(canonical(body)),contentSha256,`local ${local.id}`);
}
assert.deepEqual(gate.sourceReferenceIdentities.map(r=>r.id),['R_CAPACITY_60','R_EXISTING_ACCESS']);
assert.equal(refs.referenceDefinitions.length,2);
for(const identity of gate.sourceReferenceIdentities){
  const definition=refs.referenceDefinitions.find(r=>r.id===identity.id);
  assert.ok(definition);
  assert.equal(sha(canonical(definition)),identity.definitionSha256);
}

const at=(ms,overrides)=>modelAt(ms,source.records,refs,gate,overrides);
const s0=at(0),s5=at(5000),s10=at(10000),s15=at(15000),s20=at(20000),s25=at(25000),s30=at(30000);
assert.equal(s0.contexts.length,2);
assert.equal(s0.sourceRecords.length,4);
assert.equal(s0.controls.selectedContextId,null);
assert.deepEqual(s0.controls.expandedIds,[]);
assert.deepEqual(semanticState(s0),semanticState(s10));
assert.deepEqual(semanticState(s0),semanticState(s30));
assert.notDeepEqual(checkpointState(s0),checkpointState(s10));
assert.equal(s5.largerReference.id,'R_EXISTING_ACCESS');
assert.equal(s10.largerReference.id,'R_CAPACITY_60');
const answers=s=>Object.fromEntries(s.contexts.map(c=>[c.id,c.outerCriterion.answer]));
assert.deepEqual(answers(s0),{G6_LOCAL_HALL:'yes',G6_LOCAL_FIELD:'yes'});
assert.deepEqual(answers(s5),{G6_LOCAL_HALL:'no',G6_LOCAL_FIELD:'yes'});
assert.equal(s0.assignments.R_CAPACITY_60.find(a=>a.recordId==='venue-studio').answer,'no');
assert.equal(s5.assignments.R_EXISTING_ACCESS.find(a=>a.recordId==='venue-studio').answer,'yes');
for(const id of ['R_CAPACITY_60','R_EXISTING_ACCESS'])
  assert.equal(s0.assignments[id].find(a=>a.recordId==='weather-context').status,'unmapped');
for(const context of s0.contexts){
  assert.equal(context.outwardEvaluation.status,'insufficient-summary');
  assert.equal(context.outwardEvaluation.numericScreenPass,null);
  for(const key of ['candidateCapacityHouseholds','venueEquipmentCostTokens','requiredEquipment'])
    assert.equal(Object.hasOwn(context.activeSummary,key),false,`v1 leaks ${key}`);
}
assert.equal(evaluateOutward({...s0.contexts[0].activeSummary,venueEquipmentCostTokens:0}).status,'insufficient-summary');
assert.equal(s15.contexts.every(c=>c.expanded),true);
assert.equal(s15.contexts.every(c=>c.activeSummary.summaryVersion===2),true);
assert.deepEqual(s15.contexts.map(c=>c.dependency.venueEquipmentCostTokens),[6,9]);
assert.deepEqual(s15.contexts.map(c=>c.dependency.requiredEquipment.map(d=>d.kind)),[['access'],['power','rain-shelter']]);
assert.deepEqual(s15.contexts.map(c=>c.outwardEvaluation.numericScreenPass),[true,false]);
assert.equal(s15.contexts.every(c=>c.outwardEvaluation.status==='evaluated-numeric-screen'),true);
assert.equal(s20.requirement.minimumCapacityHouseholds,70);
assert.equal(s20.contexts.every(c=>c.activeSummary.summaryVersion===3),true);
assert.deepEqual(s20.contexts.map(c=>c.outwardEvaluation.capacityPass),[false,true]);
assert.deepEqual(s20.contexts.map(c=>c.outwardEvaluation.numericScreenPass),[false,false]);
assert.equal(s25.controls.claimsOpen,true);
assert.equal(s25.claim.status,'unsupported');
assert.equal(s25.claim.includedInSupportedGraph,false);
assert.deepEqual(s25.claim.evidence,[]);
assert.equal(s25.supportedRelations.some(r=>r.id===s25.claim.id),false);
assert.equal(s25.supportedRelations.length,4);
assert.equal(s25.supportedRelations.some(r=>r.type==='shares-source'),true);
for(const s of [s5,s15,s20,s25,s30]){
  assert.deepEqual(sourceState(s),sourceState(s0));
  assert.deepEqual(localState(s).manifests,localState(s0).manifests);
  assert.deepEqual(supportedRelationState(s),supportedRelationState(s0));
  assert.deepEqual(summaryHistoryState(s),summaryHistoryState(s0));
}
assert.deepEqual(mappingState(s0),mappingState(s15));
assert.deepEqual(receiverState(s0).requirement,receiverState(s15).requirement);
const explored=at(0,{view:'plain',layout:'close',selectedContextId:'G6_LOCAL_FIELD',expandedIds:['G6_LOCAL_FIELD']});
assert.deepEqual(sourceState(explored),sourceState(s0));
assert.deepEqual(supportedRelationState(explored),supportedRelationState(s0));
assert.deepEqual(summaryState(explored),summaryState(s0));
assert.deepEqual(receiverState(explored),receiverState(s0));
assert.notDeepEqual(checkpointState(explored),checkpointState(s0));
assert.equal(s0.contexts[0].manifest.retainedLocalReference.id,'R_CAPACITY_60');
assert.equal(s0.contexts[1].manifest.retainedLocalReference.id,'R_EXISTING_ACCESS');
console.log('Gate 6 model tests passed: source pins, canonical identities, 7 checkpoints, mappings, outward insufficiency/repair, 60→70 receiver and unsupported claim.');
