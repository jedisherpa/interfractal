#!/usr/bin/env node
// Independent controlled reproduction of the immutable 003 first-start UI path.
// It does not call the live server or claim a supported-browser observation.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as model from '../../prediction-transfer/builds/g10-9e34f791d83c1cd7a495/model.mjs';

const auditDir=path.dirname(fileURLToPath(import.meta.url));
const buildDir=path.resolve(auditDir,'../../prediction-transfer/builds/g10-9e34f791d83c1cd7a495');
const fixture=JSON.parse(await fs.readFile(path.join(buildDir,'fixture.json')));
const source=await fs.readFile(path.join(buildDir,'app.mjs'),'utf8');
const app=source.replace(/^import [^\n]+\n/,'');
if(app===source)throw Error('Unexpected built-app import layout');
const dom=new Map();
function element(id){if(!dom.has(id))dom.set(id,{id,textContent:'',innerHTML:'',hidden:false,disabled:false,value:'',append(){},getBoundingClientRect(){return {width:280,height:200}}});return dom.get(id);}
const apiCalls=[];
const mockAttemptId='controlled-attempt-id';
const fakeFetch=async (url,options)=>{
  if(url==='/fixture.json')return {ok:true,json:async()=>fixture};
  if(url==='/build.json')return {ok:true,json:async()=>({runId:'G10-PREDICT-003',buildId:'g10-9e34f791d83c1cd7a495'})};
  if(url==='/api/session'){
    apiCalls.push({route:url,accepted:true});
    return {ok:true,json:async()=>({sessionToken:'controlled-private-token',sessionId:'controlled-session-id',buildId:'g10-9e34f791d83c1cd7a495',humanEligible:false})};
  }
  if(url==='/api/start'){
    const body=JSON.parse(options.body);
    apiCalls.push({route:url,accepted:true,caseId:body.caseId,hasValidSessionToken:body.sessionToken==='controlled-private-token'});
    return {ok:true,json:async()=>({attemptId:mockAttemptId,caseId:body.caseId,ordinal:1,priorReveal:false,status:'answering',eventReference:'controlled-api-event'})};
  }
  throw Error(`Unexpected route ${url}`);
};
const context={document:{getElementById:element,createElement:()=>({value:'',textContent:''}),querySelectorAll:()=>[element('card-a'),element('card-b')],documentElement:{scrollWidth:1280,scrollHeight:1500}},fetch:fakeFetch,crypto:webcrypto,structuredClone,TextEncoder,innerWidth:1280,innerHeight:720,scrollX:0,scrollY:0,performance:{now:()=>0},setInterval:()=>1,clearInterval:()=>{},addEventListener:()=>{},...model};
await vm.runInNewContext(`(async()=>{${app}\nglobalThis.audit={events,get state(){return state},get attached(){return attached},get pending(){return pending},get ledger(){return ledger}};})()`,context);
const flush=()=>new Promise(resolve=>setTimeout(resolve,20));
await flush();
element('inspect').onclick();await flush();
const before=JSON.parse(element('inspector').textContent).semanticPayload;
element('start').onclick();await flush();
const after=JSON.parse(element('inspector').textContent);
const eventTypes=context.audit.events.map(e=>e.type);
const report={
  schema:'gate10-candidate-003-first-start-controlled-repro-v1',
  status:'FAIL',
  scope:'Exact immutable app source under controlled minimal DOM and accepted mock API; not actual browser or live-server mutation',
  buildId:'g10-9e34f791d83c1cd7a495',
  apiCalls,
  before:{mode:before.mode,caseId:before.caseId,responsePhase:before.responsePhase},
  after:{mode:after.semanticPayload.mode,caseId:after.semanticPayload.caseId,responsePhase:after.semanticPayload.responsePhase,pendingAction:after.semanticPayload.pendingAction,attachedAttempt:after.semanticPayload.attachedAttempt,ledgerAttemptCount:after.ledgerPayload.attempts.length,commitDisabled:element('commit').disabled,skipDisabled:element('skip').disabled},
  eventTypes:eventTypes.filter(x=>x.includes('session')||x.includes('attempt-start')),
  firstStartComparison:{capturedAttempt:null,currentOptionalAttempt:undefined,strictMismatch:undefined!==null},
  credentialsAndReceiptsRedacted:true
};
const reproduced=apiCalls.length===2&&apiCalls[0].route==='/api/session'&&apiCalls[1].route==='/api/start'&&apiCalls[1].hasValidSessionToken&&report.after.responsePhase==='none'&&report.after.attachedAttempt===null&&report.after.ledgerAttemptCount===0&&report.after.commitDisabled&&report.after.skipDisabled&&report.eventTypes.includes('attempt-start-request')&&!report.eventTypes.includes('attempt-start-ack');
report.reproduced=reproduced;
if(!reproduced)report.status='UNEXPECTED';
await fs.writeFile(path.join(auditDir,'candidate-003-first-start-blocker-repro.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,reproduced,apiCalls:report.apiCalls,after:report.after,eventTypes:report.eventTypes},null,2));
if(!reproduced)process.exitCode=1;
