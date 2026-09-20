// Independent controlled DOM regression of immutable Gate 13 candidate 002.
// The host's supported-browser evidence is separate.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,webcrypto} from 'node:crypto';
import vm from 'node:vm';
import * as model from '../../misleading-view/builds/g13-5b8514d97acc3485aabf/model.mjs';
const root=resolve(import.meta.dirname,'../..'),build=resolve(root,'misleading-view/builds/g13-5b8514d97acc3485aabf');
const fixture=JSON.parse(await readFile(resolve(build,'fixture.json')));
const source=(await readFile(resolve(build,'app.mjs'),'utf8')).replace(/^import [^\n]+\n/,'');
const canon=x=>Array.isArray(x)?`[${x.map(canon).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canon(x[k])}`).join(',')}}`:JSON.stringify(x);
const hash=x=>createHash('sha256').update(canon(x)).digest('hex');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const checks=[];const check=(name,pass,detail)=>checks.push({name,pass:!!pass,...(pass||detail===undefined?{}:{detail})});

async function boot(){
  const elements=new Map(),listeners={};
  function el(id){if(!elements.has(id))elements.set(id,{id,value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,children:[],listeners:{},append(x){this.children.push(x);},addEventListener(type,cb){this.listeners[type]=cb;}});return elements.get(id);}
  const document={getElementById:el,createElement:()=>({value:'',textContent:''}),querySelector:()=>({getBoundingClientRect:()=>({width:800,height:320})}),documentElement:{scrollWidth:1280,scrollHeight:1800}};
  const context={...model,document,fetch:async p=>({json:async()=>p==='/fixture.json'?fixture:{runId:'G13-MISLEAD-002',buildId:'g13-5b8514d97acc3485aabf'}}),crypto:webcrypto,structuredClone,TextEncoder,innerWidth:1280,innerHeight:720,scrollX:0,scrollY:0,performance:{now:()=>0},setInterval:()=>1,clearInterval:()=>{},requestAnimationFrame:cb=>{cb();return 1;},addEventListener:(type,cb)=>{listeners[type]=cb;}};
  await vm.runInNewContext(`(async()=>{${source}\nglobalThis.__state=()=>({state,lastPacket,localReviews,events});})()`,context);
  await wait(25);
  const current=()=>context.__state();
  const cp=async seconds=>{el('checkpoint').onchange({target:{value:String(seconds)}});await wait(25);};
  return {el,current,cp};
}

for(const seconds of [8,12,16,20]){
  const {el,current,cp}=await boot();await cp(seconds);
  let p=current().lastPacket;
  check(`CP${seconds} check/apply affordance matches disabled controls`,p.semanticPayload.mode==='saved-tour'&&p.informationPayload.availableOperations.checkOriginal===false&&p.informationPayload.availableOperations.applyCorrection===false&&el('check').disabled===true&&el('correct').disabled===true);
  const originalCheckHash=p.selectedCaseRecords.check?.contentHash,originalCorrectionHash=p.selectedCaseRecords.correction?.contentHash;
  for(const [name,invoke,assert] of [
    ['source',()=>el('source').onclick(),p=>p.semanticPayload.sourceOpen===true],
    ['records',()=>el('records').onclick(),p=>p.semanticPayload.recordsOpen===true],
    ['representation',()=>el('representation').onchange({target:{value:'plain'}}),p=>p.semanticPayload.representation==='plain']
  ]){
    const before=current().lastPacket,eventCount=current().events.length,disabled=el(name).disabled;
    invoke();await wait(25);p=current().lastPacket;
    const last=current().events.at(-1);
    check(`CP${seconds} ${name} retains canonical records and truthful event`,!disabled&&p.semanticPayload.mode==='saved-tour'&&assert(p)&&p.selectedCaseRecords.check?.contentHash===originalCheckHash&&p.selectedCaseRecords.correction?.contentHash===originalCorrectionHash&&p.selectedCaseRecords.check?.envelope.provenance==='scripted_demonstration'&&current().events.length===eventCount+1&&last.origin==='user-control'&&last.result==='accepted'&&last.beforeSemanticFingerprint===before.semanticFingerprint&&last.afterSemanticFingerprint===p.semanticFingerprint&&Object.values(current().localReviews).every(x=>!x.check&&!x.correction));
  }
  if(seconds===12||seconds===16){
    const before=current().lastPacket,enabled=!el('original').disabled;
    el('original').onclick();await wait(25);p=current().lastPacket;
    check(`CP${seconds} Show original retains scripted false check and marker`,enabled&&p.semanticPayload.mode==='saved-tour'&&p.semanticPayload.version==='original'&&p.semanticPayload.check?.verdict===false&&!!p.semanticPayload.correction&&p.semanticPayload.correctionMarker==='Correction available; original retained for inspection'&&p.selectedCaseRecords.check?.envelope.provenance==='scripted_demonstration');
    const info=p.informationHash;
    const correctionEnabled=!el('correction').disabled;
    el('correction').onclick();await wait(25);p=current().lastPacket;
    check(`CP${seconds} Show correction restores scripted debrief`,correctionEnabled&&p.semanticPayload.mode==='saved-tour'&&p.semanticPayload.version==='corrected'&&p.semanticPayload.check?.verdict===false&&!!p.semanticPayload.correction&&p.semanticPayload.debrief.includes('Subtracting a baseline')&&p.selectedCaseRecords.correction?.envelope.provenance==='scripted_demonstration'&&p.informationHash!==info);
  }
  if(seconds===20){const before=current().lastPacket,enabled=!el('correction').disabled;el('correction').onclick();await wait(25);p=current().lastPacket;check('CP20 enabled Show correction retains scripted debrief',enabled&&p.semanticPayload.mode==='saved-tour'&&p.semanticPayload.version==='corrected'&&p.semanticPayload.correction?.caseId==='MISMATCH'&&p.semanticPayload.debrief.includes('Subtracting a baseline')&&p.selectedCaseRecords.correction?.envelope.provenance==='scripted_demonstration'&&p.semanticFingerprint!==before.semanticFingerprint);}
}

{
  const {el,current,cp}=await boot();await cp(12);
  const before=current().lastPacket,eventsBefore=current().events.length;
  el('representation').onchange({target:{value:'BROKEN'}});await wait(25);
  const after=current().lastPacket,last=current().events.at(-1);
  check('invalid representation restores exact semantic state with rejected event',after.semanticFingerprint===before.semanticFingerprint&&after.informationHash===before.informationHash&&after.semanticPayload.mode==='saved-tour'&&last.result==='rejected'&&last.beforeSemanticFingerprint===last.afterSemanticFingerprint&&last.afterSemanticFingerprint===before.semanticFingerprint&&current().events.length===eventsBefore+1,{beforeHash:before.semanticFingerprint,afterHash:after.semanticFingerprint,last,eventCount:current().events.length,eventsBefore});
  const again=current().lastPacket,n=current().events.length;
  el('case').onchange({target:{value:'UNKNOWN'}});await wait(25);
  const rejected=current().events.at(-1);
  check('invalid case transition rolls back without losing canonical binding',current().lastPacket.semanticFingerprint===again.semanticFingerprint&&current().lastPacket.selectedCaseRecords.correction?.envelope.provenance==='scripted_demonstration'&&current().events.length===n+1&&rejected.result==='rejected'&&rejected.beforeSemanticFingerprint===rejected.afterSemanticFingerprint);
  await cp(8);
  const cp8=current().lastPacket,disabled=el('correction').disabled;
  el('correction').onclick();await wait(25);
  const r=current().events.at(-1);
  check('model-only forced unavailable correction rejected atomically',disabled&&current().lastPacket.semanticFingerprint===cp8.semanticFingerprint&&r.result==='rejected'&&r.beforeSemanticFingerprint===r.afterSemanticFingerprint);
}

{
  const {el,current,cp}=await boot();
  el('start-review').onclick();await wait(25);await el('check').onclick();await wait(25);await el('correct').onclick();await wait(25);
  const localCheck=current().localReviews.MISMATCH.check.contentHash,localCorrection=current().localReviews.MISMATCH.correction.contentHash;
  await cp(20);
  check('checkpoint masks older local records while scripted provenance selected',current().lastPacket.semanticPayload.mode==='saved-tour'&&current().lastPacket.selectedCaseRecords.check.envelope.provenance==='scripted_demonstration'&&current().localReviews.MISMATCH.check.contentHash===localCheck&&current().localReviews.MISMATCH.correction.contentHash===localCorrection);
  el('source').onclick();await wait(25);el('correction').onclick();await wait(25);
  check('scripted inspection does not overwrite older local records',current().lastPacket.semanticPayload.mode==='saved-tour'&&current().localReviews.MISMATCH.check.contentHash===localCheck&&current().localReviews.MISMATCH.correction.contentHash===localCorrection);
  el('start-review').onclick();await wait(25);
  check('explicit local entry rehydrates matching older records',current().lastPacket.semanticPayload.mode==='local-review'&&current().lastPacket.semanticPayload.version==='corrected'&&current().lastPacket.selectedCaseRecords.check.contentHash===localCheck&&current().lastPacket.selectedCaseRecords.correction.contentHash===localCorrection&&current().lastPacket.selectedCaseRecords.check.envelope.provenance==='host_controlled_software');
}

const errors=checks.filter(x=>!x.pass);
const result={schema:'gate13-candidate-002-controlled-canonical-controls-v1',status:errors.length?'BLOCKED':'PASS',checkCount:checks.length,passCount:checks.length-errors.length,errors,checks,scope:'Controlled DOM handlers from immutable 002; not actual supported-browser evidence.'};
await writeFile(resolve(root,'audit/gate-13/candidate-002-canonical-controls.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checkCount:result.checkCount,passCount:result.passCount,errors},null,2));
