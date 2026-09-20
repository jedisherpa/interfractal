// Independent, read-only Gate 11 final handoff verification.
// Writes only its own audit result; never changes source, server, or closed evidence.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import http from 'node:http';

const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const audit=path.join(root,'audit/gate-11');
const read=p=>fs.readFileSync(p);
const json=p=>JSON.parse(read(p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const canon=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?`[${x.map(canon).join(',')}]`:`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canon(x[k])}`).join(',')}}`;
const checks=[];
const check=(group,name,pass,details={})=>checks.push({group,name,pass:Boolean(pass),...details});
const run=json(path.join(root,'evidence/gate-11/run-evidence.json'));
const packet=read(path.join(root,'evidence/gate-11/GATE_11_PACKET.md')).toString();
const results=read(path.join(root,'evidence/gate-11/results.html')).toString();
const allow=json(path.join(root,'receiver-summary/review/allowlist.json'));
const collection=json(path.join(root,'evidence/gate-11/replay-collection.json'));
const core=json(path.join(root,'evidence/gate-11/CORE_EVIDENCE_FREEZE.json'));
const build=json(path.join(root,'receiver-summary/builds/g11-7ced826c903d40c5a0dd/build.json'));
const selectedRun=json(path.join(root,'receiver-summary/runs/G11-RECEIVER-002/run.json'));
const expectedSource='7ced826c903d40c5a0dd6398477debdf65e1ccbd4a9260d4d0fe9556aad1fc70';
check('identity','packet/build/run identity',run.runId===build.runId&&run.runId===selectedRun.runId&&run.buildId===build.buildId&&run.buildId===selectedRun.buildId&&run.sourceSha256===build.sourceHash&&run.sourceSha256===selectedRun.sourceHash&&run.sourceSha256===expectedSource);
check('identity','Git base pinned',run.baseCommit==='a35be1ccb61c802a8bd7282903a9665b2c7d1863');
check('identity','current Git HEAD remains base',execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()===run.baseCommit);
check('claims','finite answer/model minimum',JSON.stringify(run.finiteModelResult.countAnswers)==='["yes","yes","yes","yes"]'&&JSON.stringify(run.finiteModelResult.releaseAnswers)==='["no","no","no","yes"]'&&run.finiteModelResult.enumeratedFieldSubsets===8&&run.finiteModelResult.worldSubsetProjections===32&&run.finiteModelResult.releaseMinimumEntries===2&&run.finiteModelResult.countMinimumEntries===0);
check('claims','closed core and acquisition numbers',run.closedCore.sha256==='e9ab3b68f78a2b7c5a018ef39bd88efcb79536abd83ee1beb7b94e6df52c232a'&&run.acceptedFullAcquisition.observations===100&&run.acceptedFullAcquisition.hostActions===79&&run.acceptedFullAcquisition.uneditedOriginalJpegs===6&&run.acceptedFullAcquisition.designatedPausedCheckpointMatches===18&&run.acceptedFullAcquisition.naturalTourElapsedSeconds===24.005&&run.acceptedFullAcquisition.naturalScheduledEvents===7&&run.acceptedFullAcquisition.documentOneExportEvents===56&&run.acceptedFullAcquisition.documentTwoExportEvents===21);
check('claims','bounded public interpretation',run.verdict==='PASS_BOUNDED_SOFTWARE_AND_BROWSER_EVIDENCE'&&run.humanParticipants===0&&run.humanOutcomes==='UNTESTED'&&run.diagramAdvantage==='UNTESTED'&&run.closureBoundary.nextGateApproved===false&&run.closureBoundary.nextGateStarted===false&&packet.includes('untested')&&packet.includes('zero human participants')&&results.includes('zero human participants')&&results.includes('Gate 12')&&results.includes('unapproved and unrun'));
check('claims','negative and capture qualifications retained',packet.includes('Gate 10')&&packet.includes('transport')&&packet.includes('single-string')&&results.includes('Gate 10')&&results.includes('transport-limited capture')&&run.earlierPreservedAcquisitions.length===2);
check('claims','HTML numeric claims',results.includes('100 / 100')&&results.includes('24.005 s')&&results.includes('18 exact paused')&&results.includes('1,437 historical frozen entries'));
check('pins','36 synthesis pin entries',run.pinnedArtifacts.length===36);
for(const entry of run.pinnedArtifacts){const file=path.join(root,entry.path),content=read(file);check('pins',entry.path,content.length===entry.bytes&&sha(content)===entry.sha256);}
check('core','closed manifest hash',sha(read(path.join(root,'evidence/gate-11/CORE_EVIDENCE_FREEZE.json')))===run.closedCore.sha256);
check('core','54 closed entries',core.entries.length===54&&core.count===54);
for(const entry of core.entries){const content=read(path.join(root,entry.path));check('core',entry.path,content.length===entry.bytes&&sha(content)===entry.sha256);}
const prespec=json(path.join(root,'docs/gate-11/PRESPEC_FREEZE.json'));
for(const entry of prespec.files){const content=read(path.join(root,entry.path));check('prespec',entry.path,content.length===entry.bytes&&sha(content)===entry.sha256);}
let historical=0;
for(let gate=0;gate<=10;gate++){
  const file=gate===10?path.join(root,'evidence/gate-10/FREEZE_MANIFEST.json'):path.join(root,`evidence/gate-${gate}/GATE_${gate}_FREEZE.json`);
  for(const entry of json(file).files){const content=read(path.join(root,entry.path));historical++;check('historical',`gate${gate}:${entry.path}`,sha(content)===entry.sha256&&(!('bytes'in entry)||content.length===entry.bytes));}
}
check('historical','exact prior count',historical===1437);
check('review','exact nine allowlist routes',allow.assets.length===9&&new Set(allow.assets.map(x=>x.route)).size===9);
const mapping={
  '/review/results.html':'evidence/gate-11/results.html',
  '/review/replay-collection.json':'evidence/gate-11/replay-collection.json',
  '/review/source-review.md':'research/gate-11/source-review.md'
};
for(const image of ['changed-receiver-witness','initial-count-summary','minimal-repair-diagram','minimal-repair-plain','natural-tour-end','partial-negative-narrow'])mapping[`/review/images/${image}.jpg`]=`evidence/gate-11/browser-002-full/screenshots/${image}.jpg`;
check('review','review source map exact',Object.keys(mapping).length===9&&allow.assets.every(a=>mapping[a.route]));
async function response(method,url){const res=await fetch(url,{method,redirect:'manual'});return {status:res.status,headers:res.headers,body:Buffer.from(await res.arrayBuffer())};}
function rawRequest(method,requestPath){return new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:44004,method,path:requestPath},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks)}));});req.on('error',reject);req.end();});}
for(const asset of allow.assets){
  const original=read(path.join(root,mapping[asset.route]));
  const copy=read(path.join(root,'receiver-summary',asset.path));
  check('review',`copy ${asset.route}`,sha(original)===asset.sha256&&sha(copy)===asset.sha256&&copy.length===asset.bytes&&original.equals(copy));
  const served=await response('GET',`http://127.0.0.1:44004${asset.route}`);
  check('served',`GET ${asset.route}`,served.status===200&&served.body.equals(copy)&&sha(served.body)===asset.sha256&&served.headers.get('x-content-type-options')==='nosniff');
  const head=await response('HEAD',`http://127.0.0.1:44004${asset.route}`);
  check('served',`HEAD ${asset.route}`,head.status===200&&head.body.length===0&&Number(head.headers.get('content-length'))===copy.length);
}
for(const [route,file] of Object.entries({'/':'receiver-summary/builds/g11-7ced826c903d40c5a0dd/index.html','/build.json':'receiver-summary/builds/g11-7ced826c903d40c5a0dd/build.json','/run/run.json':'receiver-summary/runs/G11-RECEIVER-002/run.json'})){
  const served=await response('GET',`http://127.0.0.1:44004${route}`),expected=read(path.join(root,file));
  check('served',`immutable ${route}`,served.status===200&&served.body.equals(expected));
}
const denied=['/review/allowlist.json','/review/unlisted.html','/review/images/not-allowed.jpg','/review/results.html?x=1','/review/%2e%2e/allowlist.json','/review/%252e%252e/allowlist.json','/audit/gate-11/final-audit.json','/docs/gate-11/fixture.json','/evidence/gate-11/GATE_11_PACKET.md','/receiver-summary/README.md','/source-manifest.json','/run/computational-results.json','/run/run-manifest.json','/review//results.html'];
for(const route of denied){const served=await response('GET',`http://127.0.0.1:44004${route}`);check('denial',route,served.status===404,{status:served.status});}
for(const route of ['/review/%2e%2e/allowlist.json','/review/%252e%252e/allowlist.json','/review//results.html','/run/../run.json','/review/results.html?x=1']){const served=await rawRequest('GET',route);check('denial',`raw ${route}`,served.status===404,{status:served.status});}
for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS']){const served=await response(method,'http://127.0.0.1:44004/review/results.html');check('denial',method+' review',served.status===405,{status:served.status});}
check('links','review page local links in allowlist/root',([...results.matchAll(/(?:href|src)="(\/[^"]+)"/g)].map(x=>x[1]).every(u=>u==='/'||Object.keys(mapping).includes(u))));
const packetTargets=[...packet.matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]).filter(x=>!x.startsWith('http://')&&!x.startsWith('https://'));
check('links','packet local paths resolve',packetTargets.length>10&&packetTargets.every(target=>fs.existsSync(target.startsWith('/')?target:path.resolve(root,'evidence/gate-11',target))));
check('links','twelve listed replays',collection.entries.length===12&&collection.entries.every((x,i)=>x.gate===i));
for(const entry of collection.entries){
  const base=new URL(entry.url),endpoint=entry.gate<=9?'/api/run':'/run/run.json';
  const served=await response('GET',new URL(endpoint,base).href);
  let identity=null;try{identity=JSON.parse(served.body.toString());}catch{}
  check('replay',`gate${entry.gate} identity`,served.status===200&&identity?.runId===entry.runId&&identity?.buildId===entry.buildId,{status:served.status,route:endpoint,runId:identity?.runId,buildId:identity?.buildId});
  const page=await response('GET',entry.url);
  const resultPage=await response('GET',entry.resultsUrl);
  check('replay',`gate${entry.gate} pages`,page.status===200&&resultPage.status===200,{rootStatus:page.status,resultsStatus:resultPage.status});
}
const publishedCollection=await response('GET','http://127.0.0.1:44004/review/replay-collection.json');
check('replay','served collection byte identical',publishedCollection.status===200&&publishedCollection.body.equals(read(path.join(root,'evidence/gate-11/replay-collection.json'))));
const presentationPath=path.join(root,'evidence/gate-11/PRESENTATION_FREEZE.json');
const presentationReady=fs.existsSync(presentationPath);
if(presentationReady){
  const presentation=json(presentationPath),dir=path.join(root,'evidence/gate-11/presentation');
  const outcome=json(path.join(dir,'presentation-outcome.json'));
  const observations=json(path.join(dir,'observations.json'));
  const captures=json(path.join(dir,'captures.json'));
  const linked=json(path.join(dir,'linked-paused-identity.json'));
  check('presentation','seven sealed presentation files',presentation.count===7&&presentation.entries.length===7);
  for(const item of presentation.entries){const content=read(path.join(root,item.path));check('presentation',item.path,content.length===item.bytes&&sha(content)===item.sha256);}
  check('presentation','five observations and two originals',observations.length===5&&captures.length===2&&outcome.observations===5&&outcome.originals===2);
  check('presentation','both tested widths no overflow',observations.every(o=>[960,1280].includes(o.viewport.width)&&o.viewport.documentWidth<=o.viewport.width)&&JSON.stringify(outcome.testedWidths)==='[960,1280]');
  check('presentation','four displayed source originals loaded',observations.every(o=>o.images.length===4&&o.images.every(image=>image.complete&&mapping[image.src]&&image.naturalWidth===([image.src.includes('partial-negative-narrow')?960:1280][0])&&image.naturalHeight===720&&image.displayWidth<=o.viewport.width)));
  check('presentation','actual linked paused run/build and hash',linked.runId===run.runId&&linked.buildId===run.buildId&&linked.semanticPayload.cursorSeconds===0&&linked.semanticPayload.paused===true&&sha(Buffer.from(canon(linked.semanticPayload)))===linked.semanticFingerprint);
  check('presentation','no console warnings/errors',json(path.join(dir,'console.json')).length===0&&outcome.consoleWarningsOrErrors===0);
  for(const capture of captures){const file=path.join(dir,`${capture.name}.jpg`),content=read(file);check('presentation',`original ${capture.name}`,content.length===capture.bytes&&sha(content)===capture.sha256&&observations[capture.observation]?.label===capture.name);}
  check('presentation','result lead and Gate12 boundary visible',observations[0].text.includes('Pass · Bounded software and browser evidence')&&observations[0].text.includes('zero human participants')&&observations[3].text.includes('Gate 12')&&observations[3].text.includes('unapproved and unrun'));
}
const groups={};for(const x of checks){groups[x.group]??={passed:0,total:0};groups[x.group].total++;if(x.pass)groups[x.group].passed++;}
const failed=checks.filter(x=>!x.pass);
const report={schema:'gate11-independent-handoff-verification-v1',status:failed.length?'FAIL':presentationReady?'PASS':'PASS_PENDING_PRESENTATION',runId:run.runId,buildId:run.buildId,synthesisPins:run.pinnedArtifacts.length,closedCorePins:core.entries.length,priorFrozenEntries:historical,reviewAssets:allow.assets.length,replayIdentities:collection.entries.length,presentationRecordReady:presentationReady,groups,failed};
fs.writeFileSync(path.join(audit,'handoff-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,groups,failed:failed.slice(0,15),failedCount:failed.length,presentationRecordReady:presentationReady}));
if(failed.length)process.exitCode=1;
