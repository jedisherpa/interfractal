import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {evaluateReceiver} from './receiver.mjs';
import * as model from './model.mjs';
const here=dirname(fileURLToPath(import.meta.url));let fixturePath=resolve(here,'fixture.json');try{await access(fixturePath);}catch{fixturePath=resolve(here,'../docs/gate-11/fixture.json');}
const fixture=JSON.parse(await readFile(fixturePath));let checks=0;const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
const hashes=await model.sourceHashes(fixture),all=await model.allCertificates(fixture);check(all.length,16);
for(const world of fixture.worlds){check(model.fullAnswer(world,'R_COUNT'),'yes');check(model.fullAnswer(world,'R_RELEASE'),world.id==='W11'?'yes':'no');}
for(let mask=0;mask<8;mask++){
  const fields=model.fieldOrder.filter((_,i)=>mask&(1<<i));const count=all.find(c=>c.receiverId==='R_COUNT'&&c.subsetMask===mask),release=all.find(c=>c.receiverId==='R_RELEASE'&&c.subsetMask===mask);
  check(count.globallySufficient,true);check(release.globallySufficient,!!(mask&1&&mask&2));
  for(const world of fixture.worlds){const p=model.project(fixture,world,fields),r=evaluateReceiver(p,'R_RELEASE');check(r.status!=='invalid-summary',true);
    if(r.status==='determined')check(r.answer,model.fullAnswer(world,'R_RELEASE'));
  }
}
const s0=fixture.worlds.map(w=>model.project(fixture,w,[]));check(s0.every(p=>model.canonical(p)===model.canonical(s0[0])),true);
const valid=model.project(fixture,fixture.worlds[3],[]);check(evaluateReceiver(valid,'R_COUNT').answer,'yes');check(evaluateReceiver(valid,'R_RELEASE').status,'insufficient');
for(const bad of [{...valid,worldId:'W11'},{...valid,additions:{unknown:{value:'x'}}},{...valid,units:Number.MAX_SAFE_INTEGER+1},{...valid,lotId:'OTHER'},{...valid,sourceHash:'covert'}])check(evaluateReceiver(bad,'R_RELEASE').status,'invalid-summary');
check(evaluateReceiver(valid,'unknown').status,'invalid-summary');
const pCalNo=model.project(fixture,fixture.worlds[0],['calibration']),pCalYes=model.project(fixture,fixture.worlds[3],['calibration']);check(evaluateReceiver(pCalNo,'R_RELEASE').answer,'no');check(evaluateReceiver(pCalYes,'R_RELEASE').status,'insufficient');
const pAuthNo=model.project(fixture,fixture.worlds[0],['authorization']),pAuthYes=model.project(fixture,fixture.worlds[3],['authorization']);check(evaluateReceiver(pAuthNo,'R_RELEASE').answer,'no');check(evaluateReceiver(pAuthYes,'R_RELEASE').status,'insufficient');
const badBinding=model.clone(pCalNo);badBinding.additions.calibration.forLot='OTHER';check(evaluateReceiver(badBinding,'R_RELEASE').status,'invalid-summary');
const badEnum=model.clone(pCalNo);badEnum.additions.calibration.status='maybe';check(evaluateReceiver(badEnum,'R_RELEASE').status,'invalid-summary');
const S0=await model.makeRevision(fixture,hashes,{id:'S0',parentId:null,fieldsBefore:[],requestedFields:[],triggerReceiverId:'R_COUNT',provenance:'scripted_demonstration',originEventReference:'initial-state'});
const S1=await model.makeRevision(fixture,hashes,{id:'S1',parentId:'S0',fieldsBefore:[],requestedFields:['calibration'],triggerReceiverId:'R_RELEASE',provenance:'scripted_demonstration',originEventReference:'script:3'});
const S2=await model.makeRevision(fixture,hashes,{id:'S2',parentId:'S1',fieldsBefore:['calibration'],requestedFields:['authorization'],triggerReceiverId:'R_RELEASE',provenance:'scripted_demonstration',originEventReference:'script:4'});
check(S1.parentId,'S0');check(S2.fieldsAfter,['calibration','authorization']);check(S1.sourceFamilyHash,hashes.family);check(model.witness(fixture,S0,['W10','W11'],'R_RELEASE').status,'collision');check(model.witness(fixture,S2,['W10','W11'],'R_RELEASE').status,'separated');
for(const world of fixture.worlds)check(S0.payloadHashes[world.id],await model.hash(S0.payloads[world.id]));
const paint=await model.makeRevision(fixture,hashes,{id:'P',parentId:'S0',fieldsBefore:[],requestedFields:['paint'],triggerReceiverId:'R_RELEASE',provenance:'source_informed_software',originEventReference:'ui:1',parentReferenceOnly:true});
check(paint.parentReferenceOnly,true);check(paint.sourceFamilyHash,hashes.family);check(model.certificate(fixture,'R_RELEASE',paint.fieldsAfter).globallySufficient,false);
const empty=await model.makeRevision(fixture,hashes,{id:'E',parentId:'S0',fieldsBefore:[],requestedFields:[],triggerReceiverId:'R_RELEASE',provenance:'source_informed_software',originEventReference:'ui:2'});check(empty.outcome,'unchanged-content');
const duplicate=await model.makeRevision(fixture,hashes,{id:'D',parentId:'S1',fieldsBefore:['calibration'],requestedFields:['calibration'],triggerReceiverId:'R_RELEASE',provenance:'source_informed_software',originEventReference:'ui:3'});check(duplicate.outcome,'unchanged-content');
const allThree=await model.makeRevision(fixture,hashes,{id:'A',parentId:'S0',fieldsBefore:[],requestedFields:model.fieldOrder,triggerReceiverId:'R_RELEASE',provenance:'source_informed_software',originEventReference:'ui:4'});check(model.certificate(fixture,'R_RELEASE',allThree.fieldsAfter).globallySufficient,true);
for(const seconds of fixture.savedTour.checkpointSeconds){const s=model.checkpointState(fixture,seconds);check(s.cursorSeconds,seconds);check(s.revisionId,seconds>=16&&seconds<24?'S2':seconds>=12&&seconds<24?'S1':'S0');}
const registry={S0,S1,S2},state=model.initialState(fixture),a=model.derive(fixture,state,registry,all,hashes),b=model.derive(fixture,{...state,representation:'plain'},registry,all,hashes);check(await model.hash(a.informationPayload),await model.hash(b.informationPayload));
const changedWorlds=model.clone(fixture);changedWorlds.worlds.reverse();check(evaluateReceiver(valid,'R_RELEASE'),evaluateReceiver(valid,'R_RELEASE'));
let now=0;const elements=new Map(),listeners={},el=id=>{if(!elements.has(id))elements.set(id,{id,value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,checked:false,listeners:{},append(){},addEventListener(type,callback){this.listeners[type]=callback;},getBoundingClientRect(){return {width:720,height:300}}});return elements.get(id);};
const document={getElementById:el,createElement:()=>({value:'',textContent:''}),querySelector:()=>({getBoundingClientRect:()=>({width:720,height:300})}),documentElement:{scrollWidth:1280,scrollHeight:1800}};
const source=(await readFile(resolve(here,'app.mjs'),'utf8')).replace(/^import [^\n]+\n/,'');
const context={...model,document,fetch:async path=>({json:async()=>path==='/fixture.json'?fixture:{runId:'TEST-RUN',buildId:'TEST-BUILD'}}),crypto:webcrypto,structuredClone,TextEncoder,innerWidth:1280,innerHeight:720,scrollX:0,scrollY:0,performance:{now:()=>now},setInterval:()=>1,clearInterval:()=>{},requestAnimationFrame:cb=>{cb();return 1;},addEventListener:(type,callback)=>{listeners[type]=callback;}};
await vm.runInNewContext(`(async()=>{${source}\nglobalThis.__test={get state(){return state},get registry(){return registry},get packet(){return lastPacket},get events(){return events}};})()`,context);
await new Promise(resolve=>setTimeout(resolve,15));check(context.__test.state.mode,'saved-tour');check(context.__test.packet.semanticPayload.receiverResult.answer,'yes');
el('receiver').onchange({target:{value:'R_RELEASE'}});await new Promise(resolve=>setTimeout(resolve,15));check(context.__test.state.mode,'local-exploration');check(context.__test.packet.semanticPayload.receiverResult.status,'insufficient');
el('witness-open').onclick();await new Promise(resolve=>setTimeout(resolve,15));check(context.__test.packet.semanticPayload.selectedWitness.status,'collision');
const input={type:'checkbox',value:'calibration',checked:true};el('repair-checkboxes').onchange({target:input});input.value='authorization';el('repair-checkboxes').onchange({target:input});await el('apply').onclick();await new Promise(resolve=>setTimeout(resolve,15));check(context.__test.state.revisionId,'L1');check(context.__test.packet.semanticPayload.receiverResult.answer,'yes');check(context.__test.packet.semanticPayload.globalCertificate.globallySufficient,true);check(context.__test.packet.semanticPayload.selectedWitness.status,'separated');
const diagramHash=context.__test.packet.informationHash;el('representation').onchange({target:{value:'plain'}});await new Promise(resolve=>setTimeout(resolve,15));check(context.__test.packet.informationHash,diagramHash);
await el('export').onclick();const exported=JSON.parse(el('export-output').textContent);check(exported.includedThroughSequence,exported.events.at(-1).sequence);check(exported.localRevisionHistory.length,1);check(exported.localRevisionHistory[0].parentReferenceOnly,true);
check(/^[0-9a-f-]{36}$/.test(exported.documentId),true);check(context.__test.packet.documentId,exported.documentId);
// Reproduce candidate001's delayed-hash metadata race on the actual app controller.
const originalCrypto=globalThis.crypto,originalDescriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');let digestDelay=0;
Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{digest:async(...args)=>{if(digestDelay)await new Promise(resolve=>setTimeout(resolve,digestDelay));return originalCrypto.subtle.digest(...args);}}}});
try{
  const settle=()=>new Promise(resolve=>setTimeout(resolve,260));
  el('receiver').onchange({target:{value:'R_COUNT'}});await settle();digestDelay=75;
  el('receiver').onchange({target:{value:'R_RELEASE'}});listeners.scroll();await settle();check(context.__test.packet.semanticPayload.receiverId,'R_RELEASE');
  digestDelay=0;el('receiver').onchange({target:{value:'R_COUNT'}});await settle();digestDelay=75;
  el('receiver').onchange({target:{value:'R_RELEASE'}});listeners.resize();await settle();check(context.__test.packet.semanticPayload.receiverId,'R_RELEASE');
  digestDelay=0;el('source-close').onclick();await settle();digestDelay=75;
  el('source-open').onclick();el('inspector-details').listeners.toggle();await settle();check(context.__test.packet.semanticPayload.fullSourceOpen,true);
  digestDelay=0;el('revision').onchange({target:{value:'S0'}});await settle();
  const paintInput={type:'checkbox',value:'paint',checked:true};el('repair-checkboxes').onchange({target:paintInput});await settle();digestDelay=75;
  const repairPromise=el('apply').onclick();listeners.scroll();await repairPromise;await settle();check(context.__test.packet.semanticPayload.revisionId,'L2');check(context.__test.packet.semanticPayload.payload.additions.paint.value,'amber');
  digestDelay=75;el('checkpoint').onchange({target:{value:'16'}});listeners.scroll();await settle();check(context.__test.packet.semanticPayload.cursorSeconds,16);check(context.__test.packet.semanticPayload.revisionId,'S2');
}finally{if(originalDescriptor)Object.defineProperty(globalThis,'crypto',originalDescriptor);else Object.defineProperty(globalThis,'crypto',{configurable:true,value:originalCrypto});}
process.stdout.write(`Gate 11 builder checks: ${checks} PASS\n`);
