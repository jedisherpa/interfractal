#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {validateSnapshotRecord} from '../package-candidate-001/builder-tooling/snapshot-contract.mjs';
const base=resolve(import.meta.dirname,'..');const j=p=>JSON.parse(readFileSync(join(base,p)));
const world=j('design/world.json'),alloc=j('design/allocations.json'),tasks=j('design/development-tasks.json'),schema=j('design/snapshot.schema.json');
const original=j('package-candidate-001/builder-tooling/fixtures/SYNTHETIC_VALID_NOT_RESEARCH_OUTPUT.json');
const cardIds=alloc.packets[0].cardIds;
const probes=[];
for(const status of ['supported','refuted']){
 const r=structuredClone(original),i=r.interpretations[0];
 i.predicate='capacity';i.arguments={actor:'ARA',resource:'press'};i.status=status;i.supportingClaimIds=['F-C03-1'];i.conflictingClaimIds=['F-C03-1'];
 const errors=validateSnapshotRecord(r,schema,world,cardIds,tasks);probes.push({status,accepted:errors.length===0,errors});
}
writeFileSync(join(base,'audit/four-valued-probes-001.json'),JSON.stringify({scope:'synthetic candidate001 guard probes; not research outputs',probes},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(probes));
