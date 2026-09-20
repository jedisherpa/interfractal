#!/usr/bin/env node
// Exact packaged candidate002, synthetic records only; never research outputs.
import {readFileSync,writeFileSync} from 'node:fs';import {join,resolve} from 'node:path';
import {validateSnapshotRecord} from '../package-candidate-002/builder-tooling/snapshot-contract.mjs';
const base=resolve(import.meta.dirname,'..'),j=p=>JSON.parse(readFileSync(join(base,p)));
const world=j('design/world.json'),alloc=j('design/allocations.json'),tasks=j('design/development-tasks.json'),schema=j('design/snapshot.schema.json');
const original=j('package-candidate-002/builder-tooling/fixtures/SYNTHETIC_VALID_NOT_RESEARCH_OUTPUT.json');const z='0'.repeat(64);
const ctx={phase:'initial',agentId:'A1',snapshotId:original.snapshotId,modelId:original.identity.modelId,modelVersion:original.identity.modelVersion,cardIds:alloc.packets[0].cardIds,inputManifestSha256:z,settingsManifestSha256:z};
const cases=[
 {name:'understands rule-only model inference',id:'I-UNDERSTANDS',predicate:'understands',sourceKind:'model_inference',arguments:{actor:'ARA',plan:'P12',planVersion:1}},
 {name:'endorses rule-only model inference',id:'I-ENDORSES',predicate:'endorses',sourceKind:'model_inference',arguments:{actor:'ARA',plan:'P12',planVersion:1}},
 {name:'resource commitment rule-only model inference',id:'I-COMMITMENT',predicate:'resource_commitment',sourceKind:'model_inference',arguments:{actor:'ARA',plan:'P12',planVersion:1,resource:'press',quantity:6}},
 {name:'model attribution rule-only without model artifact',id:'I-UNDERSTANDS',predicate:'model_attributes_endorsement',sourceKind:'model_attribution',arguments:{actor:'ARA',plan:'P12',planVersion:1}},
];
const results=[];
for(const c of cases){const record=structuredClone(original),i=record.interpretations.find(x=>x.id===c.id);i.predicate=c.predicate;i.arguments=c.arguments;i.sourceKind=c.sourceKind;i.status='supported';i.supportingClaimIds=['R07'];i.conflictingClaimIds=[];const errors=validateSnapshotRecord(record,schema,world,alloc,ctx,tasks);results.push({name:c.name,expected:'reject: public rule alone is not a typed source attestation',actual:errors.length?'rejected':'accepted',errors});}
const report={schemaVersion:'materials-attestation-adversarial-probes/1',candidate:'package-candidate-002',status:results.some(r=>r.actual==='accepted')?'BLOCKED':'PASS',count:results.length,results,minimalCorrection:'For attestation predicates, require each polarity witness to be an actual supplied claim with exact predicate, directed roles, value and evidenceKind. Never count a public rule ID alone as a positive or negative actor/model attestation. Keep numeric task value correctness in separate scoring.'};
writeFileSync(join(base,'audit/attestation-probes-002.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,results:results.map(r=>({name:r.name,actual:r.actual}))}));
