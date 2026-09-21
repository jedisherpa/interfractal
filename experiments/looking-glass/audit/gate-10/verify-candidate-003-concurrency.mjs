#!/usr/bin/env node
// Reproduce overlapping idempotent requests against immutable candidate003 service.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PredictionService} from '../../prediction-transfer/builds/g10-9e34f791d83c1cd7a495/service.mjs';
import {makeServer} from '../../prediction-transfer/builds/g10-9e34f791d83c1cd7a495/server.mjs';

const auditDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(auditDir,'../..');
const fixture=JSON.parse(fs.readFileSync(path.join(root,'docs/gate-10/fixture.json')));
const key=JSON.parse(fs.readFileSync(path.join(root,'docs/gate-10/private-answer-key.json')));
const service=new PredictionService({fixture,key,runId:'G10-PREDICT-003',buildId:'g10-9e34f791d83c1cd7a495',logPath:path.join(auditDir,'candidate-003-concurrency-actions.jsonl')});
const session=(await service.handle('/api/session',{actor:'software_validation'})).body;
const common={sessionToken:session.sessionToken,buildId:'g10-9e34f791d83c1cd7a495'};
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
const httpPort=44032;
const {server}=await makeServer({port:httpPort,runDir:path.join(root,'prediction-transfer/runs/G10-PREDICT-003'),logPath:path.join(auditDir,'candidate-003-concurrency-http-actions.jsonl')});
await new Promise((resolve,reject)=>server.once('error',reject).listen(httpPort,'127.0.0.1',resolve));
async function post(route,body){const response=await fetch(`http://127.0.0.1:${httpPort}${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};}
let httpOverlap;
try{
  const hs=(await post('/api/session',{actor:'software_validation'})).body;
  const hcommon={sessionToken:hs.sessionToken,buildId:'g10-9e34f791d83c1cd7a495'};
  const hstart={...hcommon,caseId:'T01',requestId:id()};
  const hsPair=await Promise.all([post('/api/start',hstart),post('/api/start',hstart)]);
  const fresh=(await post('/api/start',{...hcommon,caseId:'T01',requestId:id()})).body;
  const hcommit={...hcommon,caseId:'T01',attemptId:fresh.attemptId,requestId:id(),response:{kind:'answer',optionId:'O1'}};
  const hcPair=await Promise.all([post('/api/commit',hcommit),post('/api/commit',hcommit)]);
  const hconflictId=id();
  const hconflict=await Promise.all([post('/api/start',{...hcommon,caseId:'T01',requestId:hconflictId}),post('/api/start',{...hcommon,caseId:'T02',requestId:hconflictId})]);
  httpOverlap={identicalStartStatuses:hsPair.map(x=>x.status),distinctStartAttemptCount:new Set(hsPair.map(x=>x.body.attemptId)).size,identicalStartEventEquality:hsPair[0].body.eventReference===hsPair[1].body.eventReference,identicalCommitStatuses:hcPair.map(x=>x.status),commitReceiptEquality:hcPair[0].body.receipt===hcPair[1].body.receipt,commitEventEquality:hcPair[0].body.eventReference===hcPair[1].body.eventReference,conflictingStartStatuses:hconflict.map(x=>x.status),conflictingStartCases:hconflict.map(x=>x.body.caseId??null)};
}finally{await new Promise(resolve=>server.close(resolve));}
const logText=fs.readFileSync(path.join(auditDir,'candidate-003-concurrency-actions.jsonl'),'utf8');
const credentialsRedacted=!logText.includes(session.sessionToken)&&!logText.includes(overlappingCommits[0].body.receipt??'undefined-secret');
const report={schema:'gate10-candidate-003-overlap-idempotency-audit-v1',status:'FAIL',scope:'Isolated software API concurrency; no browser or human action',runId:'G10-PREDICT-003',buildId:'g10-9e34f791d83c1cd7a495',identicalStart:{statuses:overlappingStarts.map(x=>x.status),attemptIds:startAttempts,distinctAttempts:new Set(startAttempts).size,eventReferenceEquality:overlappingStarts[0].body.eventReference===overlappingStarts[1].body.eventReference,expected:'one immutable attempt and identical result for both same-request retries'},identicalCommit:{statuses:overlappingCommits.map(x=>x.status),receiptEquality:!!overlappingCommits[0].body.receipt&&overlappingCommits[0].body.receipt===overlappingCommits[1].body.receipt,eventReferenceEquality:overlappingCommits[0].body.eventReference===overlappingCommits[1].body.eventReference,secondError:overlappingCommits[1].body.error??null,expected:'same locked commit receipt for both same-request retries'},conflictingStart:{statuses:conflictingStarts.map(x=>x.status),caseIds:conflictingStarts.map(x=>x.body.caseId??null),expected:'one accepted request, one 409 conflict for the same requestId with differing caseId'},httpOverlap,attemptCount:service.sessions.get(session.sessionToken).attempts.length,serverEventTypes:service.events.map(e=>e.type),credentialsRedacted};
const sorted=x=>[...x].sort((a,b)=>a-b);
const direct=JSON.stringify(sorted(report.identicalStart.statuses))===JSON.stringify([200,201])&&report.identicalStart.distinctAttempts===1&&report.identicalStart.eventReferenceEquality&&JSON.stringify(sorted(report.identicalCommit.statuses))===JSON.stringify([200,201])&&report.identicalCommit.receiptEquality&&report.identicalCommit.eventReferenceEquality&&JSON.stringify(sorted(report.conflictingStart.statuses))===JSON.stringify([201,409])&&report.attemptCount===3&&service.events.filter(e=>e.type==='commit-ack').length===1;
const remote=JSON.stringify(sorted(httpOverlap.identicalStartStatuses))===JSON.stringify([200,201])&&httpOverlap.distinctStartAttemptCount===1&&httpOverlap.identicalStartEventEquality&&JSON.stringify(sorted(httpOverlap.identicalCommitStatuses))===JSON.stringify([200,201])&&httpOverlap.commitReceiptEquality&&httpOverlap.commitEventEquality&&JSON.stringify(sorted(httpOverlap.conflictingStartStatuses))===JSON.stringify([201,409]);
report.directPass=direct;report.httpPass=remote;report.status=direct&&remote&&credentialsRedacted?'PASS':'FAIL';
fs.writeFileSync(path.join(auditDir,'candidate-003-concurrency-repro.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,identicalStart:report.identicalStart,identicalCommit:report.identicalCommit,conflictingStart:report.conflictingStart,httpOverlap:report.httpOverlap,attemptCount:report.attemptCount},null,2));
