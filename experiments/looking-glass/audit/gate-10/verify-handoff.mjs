#!/usr/bin/env node
// Read-only final Gate 10 handoff audit; no API mutation or browser control.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const at=p=>path.join(root,p),buf=p=>fs.readFileSync(at(p)),json=p=>JSON.parse(buf(p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const errors=[],check=(name,ok)=>{if(!ok)errors.push(name);};
async function request(origin,route,method='GET'){
  return new Promise((resolve,reject)=>{const url=new URL(origin);const req=http.request({hostname:url.hostname,port:url.port,path:route,method,timeout:5000},res=>{const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});req.on('error',reject);req.on('timeout',()=>req.destroy(Error('timeout')));req.end();});
}
const rootOrigin='http://127.0.0.1:44003';
const expected={
  'evidence/gate-10/GATE_10_PACKET.md':'c11042beb1274586cb49a3ced36577b3d0cb85f9384f974f7874ca86dfc0f57f',
  'evidence/gate-10/results.html':'a5be9af03cd941a8d3c3b967ca19aec6f0f7fa8b531b2d1926daceb39225b785',
  'evidence/gate-10/run-evidence.json':'7e02df51bb143e21b95981a07c9525b983cdd0c9f318b7910749ee03f7dd366d',
  'evidence/gate-10/CORE_EVIDENCE_FREEZE.json':'a8310e939ba5d3020d890613ca305f7b71179b5e7c88a97bc064bd588006fd28'
};
for(const [p,h] of Object.entries(expected))check(`stable ${p}`,sha(buf(p))===h);
const packet=buf('evidence/gate-10/GATE_10_PACKET.md').toString('utf8');
const resultHtml=buf('evidence/gate-10/results.html').toString('utf8');
const runEvidence=json('evidence/gate-10/run-evidence.json');
check('negative run evidence',runEvidence.result==='BOUNDED_NEGATIVE'&&runEvidence.instrumentReadiness==='NOT_READY'&&runEvidence.independentOverallVerdict==='BLOCKED_PREDICTION_WORKFLOW'&&runEvidence.humanParticipants===0&&runEvidence.closureBoundary.nextGateApproved===false&&runEvidence.closureBoundary.nextGateStarted===false);
check('35 run evidence pins',runEvidence.pinnedArtifacts.length===35);
const pinned=[];
for(const x of runEvidence.pinnedArtifacts){const b=buf(x.path),ok=b.length===x.bytes&&sha(b)===x.sha256;check(`run pin ${x.path}`,ok);pinned.push({path:x.path,match:ok});}
const core=json('evidence/gate-10/CORE_EVIDENCE_FREEZE.json');check('22 closed core pins',core.entries.length===22);
for(const x of core.entries){const b=buf(x.path);check(`closed core ${x.path}`,b.length===x.bytes&&sha(b)===x.sha256);}
const presentation=json('evidence/gate-10/presentation-check.json');
check('presentation QA scoped counts',presentation.observations===7&&presentation.originalScreenshots===3&&presentation.allThreeReportImagesLoaded&&presentation.noHorizontalOverflow&&presentation.coreFilesChanged===false);
for(const x of presentation.files){const b=buf(x.path);check(`presentation ${x.path}`,b.length===x.bytes&&sha(b)===x.sha256);}
const presentationObs=json('evidence/gate-10/presentation/observations.json');check('seven distinct presentation observations',presentationObs.length===7);
const reportFrames=presentationObs.filter(o=>o.url===`${rootOrigin}/review/results.html`);
check('presentation wide/narrow report no overflow',reportFrames.length===6&&[960,1280].every(w=>reportFrames.some(o=>o.viewport.width===w))&&reportFrames.every(o=>o.viewport.documentWidth<=o.viewport.width));
check('presentation images loaded',reportFrames.every(o=>o.images.length===3&&o.images.every(i=>i.complete&&i.naturalWidth===1280&&i.naturalHeight===720)));
const replayFrame=presentationObs.find(o=>o.label==='report-link-opens-paused-final-build');
const replayInspector=JSON.parse(replayFrame.inspector),replayState=replayInspector.semanticPayload;
check('actual presentation link opens clean paused build',replayFrame?.url===`${rootOrigin}/`&&replayInspector.runId==='G10-PREDICT-003'&&replayInspector.buildId==='g10-9e34f791d83c1cd7a495'&&replayState.mode==='saved-tour'&&replayState.cursorSeconds===0&&replayState.paused===true&&replayState.attachedAttempt===null&&replayState.revealedResult===null);
check('presentation returns to settled report',presentationObs.find(o=>o.label==='return-to-report')?.url===`${rootOrigin}/review/results.html`&&presentationObs.at(-1)?.label==='final-report-settled'&&presentationObs.at(-1)?.viewport.scrollY===0);
const allow=json('prediction-transfer/live/review-allowlist.json');
const exactRoutes=['/review/replay-collection.json','/review/results.html','/review/screenshots/initial-cards.jpg','/review/screenshots/natural-tour-end.jpg','/review/screenshots/start-ack-discarded.jpg','/review/source-review.md'];
check('six exact review routes',allow.assets.length===6&&JSON.stringify(allow.assets.map(x=>x.route).sort())===JSON.stringify(exactRoutes.sort()));
const sources={
  '/review/replay-collection.json':'evidence/gate-10/replay-collection.json',
  '/review/results.html':'evidence/gate-10/results.html',
  '/review/screenshots/initial-cards.jpg':'evidence/gate-10/browser/screenshots/initial-cards.jpg',
  '/review/screenshots/natural-tour-end.jpg':'evidence/gate-10/browser/screenshots/natural-tour-end.jpg',
  '/review/screenshots/start-ack-discarded.jpg':'evidence/gate-10/browser/screenshots/start-ack-discarded.jpg',
  '/review/source-review.md':'research/gate-10/source-review.md'
};
const publicAssets=[];
for(const entry of allow.assets){const local=buf(`prediction-transfer/${entry.path}`),original=buf(sources[entry.route]);const got=await request(rootOrigin,entry.route),head=await request(rootOrigin,entry.route,'HEAD');const ok=sha(local)===entry.sha256&&local.equals(original)&&got.status===200&&got.body.equals(local)&&sha(got.body)===entry.sha256&&head.status===200&&Number(head.headers['content-length'])===local.length&&head.body.length===0;check(`public ${entry.route}`,ok);publicAssets.push({route:entry.route,sha256:sha(got.body),bytes:got.body.length,getStatus:got.status,headStatus:head.status,exactLocalAndSource:ok});}
const deniedRoutes=['/private/private-answer-key.json','/private/independent-predictions.json','/private/build-manifest.json','/service.mjs','/math.mjs','/test.mjs','/build.mjs','/review/GATE_10_PACKET.md','/review/browser-final-audit.json','/review/private-answer-key.json','/review/screenshots/narrow-supports.jpg','/review/screenshots/unknown.jpg','/review/arbitrary.txt','/audit/gate-10/browser-final-audit.json','/evidence/gate-10/GATE_10_PACKET.md','/live/review-allowlist.json','/run/computational-results.json','/review/%2e%2e/private/private-answer-key.json','/review/../private/private-answer-key.json','/review/results.html?leak=1'];
const denied=[];
for(const route of deniedRoutes){const r=await request(rootOrigin,route);const ok=r.status===404&&!r.body.toString('utf8').includes('expectedOptionId');check(`denied ${route}`,ok);denied.push({route,status:r.status,pass:ok});}
const protectedApis=[];
for(const route of ['/api/session','/api/start','/api/commit','/api/reveal','/api/close','/api/export']){const r=await request(rootOrigin,route);const ok=r.status===405&&!r.body.toString('utf8').includes('sessionToken');check(`GET boundary ${route}`,ok);protectedApis.push({route,getStatus:r.status,pass:ok});}
const publicBuild=await request(rootOrigin,'/build.json');const build=JSON.parse(publicBuild.body);
check('public build sanitized',publicBuild.status===200&&build.runId==='G10-PREDICT-003'&&build.buildId==='g10-9e34f791d83c1cd7a495'&&!Object.keys(build).some(k=>/private|answer|prediction|key/i.test(k))&&!publicBuild.body.toString('utf8').includes('expectedOptionId'));
check('public HTML negative status',resultHtml.includes('Prediction instrument not ready')&&resultHtml.includes('zero participants')&&resultHtml.includes('The preserved tour works; the prediction workflow does not.')&&resultHtml.includes('Gate 11')&&resultHtml.includes('remains unapproved and unrun'));
const privateKey=json('docs/gate-10/private-answer-key.json');
const publicText=allow.assets.filter(a=>a.route.endsWith('.html')||a.route.endsWith('.json')||a.route.endsWith('.md')).map(a=>buf(`prediction-transfer/${a.path}`).toString('utf8')).join('\n');
// The replay collection intentionally names the local packet path; only its contents/HTTP route stay private.
check('answer-free public text fields',!/(expectedOptionId|softwareGrade|private-answer-key|browser-final-audit|audit\/gate-10|computed target|correct option)/i.test(publicText));
for(const ans of privateKey.answers){check(`private explanation withheld ${ans.caseId}`,!publicText.includes(ans.explanation));}
const hrefs=[...resultHtml.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(m=>m[1]);
const imgs=[...resultHtml.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1]);
const replays=json('evidence/gate-10/replay-collection.json').entries;
check('public HTML exact review and replay links',hrefs.length===14&&hrefs.includes('/')&&hrefs.includes('/review/replay-collection.json')&&hrefs.includes('/review/source-review.md')&&replays.every(e=>hrefs.includes(e.url)));
check('public HTML three exact images',imgs.length===3&&imgs.every(src=>allow.assets.some(x=>x.route===src)));
const packetLinks=[...packet.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]);
const badLocalPacketLinks=[];
for(const link of packetLinks){if(/^https?:\/\//.test(link))continue;const cleaned=link.split('#')[0];if(!cleaned)continue;const target=cleaned.startsWith('/')?cleaned:path.resolve(at('evidence/gate-10'),cleaned);if(!fs.existsSync(target))badLocalPacketLinks.push(link);}
check('all packet local links resolve',badLocalPacketLinks.length===0);
const replayGet=[];
for(const entry of replays){const origin=new URL(entry.url).origin;const runRoute=entry.gate===10?'/run/run.json':'/api/run';const run=await request(origin,runRoute);let runData={};try{runData=JSON.parse(run.body);}catch{}let buildRoute=null,buildStatus=null,buildMatch=null;
  if(entry.gate>=8){buildRoute=entry.gate===10?'/build.json':'/api/build';const b=await request(origin,buildRoute);buildStatus=b.status;try{buildMatch=b.status===200&&JSON.parse(b.body).buildId===entry.buildId;}catch{buildMatch=false;}}
  const result=await request(new URL(entry.resultsUrl).origin,new URL(entry.resultsUrl).pathname);
  const ok=run.status===200&&runData.runId===entry.runId&&runData.buildId===entry.buildId&&(buildMatch===null||buildMatch)&&result.status===200&&result.headers['content-type']?.startsWith('text/html');
  check(`replay ${entry.gate} GET identity`,ok);
  replayGet.push({gate:entry.gate,runRoute,runStatus:run.status,observedRunId:runData.runId??null,observedBuildId:runData.buildId??null,buildRoute,buildStatus,buildMatch,resultsStatus:result.status,identityAndLinkMatch:ok});
}
check('11 replay entries',replays.length===11&&replayGet.every(x=>x.identityAndLinkMatch));
const report={schema:'gate10-independent-handoff-verification-v1',status:errors.length?'FAIL':'PASS_NEGATIVE_HANDOFF',runId:'G10-PREDICT-003',buildId:'g10-9e34f791d83c1cd7a495',pinnedArtifactCount:pinned.length,closedCoreEntryCount:core.entries.length,publicAssetCount:publicAssets.length,deniedRouteCount:denied.length,protectedApiGetCount:protectedApis.length,replayIdentityCount:replayGet.length,presentationObservationCount:presentationObs.length,presentationOriginalCount:presentation.originalScreenshots,packetLocalLinkCount:packetLinks.length,badLocalPacketLinks,publicAssets,denied,protectedApis,replayGet,errors,scope:'Read-only actual HTTP handoff plus file pins; no API mutation, new browser trial or human outcome'};
fs.writeFileSync(at('audit/gate-10/handoff-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,pinnedArtifactCount:report.pinnedArtifactCount,closedCoreEntryCount:report.closedCoreEntryCount,publicAssetCount:report.publicAssetCount,deniedRouteCount:report.deniedRouteCount,protectedApiGetCount:report.protectedApiGetCount,replayIdentityCount:report.replayIdentityCount,errors},null,2));
if(errors.length)process.exitCode=1;
