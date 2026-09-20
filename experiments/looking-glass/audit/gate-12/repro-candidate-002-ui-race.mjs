// Controlled DOM/clock reproduction against immutable candidate 002 app source.
// This does not claim supported-browser evidence and writes only an audit result.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,webcrypto} from 'node:crypto';
import vm from 'node:vm';
import * as model from '../../coordination/builds/g12-3c5526361a7cb2cc5c4a/model.mjs';

const root=resolve(import.meta.dirname,'../..');
const built=resolve(root,'coordination/builds/g12-3c5526361a7cb2cc5c4a');
const fixture=JSON.parse(await readFile(resolve(built,'fixture.json')));
const source=(await readFile(resolve(built,'app.mjs'),'utf8')).replace(/^import [^\n]+\n/,'');
const elements=new Map(),listeners={};
function el(id){if(!elements.has(id))elements.set(id,{id,value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,children:[],listeners:{},append(x){this.children.push(x);},addEventListener(type,cb){this.listeners[type]=cb;},getBoundingClientRect(){return {width:760,height:300}}});return elements.get(id);}
const document={getElementById:el,createElement:()=>({value:'',textContent:''}),querySelector:()=>({getBoundingClientRect:()=>({width:760,height:300})}),documentElement:{scrollWidth:1280,scrollHeight:1800}};
let delayMode='none', calls=0;
const canonical=x=>Array.isArray(x)?`[${x.map(canonical).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`:JSON.stringify(x);
async function slowHash(x){calls++;const delay=delayMode==='fixed'?70:delayMode==='stale'?(x?.scenarioId==='EXTREMES'?160:10):0;if(delay)await new Promise(r=>setTimeout(r,delay));return createHash('sha256').update(canonical(x)).digest('hex');}
const context={...model,hash:slowHash,document,fetch:async path=>({json:async()=>path==='/fixture.json'?fixture:{runId:'G12-COORD-002',buildId:'g12-3c5526361a7cb2cc5c4a'}}),crypto:webcrypto,structuredClone,TextEncoder,innerWidth:1280,innerHeight:720,scrollX:0,scrollY:0,performance:{now:()=>0},setInterval:()=>1,clearInterval:()=>{},requestAnimationFrame:cb=>{cb();return 1;},addEventListener:(type,cb)=>{listeners[type]=cb;}};
await vm.runInNewContext(`(async()=>{${source}\nglobalThis.__state=()=>({packet:lastPacket,state,localBranches,events,semanticGeneration,committedGeneration});})()`,context);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(30);
const checks=[];const check=(name,pass,detail)=>checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});
check('initial snapshot',context.__state().packet?.semanticPayload?.scenarioId==='ALL');
el('new-branch').onclick();await wait(30);
check('new local branch',context.__state().state.mode==='local-exploration' && context.__state().localBranches.length===1);
document.documentElement.scrollHeight=1950;
await el('export').onclick();await wait(30);
const exported=JSON.parse(el('export-output').textContent);
check('export includes its own event',exported.events.at(-1).type==='local-export' && exported.includedThroughSequence===exported.events.at(-1).sequence);
check('post-export layout measured',context.__state().packet.viewport.documentHeight===1950);

delayMode='fixed';
el('scenario').onchange({target:{value:'EXTREMES'}});
document.documentElement.scrollHeight=2100;context.scrollY=120;listeners.scroll();
context.innerWidth=960;document.documentElement.scrollWidth=960;listeners.resize();
el('inspector-details').listeners.toggle();
await wait(250);
let packet=context.__state().packet;
check('paused control then scroll/resize/details preserves semantic',packet.semanticPayload.scenarioId==='EXTREMES' && packet.semanticPayload.currentOutcome===null);
check('post-render metadata from latest viewport',packet.viewport.width===960 && packet.viewport.scrollY===120 && packet.viewport.documentHeight===2100 && packet.viewport.horizontalOverflow===false);
check('published inspector matches latest packet',JSON.parse(el('inspector').textContent).semanticFingerprint===packet.semanticFingerprint);

delayMode='stale';
el('scenario').onchange({target:{value:'ALL'}});
el('scenario').onchange({target:{value:'EXTREMES'}});
el('scenario').onchange({target:{value:'NONE'}});
await wait(300);
packet=context.__state().packet;
check('obsolete slow semantic result rejected',packet.semanticPayload.scenarioId==='NONE' && packet.semanticPayload.currentOutcome===null);
check('semantic token settled',context.__state().semanticGeneration===context.__state().committedGeneration);

// Published local branch index feeds the actual branch <select> and information hash.
check('local branch index has no duplicate and canonical remains selectable',packet.branchRegistry.map(b=>b.id).join(',')==='C0,L1',packet.branchRegistry.map(b=>b.id));
check('retained-outcome select has enablement handler',typeof el('retained-outcome').onchange==='function');

delayMode='none';
el('scenario').onchange({target:{value:'ALL'}});await wait(30);
await el('record-archive').onclick();await wait(30);
await el('record-dispatch').onclick();await wait(30);
await el('evaluate').onclick();await wait(30);
check('first local outcome selected P2',context.__state().packet.semanticPayload.currentOutcome?.selectedModeId==='P2');
el('scenario').onchange({target:{value:'EXTREMES'}});await wait(30);
await el('evaluate').onclick();await wait(30);
check('second local outcome selected tied P1',context.__state().packet.semanticPayload.currentOutcome?.selectedModeId==='P1');
el('retained-outcome').onchange({target:{value:'L-A-1'}});
check('retained inspection enabled by actual selector handler',el('inspect-outcome').disabled===false);
el('representation').onchange({target:{value:'plain'}});await wait(30);
check('pending outcome choice survives redraw',el('retained-outcome').value==='L-A-1' && !el('inspect-outcome').disabled);
el('inspect-outcome').onclick();await wait(30);
check('historical outcome inspected with recorded context',context.__state().packet.semanticPayload.inspectedOutcome?.scenarioId==='ALL' && context.__state().packet.semanticPayload.scenarioId==='EXTREMES' && context.__state().packet.semanticPayload.inspectedOutcome?.selectedModeId==='P2');
el('new-branch').onclick();await wait(30);
check('second local branch unique registry',context.__state().packet.branchRegistry.map(b=>b.id).join(',')==='C0,L1,L2' && context.__state().packet.informationPayload.branchIndex.length===3);
el('branch').onchange({target:{value:'L1'}});await wait(30);
check('return L1 preserves records',context.__state().packet.selectedBranchId==='L1' && context.__state().packet.selectedBranchRecord.outcomes.length===2);
el('branch').onchange({target:{value:'C0'}});await wait(30);
check('canonical return masks display but retains local registry',context.__state().packet.selectedBranchId==='C0' && context.__state().packet.semanticPayload.recordedGroups.length===0 && context.__state().packet.branchRegistry.length===3);

const errors=checks.filter(x=>!x.pass);
const out={schema:'gate12-candidate-002-controlled-ui-race-v1',candidate:'G12-COORD-002',status:errors.length?'BLOCKED':'PASS',checkCount:checks.length,passCount:checks.length-errors.length,checks,errors,hashCalls:calls,scope:'isolated VM DOM/clock reproduction; not supported-browser evidence'};
await writeFile(resolve(root,'audit/gate-12/candidate-002-ui-race.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,checkCount:out.checkCount,passCount:out.passCount,errors},null,2));
