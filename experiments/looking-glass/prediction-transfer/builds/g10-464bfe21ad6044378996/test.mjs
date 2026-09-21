import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {PredictionService} from './service.mjs';
import {q,str,pointObserve,ballSlice,solveBall} from './math.mjs';
import {canonical,canonicalStateAt,semanticPayload,freshState,pointScreen,decimal} from './model.mjs';
const here=dirname(fileURLToPath(import.meta.url)),docs=resolve(here,'../docs/gate-10');
let fixturePath=resolve(here,'fixture.json'),keyPath=resolve(here,'private/private-answer-key.json');
try{await access(fixturePath);await access(keyPath);}catch{fixturePath=resolve(docs,'fixture.json');keyPath=resolve(docs,'private-answer-key.json');}
const fixture=JSON.parse(await readFile(fixturePath)),key=JSON.parse(await readFile(keyPath));
const sha=x=>createHash('sha256').update(canonical(x)).digest('hex');
let checks=0;const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
check(str(q('-0/8')),'0');check(str(q('10/20')),'1/2');check(decimal('1/3'),'0.333333');
for(const answer of key.answers){const task=fixture.tasks.find(t=>t.id===answer.caseId);assert(task);
  if(task.family==='point4-rotation'){
    const queries=fixture.pointQueries;
    if(answer.source){for(const support of task.supports)check(pointObserve(answer.source.xyzw,queries.find(q=>q.id===support.queryId)),support.xyz);check(pointObserve(answer.source.xyzw,queries.find(q=>q.id===task.target.queryId)),answer.target.xyz);}
    else{const targets=[];for(const source of answer.sourceClass.admissibleSources){for(const support of task.supports)check(pointObserve(source,queries.find(q=>q.id===support.queryId)),support.xyz);targets.push(pointObserve(source,queries.find(q=>q.id===task.target.queryId)));}check(targets.map(JSON.stringify).sort(),answer.target.points.map(JSON.stringify).sort());}
  }else{const solved=solveBall(task.supports);check(solved.centerW,answer.source.center[3]);check(solved.radiusSquared,answer.source.radiusSquared);for(const support of task.supports){const seen=ballSlice(solved.centerW,solved.radiusSquared,support.sliceSetting);check(seen.kind,support.kind);check(seen.radiusSquared,support.radiusSquared);}check(ballSlice(solved.centerW,solved.radiusSquared,task.target.sliceSetting),answer.target);}
  check(task.options.some(o=>o.id===answer.expectedOptionId),true);
}
check(pointScreen(['1/3','2/3','-1/3'],0,20).x,140+50/3);
const cps=fixture.savedTour.checkpoints.map(x=>canonicalStateAt(fixture,x));check(cps.map(x=>x.caseId),fixture.savedTour.caseOrder);check(cps.every(s=>!s.response&&!s.revealedResult&&!s.attachedAttempt),true);check(sha(semanticPayload(cps[0],fixture)),sha(semanticPayload(freshState(),fixture)));
let time=Date.parse('2026-09-20T00:00:00Z');const service=new PredictionService({fixture,key,runId:'TEST',buildId:'BUILD',now:()=>time});
const call=async(path,body,status)=>{const r=await service.handle(path,body);check(r.status,status);return r.body;};
const session=await call('/api/session',{actor:'software_validation'},201);check(session.humanEligible,false);
const startBody={sessionToken:session.sessionToken,buildId:'BUILD',caseId:'T01',requestId:'start0001'};
const a=await call('/api/start',startBody,201);check(a.priorReveal,false);check((await call('/api/start',startBody,200)).attemptId,a.attemptId);
await call('/api/start',{...startBody,caseId:'T02'},409);await call('/api/start',{...startBody,caseId:'P00',requestId:'start0002'},400);
const revealBody={sessionToken:session.sessionToken,buildId:'BUILD',caseId:'T01',attemptId:a.attemptId,receipt:'guess',requestId:'reveal001'};
await call('/api/reveal',revealBody,403);
const commitBody={sessionToken:session.sessionToken,buildId:'BUILD',caseId:'T01',attemptId:a.attemptId,requestId:'commit001',response:{kind:'answer',optionId:'O1'}};
await call('/api/commit',{...commitBody,response:{kind:'answer',optionId:'O9'}},400);
const pre=await call('/api/export',{sessionToken:session.sessionToken,buildId:'BUILD'},200);check(pre.attempts[0].target,null);check(pre.attempts[0].softwareGrade,null);
const committed=await call('/api/commit',commitBody,201);check(committed.grading,'withheld');check(Object.hasOwn(committed,'target'),false);check((await call('/api/commit',commitBody,200)).receipt,committed.receipt);
await call('/api/commit',{...commitBody,response:{kind:'answer',optionId:'O2'}},409);
await call('/api/commit',{...commitBody,requestId:'commit002',response:{kind:'answer',optionId:'O2'}},409);
await call('/api/reveal',{...revealBody,receipt:'wrong'},403);
await call('/api/reveal',{...revealBody,receipt:committed.receipt,caseId:'T02'},403);
await call('/api/reveal',{...revealBody,receipt:committed.receipt,buildId:'WRONG'},409);
const shown=await call('/api/reveal',{...revealBody,receipt:committed.receipt},201);check(shown.softwareGrade,'incorrect');check(shown.revealSequence>committed.commitSequence,true);
check((await call('/api/reveal',{...revealBody,receipt:committed.receipt},200)).repeated,true);
const post=await call('/api/export',{sessionToken:session.sessionToken,buildId:'BUILD'},200);check(post.attempts[0].softwareGrade,'incorrect');check(post.attempts[0].target,key.answers[0].target);check(JSON.stringify(post).includes(committed.receipt),false);check(JSON.stringify(post).includes(session.sessionToken),false);
const second=await call('/api/start',{...startBody,requestId:'start0003'},201);check(second.priorReveal,true);check(second.ordinal,2);
const skipped=await call('/api/commit',{...commitBody,attemptId:second.attemptId,requestId:'commit003',response:{kind:'skip',optionId:null}},201);check((await call('/api/reveal',{...revealBody,attemptId:second.attemptId,receipt:skipped.receipt,requestId:'reveal002'},201)).softwareGrade,null);
const unfinished=await call('/api/start',{...startBody,caseId:'T02',requestId:'start0004'},201);await call('/api/close',{sessionToken:session.sessionToken,buildId:'BUILD',attemptId:unfinished.attemptId,reason:'reopen-saved'},200);check((await call('/api/export',{sessionToken:session.sessionToken,buildId:'BUILD'},200)).attempts[2].status,'abandoned');
const otherSession=await call('/api/session',{actor:'software_validation'},201);await call('/api/reveal',{...revealBody,sessionToken:otherSession.sessionToken,receipt:committed.receipt,requestId:'reveal003'},403);check((await call('/api/export',{sessionToken:otherSession.sessionToken,buildId:'BUILD'},200)).attempts.length,0);
time+=30*60*1000;await call('/api/export',{sessionToken:session.sessionToken,buildId:'BUILD'},410);
const cap=new PredictionService({fixture,key,runId:'CAP',buildId:'BUILD'});for(let i=0;i<64;i++)check((await cap.handle('/api/session',{actor:'software_validation'})).status,201);check((await cap.handle('/api/session',{actor:'software_validation'})).status,429);
const attempts=new PredictionService({fixture,key,runId:'CAP2',buildId:'BUILD'});const sx=(await attempts.handle('/api/session',{actor:'software_validation'})).body;for(let i=0;i<32;i++)check((await attempts.handle('/api/start',{sessionToken:sx.sessionToken,buildId:'BUILD',caseId:'T01',requestId:`request${String(i).padStart(4,'0')}`})).status,201);check((await attempts.handle('/api/start',{sessionToken:sx.sessionToken,buildId:'BUILD',caseId:'T01',requestId:'request9999'})).status,429);
process.stdout.write(`Gate 10 builder checks: ${checks} PASS\n`);
