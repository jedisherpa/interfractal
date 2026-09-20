// Gate 12 synthesis/presentation/served-route audit. Read-only, except its own result file.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import http from 'node:http';
import {makeServer} from '../../coordination/builds/g12-3c5526361a7cb2cc5c4a/server.mjs';

const root=resolve(import.meta.dirname,'../..'),base='http://127.0.0.1:44005';
const get=async p=>readFile(resolve(root,p)),parse=async p=>JSON.parse(await get(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const checks=[],errors=[];
function check(name,pass,detail){checks.push({name,pass:!!pass});if(!pass)errors.push({name,detail});}
async function fetchBytes(url,method='GET'){const r=await fetch(url,{method,signal:AbortSignal.timeout(5000),redirect:'manual'});return {status:r.status,headers:r.headers,bytes:Buffer.from(await r.arrayBuffer())};}

const fixedSynthesis={
  'evidence/gate-12/GATE_12_PACKET.md':'daf8c269b99f623c4fb21992d50e07d50f0002ac8fa90f0870c618111f3aea57',
  'evidence/gate-12/results.html':'8b71893060617754f3490b155d37e280070fd241d72150a5b4f7ea832af34a62',
  'evidence/gate-12/run-evidence.json':'a9478963ce718adb9b15ec2babc874e8ac0f6919e112ccebc9420641f7fd9420'};
for(const [p,h] of Object.entries(fixedSynthesis))check(`synthesis SHA ${p}`,sha(await get(p))===h);
const runEvidence=await parse('evidence/gate-12/run-evidence.json');
const componentFailures=[];
for(const f of runEvidence.componentFiles){try{const b=await get(f.path);if(b.length!==f.bytes||sha(b)!==f.sha256)componentFailures.push(f.path);}catch{componentFailures.push(f.path);}}
check('109 synthesis component pins',runEvidence.componentFileCount===109&&runEvidence.componentFiles.length===109&&new Set(runEvidence.componentFiles.map(x=>x.path)).size===109&&componentFailures.length===0,componentFailures);
const core=await parse('evidence/gate-12/CORE_EVIDENCE_FREEZE.json');
const coreFailures=[];
for(const f of core.files){const b=await get(f.path);if(b.length!==f.bytes||sha(b)!==f.sha256)coreFailures.push(f.path);}
check('102 unchanged closed-core pins',core.files.length===102&&sha(await get('evidence/gate-12/CORE_EVIDENCE_FREEZE.json'))==='cdcbfb68c8fec722a217075d30c14b76e69803e753296fc3bde8a6ea936335f6'&&coreFailures.length===0,coreFailures);
const prespec=await parse('docs/gate-12/PRESPEC_FREEZE.json');
check('nine prespec pins unchanged',(await Promise.all(prespec.files.map(async f=>sha(await get(f.path))===f.sha256))).every(Boolean)&&prespec.files.length===9);
const prior=['evidence/gate-0/GATE_0_FREEZE.json','evidence/gate-1/GATE_1_FREEZE.json','evidence/gate-2/GATE_2_FREEZE.json','evidence/gate-3/GATE_3_FREEZE.json','evidence/gate-4/GATE_4_FREEZE.json','evidence/gate-5/GATE_5_FREEZE.json','evidence/gate-6/GATE_6_FREEZE.json','evidence/gate-7/GATE_7_FREEZE.json','evidence/gate-8/GATE_8_FREEZE.json','evidence/gate-9/GATE_9_FREEZE.json','evidence/gate-10/FREEZE_MANIFEST.json','evidence/gate-11/FREEZE_MANIFEST.json'];
let priorCount=0;const priorFailures=[];
for(const p of prior){const m=await parse(p);for(const f of m.files){priorCount++;try{const b=await get(f.path);if(sha(b)!==f.sha256||(f.bytes!==undefined&&b.length!==f.bytes))priorFailures.push(f.path);}catch{priorFailures.push(f.path);}}}
check('1613 prior frozen entries unchanged',priorCount===1613&&priorFailures.length===0,priorFailures);
check('Git base still frozen at approved Gate11 commit',execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()==='a7d6d3f686817f4cb9700ed3bf3095845dea3874');

const packet=(await get('evidence/gate-12/GATE_12_PACKET.md')).toString();
const html=(await get('evidence/gate-12/results.html')).toString();
const audit=await parse('audit/gate-12/final-audit.json');
const oldActions=await parse('evidence/gate-12/browser-001/actions.json');
const newActions=await parse('evidence/gate-12/browser-002/actions.json');
const oldObservations=await parse('evidence/gate-12/browser-001/observations.json');
const newObservations=await parse('evidence/gate-12/browser-002/observations.json');
const firstExport=await parse('evidence/gate-12/browser-002/document-1-final-export.json');
const secondExport=await parse('evidence/gate-12/browser-002/document-2-final-export.json');
const oldFailed=oldActions.filter(a=>!!a.error);
check('candidate and aggregate action counts from raw',oldActions.length===31&&oldFailed.length===2&&oldActions.length-oldFailed.length===29&&newActions.length===79&&newActions.every(a=>!a.error)&&oldActions.length+newActions.length===110&&29+newActions.length===108&&oldObservations.length+newObservations.length===136);
check('packet action-count prose truthful',packet.includes('31 action attempts (29 completed, two failed)')&&packet.includes('110 action attempts (108 completed, two failed)')&&packet.includes('136 observations')&&packet.includes('11 originals'));
check('HTML action-count prose truthful',html.includes('31 action attempts (29 completed, two failed)')&&html.includes('79 successful host actions')&&html.includes('93 complete observations'));
check('packet/HTML model and browser claims anchored',packet.includes('24 contexts')&&packet.includes('18 checkpoint matches')&&packet.includes('24.002 seconds')&&html.includes('93 / 93')&&html.includes('18 / 18')&&html.includes('24.002 seconds')&&firstExport.localBranches.length===2&&firstExport.localBranches.reduce((n,b)=>n+Object.keys(b.proposals).length,0)===4&&firstExport.localBranches.reduce((n,b)=>n+b.outcomes.length,0)===5&&firstExport.events.length===54&&secondExport.events.length===18&&audit.verdict==='PASS_DECLARED_SOFTWARE_SCOPE');
check('bounded no-human and Gate13-unapproved claims',runEvidence.scope.humanParticipants===0&&runEvidence.scope.enactedActions===0&&runEvidence.scope.humanCoordinationBenefitEstablished===false&&runEvidence.nextGate.approved===false&&runEvidence.nextGate.run===false&&packet.includes('Gate 13 is unapproved and unrun')&&html.includes('Gate 13 remains unapproved and unrun')&&html.includes('No humans participated and no action was enacted'));
check('known qualifications disclosed',packet.includes('4–8, 12–16 or 16–20')&&html.includes('4–8, 12–16 or 16–20')&&packet.includes('1279×904')&&html.includes('1279 × 904')&&packet.includes('raw canonical registry preloads')&&html.includes('raw public canonical registry preloads')&&packet.includes('Reduced-motion emulation was not tested'));
check('source review scopes remain narrow',packet.includes('conceptual motivation')&&packet.includes('adjacent formal context')&&packet.includes('None validates this instrument\'s human effects')&&html.includes('None of these sources establishes human benefit'));
check('synthesis role/provenance labels',runEvidence.actualAgentRoles.length===4&&packet.includes('separate Sol high independent auditor')&&html.includes('separate Sol high audit worker'));
const localMarkdownLinks=[...packet.matchAll(/!?(?:\[[^\]]*\])\(([^)]+)\)/g)].map(x=>x[1]).filter(x=>!x.startsWith('http'));
const badPacketLinks=[];
for(const href of localMarkdownLinks){const path=href.startsWith('/')?href:resolve(root,'evidence/gate-12',href);try{await readFile(path);}catch{badPacketLinks.push(href);}}
check('packet local artifact links resolve',badPacketLinks.length===0,badPacketLinks);
const imageRoutes=[...html.matchAll(/<img\s+[^>]*src="([^"]+)"/g)].map(x=>x[1]);
check('HTML four original images and static content',imageRoutes.length===4&&new Set(imageRoutes).size===4&&imageRoutes.every(x=>x.startsWith('/review/images/'))&&!/<script\b|<form\b/i.test(html));
const hrefs=[...html.matchAll(/href="([^"]+)"/g)].map(x=>x[1]);
check('HTML internal review links and next anchor',hrefs.includes('/')&&hrefs.includes('/review/replay-collection.json')&&hrefs.includes('/review/source-review.md')&&hrefs.includes('#next')&&html.includes('id="next"'));

const allow=await parse('coordination/review/allowlist.json');
const reviewSources={
  '/review/results.html':'evidence/gate-12/results.html',
  '/review/source-review.md':'research/gate-12/source-review.md',
  '/review/replay-collection.json':'evidence/gate-12/replay-collection.json',
  ...Object.fromEntries((await parse('evidence/gate-12/browser-002/screenshots.json')).map(x=>['/review/images/'+x.path.split('/').at(-1),'evidence/gate-12/browser-002/screenshots/'+x.path.split('/').at(-1)]))
};
const allowFailures=[];
for(const a of allow.assets){const source=reviewSources[a.route],served=await get('coordination/'+a.path),original=source?await get(source):null;if(!source||sha(served)!==a.sha256||served.length!==a.bytes||sha(served)!==sha(original))allowFailures.push(a.route);}
check('eight exact approved review copies',allow.assets.length===8&&Object.keys(reviewSources).length===8&&new Set(allow.assets.map(x=>x.route)).size===8&&allowFailures.length===0,allowFailures);
check('four HTML images are approved originals',imageRoutes.every(x=>allow.assets.some(a=>a.route===x)));

const servedFailures=[];
for(const a of allow.assets){const expected=await get('coordination/'+a.path),resp=await fetchBytes(base+a.route),head=await fetchBytes(base+a.route,'HEAD');if(resp.status!==200||sha(resp.bytes)!==sha(expected)||head.status!==200||head.bytes.length!==0||Number(head.headers.get('content-length'))!==expected.length)servedFailures.push(a.route);}
check('eight actual served GET/HEAD exact assets',servedFailures.length===0,servedFailures);
const liveRoot=await fetchBytes(base+'/'),liveRun=await fetchBytes(base+'/run/run.json');
check('actual current instrument/run identity',liveRoot.status===200&&liveRun.status===200&&JSON.parse(liveRun.bytes).runId==='G12-COORD-002'&&JSON.parse(liveRun.bytes).buildId==='g12-3c5526361a7cb2cc5c4a');

// Deny-path and method probes use an ephemeral server, preserving the host's live session.
const {server}=await makeServer({runDir:resolve(root,'coordination/runs/G12-COORD-002')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const isolated=`http://127.0.0.1:${server.address().port}`;
const deniedPaths=['/review/allowlist.json','/review/other.html','/review/images/unknown.jpg','/evidence/gate-12/GATE_12_PACKET.md','/audit/gate-12/final-audit.md','/docs/gate-12/fixture.json','/independent-predictions.json','/run/computational-results.json','/server.mjs','/review/results.html?x=1','/%2e%2e/docs/gate-12/fixture.json'];
const denialFailures=[];
try{
  for(const path of deniedPaths){const r=await fetchBytes(isolated+path);if(r.status!==404)denialFailures.push({path,status:r.status});}
  for(const path of ['/../docs/gate-12/fixture.json','/review/../../docs/gate-12/fixture.json']){
    const code=await new Promise((resolveCode,reject)=>{const req=http.request({hostname:'127.0.0.1',port:server.address().port,path},res=>{res.resume();res.on('end',()=>resolveCode(res.statusCode));});req.on('error',reject);req.end();});if(code!==404)denialFailures.push({path,status:code});
  }
  for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS']){const r=await fetchBytes(isolated+'/review/results.html',method);if(r.status!==405)denialFailures.push({method,status:r.status});}
}finally{await new Promise(r=>server.close(r));}
check('private/generic/traversal/mutation denials',denialFailures.length===0,denialFailures);

const replays=await parse('evidence/gate-12/replay-collection.json'),copiedReplays=await parse('coordination/review/replay-collection.json');
check('13 exact replay descriptors and copy',replays.entries.length===13&&replays.entries.every((e,i)=>e.gate===i)&&JSON.stringify(replays)===JSON.stringify(copiedReplays));
const replayChecks=[];
for(const e of replays.entries){const identityPath=e.gate<=9?'/api/run':'/run/run.json';try{const [rootResp,resultResp,identityResp]=await Promise.all([fetchBytes(e.url),fetchBytes(e.resultsUrl),fetchBytes(new URL(identityPath,e.url))]);const id=JSON.parse(identityResp.bytes);replayChecks.push({gate:e.gate,identityRoute:identityPath,rootStatus:rootResp.status,resultsStatus:resultResp.status,identityStatus:identityResp.status,runMatch:id.runId===e.runId,buildMatch:id.buildId===e.buildId});}catch(error){replayChecks.push({gate:e.gate,error:String(error)});}}
check('13 current exact replay identities and result routes',replayChecks.length===13&&replayChecks.every(x=>x.rootStatus===200&&x.resultsStatus===200&&x.identityStatus===200&&x.runMatch&&x.buildMatch),replayChecks.filter(x=>x.error||x.rootStatus!==200||x.resultsStatus!==200||x.identityStatus!==200||!x.runMatch||!x.buildMatch));

const presentation=await parse('evidence/gate-12/PRESENTATION_FREEZE.json');
const presentationHash=sha(await get('evidence/gate-12/PRESENTATION_FREEZE.json'));
const presentationBad=[];
for(const f of presentation.files){const b=await get(f.path);if(b.length!==f.bytes||sha(b)!==f.sha256)presentationBad.push(f.path);}
check('six sealed presentation pins',presentationHash==='7ee2a3dc1a82e5d02731b9d47c6dd9b0ce0da5dd00061c468e303509d1e78168'&&presentation.files.length===6&&presentationBad.length===0,presentationBad);
const presentationObs=await parse('evidence/gate-12/presentation/observations.json');
const presentationImages=await parse('evidence/gate-12/presentation/screenshots.json');
const presentationConsole=await parse('evidence/gate-12/presentation/console.json');
check('nine visible report observations and no overflow',presentationObs.length===9&&presentationObs.every((x,i)=>x.index===i&&[base+'/review/results.html',base+'/review/results.html#next'].includes(x.url)&&x.documentWidth<=x.width)&&presentationObs.some(x=>x.width===1280)&&presentationObs.some(x=>x.width===960));
check('lazy-load state honestly retained then all four loaded',presentationObs[0].images.some(x=>!x.complete)&&presentationObs[7].images.length===4&&presentationObs[7].images.every(x=>x.complete&&x.naturalWidth>0&&x.naturalHeight>0)&&presentationObs[8].images.every(x=>x.complete));
check('presentation links and bounded next gate visible',presentationObs[0].bodyText.includes('PASS within the declared software scope')&&presentationObs[5].bodyText.includes('Gate 13 remains unapproved and unrun')&&presentationObs[0].links.some(x=>x.href===base+'/')&&presentationObs[0].links.some(x=>x.href===base+'/review/replay-collection.json'));
const presentationImageFailures=[];
for(const shot of presentationImages){const bytes=await readFile(shot.path);if(bytes.length!==shot.bytes||sha(bytes)!==shot.sha256||!presentation.files.some(f=>resolve(root,f.path)===resolve(shot.path)&&f.sha256===shot.sha256))presentationImageFailures.push(shot.path);}
check('presentation originals and console',presentationImages.length===2&&presentationImageFailures.length===0&&Array.isArray(presentationConsole)&&presentationConsole.length===0,presentationImageFailures);

const result={schema:'gate12-independent-handoff-verification-v1',status:errors.length?'BLOCKED':'PASS',checkCount:checks.length,passCount:checks.length-errors.length,errors,checks,synthesisPins:Object.keys(fixedSynthesis).length,componentPins:runEvidence.componentFiles.length,corePins:core.files.length,priorPins:priorCount,allowlistedAssets:allow.assets.length,servedAssetFailures:servedFailures,routeDenialFailures:denialFailures,replayChecks,presentationFreezeSha256:presentationHash,presentationObservations:presentationObs.length,presentationOriginals:presentationImages.length,presentationFinalObservedViewport:[presentationObs.at(-1).width,presentationObs.at(-1).height],qualification:'Final sealed report observation remains at 960x720; viewport-override reset is host reported, not independently established by that last DOM record. Initial lazy-image incompleteness is retained and all four load after scroll. Final gate freeze/Git publication pending.'};
await writeFile(resolve(root,'audit/gate-12/handoff-verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checks:result.checkCount,passed:result.passCount,errors:result.errors,componentPins:result.componentPins,corePins:result.corePins,priorPins:result.priorPins,assets:result.allowlistedAssets,replays:result.replayChecks.length},null,2));
