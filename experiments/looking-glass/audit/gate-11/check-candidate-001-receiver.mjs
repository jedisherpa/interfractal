// Independent finite oracle against the packaged pure receiver only.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateReceiver} from '../../receiver-summary/builds/g11-4a38606632d77897a06e/receiver.mjs';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const fixture=JSON.parse(readFileSync(resolve(root,'docs/gate-11/fixture.json')));
const oracle=JSON.parse(readFileSync(resolve(root,'audit/gate-11/prespec-derivation.json')));
const checks=[];
const check=(name,pass)=>checks.push({name,pass:Boolean(pass)});
const clone=x=>structuredClone(x);
const worlds=fixture.worlds;

function independentProjection(world,mask){
  const payload=clone(fixture.baseSummaryPayload);
  for(const item of fixture.repairMenu){
    if(!(mask&item.bit))continue;
    const source=world.records[item.sourceRecord];
    const entry={};
    for(const [out,field] of Object.entries(item.copy))entry[out]=source[field];
    entry.sourceRef=clone(item.sourceRef);
    payload.additions[item.id]=entry;
  }
  return payload;
}

for(let mask=0;mask<8;mask++){
  const cert=oracle.subsetCertificates[mask];
  for(const world of worlds){
    const payload=independentProjection(world,mask),before=JSON.stringify(payload);
    const count=evaluateReceiver(payload,'R_COUNT');
    const release=evaluateReceiver(payload,'R_RELEASE');
    const expected=cert.localReleaseResultsByWorld[world.id];
    check(`mask${mask}-${world.id}-count`,count.status==='determined'&&count.answer===cert.localCountResultsByWorld[world.id]&&JSON.stringify(count.possibleAnswers)==='["yes"]');
    check(`mask${mask}-${world.id}-release`,expected==='insufficient'?release.status==='insufficient'&&release.answer===null&&JSON.stringify(release.possibleAnswers)==='["no","yes"]':release.status==='determined'&&release.answer===expected&&JSON.stringify(release.possibleAnswers)===JSON.stringify([expected]));
    check(`mask${mask}-${world.id}-unchanged-input`,JSON.stringify(payload)===before);
  }
}

const good=independentProjection(worlds[3],3);
const invalidCases=[
  ['unknown receiver',good,'R_HIDDEN'],
  ['covert world id',{...good,worldId:'W11'},'R_RELEASE'],
  ['covert source hash',{...good,fullSourceHash:'x'},'R_RELEASE'],
  ['covert revision',{...good,revisionId:'S2'},'R_RELEASE'],
  ['unsafe count',{...good,units:Number.MAX_SAFE_INTEGER+1},'R_RELEASE'],
  ['wrong lot binding',{...good,additions:{...good.additions,calibration:{...good.additions.calibration,forLot:'OTHER'}}},'R_RELEASE'],
  ['invalid enum',{...good,additions:{...good.additions,authorization:{...good.additions.authorization,status:'unknown'}}},'R_RELEASE'],
  ['unknown addition',{...good,additions:{...good.additions,secret:{status:'approved'}}},'R_RELEASE'],
  ['dereferenceable ref',{...good,sourceRef:{...good.sourceRef,dereferenceWithinReceiver:true}},'R_RELEASE'],
];
for(const [name,payload,receiver] of invalidCases){const result=evaluateReceiver(payload,receiver);check(`reject-${name}`,result.status==='invalid-summary'&&result.answer===null&&result.possibleAnswers.length===0);}

const result={schema:'gate11-candidate001-independent-receiver-v1',status:checks.every(x=>x.pass)?'PASS':'FAIL',checkCount:checks.length,passCount:checks.filter(x=>x.pass).length,projectionCount:32,invalidCaseCount:invalidCases.length,implementationModuleImports:['packaged receiver.mjs'],checks};
writeFileSync(resolve(root,'audit/gate-11/candidate-001-receiver-check.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checkCount:result.checkCount,passCount:result.passCount,projectionCount:result.projectionCount,invalidCaseCount:result.invalidCaseCount}));
if(result.status!=='PASS')process.exitCode=1;
