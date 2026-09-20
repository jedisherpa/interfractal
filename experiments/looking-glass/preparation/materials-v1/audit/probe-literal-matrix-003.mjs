#!/usr/bin/env node
// Independent positive/negative literal-source probes against immutable candidate003.
import {readFileSync,writeFileSync} from 'node:fs';import {join,resolve} from 'node:path';
import {validateSnapshotRecord} from '../package-candidate-003/builder-tooling/snapshot-contract.mjs';
const base=resolve(import.meta.dirname,'..'),j=p=>JSON.parse(readFileSync(join(base,p)));
const world=j('design/world.json'),alloc=j('design/allocations.json'),tasks=j('design/development-tasks.json'),schema=j('design/snapshot.schema.json');
const seed=j('package-candidate-003/builder-tooling/fixtures/SYNTHETIC_VALID_NOT_RESEARCH_OUTPUT.json'),z='0'.repeat(64),ids=world.cards.map(c=>c.id);
const initial={phase:'initial',agentId:'A1',snapshotId:seed.snapshotId,modelId:seed.identity.modelId,modelVersion:seed.identity.modelVersion,cardIds:alloc.packets[0].cardIds,inputManifestSha256:z,settingsManifestSha256:z};
const unionRecord=structuredClone(seed);unionRecord.phase='union';unionRecord.agentId='SYNTHETIC-UNION';unionRecord.snapshotId='SYNTHETIC-UNION-LITERAL';unionRecord.suppliedCardIds=ids;unionRecord.sourceCoverage=ids.map(cardId=>({cardId,disposition:'used',reason:'synthetic literal witness fixture'}));unionRecord.taskResponses.push({taskId:'D09',values:{lineageCount:1,maxQuantity:1},evidence:{lineageCount:[],maxQuantity:[]},missingDependencies:[]},{taskId:'D10',values:{C06_C13:'unknown',C13_C14:'unknown'},evidence:{C06_C13:[],C13_C14:[]},missingDependencies:['synthetic']});
const union={...initial,phase:'union',agentId:unionRecord.agentId,snapshotId:unionRecord.snapshotId,cardIds:ids};
const cases=[];const run=(name,record,context,expectedAccept)=>{const errors=validateSnapshotRecord(record,schema,world,alloc,context,tasks);cases.push({name,expectedAccept,accepted:errors.length===0,pass:(errors.length===0)===expectedAccept,errors});};
const edit=(record,id,predicate,args,kind,polarity,refs)=>{const r=structuredClone(record),i=r.interpretations.find(x=>x.id===id);i.predicate=predicate;i.arguments=args;i.sourceKind=kind;i.status=polarity==='positive'?'supported':'refuted';i.supportingClaimIds=polarity==='positive'?refs:[];i.conflictingClaimIds=polarity==='negative'?refs:[];return r;};
const p12={actor:'ARA',plan:'P12',planVersion:1},grant={...p12,resource:'press',quantity:6};
run('understands rule plus matching source',edit(seed,'I-UNDERSTANDS','understands',p12,'source_stipulation','positive',['R04','F-C04-1']),initial,true);
run('endorses negative rule plus matching source',edit(seed,'I-ENDORSES','endorses',p12,'source_stipulation','negative',['R04','F-C04-2']),initial,true);
run('commitment rule plus exact source',edit(seed,'I-COMMITMENT','resource_commitment',grant,'source_stipulation','positive',['R05','F-C04-3']),initial,true);
run('model attribution rule plus exact artifact',edit(unionRecord,'I-UNDERSTANDS','model_attributes_endorsement',p12,'model_attribution','positive',['R04','F-C16-1']),union,true);
for(const [predicate,id,args,kind,record,context] of [
 ['understands','I-UNDERSTANDS',p12,'source_stipulation',seed,initial],
 ['endorses','I-ENDORSES',p12,'source_stipulation',seed,initial],
 ['resource_commitment','I-COMMITMENT',grant,'source_stipulation',seed,initial],
 ['model_attributes_endorsement','I-UNDERSTANDS',p12,'model_attribution',unionRecord,union],
])for(const polarity of ['positive','negative'])run(`${predicate} ${polarity} rule-only`,edit(record,id,predicate,args,kind,polarity,['R04']),context,false);
run('wrong resource-commitment quantity',edit(seed,'I-COMMITMENT','resource_commitment',{...grant,quantity:5},'source_stipulation','positive',['F-C04-3']),initial,false);
run('wrong endorsement plan',edit(seed,'I-ENDORSES','endorses',{...p12,plan:'P8'},'source_stipulation','negative',['F-C04-2']),initial,false);
run('model inference cannot serve literal understanding',edit(seed,'I-UNDERSTANDS','understands',p12,'model_inference','positive',['F-C04-1']),initial,false);
run('model artifact cannot be relabeled source stipulation',edit(unionRecord,'I-UNDERSTANDS','model_attributes_endorsement',p12,'source_stipulation','positive',['F-C16-1']),union,false);
const out={schemaVersion:'materials-literal-matrix/1',candidate:'003',status:cases.every(c=>c.pass)?'PASS':'FAIL',cases};writeFileSync(join(base,'audit/literal-matrix-003.json'),JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:out.status,checks:cases.length,failures:cases.filter(c=>!c.pass).map(c=>c.name)}));if(out.status!=='PASS')process.exitCode=1;
