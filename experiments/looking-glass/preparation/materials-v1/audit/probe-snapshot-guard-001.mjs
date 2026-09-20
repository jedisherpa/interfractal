#!/usr/bin/env node
// Synthetic adversarial records only; no research outputs.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {validateSnapshotRecord} from '../package-candidate-001/builder-tooling/snapshot-contract.mjs';
const base=resolve(import.meta.dirname,'..');
const json=p=>JSON.parse(readFileSync(join(base,p)));
const world=json('design/world.json'), alloc=json('design/allocations.json'), tasks=json('design/development-tasks.json'), schema=json('design/snapshot.schema.json');
const initial=json('package-candidate-001/builder-tooling/fixtures/SYNTHETIC_VALID_NOT_RESEARCH_OUTPUT.json');
const allowed=alloc.packets.find(p=>p.agentId==='A1').cardIds;
const probes=[];
const run=(name,mutate)=>{const record=structuredClone(initial);mutate(record);const errors=validateSnapshotRecord(record,schema,world,allowed,tasks);probes.push({name,accepted:errors.length===0,errors});};
run('valid synthetic baseline',()=>{});
run('union phase with only six initial cards and D01-D08',r=>{r.phase='union';});
run('initial A4 identity over A1 card packet',r=>{r.agentId='A4';});
run('duplicate interpretation ID',r=>{r.interpretations[1].id=r.interpretations[0].id;});
run('supported action without derivation or dependencies',r=>{r.proposedActions[0].status='supported';r.proposedActions[0].missingDependencies=[];});
run('numerically false D02 press answer with real but insufficient citation',r=>{r.taskResponses.find(x=>x.taskId==='D02').values.press=99;});
const report={schemaVersion:'materials-snapshot-guard-probe/1',candidate:'package-candidate-001',scope:'synthetic adversarial record validation; no model calls',probes};
writeFileSync(join(base,'audit/snapshot-guard-probes-001.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(probes.map(p=>({name:p.name,accepted:p.accepted,errorCount:p.errors.length}))));
