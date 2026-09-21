// Independent immutable-build/model/HTTP audit. Imports only the packaged model/server under test.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import http from 'node:http';
import * as model from '../../coordination/builds/g12-3c5526361a7cb2cc5c4a/model.mjs';
import {makeServer} from '../../coordination/builds/g12-3c5526361a7cb2cc5c4a/server.mjs';

const root=resolve(import.meta.dirname,'../..');
const buildDir=resolve(root,'coordination/builds/g12-3c5526361a7cb2cc5c4a');
const runDir=resolve(root,'coordination/runs/G12-COORD-002');
const read=async p=>readFile(resolve(root,p));
const parse=async p=>JSON.parse(await read(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const canon=x=>Array.isArray(x)?`[${x.map(canon).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canon(x[k])}`).join(',')}}`:JSON.stringify(x);
const hash=x=>sha(Buffer.from(canon(x)));
const checks=[];
const check=(name,pass,detail)=>checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});
const fixture=await parse('docs/gate-12/fixture.json');
const expected=await parse('audit/gate-12/prespec-derivation.json');
const freeze=await parse('docs/gate-12/PRESPEC_FREEZE.json');
const manifest=await parse('coordination/builds/g12-3c5526361a7cb2cc5c4a/source-manifest.json');
const runManifest=await parse('coordination/runs/G12-COORD-002/run-manifest.json');
const build=await parse('coordination/builds/g12-3c5526361a7cb2cc5c4a/build.json');
const run=await parse('coordination/runs/G12-COORD-002/run.json');

check('frozen spec and prespec audit 9 pins', (await Promise.all(freeze.files.map(async x=>sha(await read(x.path))===x.sha256))).every(Boolean));
check('manifest source 14 pins', (await Promise.all(manifest.content.map(async x=>sha(await read(x.path))===x.sha256))).every(Boolean));
check('manifest built 10 pins', (await Promise.all(manifest.built.map(async x=>sha(await read(`coordination/builds/${build.buildId}/${x.path}`))===x.sha256))).every(Boolean));
check('run manifest 5 pins', (await Promise.all(runManifest.files.map(async x=>sha(await read(`coordination/runs/${run.runId}/${x.path}`))===x.sha256))).every(Boolean));
check('source hash independently recomputed', hash(manifest.content)===build.sourceHash && build.sourceHash===run.sourceHash && build.buildId===`g12-${build.sourceHash.slice(0,20)}` && build.sourceHash==='3c5526361a7cb2cc5c4afe35c23801f183dacdc2f8ae4653471b202a27a9665c');
check('run and spec identities', build.runId===run.runId && build.buildId===run.buildId && build.baseCommit===run.baseCommit && run.prespecFreezeSha256===sha(await read('docs/gate-12/PRESPEC_FREEZE.json')) && run.fixtureSha256===sha(await read('docs/gate-12/fixture.json')));
check('source hash from independent canonicalization', hash(fixture.sourceModes)===run.sourceModesHash && run.sourceModesHash===expected.sourceHash);
check('public build contains no oracle path', !JSON.stringify(build).includes('independent-predictions') && !JSON.stringify(build).includes('audit/gate-12') && build.humanParticipants===0);

const sourceHash=expected.sourceHash;
for(const assignmentId of ['BASE','DETAIL_CONTROL'])for(const scenarioId of ['ALL','EXTREMES','NONE'])for(const presentGroups of fixture.proposalPresenceStates){
  const key=`${assignmentId}/${scenarioId}/${presentGroups.join('+')||'empty'}`;
  const oracle=expected.outcomes.find(x=>x.assignmentId===assignmentId&&x.scenarioId===scenarioId&&canon(x.presentGroups)===canon(presentGroups));
  const records={};for(const g of presentGroups)records[g]=await model.makeProposal(fixture,assignmentId,g,sourceHash,'source_informed_software',{recordId:`TEST-${g}`});
  const before=canon(records);
  const result=await model.evaluateProcedure(fixture,sourceHash,assignmentId,records,scenarioId,'MINIMAX_RANK');
  const fields=Object.keys(oracle).filter(x=>x!=='presentGroups');
  check(`finite ${key}`,fields.every(f=>canon(result[f])===canon(oracle[f])) && canon(records)===before);
  const reverse=Object.fromEntries([...Object.entries(records)].reverse());
  const r2=await model.evaluateProcedure(fixture,sourceHash,assignmentId,reverse,scenarioId,'MINIMAX_RANK');
  check(`proposal-order ${key}`,canon(r2)===canon(result));
  check(`exact local bindings ${key}`,presentGroups.every(g=>records[g].content.groupId===g && records[g].content.sourceHash===sourceHash && records[g].content.preferredModeId===expected.firstChoicesByAssignment[assignmentId][g] && records[g].content.ranking.length===3 && records[g].contentHash===hash(records[g].content)));
}

const archive=await model.makeProposal(fixture,'BASE','ARCHIVE',sourceHash,'source_informed_software',{recordId:'A'});
const dispatch=await model.makeProposal(fixture,'BASE','DISPATCH',sourceHash,'source_informed_software',{recordId:'D'});
const rejects=async(name,args)=>{let rejected=false;try{await model.evaluateProcedure(...args);}catch{rejected=true;}check(name,rejected);};
for(const [name,modifier] of [
  ['wrong group content',p=>{p.content.groupId='DISPATCH';}],
  ['wrong source hash',p=>{p.content.sourceHash='bad';}],
  ['altered rank',p=>{p.content.ranking[0].rank=9;p.contentHash=hash(p.content);}],
  ['altered reference',p=>{p.content.reference.id='R_SPEED';p.contentHash=hash(p.content);}],
  ['altered preferred',p=>{p.content.preferredModeId='P1';p.contentHash=hash(p.content);}],
  ['extra semantic field',p=>{p.content.acceptance=true;p.contentHash=hash(p.content);}],
  ['bad content hash',p=>{p.contentHash='0'.repeat(64);}]
]){const p=structuredClone(archive);modifier(p);await rejects(name,[fixture,sourceHash,'BASE',{ARCHIVE:p,DISPATCH:dispatch},'ALL','MINIMAX_RANK']);}
await rejects('unknown scenario',[fixture,sourceHash,'BASE',{ARCHIVE:archive,DISPATCH:dispatch},'BAD','MINIMAX_RANK']);
await rejects('unknown assignment',[fixture,sourceHash,'BAD',{ARCHIVE:archive,DISPATCH:dispatch},'ALL','MINIMAX_RANK']);
await rejects('wrong procedure',[fixture,sourceHash,'BASE',{ARCHIVE:archive,DISPATCH:dispatch},'ALL','BAD']);
await rejects('extra group',[fixture,sourceHash,'BASE',{ARCHIVE:archive,DISPATCH:dispatch,OTHER:archive},'ALL','MINIMAX_RANK']);
await rejects('wrong assignment proposal',[fixture,sourceHash,'DETAIL_CONTROL',{ARCHIVE:archive,DISPATCH:dispatch},'ALL','MINIMAX_RANK']);
await rejects('malformed proposals object',[fixture,sourceHash,'BASE',[], 'ALL','MINIMAX_RANK']);

const computations=await parse('coordination/runs/G12-COORD-002/computational-results.json');
check('stored 24 computational outcomes independently match',computations.outcomes.length===24 && computations.outcomes.every((x,i)=>x.assignmentId===expected.outcomes[i].assignmentId && x.scenarioId===expected.outcomes[i].scenarioId && canon(x.presentGroups)===canon(expected.outcomes[i].presentGroups) && Object.keys(expected.outcomes[i]).filter(k=>k!=='presentGroups').every(k=>canon(x.content[k])===canon(expected.outcomes[i][k]))));
check('canonical proposal content/source hashes',Object.entries(computations.canonicalBranch.proposals).every(([g,r])=>r.content.groupId===g&&r.content.sourceHash===sourceHash&&r.contentHash===hash(r.content)&&r.content.provenance==='scripted_demonstration'));
check('canonical outcome content hashes',computations.canonicalBranch.outcomes.length===2&&computations.canonicalBranch.outcomes.every(o=>o.contentHash===hash(o.content)&&o.content.jointAction.enacted===false));
const initial=await parse('coordination/runs/G12-COORD-002/initial-state.json');
check('initial state and semantic hash',canon(initial.state)===canon(fixture.initialState) && initial.semanticFingerprint===hash(initial.payload));
const checkpoints=await parse('coordination/runs/G12-COORD-002/checkpoints.json');
check('seven checkpoint hashes',checkpoints.length===7 && checkpoints.every((x,i)=>x.seconds===fixture.savedTour.checkpoints[i] && x.semanticFingerprint===hash(x.payload) && x.referenceOnly===true));
const events=(await read('coordination/runs/G12-COORD-002/events.jsonl')).toString().trim().split('\n').map(JSON.parse);
check('eight canonical event identities',events.length===8 && events.every((e,i)=>e.sequence===i+1 && e.type===fixture.savedTour.events[i].type && e.origin===fixture.savedTour.events[i].origin && e.cursorSeconds===fixture.savedTour.events[i].seconds && e.documentId==='canonical-script'));
check('same-boundary event fingerprint chains',events[5].beforeSemanticFingerprint===events[4].afterSemanticFingerprint && events[7].beforeSemanticFingerprint===events[6].afterSemanticFingerprint);
check('canonical action never human/enacted',events.every(e=>e.actor==='scripted_demonstration' && e.provenance==='scripted_demonstration') && events.at(-1).intended.reason==='end-of-sequence' && run.humanParticipants===0);
const localState={...fixture.initialState,mode:'local-exploration',recordedGroups:['ARCHIVE','DISPATCH']};
const branch={id:'L1',assignmentId:'BASE',proposals:{ARCHIVE:archive,DISPATCH:dispatch},outcomes:[]};
const d1=model.derive(fixture,sourceHash,localState,branch,[branch]);
const d2=model.derive(fixture,sourceHash,{...localState,representation:'plain'},branch,[branch]);
check('diagram/plain exact information equality',canon(d1.informationPayload)===canon(d2.informationPayload) && hash(d1.semanticPayload)!==hash(d2.semanticPayload));
check('document UUID outside semantic/information',!canon(d1.semanticPayload).includes('documentId')&&!canon(d1.informationPayload).includes('documentId'));

const {server}=await makeServer({runDir,port:0});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
try{
  for(const route of build.publicRoutes){const response=await fetch(base+route);let path=route==='/'?`coordination/builds/${build.buildId}/index.html`:route.startsWith('/run/')?`coordination/runs/${run.runId}/${route.slice(5)}`:`coordination/builds/${build.buildId}/${route.slice(1)}`;const bytes=Buffer.from(await response.arrayBuffer());check(`GET ${route}`,response.status===200&&sha(bytes)===sha(await read(path)));const head=await fetch(base+route,{method:'HEAD'});check(`HEAD ${route}`,head.status===200&&Number(head.headers.get('content-length'))===bytes.length&&(await head.arrayBuffer()).byteLength===0);}
  for(const route of ['/review/results.html','/review/source-review.md','/review/images/x.jpg','/independent-predictions.json','/model-contract.md','/run/computational-results.json','/source-manifest.json','/server.mjs','/foo','/review/anything.html','/%2e%2e/docs/gate-12/fixture.json','/run//run.json','/run/run.json?x=1']){const r=await fetch(base+route,{redirect:'manual'});check(`deny ${route}`,r.status===404,r.status);}
  for(const rawPath of ['/../docs/gate-12/fixture.json','/review/../../docs/gate-12/fixture.json','/%2e%2e/docs/gate-12/fixture.json','/run//run.json','/run/run.json?x=1']){
    const code=await new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path:rawPath},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end();});
    check(`raw path denied ${rawPath}`,code===404,code);
  }
  for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS']){const r=await fetch(base+'/run/run.json',{method,body:method==='POST'||method==='PUT'||method==='PATCH'?'x':undefined});check(`deny method ${method}`,r.status===405,r.status);}
}finally{await new Promise(resolve=>server.close(resolve));}

const errors=checks.filter(c=>!c.pass);
const report={schema:'gate12-candidate-002-independent-check-v1',candidate:run.runId,buildId:build.buildId,sourceHash:build.sourceHash,checkCount:checks.length,passCount:checks.length-errors.length,status:errors.length?'BLOCKED':'PASS',errors,checks,scope:'packaged source/model/run assets and isolated loopback HTTP; no browser claim'};
await import('node:fs/promises').then(fs=>fs.writeFile(resolve(root,'audit/gate-12/candidate-002-check.json'),JSON.stringify(report,null,2)+'\n'));
console.log(JSON.stringify({status:report.status,checkCount:report.checkCount,passCount:report.passCount,errors},null,2));
