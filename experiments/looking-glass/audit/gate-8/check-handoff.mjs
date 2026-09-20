import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const evidence=join(root,'evidence/gate-8');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async path=>JSON.parse(await readFile(path));
const pins={
  'GATE_8_PACKET.md':'56c3d57e6ea337a41f88e080d33ec005038927d405869b28a64c68cc9b8e1bd7',
  'results.html':'74cb9624c9432fa45061762b7a892b990a6c93c1c30a84173f7b1c1e70841fea',
  'run-evidence.json':'d677dea5d14194adcf080f0b6f60f4fb585fa058ca2dc61af6b705e5a1ba0b57'
};
const paths={'GATE_8_PACKET.md':'/review/packet.md','results.html':'/review/results.html',
  'run-evidence.json':'/review/run-evidence.json'};
const served=[];
for(const [name,path] of Object.entries(paths)){
  const local=await readFile(join(evidence,name));
  assert.equal(sha(local),pins[name],name);
  const response=await fetch(`http://127.0.0.1:44001${path}`,{method:'GET',cache:'no-store'});
  assert.equal(response.status,200,path);
  const live=Buffer.from(await response.arrayBuffer());
  assert.deepEqual(live,local,path);
  served.push({route:path,status:200,sha256:sha(live),bytes:live.length});
}
const packet=(await readFile(join(evidence,'GATE_8_PACKET.md'))).toString();
const html=(await readFile(join(evidence,'results.html'))).toString();
const review=await json(join(evidence,'run-evidence.json'));
const core=await json(join(evidence,'CORE_TRIAL_CLOSED.json'));
const independent=await json(join(root,'audit/gate-8/independent-results.json'));
const build=await json(join(root,'ambiguity/builds/g8-f5c5ee62889da529/build.json'));
const failedIndex=await json(join(evidence,'failed-acquisitions/G8-AMBIGUITY-001-server-stop/capture-index.json'));
const captureIndex=await json(join(evidence,'capture-index.json'));
const presentationBytes=await readFile(join(evidence,'presentation-review.json'));
const presentation=JSON.parse(presentationBytes);
assert.equal(review.result,'qualified_pass');
assert.equal(review.runId,core.runId);
assert.equal(review.buildId,core.buildId);
assert.equal(review.sourceSha256,build.sourceSha256);
assert.equal(review.closedCore.sha256,'2ec12a77e41c2d3ce05ca77e79c1f37aac2e89a105e2060e1012ddaf447adcbf');
assert.deepEqual(review.closedCore.counts,core.counts);
assert.equal(review.closedCore.pinnedFileCount,core.files.length);
assert.equal(review.humanParticipantCount,0);
assert.equal(review.participantResponseCount,0);
assert.equal(review.humanUnderstandingEstablished,false);
assert.equal(review.visualAdvantageEstablished,false);
assert.equal(review.globalQueryOptimalityEstablished,false);
assert.equal(review.nextGate.approved,false);
assert.equal(review.nextGate.executed,false);
assert.equal(review.benchmark.worlds,10);
assert.equal(review.benchmark.allowedWorldQueryOutputsChecked,28);
assert.equal(review.benchmark.withinCasePairs,9);
assert.equal(review.benchmark.baselineExactConflictingPairs,8);
assert.equal(review.benchmark.additionalQuerySubsets,12);
assert.equal(review.benchmark.cases.length,4);
for(const [i,c] of review.benchmark.cases.entries()){
  const id=`G8-C0${i+1}`,d=independent.caseResults[id];
  assert.equal(c.caseId,id);
  assert.equal(c.subsetsExamined,d.subsets.length);
  assert.equal(c.baselineExactConflictingPairs,d.baselinePairDiagnostics.filter(p=>!p.propertyEqual&&p.exactEqual).length);
  assert.deepEqual(c.minimum,d.minimum);
}
assert.equal(review.replay.durationSeconds,32);
assert.equal(review.replay.matchingCheckpointObservations,36);
assert.equal(review.replay.observedSemanticRows,79);
assert.equal(review.replay.continuousReplayElapsedMilliseconds,32020);
assert.equal(review.historicalPreservation.uniqueFrozenEntries,979);
assert.equal(review.historicalPreservation.historicalHttpHomepagesAvailable,8);
assert.equal(review.captures.length,14);
assert.equal(review.preservedIncompleteAcquisition.counts.originalCaptures,4);
assert.equal(review.replayCollection.length,9);
assert.equal(review.captureCountingNote.includes('18 preserved instrument originals'),true);
assert.equal(presentation.observations.length,13);
assert.equal(presentation.captures.length,5);
assert.equal(presentation.consoleEntries.length,0);
assert.ok(presentation.observations.every(o=>o.scrollWidth<=o.clientWidth));
assert.ok(presentation.observations.some(o=>o.images?.length===4&&
  o.images.every(image=>image.complete&&image.naturalWidth>0&&image.naturalHeight>0)));
for(const capture of presentation.captures){
  assert.equal(capture.original,true);
  assert.ok(capture.beforeObservation>=0&&capture.afterObservation<presentation.observations.length);
  assert.ok(capture.beforeObservation<=capture.afterObservation);
  assert.equal(sha(await readFile(join(root,capture.path))),capture.sha256);
}
for(const required of ['28 allowed world/query outputs','nine within-case pairs','twelve additional-query subsets',
  '197 actual browser observations','83 successful host action calls','14 original captures',
  '36 checkpoint observations','79 semantic event rows','18 preserved instrument originals',
  '979 unique frozen entries','32.020-second','Gate 9 and later gates are unapproved and unrun'])
  assert.ok(packet.includes(required),`packet claim missing: ${required}`);
for(const required of ['1, 2, none, and 0','28 allowed world/query outputs','all twelve query subsets',
  '979 unique frozen entries','Zero human participants'])
  assert.ok(html.includes(required),`results claim missing: ${required}`);

const htmlLinks=[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]);
const mdLinks=[...packet.matchAll(/\]\(([^)]+)\)/g)].map(m=>m[1]);
const links=[...htmlLinks,...mdLinks];
const allowedG8=new Set(build.servedRoutes.filter(path=>path.startsWith('/')));
allowedG8.add('/');
const screenshotUrls=new Set();
let localFileLinks=0;
for(const raw of links){
  if(raw.startsWith('#')){
    assert.ok(html.includes(`id="${raw.slice(1)}"`),`broken section link ${raw}`);
    continue;
  }
  if(raw.startsWith('/Users/')){
    assert.ok(raw.startsWith(root+'/'),`external local path ${raw}`);
    await readFile(raw);localFileLinks++;
    continue;
  }
  const url=new URL(raw,'http://127.0.0.1:44001');
  assert.equal(url.hostname,'127.0.0.1');
  if(url.port==='44001'){
    if(url.pathname.startsWith('/review/screenshots/')){
      assert.match(url.pathname,/^\/review\/screenshots\/[A-Za-z0-9_-]+\.jpe?g$/);
      screenshotUrls.add(url.href);
    } else {
      assert.ok(allowedG8.has(url.pathname),`generic/unserved Gate8 link ${url.pathname}`);
    }
  } else {
    assert.ok(['43991','43994','43995','43996','43997','43998','43999','44000'].includes(url.port),`foreign port ${url.port}`);
    assert.equal(url.pathname,'/',`unsupported historical path ${url.href}`);
  }
}
const expectedScreenshots=[...captureIndex,...failedIndex].map(c=>
  `http://127.0.0.1:44001/review/screenshots/${c.path.split('/').at(-1)}`);
assert.equal(new Set(expectedScreenshots).size,18);
assert.equal(screenshotUrls.size,18);
assert.deepEqual([...screenshotUrls].sort(),expectedScreenshots.sort());
const byName=new Map([...captureIndex,...failedIndex].map(c=>[c.path.split('/').at(-1),c]));
const originals=[];
for(const url of screenshotUrls){
  const name=new URL(url).pathname.split('/').at(-1);
  const expected=byName.get(name);assert.ok(expected);
  const response=await fetch(url,{method:'GET',cache:'no-store'});
  assert.equal(response.status,200,url);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(sha(bytes),expected.sha256,url);
  originals.push({name,status:200,sha256:sha(bytes),bytes:bytes.length});
}
const replays=[];
for(const item of review.replayCollection){
  assert.ok(packet.includes(item.url),`packet missing replay ${item.gate}`);
  assert.ok(html.includes(`href="${item.url}"`),`results missing replay ${item.gate}`);
  const response=await fetch(item.url,{method:'GET',cache:'no-store'});
  assert.equal(response.status,200,item.url);
  const resultResponse=await fetch(item.resultsUrl,{method:'GET',cache:'no-store'});
  assert.equal(resultResponse.status,200,item.resultsUrl);
  replays.push({gate:item.gate,runId:item.runId,buildId:item.buildId,url:item.url,status:200,
    resultsUrl:item.resultsUrl,resultsStatus:200});
}
for(const [name,url] of Object.entries(review.reviewUrls)){
  const parsed=new URL(url);
  assert.equal(parsed.hostname,'127.0.0.1',name);
  assert.equal(parsed.port,'44001',name);
  assert.ok(allowedG8.has(parsed.pathname),`unsupported review URL ${name}: ${parsed.pathname}`);
  const response=await fetch(url,{method:'GET',cache:'no-store'});
  assert.equal(response.status,200,url);
}
const result={kind:'gate8-independent-handoff-addendum',status:'PASS',
  servedReviewRoutes:served,linkedOriginals:originals,linkedReplays:replays,
  uniqueOriginalLinks:screenshotUrls.size,uniqueReplayLinks:replays.length,
  reviewUrlAliasesChecked:Object.keys(review.reviewUrls).length,
  checkedLocalPacketFileLinks:localFileLinks,genericInvalidRouteLinks:0,
  packetClaimsMatchClosedCore:true,resultsClaimsMatchIndependentOracle:true,
  presentationReview:{sha256:sha(presentationBytes),observations:presentation.observations.length,
    separateOriginalCaptures:presentation.captures.length,embeddedOriginalsLoaded:4,
    horizontalOverflowObservations:0,consoleEntries:0},
  priorAuditSha256:'928238cccfa43cacf98245b01b51bdb7f268764c033daab346a9abe40a37fb8a',
  priorFinalChecksSha256:'57c86b6e29a46a08f256b0a5a62d59214ec80288e4494de7b7ae44116d019b23',
  limitation:'Read-only HTTP and source-link audit. Host presentation QA is separate; no browser controls or POST used.'};
assert.equal(sha(await readFile(join(root,'audit/gate-8/AUDIT.md'))),result.priorAuditSha256);
assert.equal(sha(await readFile(join(root,'audit/gate-8/final-checks.json'))),result.priorFinalChecksSha256);
await writeFile(join(root,'audit/gate-8/handoff-addendum.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,reviewRoutes:served.length,originals:originals.length,
  replays:replays.length,genericInvalidRouteLinks:0,packetClaimsMatchClosedCore:true}));
