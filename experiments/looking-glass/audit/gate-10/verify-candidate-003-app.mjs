#!/usr/bin/env node
// Independent deterministic control-flow probe of the exact immutable app source.
// This is a minimal DOM/clock harness, not a supported-browser observation.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as model from '../../prediction-transfer/builds/g10-9e34f791d83c1cd7a495/model.mjs';

const auditDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(auditDir,'../..');
const buildDir=path.join(root,'prediction-transfer/builds/g10-9e34f791d83c1cd7a495');
const fixture=JSON.parse(await fs.readFile(path.join(buildDir,'fixture.json')));
const raw=await fs.readFile(path.join(buildDir,'app.mjs'),'utf8');
const appSource=raw.replace(/^import [^\n]+\n/,'');
if(appSource===raw)throw Error('Expected one static model import');
const checks=[];
function check(name,condition){checks.push({name,pass:!!condition});}
const nodes=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{id,textContent:'',innerHTML:'',disabled:false,hidden:false,value:'',append(){},getBoundingClientRect(){return {width:280,height:200}}});return nodes.get(id);}
let clock=0;
const delayed=[];
const context={
  document:{getElementById:node,createElement:()=>({value:'',textContent:''}),querySelectorAll:()=>[node('draw1'),node('draw2')],documentElement:{scrollWidth:1280,scrollHeight:1600}},
  fetch:async (url)=>{
    if(url==='/fixture.json')return {json:async()=>fixture};
    if(url==='/build.json')return {json:async()=>({runId:'G10-PREDICT-003',buildId:'g10-9e34f791d83c1cd7a495'})};
    if(url==='/api/export')return await new Promise(resolve=>delayed.push(resolve));
    return {ok:true,json:async()=>({})};
  },
  crypto:webcrypto,structuredClone,TextEncoder,innerWidth:1280,innerHeight:720,scrollX:0,scrollY:0,
  performance:{now:()=>clock},setInterval:()=>1,clearInterval:()=>{},addEventListener:()=>{},
  ...model
};
await vm.runInNewContext(`(async()=>{${appSource}\nglobalThis.audit={play,pause,restore,localReview,log,events,get state(){return state},setSession(t,s){sessionToken=t;sessionId=s}};})()`,context);
const flush=()=>new Promise(resolve=>setTimeout(resolve,15));
await flush();
const initial=JSON.parse(node('inspector').textContent);
check('initial inspector semantic hash',initial.semanticFingerprint===await model.fingerprint(initial.semanticPayload));
check('initial target withheld',node('target').innerHTML.includes('Target result withheld'));
context.audit.localReview('T01','inspect-case');await flush();
context.audit.play();await flush();
const entry=context.audit.events.filter(e=>e.type==='reopen-saved'||e.type==='tour-play');
check('local play emits restore then play',entry.length===2&&entry[0].type==='reopen-saved'&&entry[1].type==='tour-play');
check('local play event fingerprints join',entry.length===2&&entry[0].afterSemanticFingerprint===entry[1].beforeSemanticFingerprint);
clock=4000;context.audit.pause();await flush();
const boundary=context.audit.events.slice(-2);
check('boundary pause emits case-select then pause',boundary[0]?.type==='case-select'&&boundary[1]?.type==='tour-pause');
check('boundary pause event fingerprints join',boundary[0]?.afterSemanticFingerprint===boundary[1]?.beforeSemanticFingerprint);
const same=model.semanticPayload(context.audit.state,fixture);
await context.audit.log('commit-ack','api',{},'accepted',same,same);
const apiEvent=context.audit.events.at(-1);
check('API actor/provenance not scripted',apiEvent.actor==='source_informed_software_api'&&apiEvent.provenance==='source_informed_software');
context.audit.localReview('T01','inspect-case');context.audit.setSession('private-test-token','session-test-1');await flush();
const staleExport=node('export-ledger').onclick();await flush();
check('export request delayed',delayed.length===1);
context.audit.restore(0,'reopen-saved');await flush();
delayed.shift()({ok:true,json:async()=>({attempts:[{caseId:'T01',target:{kind:'point'},explanation:'PRIVATE_TEST_ANSWER'}]})});
await staleExport;await flush();
check('late export does not repopulate canonical text',node('export-output').textContent==='');
check('late export does not pollute canonical inspector',!node('inspector').textContent.includes('PRIVATE_TEST_ANSWER'));
context.audit.localReview('T02','case-select');await flush();
const staleCaseExport=node('export-ledger').onclick();await flush();
check('second delayed export',delayed.length===1);
context.audit.localReview('T03','case-select');await flush();
delayed.shift()({ok:true,json:async()=>({attempts:[{caseId:'T02',target:{kind:'point'},explanation:'PRIVATE_CASE_ANSWER'}]})});
await staleCaseExport;await flush();
check('late export does not cross local case',node('export-output').textContent===''&&!node('inspector').textContent.includes('PRIVATE_CASE_ANSWER'));
const report={schema:'gate10-candidate-003-independent-app-control-audit-v1',status:checks.every(c=>c.pass)?'PASS':'FAIL',scope:'Deterministic minimal DOM and clock harness of built app source; no supported browser or human action',buildId:'g10-9e34f791d83c1cd7a495',checkCount:checks.length,checks};
await fs.writeFile(path.join(auditDir,'candidate-003-app-control-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,checkCount:report.checkCount,failed:checks.filter(c=>!c.pass)},null,2));
if(report.status!=='PASS')process.exitCode=1;
