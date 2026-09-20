#!/usr/bin/env node
// Synthetic positive/negative post-initial phase contract probes.
import {readFileSync,writeFileSync} from 'node:fs';import {join,resolve} from 'node:path';
import {validateSnapshotRecord} from '../package-candidate-003/builder-tooling/snapshot-contract.mjs';
const base=resolve(import.meta.dirname,'..'),j=p=>JSON.parse(readFileSync(join(base,p)));
const world=j('design/world.json'),alloc=j('design/allocations.json'),tasks=j('design/development-tasks.json'),schema=j('design/snapshot.schema.json');
const r=j('package-candidate-003/builder-tooling/fixtures/SYNTHETIC_VALID_NOT_RESEARCH_OUTPUT.json');const z='0'.repeat(64),ids=world.cards.map(c=>c.id);
r.phase='union';r.agentId='SYNTHETIC-UNION';r.snapshotId='SYNTHETIC-UNION-2';r.suppliedCardIds=ids;r.sourceCoverage=ids.map(cardId=>({cardId,disposition:'used',reason:'synthetic phase probe'}));
r.taskResponses.push({taskId:'D09',values:{lineageCount:1,maxQuantity:1},evidence:{lineageCount:[],maxQuantity:[]},missingDependencies:[]},{taskId:'D10',values:{C06_C13:'unknown',C13_C14:'unknown'},evidence:{C06_C13:[],C13_C14:[]},missingDependencies:['synthetic']});
const ctx={phase:'union',agentId:r.agentId,snapshotId:r.snapshotId,modelId:r.identity.modelId,modelVersion:r.identity.modelVersion,cardIds:ids,inputManifestSha256:z,settingsManifestSha256:z};
const probes=[];function check(name,record,expected,accepted){const errors=validateSnapshotRecord(record,schema,world,alloc,expected,tasks);probes.push({name,accepted:errors.length===0,expectedAccept:accepted,pass:(errors.length===0)===accepted,errors});}
check('union full18 D01-D10',structuredClone(r),ctx,true);
const revised=structuredClone(r);revised.phase='revised';revised.agentId='A1';revised.snapshotId='SYNTHETIC-REVISED';revised.revision.parentSnapshotIds=['SYNTHETIC-INITIAL'];revised.revision.triggerSourceIds=['F-C17-1'];
const revisedCtx={...ctx,phase:'revised',agentId:'A1',snapshotId:revised.snapshotId,parentSnapshotIds:['SYNTHETIC-INITIAL'],triggerSourceIds:['F-C17-1']};
check('revised full18 with trusted parent and trigger',revised,revisedCtx,true);
const badRevised=structuredClone(revised);badRevised.taskResponses=badRevised.taskResponses.filter(x=>!['D09','D10'].includes(x.taskId));check('revised lacking D09 D10',badRevised,revisedCtx,false);
const final=structuredClone(r);final.phase='interactive_final';final.agentId='SYNTHETIC-SYNTHESIS';final.snapshotId='SYNTHETIC-FINAL';final.revision.parentSnapshotIds=['SYNTHETIC-R1','SYNTHETIC-R2','SYNTHETIC-R3','SYNTHETIC-R4'];
const finalCtx={...ctx,phase:'interactive_final',agentId:final.agentId,snapshotId:final.snapshotId,parentSnapshotIds:final.revision.parentSnapshotIds};
check('interactive final full18 with four trusted parents',final,finalCtx,true);
const badFinal=structuredClone(final);badFinal.revision.parentSnapshotIds=['SYNTHETIC-R1'];check('interactive final one parent',badFinal,finalCtx,false);
const out={schemaVersion:'materials-postinitial-probes/1',status:probes.every(p=>p.pass)?'PASS':'FAIL',probes};writeFileSync(join(base,'audit/phase-probes-003.json'),JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:out.status,probes:probes.length,failed:probes.filter(p=>!p.pass).map(p=>p.name)}));if(out.status!=='PASS')process.exitCode=1;
