import assert from 'node:assert/strict';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeServer} from '../../prediction-transfer/builds/g10-9e34f791d83c1cd7a495/server.mjs';

const here=dirname(fileURLToPath(import.meta.url)),project=resolve(here,'../..'),port=44027;
const {server,service}=await makeServer({port,runDir:resolve(project,'prediction-transfer/runs/G10-PREDICT-003'),logPath:resolve(here,'builder-003-api-actions.jsonl')});
await new Promise((resolve,reject)=>server.once('error',reject).listen(port,'127.0.0.1',resolve));
let summary;
try{
  const post=async(path,body)=>{const response=await fetch(`http://127.0.0.1:${port}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
  const session=await post('/api/session',{actor:'software_validation'}),common={sessionToken:session.body.sessionToken,buildId:'g10-9e34f791d83c1cd7a495'};
  const startBody={...common,caseId:'T01',requestId:'builder003start'};
  const starts=await Promise.all([post('/api/start',startBody),post('/api/start',startBody)]);
  assert.deepEqual(starts.map(x=>x.status).sort(),[200,201]);assert.equal(starts[0].body.attemptId,starts[1].body.attemptId);
  const conflict=await Promise.all([post('/api/start',{...common,caseId:'T01',requestId:'builder003conflict'}),post('/api/start',{...common,caseId:'T02',requestId:'builder003conflict'})]);
  assert.deepEqual(conflict.map(x=>x.status).sort(),[201,409]);
  const chosen=conflict.find(x=>x.status===201).body;
  const commitBody={...common,caseId:chosen.caseId,attemptId:chosen.attemptId,requestId:'builder003commit',response:{kind:'answer',optionId:'O1'}};
  const commits=await Promise.all([post('/api/commit',commitBody),post('/api/commit',commitBody)]);
  assert.deepEqual(commits.map(x=>x.status).sort(),[200,201]);assert.equal(commits[0].body.receipt,commits[1].body.receipt);
  const ledger=await post('/api/export',common);assert.equal(ledger.body.attempts.length,2);
  assert.equal(service.events.filter(x=>x.type==='commit-ack').length,1);
  summary={schema:'gate10-builder-003-http-overlap-v1',status:'PASS',source:'isolated software API probe; no browser/human action',runId:'G10-PREDICT-003',buildId:common.buildId,identicalStartStatuses:starts.map(x=>x.status),sameAttempt:starts[0].body.attemptId===starts[1].body.attemptId,conflictStatuses:conflict.map(x=>x.status),identicalCommitStatuses:commits.map(x=>x.status),sameReceipt:commits[0].body.receipt===commits[1].body.receipt,attemptCount:ledger.body.attempts.length,acceptedCommitCount:service.events.filter(x=>x.type==='commit-ack').length};
}finally{await new Promise(resolve=>server.close(resolve));}
process.stdout.write(JSON.stringify(summary)+'\n');
