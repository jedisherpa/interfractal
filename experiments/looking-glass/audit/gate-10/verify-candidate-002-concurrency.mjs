#!/usr/bin/env node
// Reproduce overlapping idempotent requests against immutable candidate002 service.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PredictionService} from '../../prediction-transfer/builds/g10-464bfe21ad6044378996/service.mjs';
import {makeServer} from '../../prediction-transfer/builds/g10-464bfe21ad6044378996/server.mjs';

const auditDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(auditDir,'../..');
const fixture=JSON.parse(fs.readFileSync(path.join(root,'docs/gate-10/fixture.json')));
const key=JSON.parse(fs.readFileSync(path.join(root,'docs/gate-10/private-answer-key.json')));
const service=new PredictionService({fixture,key,runId:'G10-PREDICT-002',buildId:'g10-464bfe21ad6044378996',logPath:path.join(auditDir,'candidate-002-concurrency-actions.jsonl')});
const session=(await service.handle('/api/session',{actor:'software_validation'})).body;
const common={sessionToken:session.sessionToken,buildId:'g10-464bfe21ad6044378996'};
const id=()=>crypto.randomBytes(12).toString('hex');
const startBody={...common,caseId:'T01',requestId:id()};
const overlappingStarts=await Promise.all([service.handle('/api/start',startBody),service.handle('/api/start',startBody)]);
const startAttempts=overlappingStarts.map(x=>x.body.attemptId);
const fresh=(await service.handle('/api/start',{...common,caseId:'T01',requestId:id()})).body;
const commitBody={...common,caseId:'T01',attemptId:fresh.attemptId,requestId:id(),response:{kind:'answer',optionId:'O1'}};
const overlappingCommits=await Promise.all([service.handle('/api/commit',commitBody),service.handle('/api/commit',commitBody)]);
const conflictId=id();
const conflictingStarts=await Promise.all([
  service.handle('/api/start',{...common,caseId:'T01',requestId:conflictId}),
  service.handle('/api/start',{...common,caseId:'T02',requestId:conflictId})
]);
const httpPort=44025;
const {server}=await makeServer({port:httpPort,runDir:path.join(root,'prediction-transfer/runs/G10-PREDICT-002'),logPath:path.join(auditDir,'candidate-002-concurrency-http-actions.jsonl')});
await new Promise((resolve,reject)=>server.once('error',reject).listen(httpPort,'127.0.0.1',resolve));
async function post(route,body){const response=await fetch(`http://127.0.0.1:${httpPort}${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};}
let httpOverlap;
try{
  const hs=(await post('/api/session',{actor:'software_validation'})).body;
  const hcommon={sessionToken:hs.sessionToken,buildId:'g10-464bfe21ad6044378996'};
  const hstart={...hcommon,caseId:'T01',requestId:id()};
  const hsPair=await Promise.all([post('/api/start',hstart),post('/api/start',hstart)]);
  const fresh=(await post('/api/start',{...hcommon,caseId:'T01',requestId:id()})).body;
  const hcommit={...hcommon,caseId:'T01',attemptId:fresh.attemptId,requestId:id(),response:{kind:'answer',optionId:'O1'}};
  const hcPair=await Promise.all([post('/api/commit',hcommit),post('/api/commit',hcommit)]);
  httpOverlap={identicalStartStatuses:hsPair.map(x=>x.status),distinctStartAttemptCount:new Set(hsPair.map(x=>x.body.attemptId)).size,identicalCommitStatuses:hcPair.map(x=>x.status),secondCommitError:hcPair[1].body.error??null};
}finally{await new Promise(resolve=>server.close(resolve));}
const logText=fs.readFileSync(path.join(auditDir,'candidate-002-concurrency-actions.jsonl'),'utf8');
const credentialsRedacted=!logText.includes(session.sessionToken)&&!logText.includes(overlappingCommits[0].body.receipt??'undefined-secret');
const report={schema:'gate10-candidate-002-overlap-idempotency-repro-v1',status:'FAIL',scope:'Isolated software API concurrency; no browser or human action',runId:'G10-PREDICT-002',buildId:'g10-464bfe21ad6044378996',identicalStart:{statuses:overlappingStarts.map(x=>x.status),attemptIds:startAttempts,distinctAttempts:new Set(startAttempts).size,expected:'one immutable attempt and identical result for both same-request retries'},identicalCommit:{statuses:overlappingCommits.map(x=>x.status),receiptEquality:!!overlappingCommits[0].body.receipt&&overlappingCommits[0].body.receipt===overlappingCommits[1].body.receipt,secondError:overlappingCommits[1].body.error??null,expected:'same locked commit receipt for both same-request retries'},conflictingStart:{statuses:conflictingStarts.map(x=>x.status),caseIds:conflictingStarts.map(x=>x.body.caseId??null),expected:'one accepted request, one 409 conflict for the same requestId with differing caseId'},httpOverlap,attemptCount:service.sessions.get(session.sessionToken).attempts.length,serverEventTypes:service.events.map(e=>e.type),sourceOfFailure:'startRequests and commitRequests are stored only after awaiting record(); overlapping calls enter before their idempotency entries are visible.',credentialsRedacted};
if(report.identicalStart.distinctAttempts===1&&report.identicalCommit.statuses.every(s=>[200,201].includes(s))&&report.identicalCommit.receiptEquality)report.status='PASS';
fs.writeFileSync(path.join(auditDir,'candidate-002-concurrency-repro.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,identicalStart:report.identicalStart,identicalCommit:report.identicalCommit,conflictingStart:report.conflictingStart,httpOverlap:report.httpOverlap,attemptCount:report.attemptCount},null,2));
