// Independent audit of the first, preserved candidate002 CUA object transport.
// Reads evidence only; does not touch the browser or implementation.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const base=resolve(root,'evidence/gate-11/browser-002');
const load=name=>JSON.parse(readFileSync(resolve(base,name),'utf8'));
const obs=load('observations.json');
const canonical=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?`[${x.map(canonical).join(',')}]`:`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`;
const hash=x=>createHash('sha256').update(canonical(x)).digest('hex');
const placeholder=x=>JSON.stringify(x).includes('[MaxDepth]');
const semanticFail=obs.filter(o=>hash(o.published.semanticPayload)!==o.published.semanticFingerprint);
const infoFail=obs.filter(o=>hash(o.published.informationPayload)!==o.published.informationHash);
const semanticPlaceholder=semanticFail.filter(o=>placeholder(o.published.semanticPayload));
const informationPlaceholder=infoFail.filter(o=>placeholder(o.published.informationPayload));
const unexplained=semanticFail.filter(o=>!placeholder(o.published.semanticPayload));
const one=unexplained.length===1?unexplained[0]:null;
let ulp=null;
if(one){
  const source=one.published.semanticPayload,captured=source.cursorSeconds;
  const buffer=new ArrayBuffer(8),view=new DataView(buffer);view.setFloat64(0,captured,false);
  const bits=view.getBigUint64(0,false);
  for(let delta=-4;delta<=4;delta++){
    view.setBigUint64(0,bits+BigInt(delta),false);
    const candidate=view.getFloat64(0,false),copy={...source,cursorSeconds:candidate};
    if(hash(copy)===one.published.semanticFingerprint){ulp={observationIndex:one.index,label:one.label,capturedCursor:captured,matchingCursor:candidate,deltaUlps:delta,allOtherFieldsUnchanged:true};break;}
  }
}
const exports=['critical-workflow-export.json','session-one-final-export.json','session-two-final-export.json','natural-tour-export.json'].map(name=>({name,containsMaxDepth:readFileSync(resolve(base,name),'utf8').includes('[MaxDepth]')}));
const report={schema:'gate11-candidate002-cua-object-transport-diagnosis-v1',status:semanticFail.length===22&&semanticPlaceholder.length===21&&infoFail.length===66&&informationPlaceholder.length===66&&ulp?.deltaUlps===-1&&exports.every(x=>!x.containsMaxDepth)?'TRANSPORT_TRUNCATION_CONFIRMED':'UNRESOLVED',firstAcquisitionObservationCount:obs.length,semanticHashPassed:obs.length-semanticFail.length,semanticHashTotal:obs.length,semanticFailuresWithLiteralMaxDepth:semanticPlaceholder.map(x=>x.index),informationHashPassed:obs.length-infoFail.length,informationHashTotal:obs.length,informationFailuresWithLiteralMaxDepth:informationPlaceholder.map(x=>x.index),nonPlaceholderSemanticFailures:unexplained.map(x=>x.index),oneUlpResolution:ulp,rawStringExports:exports,scope:'First browser-002 object transport only; unverified hashes remain unverified and no browser/app claim follows from this diagnosis.'};
writeFileSync(resolve(root,'audit/gate-11/candidate-002-transport-diagnosis.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,observations:report.firstAcquisitionObservationCount,semanticFailures:semanticFail.length,semanticMaxDepth:semanticPlaceholder.length,informationFailures:infoFail.length,informationMaxDepth:informationPlaceholder.length,oneUlpResolution:ulp,rawExportsComplete:exports.every(x=>!x.containsMaxDepth)}));
if(report.status!=='TRANSPORT_TRUNCATION_CONFIRMED')process.exitCode=1;
