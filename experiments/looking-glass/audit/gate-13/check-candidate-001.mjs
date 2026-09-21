// Independent audit of immutable Gate 13 candidate 001, not a browser observation.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import http from 'node:http';
import * as model from '../../misleading-view/builds/g13-daa720242d62cd4c184f/model.mjs';
import {makeServer} from '../../misleading-view/builds/g13-daa720242d62cd4c184f/server.mjs';

const root=resolve(import.meta.dirname,'../..');
const buildDir=resolve(root,'misleading-view/builds/g13-daa720242d62cd4c184f');
const runDir=resolve(root,'misleading-view/runs/G13-MISLEAD-001');
const get=async p=>readFile(resolve(root,p)),parse=async p=>JSON.parse(await get(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const canon=x=>Array.isArray(x)?`[${x.map(canon).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canon(x[k])}`).join(',')}}`:JSON.stringify(x);
const hash=x=>sha(Buffer.from(canon(x)));
const checks=[];
function check(name,pass,detail){checks.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});}
const fixture=await parse('docs/gate-13/fixture.json');
const derived=await parse('audit/gate-13/prespec-derivation.json');
const freeze=await parse('docs/gate-13/PRESPEC_FREEZE.json');
const manifest=await parse('misleading-view/builds/g13-daa720242d62cd4c184f/package-manifest.json');
const runManifest=await parse('misleading-view/runs/G13-MISLEAD-001/run-manifest.json');
const build=await parse('misleading-view/builds/g13-daa720242d62cd4c184f/build.json');
const run=await parse('misleading-view/runs/G13-MISLEAD-001/run.json');
const computations=await parse('misleading-view/runs/G13-MISLEAD-001/computational-results.json');

check('prespec freeze nine pins and fixed SHA',sha(await get('docs/gate-13/PRESPEC_FREEZE.json'))==='5e05e46a031ce84786d1f67c1b194fb457c7817d6300b40d3c35ceed20371269'&&freeze.files.length===9&&(await Promise.all(freeze.files.map(async x=>sha(await get(x.path))===x.sha256))).every(Boolean));
check('source manifest fourteen pins',manifest.content.length===14&&(await Promise.all(manifest.content.map(async x=>sha(await get(x.path))===x.sha256))).every(Boolean));
check('immutable package ten pins',manifest.files.length===10&&(await Promise.all(manifest.files.map(async x=>sha(await readFile(resolve(buildDir,x.path)))===x.sha256))).every(Boolean));
check('immutable run five pins',runManifest.files.length===5&&(await Promise.all(runManifest.files.map(async x=>sha(await readFile(resolve(runDir,x.path)))===x.sha256))).every(Boolean));
check('source hash and exact run/build identity',hash(manifest.content)==='daa720242d62cd4c184f2f3687ddc1e8584f6ce2031f40ba119b87efa225f93d'&&build.sourceHash===run.sourceHash&&build.sourceHash===manifest.sourceHash&&build.buildId===`g13-${build.sourceHash.slice(0,20)}`&&build.runId===run.runId&&run.runId==='G13-MISLEAD-001'&&build.buildId===run.buildId);
check('run/spec/fixture hashes and public scope',run.prespecFreezeSha256===sha(await get('docs/gate-13/PRESPEC_FREEZE.json'))&&run.fixtureSha256===sha(await get('docs/gate-13/fixture.json'))&&run.oracleSha256===sha(await get('docs/gate-13/independent-predictions.json'))&&build.humanParticipants===0&&run.humanParticipants===0&&computations.humanParticipants===0&&build.localSoftwareOnly===true);
check('public build does not disclose private path or audit metadata',!JSON.stringify(build).includes('independent-predictions')&&!JSON.stringify(build).includes('audit/gate-13')&&!JSON.stringify(build).includes('PRESPEC_FREEZE'));
check('packaged fixture exact frozen bytes',sha(await readFile(resolve(buildDir,'fixture.json')))===sha(await get('docs/gate-13/fixture.json')));

for(const row of derived.derivedCaseResults){
  const c=fixture.cases.find(x=>x.id===row.caseId);
  const original=model.encoding(c,'original');
  check(`${row.caseId} original exact independent arithmetic`,canon(original.counts)===canon(row.sourceCounts)&&original.lowerBound===row.originalLowerBound&&canon(original.offsets)===canon(row.originalOffsets)&&canon(original.svgWidths)===canon(row.originalSvgWidths)&&canon(original.countRatio)===canon(row.countRatio)&&canon(original.lengthRatio)===canon(row.originalLengthRatio)&&original.difference===row.difference&&original.originalStatementTrue===row.originalStatementVerdict);
  const binding=await model.bindings(c);
  check(`${row.caseId} exact source/display hashes`,binding.sourceHash===row.sourceSha256&&binding.originalDisplayHash===row.originalDisplaySha256&&binding.correctionDisplayHash===(row.correction?.displaySha256??null)&&canon(computations.hashes[row.caseId])===canon(binding));
  const checkRecord=await model.makeCheck(fixture,row.caseId,'host_controlled_software',{recordId:`INDEPENDENT-${row.caseId}`,documentId:'independent-audit',atUtc:null});
  check(`${row.caseId} check content/hash/binding`,checkRecord.contentHash===hash(checkRecord.content)&&checkRecord.content.sourceHash===row.sourceSha256&&checkRecord.content.originalDisplayHash===row.originalDisplaySha256&&checkRecord.content.verdict===row.originalStatementVerdict&&canon(checkRecord.content.countRatio)===canon(row.countRatio)&&canon(checkRecord.content.originalLengthRatio)===canon(row.originalLengthRatio)&&checkRecord.envelope.provenance==='host_controlled_software');
  if(row.correction){
    const corrected=model.encoding(c,'corrected');
    check(`${row.caseId} corrected exact widths/ratio`,corrected.lowerBound===0&&canon(corrected.offsets)===canon(row.correction.offsets)&&canon(corrected.svgWidths)===canon(row.correction.svgWidths)&&canon(corrected.lengthRatio)===canon(row.correction.lengthRatio));
    const record=await model.makeCorrection(fixture,row.caseId,checkRecord,'host_controlled_software',{recordId:`INDEPENDENT-C-${row.caseId}`,documentId:'independent-audit',atUtc:null});
    check(`${row.caseId} correction immutable check reference`,record.contentHash===hash(record.content)&&record.content.checkContentHash===checkRecord.contentHash&&record.content.originalDisplayHash===row.originalDisplaySha256&&record.content.correctedDisplayHash===row.correction.displaySha256&&record.content.factsTrue===true&&record.envelope.checkRecordId===checkRecord.envelope.recordId);
  }
}
check('ten packaged configurations match independent derivation',computations.configurations.length===10&&computations.configurations.every((x,i)=>{const e=derived.derivedDisplayConfigurations[i];return x.caseId===e.caseId&&x.version===e.version&&x.representation===e.representation&&canon(x.encoding.counts)===canon(e.sourceCounts)&&x.encoding.lowerBound===e.lowerBound&&canon(x.encoding.svgWidths)===canon(e.svgWidths)&&x.sourceHash===derived.derivedCaseResults.find(y=>y.caseId===e.caseId).sourceSha256;}));
check('scripted canonical record provenance and hashes',Object.values(computations.canonicalRecords).every(r=>r.check.contentHash===hash(r.check.content)&&r.check.envelope.provenance==='scripted_demonstration'&&(!r.correction||(r.correction.contentHash===hash(r.correction.content)&&r.correction.content.checkContentHash===r.check.contentHash&&r.correction.envelope.provenance==='scripted_demonstration'))));
const canonicalZero=await parse('misleading-view/runs/G13-MISLEAD-001/initial-state.json');
check('paused zero has no performed check/correction',canonicalZero.state.paused===true&&canonicalZero.state.cursorSeconds===0&&canonicalZero.state.activeCheck===false&&canonicalZero.state.activeCorrection===false&&canonicalZero.semanticFingerprint===hash(canonicalZero.payload));
const checkpoints=await parse('misleading-view/runs/G13-MISLEAD-001/checkpoints.json');
check('seven exact checkpoint hashes and states',checkpoints.length===7&&checkpoints.every((x,i)=>x.seconds===derived.derivedCheckpointExpectations[i].seconds&&x.semanticFingerprint===hash(x.payload)&&x.state.version===derived.derivedCheckpointExpectations[i].version&&x.state.representation===derived.derivedCheckpointExpectations[i].representation&&x.state.sourceOpen===derived.derivedCheckpointExpectations[i].sourceOpen&&x.state.activeCheck===derived.derivedCheckpointExpectations[i].activeCheck&&x.state.activeCorrection===derived.derivedCheckpointExpectations[i].activeCorrection));
const events=(await get('misleading-view/runs/G13-MISLEAD-001/events.jsonl')).toString().trim().split('\n').map(JSON.parse);
check('seven canonical event identities and origin',events.length===7&&events.every((e,i)=>e.sequence===i+1&&e.type===fixture.savedTour.events[i].type&&e.origin===fixture.savedTour.events[i].origin&&e.cursorSeconds===fixture.savedTour.events[i].atSeconds&&e.actor==='scripted_demonstration'&&e.documentId==='canonical-script'));
check('same-boundary restore to automatic stop chain',events[6].beforeSemanticFingerprint===events[5].afterSemanticFingerprint&&events[6].intended.reason==='end-of-sequence');

const mcase=fixture.cases[0],zcase=fixture.cases[2];
const good=await model.makeCheck(fixture,'MISMATCH','host_controlled_software',{recordId:'GOOD',documentId:'audit'});
async function rejects(name,action){let threw=false;try{await action();}catch{threw=true;}check(name,threw);}
await rejects('unknown case rejects',()=>model.checkContent(fixture,'UNKNOWN'));
await rejects('true-case corrected version rejects',()=>model.encoding(fixture.cases[1],'corrected'));
await rejects('correction before check rejects',()=>model.correctionContent(fixture,'MISMATCH',null));
await rejects('true-case correction rejects',async()=>model.correctionContent(fixture,'TRUE_CONTROL',await model.makeCheck(fixture,'TRUE_CONTROL','host_controlled_software',{recordId:'TRUE'})));
await rejects('wrong content hash rejects',()=>model.correctionContent(fixture,'MISMATCH',{...good,contentHash:'0'.repeat(64)}));
await rejects('wrong source binding rejects',()=>model.correctionContent(fixture,'MISMATCH',{...good,content:{...good.content,sourceHash:'0'.repeat(64)}}));
await rejects('wrong original display binding rejects',()=>model.correctionContent(fixture,'MISMATCH',{...good,content:{...good.content,originalDisplayHash:'0'.repeat(64)}}));
await rejects('wrong case binding rejects',()=>model.correctionContent(fixture,'ZERO_CONTROL',good));
await rejects('malformed count rejects',()=>model.validateFixture({...fixture,cases:[{...mcase,source:{...mcase.source,records:[{id:'A',completedCount:-1},mcase.source.records[1]]}},...fixture.cases.slice(1)]}));
await rejects('malformed axis rejects',()=>model.encoding({...mcase,originalDisplay:{...mcase.originalDisplay,scale:{...mcase.originalDisplay.scale,lowerBound:91}}},'original'));
check('zero case remains decidably false with undefined ratios',model.encoding(zcase,'original').originalStatementTrue===false&&model.encoding(zcase,'original').countRatio.status==='undefined'&&model.encoding(zcase,'original').lengthRatio.status==='undefined');

for(const row of derived.derivedCaseResults){
  const c=fixture.cases.find(x=>x.id===row.caseId),h=computations.hashes[row.caseId],canonical=computations.canonicalRecords[row.caseId];
  for(const version of (row.correction?['original','corrected']:['original'])){
    const state={...fixture.initialState,mode:'local-review',caseId:row.caseId,version,cursorSeconds:0,paused:true,activeCheck:true,activeCorrection:!!row.correction,sourceOpen:true,recordsOpen:true};
    const record={hashes:h,check:canonical.check,correction:canonical.correction,history:Object.fromEntries(fixture.caseOrder.map(id=>[id,{check:id===row.caseId?canonical.check:null,correction:id===row.caseId?canonical.correction:null}]))};
    const visual=model.derive(fixture,{...state,representation:'visual'},record,canonical);
    const plain=model.derive(fixture,{...state,representation:'plain'},record,canonical);
    check(`${row.caseId}/${version} information parity`,hash(visual.informationPayload)===hash(plain.informationPayload)&&hash(visual.semanticPayload)!==hash(plain.semanticPayload)&&visual.informationPayload.sourceHash===row.sourceSha256&&visual.informationPayload.availableOperations.inspectSource===true);
  }
}

const {server}=await makeServer({runDir,port:0});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
try{
  for(const route of build.publicRoutes){
    const expected=route==='/'?resolve(buildDir,'index.html'):route.startsWith('/run/')?resolve(runDir,route.slice(5)):resolve(buildDir,route.slice(1));
    const bytes=await readFile(expected),response=await fetch(base+route),served=Buffer.from(await response.arrayBuffer()),head=await fetch(base+route,{method:'HEAD'});
    check(`GET+HEAD exact ${route}`,response.status===200&&sha(served)===sha(bytes)&&head.status===200&&Number(head.headers.get('content-length'))===bytes.length&&(await head.arrayBuffer()).byteLength===0);
  }
  for(const route of ['/review/results.html','/review/allowlist.json','/docs/gate-13/fixture.json','/docs/gate-13/independent-predictions.json','/audit/gate-13/prespec-review.json','/source-manifest.json','/server.mjs','/run/unknown.json','/bogus','/%2e%2e/docs/gate-13/fixture.json','/run/run.json?x=1']){const r=await fetch(base+route,{redirect:'manual'});check(`deny ${route}`,r.status===404,r.status);}
  for(const rawPath of ['/../docs/gate-13/fixture.json','/review/../../docs/gate-13/fixture.json']){
    const status=await new Promise((resolveCode,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path:rawPath},res=>{res.resume();res.on('end',()=>resolveCode(res.statusCode));});req.on('error',reject);req.end();});check(`deny raw ${rawPath}`,status===404,status);
  }
  for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS']){const r=await fetch(base+'/run/run.json',{method,body:['POST','PUT','PATCH'].includes(method)?'x':undefined});check(`deny method ${method}`,r.status===405,r.status);}
}finally{await new Promise(r=>server.close(r));}

const errors=checks.filter(x=>!x.pass);
const result={schema:'gate13-candidate-001-independent-check-v1',status:errors.length?'BLOCKED':'PASS',runId:run.runId,buildId:build.buildId,sourceHash:build.sourceHash,checkCount:checks.length,passCount:checks.length-errors.length,errors,checks,scope:'Immutable packaged model/assets and isolated HTTP only; not supported-browser evidence.'};
await writeFile(resolve(root,'audit/gate-13/candidate-001-check.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checkCount:result.checkCount,passCount:result.passCount,errors},null,2));
