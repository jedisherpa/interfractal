// Narrow controlled-DOM reproduction of immutable 001 canonical-to-local controls.
// This is implementation-under-test evidence, never supported-browser evidence.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import * as model from '../../misleading-view/builds/g13-daa720242d62cd4c184f/model.mjs';
const root=resolve(import.meta.dirname,'../..'),build=resolve(root,'misleading-view/builds/g13-daa720242d62cd4c184f');
const fixture=JSON.parse(await readFile(resolve(build,'fixture.json')));
const source=(await readFile(resolve(build,'app.mjs'),'utf8')).replace(/^import [^\n]+\n/,'');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function boot(){
  const elements=new Map(),listeners={};
  function el(id){if(!elements.has(id))elements.set(id,{id,value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,children:[],listeners:{},append(x){this.children.push(x);},addEventListener(type,cb){this.listeners[type]=cb;}});return elements.get(id);}
  const document={getElementById:el,createElement:()=>({value:'',textContent:''}),querySelector:()=>({getBoundingClientRect:()=>({width:800,height:320})}),documentElement:{scrollWidth:1280,scrollHeight:1800}};
  const context={...model,document,fetch:async p=>({json:async()=>p==='/fixture.json'?fixture:{runId:'G13-MISLEAD-001',buildId:'g13-daa720242d62cd4c184f'}}),crypto:webcrypto,structuredClone,TextEncoder,innerWidth:1280,innerHeight:720,scrollX:0,scrollY:0,performance:{now:()=>0},setInterval:()=>1,clearInterval:()=>{},requestAnimationFrame:cb=>{cb();return 1;},addEventListener:(type,cb)=>{listeners[type]=cb;}};
  await vm.runInNewContext(`(async()=>{${source}\nglobalThis.__state=()=>({state,lastPacket,localReviews,events});})()`,context);
  await wait(30);
  return {el,context};
}
const cases=[];
async function probe(seconds,control,invoke){const {el,context}=await boot();el('checkpoint').onchange({target:{value:String(seconds)}});await wait(30);const b=context.__state(),before={mode:b.state.mode,version:b.state.version,activeCheck:b.state.activeCheck,activeCorrection:b.state.activeCorrection,informationAvailableOperations:structuredClone(b.lastPacket.informationPayload.availableOperations),controlDisabled:el(control).disabled,eventCount:b.events.length};let error=null;try{invoke(el);}catch(e){error=String(e);}await wait(30);const after=context.__state();cases.push({seconds,control,before,error,after:{mode:after.state.mode,version:after.state.version,activeCheck:after.state.activeCheck,activeCorrection:after.state.activeCorrection,publishedMode:after.lastPacket.semanticPayload.mode,publishedVersion:after.lastPacket.semanticPayload.version,publishedCheck:!!after.lastPacket.semanticPayload.check,publishedCorrection:!!after.lastPacket.semanticPayload.correction,publishedMarker:after.lastPacket.semanticPayload.correctionMarker,eventCount:after.events.length,message:el('message').textContent}});}
await probe(8,'correct',()=>{});
await probe(12,'source',el=>el('source').onclick());
await probe(12,'representation',el=>el('representation').onchange({target:{value:'plain'}}));
await probe(12,'records',el=>el('records').onclick());
await probe(12,'original',el=>el('original').onclick());
await probe(20,'correction',el=>el('correction').onclick());
const [cp8,source12,rep12,records12,original12,correction20]=cases;
const defects={cp8AdvertisesUnavailableCorrection:cp8.before.informationAvailableOperations.applyCorrection===true&&cp8.before.controlDisabled===true,cp12SourceThrows:source12.before.controlDisabled===false&&source12.error?.includes('correction not active'),cp12RepresentationThrows:rep12.before.controlDisabled===false&&rep12.error?.includes('correction not active'),cp12RecordsThrows:records12.before.controlDisabled===false&&records12.error?.includes('correction not active'),cp12OriginalDropsScriptedCheckAndCorrection:original12.before.controlDisabled===false&&!original12.error&&original12.after.publishedMode==='local-review'&&original12.after.publishedCheck===false&&original12.after.publishedCorrection===false&&original12.after.publishedMarker===null,cp20CorrectionThrows:correction20.before.controlDisabled===false&&correction20.error?.includes('correction not active')};
const result={schema:'gate13-candidate-001-canonical-control-reproduction-v1',status:Object.values(defects).every(Boolean)?'DEFECT_REPRODUCED':'REPRODUCTION_INCOMPLETE',defects,cases,scope:'Controlled VM handlers from immutable 001; not actual supported-browser clicks. Sealed browser core did not execute these cross-mode canonical controls.'};
await writeFile(resolve(root,'audit/gate-13/canonical-control-repro.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,defects,cases:cases.map(x=>({seconds:x.seconds,control:x.control,error:x.error,before:x.before,after:x.after}))},null,2));
