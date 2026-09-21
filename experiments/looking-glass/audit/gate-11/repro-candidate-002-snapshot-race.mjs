// Controlled-DOM software repro for a paused metadata refresh racing an async semantic publish.
// It does not operate the supported browser or change implementation files.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {webcrypto} from 'node:crypto';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const buildDir=resolve(root,'receiver-summary/builds/g11-7ced826c903d40c5a0dd');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let digestDelay=0;
Object.defineProperty(globalThis,'crypto',{configurable:true,value:{randomUUID:()=>webcrypto.randomUUID(),subtle:{digest:async(...args)=>{if(digestDelay)await delay(digestDelay);return webcrypto.subtle.digest(...args);}}}});
class Element{
  constructor(){this.textContent='';this.innerHTML='';this.value='';this.hidden=false;this.disabled=false;this.children=[];}
  append(child){this.children.push(child);}
  addEventListener(){}
  getBoundingClientRect(){return {width:720,height:300};}
}
const elements=new Map();
const getElementById=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const listeners={};
globalThis.document={getElementById,createElement:()=>new Element(),querySelector:()=>new Element(),documentElement:{scrollWidth:1100,scrollHeight:1800}};
globalThis.addEventListener=(type,callback)=>{listeners[type]=callback;};
globalThis.requestAnimationFrame=callback=>setTimeout(callback,0);
globalThis.innerWidth=1280;globalThis.innerHeight=720;globalThis.scrollX=0;globalThis.scrollY=0;
globalThis.fetch=async path=>({json:async()=>JSON.parse(readFileSync(resolve(buildDir,path.slice(1))))});

await import('../../receiver-summary/builds/g11-7ced826c903d40c5a0dd/app.mjs');
await delay(50);
const initial=JSON.parse(getElementById('inspector').textContent);
if(initial.semanticPayload.receiverId!=='R_COUNT')throw Error('initial publish did not complete');
digestDelay=75;
getElementById('receiver').onchange({target:{value:'R_RELEASE'}});
listeners.scroll();
await delay(300);
const after=JSON.parse(getElementById('inspector').textContent);
const result={schema:'gate11-candidate002-paused-publication-race-recheck-v1',status:after.semanticPayload.receiverId==='R_RELEASE'&&after.snapshotRevision>initial.snapshotRevision?'PASS_FIXED':'FAIL_STALE',expectedReceiverAfterControl:'R_RELEASE',actualPublishedReceiverAfterSettling:after.semanticPayload.receiverId,initialSnapshotRevision:initial.snapshotRevision,finalSnapshotRevision:after.snapshotRevision,trigger:'receiver control starts delayed hash; immediate paused scroll requests metadata refresh',softwareControlledDomOnly:true,browserObservation:false};
writeFileSync(resolve(root,'audit/gate-11/candidate-002-snapshot-race-repro.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(result.status!=='PASS_FIXED')process.exitCode=1;
