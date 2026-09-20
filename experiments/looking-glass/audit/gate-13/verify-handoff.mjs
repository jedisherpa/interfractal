// Independent Gate 13 handoff verifier. Reads frozen evidence and live GET/HEAD
// routes; mutation-method probes use a disposable local server. Writes only its result.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import http from 'node:http';
import { makeServer } from '../../misleading-view/builds/g13-5b8514d97acc3485aabf/server.mjs';

const root=resolve(import.meta.dirname,'../..'),base='http://127.0.0.1:44006';
const read=async p=>readFile(resolve(root,p)),parse=async p=>JSON.parse(await read(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const checks=[],errors=[];
function check(name,pass,detail){checks.push({name,pass:!!pass});if(!pass)errors.push({name,detail});}
async function httpBytes(url,method='GET'){const r=await fetch(url,{method,signal:AbortSignal.timeout(5000),redirect:'manual'});return {status:r.status,bytes:Buffer.from(await r.arrayBuffer()),headers:r.headers};}
async function pinned(manifest){const bad=[];for(const e of manifest.files){try{const data=await read(e.path);if(data.length!==e.bytes||sha(data)!==e.sha256)bad.push(e.path);}catch{bad.push(e.path);}}return bad;}

const packetPath='evidence/gate-13/GATE_13_PACKET.md',htmlPath='evidence/gate-13/results.html',runPath='evidence/gate-13/run-evidence.json';
const fixed={
  [packetPath]:'1c7c259442c8d71a67053ceade67f1f4811d48744c9f386fc526d33866d2fab9',
  [htmlPath]:'94972776d340c8de1d15bc8efae8336ffb14f782c9c777533ab02bc26150b732',
  [runPath]:'eff98284518367a302e06b2b81d185a216b635ea2a2618b54b90203732c2fccb'
};
for(const [p,digest] of Object.entries(fixed))check(`final synthesis SHA ${p}`,sha(await read(p))===digest);
const packet=(await read(packetPath)).toString(),html=(await read(htmlPath)).toString(),run=await parse(runPath);
const pinBad=[];for(const e of run.componentFiles){try{const data=await read(e.path);if(data.length!==e.bytes||sha(data)!==e.sha256)pinBad.push(e.path);}catch{pinBad.push(e.path);}}
check('145 exact synthesis component pins',run.componentFileCount===145&&run.componentFiles.length===145&&new Set(run.componentFiles.map(x=>x.path)).size===145&&!pinBad.length,pinBad);
const core=await parse('evidence/gate-13/CORE_EVIDENCE_FREEZE_002.json'),coreBad=await pinned(core);
check('138 sealed candidate 002 core pins',sha(await read('evidence/gate-13/CORE_EVIDENCE_FREEZE_002.json'))==='f6cd344da16e2e8d15ad2cbe21f31c66bdc80a8884f1b6ac0d18aab984d6ab20'&&core.files.length===138&&!coreBad.length,coreBad);
const failed=await parse('evidence/gate-13/CANDIDATE_001_FAILURE_FREEZE.json'),failedBad=await pinned(failed);
check('84 candidate 001 failure pins',sha(await read('evidence/gate-13/CANDIDATE_001_FAILURE_FREEZE.json'))==='152c8c74a83e5efcf54f60ee530ad51b88a2d4ad72149f147c986fc94fd526fe'&&failed.files.length===84&&!failedBad.length,failedBad);
const prior=await parse('evidence/gate-13/prior-integrity-at-start.json');let priorCount=0;const priorBad=[];
for(const m of prior.manifests){if(sha(await read(m.manifest))!==m.manifestSha256)priorBad.push(m.manifest);const obj=await parse(m.manifest);for(const e of obj.files){priorCount++;try{const data=await read(e.path);if(sha(data)!==e.sha256||(e.bytes!==undefined&&data.length!==e.bytes))priorBad.push(e.path);}catch{priorBad.push(e.path);}}}
check('1745 earlier frozen entries',priorCount===1745&&!priorBad.length,priorBad);
const superseded=await parse('evidence/gate-13/drafts/before-preparation-scope-change/FREEZE.json');
check('20 superseded synthesis and presentation pins retained',sha(await read('evidence/gate-13/drafts/before-preparation-scope-change/FREEZE.json'))==='e16b929767fe54e710c4323bc98e302614ad52194985f6902d9730ae69f82cb9'&&superseded.files.length===20&&!(await pinned(superseded)).length);
const presentation=await parse('evidence/gate-13/PRESENTATION_FREEZE.json'),presentationBad=await pinned(presentation);
check('22 final presentation and served-asset pins',sha(await read('evidence/gate-13/PRESENTATION_FREEZE.json'))==='19ba2cac5b5b7814122b7fbe0d81a9e32d08a8c1261ca8dd622693e8772d7ead'&&presentation.fileCount===22&&presentation.files.length===22&&presentation.reportSha256===fixed[htmlPath]&&!presentationBad.length,presentationBad);

const authority=await parse('docs/preparation-goal-authority-2026-09-20.json');
const ledger=(await read('evidence/gate-13/preparation-requirements-at-close.md')).toString();
check('actual confirmation governs preparation-only scope',authority.scopeClarification?.answer==='Yes—defer both; complete preparation only'&&authority.scopeClarification?.effect.includes('deferred and excluded')&&authority.researchAgentSnapshots===0&&authority.humanParticipants===0&&run.fullProgram.currentGoalScope==='PREPARATION_ONLY'&&run.fullProgram.preparationComplete===false&&run.fullProgram.newV03ResearchAgentSnapshotsPerformed===0&&run.fullProgram.humanParticipants===0);
check('deferral and unfinished preparation explicit in packet/report/ledger',packet.includes('preparation only')&&packet.includes('deferred')&&run.fullProgram.preparationComplete===false&&html.includes('preparation-only goal')&&html.includes('deferred and are not completion blockers')&&html.includes('These deliverables remain incomplete')&&ledger.includes('deferred')&&ledger.includes('incomplete'));
check('roles, negative history, no human claim, and Gate14 boundary',run.nextGate.number===14&&run.nextGate.approved===false&&run.nextGate.run===false&&run.scope.humanParticipants===0&&run.scope.researchAgentSnapshots===0&&run.fullProgram.engineeringWorkersAreResearchSnapshotParticipants===false&&packet.includes('Gate 10')&&packet.includes('Candidate 001')&&html.includes('Gate 10')&&html.includes('Gate 14 remains unapproved and unrun')&&html.includes('These software workers are not research participants'));
check('core claims match raw counts and independent verdict',run.acceptedCandidate.runId==='G13-MISLEAD-002'&&run.actualBrowserEvidence.observations===108&&run.actualBrowserEvidence.hostActionAttempts===91&&run.closedCore.pinsTotal===138&&run.coreVerdict.includes('PASS')&&packet.includes('108 observations')&&html.includes('108 complete observations')&&html.includes('18 checkpoint comparisons'));
const packetLinks=[...packet.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g)].map(m=>m[1]).filter(x=>!x.startsWith('http'));
const badLinks=[];for(const x of packetLinks){const p=x.startsWith('/')?x:resolve(root,'evidence/gate-13',x);try{await readFile(p);}catch{badLinks.push(x);}}
check('packet local links resolve',!badLinks.length,badLinks);
const imageRoutes=[...html.matchAll(/<img\s+[^>]*src="([^"]+)"/g)].map(x=>x[1]);
check('report four approved image embeds, static links and next anchor',imageRoutes.length===4&&new Set(imageRoutes).size===4&&imageRoutes.every(x=>x.startsWith('/review/images/'))&&!/<script\b|<form\b/i.test(html)&&html.includes('href="/"')&&html.includes('href="/review/replay-collection.json"')&&html.includes('href="#next"')&&html.includes('id="next"'));

const allow=await parse('misleading-view/review/allowlist.json');
const originals=await parse('evidence/gate-13/browser-002/screenshots.json');
const sourceByRoute={
  '/review/results.html':htmlPath,
  '/review/source-review.md':'research/gate-13/source-review.md',
  '/review/replay-collection.json':'evidence/gate-13/replay-collection.json',
  ...Object.fromEntries(originals.map(x=>['/review/images/'+x.path.split('/').at(-1),'evidence/gate-13/browser-002/screenshots/'+x.path.split('/').at(-1)]))
};
const copyBad=[];for(const e of allow.assets){try{const copy=await read('misleading-view/'+e.path),original=await read(sourceByRoute[e.route]);if(sha(copy)!==e.sha256||sha(copy)!==sha(original))copyBad.push(e.route);}catch{copyBad.push(e.route);}}
check('eight exact approved allowlist copies including original images',allow.assets.length===8&&new Set(allow.assets.map(x=>x.route)).size===8&&Object.keys(sourceByRoute).length===8&&!copyBad.length&&imageRoutes.every(x=>allow.assets.some(e=>e.route===x)),copyBad);
const servedBad=[];for(const e of allow.assets){try{const copy=await read('misleading-view/'+e.path),get=await httpBytes(base+e.route),head=await httpBytes(base+e.route,'HEAD');if(get.status!==200||sha(get.bytes)!==e.sha256||head.status!==200||head.bytes.length!==0||Number(head.headers.get('content-length'))!==copy.length)servedBad.push(e.route);}catch{servedBad.push(e.route);}}
check('eight actual served GET/HEAD byte-identical assets',!servedBad.length,servedBad);
const hostHttp=await parse('evidence/gate-13/review-http-checks.json');
check('separate host HTTP acquisition reports eight matching assets',hostHttp.checks.length===8&&hostHttp.checks.every(x=>x.status===200&&x.shaMatches===true));
const [liveBuild,liveRun]=await Promise.all([httpBytes(base+'/build.json'),httpBytes(base+'/run/run.json')]);
check('current live immutable run/build identity',liveBuild.status===200&&liveRun.status===200&&JSON.parse(liveBuild.bytes).runId==='G13-MISLEAD-002'&&JSON.parse(liveRun.bytes).buildId==='g13-5b8514d97acc3485aabf');

const denied=['/review/allowlist.json','/review/unapproved.html','/review/images/unknown.jpg','/evidence/gate-13/GATE_13_PACKET.md','/audit/gate-13/final-audit-002.md','/docs/preparation-goal-authority-2026-09-20.json','/server.mjs','/review/results.html?probe=1','/%2e%2e/docs/gate-13/fixture.json'];
const denyBad=[];for(const p of denied){try{const r=await httpBytes(base+p);if(r.status!==404)denyBad.push({path:p,status:r.status});}catch(e){denyBad.push({path:p,error:String(e)});}}
const {server}=await makeServer({runDir:resolve(root,'misleading-view/runs/G13-MISLEAD-002')});await new Promise(r=>server.listen(0,'127.0.0.1',r));const isolated=`http://127.0.0.1:${server.address().port}`;
try{for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS']){const r=await httpBytes(isolated+'/review/results.html',method);if(r.status!==405)denyBad.push({method,status:r.status});}
  for(const path of ['/../docs/gate-13/fixture.json','/review/../../docs/gate-13/fixture.json']){const status=await new Promise((ok,fail)=>{const q=http.request({hostname:'127.0.0.1',port:server.address().port,path},r=>{r.resume();r.on('end',()=>ok(r.statusCode));});q.on('error',fail);q.end();});if(status!==404)denyBad.push({path,status});}
}finally{await new Promise(r=>server.close(r));}
check('private/generic/traversal paths and mutation methods denied',!denyBad.length,denyBad);

const replay=await parse('evidence/gate-13/replay-collection.json'),copyReplay=await parse('misleading-view/review/replay-collection.json');
check('fourteen exact descriptors and approved copy',replay.entries.length===14&&replay.entries.every((x,i)=>x.gate===i)&&sha(await read('evidence/gate-13/replay-collection.json'))===sha(await read('misleading-view/review/replay-collection.json')));
const replayChecks=[];for(const e of replay.entries){const identityRoute=e.gate<=9?'/api/run':'/run/run.json';try{const [index,result,identity]=await Promise.all([httpBytes(e.url),httpBytes(e.resultsUrl),httpBytes(new URL(identityRoute,e.url))]);const id=JSON.parse(identity.bytes);replayChecks.push({gate:e.gate,identityRoute,indexStatus:index.status,resultsStatus:result.status,identityStatus:identity.status,runMatch:id.runId===e.runId,buildMatch:id.buildId===e.buildId});}catch(error){replayChecks.push({gate:e.gate,error:String(error)});}}
check('fourteen current historical root/result/identity routes',replayChecks.length===14&&replayChecks.every(x=>x.indexStatus===200&&x.resultsStatus===200&&x.identityStatus===200&&x.runMatch&&x.buildMatch),replayChecks.filter(x=>x.error||x.indexStatus!==200||x.resultsStatus!==200||x.identityStatus!==200||!x.runMatch||!x.buildMatch));

const po=await parse('evidence/gate-13/presentation-final/observations.json'),ps=await parse('evidence/gate-13/presentation-final/screenshots.json'),pc=await parse('evidence/gate-13/presentation-final/console.json');
const presentationImageBad=[];for(const shot of ps){try{const data=await read(shot.path);if(data.length!==shot.bytes||sha(data)!==shot.sha256||shot.afterObservationIndex!==shot.beforeObservationIndex+1||!presentation.files.some(e=>resolve(root,e.path)===resolve(shot.path)&&e.sha256===shot.sha256))presentationImageBad.push(shot.path);}catch{presentationImageBad.push(shot.path);}}
check('three bracketed final presentation originals and empty console',ps.length===3&&!presentationImageBad.length&&Array.isArray(pc)&&pc.length===0,presentationImageBad);
check('ten actual final presentation observations at 1280x720 without horizontal overflow',po.length===10&&po.every((o,i)=>o.index===i&&o.viewport.width===1280&&o.viewport.height===720&&o.viewport.documentWidth<=o.viewport.width)&&po[3].images.length===4&&po[3].images.every(x=>x.complete&&x.width>0&&x.height>0));
check('final report shows bounded verdict, scope, and actual next-decision navigation',po[0].text.includes('PASS within the declared software scope')&&po[2].text.includes('preparation-only goal')&&po[9].label==='actual-next-decision-click'&&po[9].viewport.scrollY>0&&po[9].text.includes('Gate 14 remains unapproved and unrun')&&po[9].text.includes('deferred and are not completion blockers'));

const result={schema:'gate13-independent-handoff-verification-v1',status:errors.length?'BLOCKED':'PASS',checkCount:checks.length,passCount:checks.length-errors.length,errors,checks,pins:{synthesisComponents:run.componentFiles.length,core:core.files.length,failedCandidate:failed.files.length,historical:priorCount,supersededPresentation:superseded.files.length,finalPresentation:presentation.files.length},servedAssets:allow.assets.length,servedFailures:servedBad,denialFailures:denyBad,replayChecks,presentation:{observations:po.length,originalImages:ps.length,consoleRows:pc.length,firstAllFourLoadedIndex:po.findIndex(o=>o.images.length===4&&o.images.every(x=>x.complete&&x.width>0&&x.height>0))},scope:'Preparation-only handoff; no research-agent snapshots or human collection performed; Gate14 unapproved.'};
await writeFile(resolve(root,'audit/gate-13/handoff-verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checks:result.checkCount,passed:result.passCount,errors:result.errors,pins:result.pins,assets:result.servedAssets,replays:result.replayChecks.length},null,2));
