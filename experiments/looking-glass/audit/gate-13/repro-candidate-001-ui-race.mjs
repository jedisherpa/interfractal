// Controlled VM DOM/clock probe of packaged Gate 13 app; not supported-browser evidence.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,webcrypto} from 'node:crypto';
import vm from 'node:vm';
import * as model from '../../misleading-view/builds/g13-daa720242d62cd4c184f/model.mjs';

const root=resolve(import.meta.dirname,'../..'),built=resolve(root,'misleading-view/builds/g13-daa720242d62cd4c184f');
const fixture=JSON.parse(await readFile(resolve(built,'fixture.json')));
const source=(await readFile(resolve(built,'app.mjs'),'utf8')).replace(/^import [^\n]+\n/,'');
const elements=new Map(),listeners={};
function el(id){if(!elements.has(id))elements.set(id,{id,value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,children:[],listeners:{},append(x){this.children.push(x);},addEventListener(type,cb){this.listeners[type]=cb;},getBoundingClientRect(){return {width:760,height:250}}});return elements.get(id);}
const document={getElementById:el,createElement:()=>({value:'',textContent:''}),querySelector:selector=>({getBoundingClientRect:()=>({width:selector==='#plain table'?720:800,height:selector==='#plain table'?260:320})}),documentElement:{scrollWidth:1280,scrollHeight:1800}};
const canon=x=>Array.isArray(x)?`[${x.map(canon).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canon(x[k])}`).join(',')}}`:JSON.stringify(x);
let delayMode='none',calls=0;
async function slowHash(x){calls++;const delay=delayMode==='fixed'?65:delayMode==='stale'?(x?.representation==='plain'?140:12):0;if(delay)await new Promise(r=>setTimeout(r,delay));return createHash('sha256').update(canon(x)).digest('hex');}
const context={...model,hash:slowHash,document,fetch:async p=>({json:async()=>p==='/fixture.json'?fixture:{runId:'G13-MISLEAD-001',buildId:'g13-daa720242d62cd4c184f'}}),crypto:webcrypto,structuredClone,TextEncoder,innerWidth:1280,innerHeight:720,scrollX:0,scrollY:0,performance:{now:()=>0},setInterval:()=>1,clearInterval:()=>{},requestAnimationFrame:cb=>{cb();return 1;},addEventListener:(type,cb)=>{listeners[type]=cb;}};
await vm.runInNewContext(`(async()=>{${source}\nglobalThis.__state=()=>({state,lastPacket,localReviews,events,busy,semanticGeneration,committedGeneration});})()`,context);
const wait=ms=>new Promise(r=>setTimeout(r,ms)),checks=[];
const check=(name,pass,detail)=>checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});
await wait(30);
check('initial paused zero published',context.__state().lastPacket?.semanticPayload?.cursorSeconds===0&&context.__state().lastPacket?.semanticPayload?.activeCheck===false);
el('start-review').onclick();await wait(30);
el('source').onclick();await wait(30);
check('first source visible before checking',context.__state().lastPacket.semanticPayload.sourceOpen&&el('source-detail').textContent.includes('completedCount'));
await el('check').onclick();await wait(40);
check('false check created once',context.__state().localReviews.MISMATCH.check.content.verdict===false&&context.__state().events.filter(x=>x.type==='statement-check').length===1);
const correctionTask=el('correct').onclick();
check('pending immutable correction disables version control',context.__state().busy===true&&el('original').disabled===true);
await correctionTask;await wait(40);
check('correction linked and controls reenabled',context.__state().localReviews.MISMATCH.correction.content.checkContentHash===context.__state().localReviews.MISMATCH.check.contentHash&&context.__state().busy===false&&el('original').disabled===false);
const beforeOriginal=context.__state().events.length;
el('original').onclick();await wait(40);
check('settled Show original click changes state and event',context.__state().state.version==='original'&&context.__state().events.length===beforeOriginal+1&&context.__state().events.at(-1).type==='version-select'&&context.__state().lastPacket.semanticPayload.correctionMarker);
el('correction').onclick();await wait(40);
check('show correction restores debrief',context.__state().state.version==='corrected'&&el('debrief').textContent.includes('Subtracting a baseline of 70')&&context.__state().localReviews.MISMATCH.check.content.verdict===false);
const visualHash=context.__state().lastPacket.informationHash;
el('representation').onchange({target:{value:'plain'}});await wait(40);
check('plain keeps exact information and source path',context.__state().lastPacket.informationHash===visualHash&&el('source').disabled===false&&el('numeric-key').innerHTML.includes('Bar width'));
document.documentElement.scrollHeight=2100;
await el('export').onclick();await wait(40);
const exported=JSON.parse(el('export-output').textContent);
check('export includes its own event and complete local records',exported.events.at(-1).type==='review-export'&&exported.includedThroughSequence===exported.events.at(-1).sequence&&exported.localReviews.MISMATCH.check&&exported.localReviews.MISMATCH.correction);
check('post-export layout refreshed',context.__state().lastPacket.viewport.documentHeight===2100&&context.__state().lastPacket.scene.representation==='plain');

delayMode='fixed';
el('representation').onchange({target:{value:'visual'}});
document.documentElement.scrollHeight=2300;document.documentElement.scrollWidth=960;context.innerWidth=960;context.scrollY=140;
listeners.scroll();listeners.resize();el('inspector-details').listeners.toggle();
await wait(260);
let packet=context.__state().lastPacket;
check('paused control survives metadata refresh during delayed hash',packet.semanticPayload.representation==='visual'&&packet.semanticPayload.version==='corrected'&&context.__state().semanticGeneration===context.__state().committedGeneration);
check('latest post-render viewport/scene measured',packet.viewport.width===960&&packet.viewport.documentWidth===960&&packet.viewport.documentHeight===2300&&packet.viewport.scrollY===140&&packet.scene.representation==='visual');
check('inspector matches published semantic and information hashes',JSON.parse(el('inspector').textContent).semanticFingerprint===packet.semanticFingerprint&&JSON.parse(el('inspector').textContent).informationHash===packet.informationHash);
delayMode='stale';
el('representation').onchange({target:{value:'plain'}});
el('representation').onchange({target:{value:'visual'}});
await wait(250);
packet=context.__state().lastPacket;
check('obsolete asynchronous semantic result rejected',packet.semanticPayload.representation==='visual'&&context.__state().semanticGeneration===context.__state().committedGeneration);
check('all records persist after publication races',context.__state().localReviews.MISMATCH.check.contentHash===exported.localReviews.MISMATCH.check.contentHash&&context.__state().localReviews.MISMATCH.correction.contentHash===exported.localReviews.MISMATCH.correction.contentHash);

const errors=checks.filter(x=>!x.pass);
const result={schema:'gate13-candidate-001-controlled-ui-race-v1',status:errors.length?'BLOCKED':'PASS',checkCount:checks.length,passCount:checks.length-errors.length,errors,checks,hashCalls:calls,scope:'Isolated VM DOM/clock probe of immutable packaged app; not actual supported-browser evidence.'};
await writeFile(resolve(root,'audit/gate-13/candidate-001-ui-race.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checkCount:result.checkCount,passCount:result.passCount,errors},null,2));
