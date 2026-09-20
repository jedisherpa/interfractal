#!/usr/bin/env node
// Independent read-only HTTP and isolated software API audit of immutable 002.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {makeServer} from '../../prediction-transfer/builds/g10-464bfe21ad6044378996/server.mjs';
import {PredictionService} from '../../prediction-transfer/builds/g10-464bfe21ad6044378996/service.mjs';

const auditDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(auditDir,'../..');
const buildDir=path.join(root,'prediction-transfer/builds/g10-464bfe21ad6044378996');
const runDir=path.join(root,'prediction-transfer/runs/G10-PREDICT-002');
const fixture=JSON.parse(fs.readFileSync(path.join(root,'docs/gate-10/fixture.json')));
const key=JSON.parse(fs.readFileSync(path.join(root,'docs/gate-10/private-answer-key.json')));
const port=44024,base=`http://127.0.0.1:${port}`,buildId='g10-464bfe21ad6044378996';
const errors=[],checks=[];
const check=(name,ok)=>{checks.push({name,pass:!!ok});if(!ok)errors.push(name);};
const uid=()=>crypto.randomBytes(12).toString('hex');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const safeKeys=x=>x&&typeof x==='object'?Object.keys(x).sort():[];
const {server,service}=await makeServer({port,runDir,logPath:path.join(auditDir,'candidate-002-isolated-api-actions.jsonl')});
await new Promise((resolve,reject)=>server.once('error',reject).listen(port,'127.0.0.1',resolve));

async function request(method,url,body,headers={}){
  const init={method,headers};
  if(body!==undefined){init.body=typeof body==='string'?body:JSON.stringify(body);if(!headers['Content-Type'])init.headers={...headers,'Content-Type':'application/json'};}
  const response=await fetch(base+url,init);const bytes=Buffer.from(await response.arrayBuffer());
  let value=null;try{value=JSON.parse(bytes.toString());}catch{}
  check(`no-store ${method} ${url} ${checks.length}`,response.headers.get('cache-control')==='no-store');
  check(`no cross-origin grant ${method} ${url} ${checks.length}`,response.headers.get('access-control-allow-origin')==='none');
  return {status:response.status,bytes,value,headers:response.headers};
}
const api=(route,body,headers={})=>request('POST',route,body,headers);
function status(name,result,expected){check(name,result.status===expected);return result.value;}
function rawPath(method,route){return new Promise(resolve=>{const req=http.request({hostname:'127.0.0.1',port,path:route,method},res=>{const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,bytes:Buffer.concat(chunks),headers:res.headers}));});req.on('error',e=>resolve({status:0,error:String(e)}));req.end();});}

try{
  const staticMap={
    '/':'index.html','/index.html':'index.html','/app.mjs':'app.mjs','/model.mjs':'model.mjs','/style.css':'style.css','/fixture.json':'fixture.json','/build.json':'build.json',
    '/run/run.json':'run.json','/run/initial-state.json':'initial-state.json','/run/events.jsonl':'events.jsonl','/run/checkpoints.json':'checkpoints.json'
  };
  for(const [route,name] of Object.entries(staticMap)){
    const expected=fs.readFileSync(path.join(route.startsWith('/run/')?runDir:buildDir,name));
    const get=await request('GET',route);
    check(`exact served bytes ${route}`,get.status===200&&get.bytes.equals(expected));
    const head=await request('HEAD',route);
    check(`HEAD ${route}`,head.status===200&&head.bytes.length===0&&Number(head.headers.get('content-length'))===expected.length);
  }
  for(const route of ['/private/private-answer-key.json','/private/independent-predictions.json','/service.mjs','/math.mjs','/test.mjs','/build.mjs','/README.md','/run/computational-results.json','/review/results.html','/review/packet.md','/api/key','/docs/gate-10/private-answer-key.json']){
    const r=await request('GET',route);check(`unserved ${route}`,r.status===404);
  }
  for(const route of ['/../docs/gate-10/private-answer-key.json','/%2e%2e/docs/gate-10/private-answer-key.json','/%252e%252e%252fprivate%252fprivate-answer-key.json','/private%2fprivate-answer-key.json','/run/../private/private-answer-key.json','/run//checkpoints.json','/index.html?x=1']){
    const r=await rawPath('GET',route);check(`raw traversal/unknown ${route}`,r.status===404);
  }
  for(const route of ['/api/session','/api/start','/api/commit','/api/reveal','/api/close','/api/export']){
    const r=await request('GET',route);check(`GET API denied ${route}`,r.status===405);
  }
  check('POST static denied',(await request('POST','/fixture.json',{})).status===405);
  check('OPTIONS denied',(await request('OPTIONS','/api/session')).status===405);
  check('bad Origin denied',(await api('/api/session',{actor:'software_validation'},{Origin:'http://evil.invalid'})).status===403);
  check('wrong content type denied',(await request('POST','/api/session','{}',{'Content-Type':'text/plain'})).status===415);
  check('invalid JSON denied',(await request('POST','/api/session','{bad')).status===400);
  check('oversized JSON denied',(await request('POST','/api/session',JSON.stringify({actor:'software_validation',padding:'a'.repeat(17000)}))).status===413);
  check('unknown session fields denied',(await api('/api/session',{actor:'software_validation',extra:1})).status===400);
  check('wrong actor denied',(await api('/api/session',{actor:'human'})).status===400);

  const created=await api('/api/session',{actor:'software_validation'},{Origin:base});
  const s=status('session created',created,201);
  check('opaque in-memory session response',safeKeys(s).join('|')===['buildId','expiresAtUtc','humanEligible','sessionId','sessionToken'].sort().join('|')&&s.humanEligible===false&&s.buildId===buildId&&typeof s.sessionToken==='string'&&s.sessionToken.length>=32);
  const common={sessionToken:s.sessionToken,buildId};
  check('practice start rejected',(await api('/api/start',{...common,caseId:'P00',requestId:uid()})).status===400);
  check('unknown case rejected',(await api('/api/start',{...common,caseId:'NOPE',requestId:uid()})).status===400);
  check('wrong build rejected',(await api('/api/start',{...common,buildId:'wrong',caseId:'T01',requestId:uid()})).status===409);
  check('invalid session rejected',(await api('/api/start',{sessionToken:'bad',buildId,caseId:'T01',requestId:uid()})).status===401);
  const startId=uid(),startBody={...common,caseId:'T01',requestId:startId};
  const started=await api('/api/start',startBody),a=status('T01 start',started,201);
  check('T01 start bound/ungraded',a.caseId==='T01'&&a.ordinal===1&&a.priorReveal===false&&a.firstExposureHumanEligible===false&&a.status==='answering'&&a.provenance==='source_informed_software'&&!('target' in a)&&!('expectedOptionId' in a));
  const retryStart=await api('/api/start',startBody);check('start retry same identity',retryStart.status===200&&retryStart.value.attemptId===a.attemptId);
  check('start requestId conflict',(await api('/api/start',{...startBody,caseId:'T02'})).status===409);
  const revealBody={...common,caseId:'T01',attemptId:a.attemptId,receipt:'guess',requestId:uid()};
  check('precommit reveal rejected',(await api('/api/reveal',revealBody)).status===403);
  check('off-menu answer rejected',(await api('/api/commit',{...common,caseId:'T01',attemptId:a.attemptId,requestId:uid(),response:{kind:'answer',optionId:'O9'}})).status===400);
  check('malformed skip rejected',(await api('/api/commit',{...common,caseId:'T01',attemptId:a.attemptId,requestId:uid(),response:{kind:'skip',optionId:'O1'}})).status===400);
  check('cross-case commit rejected',(await api('/api/commit',{...common,caseId:'T02',attemptId:a.attemptId,requestId:uid(),response:{kind:'answer',optionId:'O1'}})).status===403);
  const before=await api('/api/export',common);check('unrevealed export redacted',before.status===200&&before.value.attempts.length===1&&before.value.attempts[0].target===null&&before.value.attempts[0].softwareGrade===null&&before.value.attempts[0].response===null&&!JSON.stringify(before.value).includes(s.sessionToken));
  const commitId=uid(),commitBody={...common,caseId:'T01',attemptId:a.attemptId,requestId:commitId,response:{kind:'answer',optionId:'O1'}};
  const committed=await api('/api/commit',commitBody),c=status('wrong T01 commit',committed,201);
  check('commit ungraded and target-free',c.grading==='withheld'&&c.locked===true&&c.response.kind==='answer'&&c.response.optionId==='O1'&&c.receipt?.length>=32&&!('target' in c)&&!('expectedOptionId' in c)&&!('softwareGrade' in c)&&!('explanation' in c));
  const retryCommit=await api('/api/commit',commitBody);check('same commit retry receipt unchanged',retryCommit.status===200&&retryCommit.value.receipt===c.receipt&&retryCommit.value.commitSequence===c.commitSequence);
  check('conflicting commit requestId rejected',(await api('/api/commit',{...commitBody,response:{kind:'answer',optionId:'O2'}})).status===409);
  check('changed answer after lock rejected',(await api('/api/commit',{...commitBody,requestId:uid(),response:{kind:'answer',optionId:'O2'}})).status===409);
  const locked=await api('/api/export',common);check('locked unrevealed export target-free',locked.status===200&&locked.value.attempts[0].response.optionId==='O1'&&locked.value.attempts[0].target===null&&locked.value.attempts[0].softwareGrade===null&&locked.value.attempts[0].explanation===null&&!JSON.stringify(locked.value).includes(c.receipt));
  check('wrong receipt rejected',(await api('/api/reveal',{...revealBody,receipt:'wrong'})).status===403);
  check('cross-case reveal rejected',(await api('/api/reveal',{...revealBody,caseId:'T02',receipt:c.receipt})).status===403);
  check('wrong-build reveal rejected',(await api('/api/reveal',{...revealBody,buildId:'wrong',receipt:c.receipt})).status===409);
  const second=await api('/api/session',{actor:'software_validation'}),s2=status('second session',second,201);
  check('cross-session reveal rejected',(await api('/api/reveal',{...revealBody,sessionToken:s2.sessionToken,receipt:c.receipt})).status===403);
  const revealId=uid(),revealReq={...common,caseId:'T01',attemptId:a.attemptId,receipt:c.receipt,requestId:revealId};
  const revealed=await api('/api/reveal',revealReq),r=status('deliberate wrong reveal',revealed,201);
  check('revealed key exact and ordered',r.target.kind==='unique-point'&&r.target.xyz.join('|')==='2/5|-1|1/2'&&r.expectedOptionId==='O2'&&r.softwareGrade==='incorrect'&&r.revealSequence>c.commitSequence);
  const repeated=await api('/api/reveal',revealReq);check('same reveal repeated',repeated.status===200&&repeated.value.repeated===true&&repeated.value.firstRevealEventReference===r.eventReference);
  const otherRepeat=await api('/api/reveal',{...revealReq,requestId:uid()});check('distinct repeated reveal intent',otherRepeat.status===200&&otherRepeat.value.repeated===true);
  const postReveal=await api('/api/export',common);check('own revealed export now shows key',postReveal.status===200&&postReveal.value.attempts[0].target.xyz.join('|')==='2/5|-1|1/2'&&postReveal.value.attempts[0].softwareGrade==='incorrect'&&!JSON.stringify(postReveal.value).includes(c.receipt));
  const otherExport=await api('/api/export',{sessionToken:s2.sessionToken,buildId});check('new session isolated',otherExport.status===200&&otherExport.value.attempts.length===0&&!JSON.stringify(otherExport.value).includes('2/5'));
  const again=await api('/api/start',{...common,caseId:'T01',requestId:uid()}),a2=status('T01 repeat start',again,201);
  check('repeat ordinal/prior reveal',a2.ordinal===2&&a2.priorReveal===true&&a2.attemptId!==a.attemptId);
  const skipped=await api('/api/start',{...common,caseId:'T04',requestId:uid()}),a4=status('T04 start',skipped,201);
  const abandon=await api('/api/export',common);check('new start abandons previous unanswered',abandon.status===200&&abandon.value.attempts.find(x=>x.attemptId===a2.attemptId)?.status==='abandoned');
  const skipCommit=await api('/api/commit',{...common,caseId:'T04',attemptId:a4.attemptId,requestId:uid(),response:{kind:'skip',optionId:null}}),sc=status('T04 skip commit',skipCommit,201);
  check('skip locks null',sc.response.kind==='skip'&&sc.response.optionId===null&&sc.grading==='withheld');
  const skipReveal=await api('/api/reveal',{...common,caseId:'T04',attemptId:a4.attemptId,receipt:sc.receipt,requestId:uid()}),sr=status('T04 deliberate reveal',skipReveal,201);
  check('skip null grade and point',sr.softwareGrade===null&&sr.target.kind==='point'&&sr.target.delta==='0'&&sr.target.radiusSquared==='0');
  const t5=await api('/api/start',{...common,caseId:'T05',requestId:uid()}),a5=status('T05 start',t5,201);
  const t5Commit=await api('/api/commit',{...common,caseId:'T05',attemptId:a5.attemptId,requestId:uid(),response:{kind:'answer',optionId:'O4'}}),c5=status('T05 commit',t5Commit,201);
  const t5Reveal=await api('/api/reveal',{...common,caseId:'T05',attemptId:a5.attemptId,receipt:c5.receipt,requestId:uid()}),r5=status('T05 reveal',t5Reveal,201);
  check('empty distinct from point',r5.target.kind==='empty'&&r5.target.delta==='-5/4'&&r5.target.radiusSquared===null&&r5.target.radius===null&&r5.softwareGrade==='correct');
  const open=await api('/api/start',{...common,caseId:'T03',requestId:uid()}),ao=status('open T03',open,201);
  const close=await api('/api/close',{...common,attemptId:ao.attemptId,reason:'reopen-saved'});check('explicit close abandons open',close.status===200&&close.value.status==='abandoned');
  check('closed open attempt cannot commit',(await api('/api/commit',{...common,caseId:'T03',attemptId:ao.attemptId,requestId:uid(),response:{kind:'answer',optionId:'O4'}})).status===409);
  const abandoned=await api('/api/export',common);check('wrong/skipped/repeated/abandoned retained',abandoned.status===200&&abandoned.value.attempts.length===5&&abandoned.value.attempts[0].response.optionId==='O1'&&abandoned.value.attempts.find(x=>x.attemptId===ao.attemptId)?.status==='abandoned');
  const capacitySession=await api('/api/session',{actor:'software_validation'}),cs=status('capacity session',capacitySession,201);
  const cc={sessionToken:cs.sessionToken,buildId};
  for(let i=0;i<32;i++){const x=await api('/api/start',{...cc,caseId:'T02',requestId:uid()});check(`attempt capacity accepted ${i+1}`,x.status===201);}
  check('33rd attempt capacity rejects',(await api('/api/start',{...cc,caseId:'T02',requestId:uid()})).status===429);
  // s, s2 and cs already occupy three slots.
  for(let i=3;i<64;i++){const x=await api('/api/session',{actor:'software_validation'});check(`session capacity accepted ${i+1}`,x.status===201);}
  check('65th session capacity rejects',(await api('/api/session',{actor:'software_validation'})).status===429);
  let clock=Date.UTC(2026,8,20,0,0,0);
  const expiry=new PredictionService({fixture,key,runId:'G10-PREDICT-002',buildId,now:()=>clock});
  const es=(await expiry.handle('/api/session',{actor:'software_validation'})).body;
  const ea=await expiry.handle('/api/start',{sessionToken:es.sessionToken,buildId,caseId:'T01',requestId:uid()});
  check('controlled-clock session valid',ea.status===201);
  clock+=30*60*1000;
  const expired=await expiry.handle('/api/export',{sessionToken:es.sessionToken,buildId});
  check('controlled-clock expiry rejects',expired.status===410&&expired.body.error==='session_expired');
  check('expired session cannot reveal',(await expiry.handle('/api/reveal',{sessionToken:es.sessionToken,buildId,caseId:'T01',attemptId:ea.body.attemptId,receipt:'guess',requestId:uid()})).status===410);
  check('new session after expiry',(await expiry.handle('/api/session',{actor:'software_validation'})).status===201);
  const logged=fs.readFileSync(path.join(auditDir,'candidate-002-isolated-api-actions.jsonl'),'utf8');
  check('isolated API log redacted',!logged.includes(s.sessionToken)&&!logged.includes(c.receipt)&&logged.split('\n').filter(Boolean).length>100);
}finally{await new Promise(resolve=>server.close(resolve));}

const summary={schema:'gate10-candidate-002-isolated-http-service-audit-v1',status:errors.length?'FAIL':'PASS',runId:'G10-PREDICT-002',buildId,port,checkCount:checks.length,passCount:checks.length-errors.length,failed:errors,apiOrigin:'software_validation_api',browserInteraction:false,isolatedLogPath:'audit/gate-10/candidate-002-isolated-api-actions.jsonl',checks};
fs.writeFileSync(path.join(auditDir,'candidate-002-http-service-audit.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({status:summary.status,checkCount:summary.checkCount,passCount:summary.passCount,failed:summary.failed},null,2));
