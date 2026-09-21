import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const buildDir=join(root,'ambiguity/builds/g8-f5c5ee62889da529');
const runDir=join(root,'ambiguity/runs/G8-AMBIGUITY-001');
const build=JSON.parse(await readFile(join(buildDir,'build.json')));
const origin='http://127.0.0.1:44001';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=[];
for(const entry of build.publicFiles){
  const path=entry.path==='index.html'?'/index.html':'/'+entry.path;
  const response=await fetch(origin+path,{method:'GET',cache:'no-store'});
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(response.status,200,path);
  assert.equal(sha(bytes),entry.sha256,path);
  checks.push({method:'GET',path,status:response.status,sha256:sha(bytes)});
}
for(const [path,filename,dir] of [
  ['/','index.html',buildDir],['/api/run','run.json',runDir],
  ['/api/build','build.json',buildDir],['/api/checkpoints','checkpoints.json',runDir],
  ['/api/events','events.jsonl',runDir]]){
  const response=await fetch(origin+path,{method:'GET',cache:'no-store'});
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(response.status,200,path);
  assert.equal(sha(bytes),sha(await readFile(join(dir,filename))),path);
  checks.push({method:'GET',path,status:response.status,sha256:sha(bytes)});
}
for(const path of ['/PRESPEC_FREEZE.json','/independent-predictions.json','/test.mjs',
  '/api/activity','/docs/gate-8/fixture.json','/review/screenshots/..%2fREADME.md',
  '/review/screenshots/not-an-original.txt','/not-a-route']){
  const response=await fetch(origin+path,{method:'GET',cache:'no-store'});
  assert.equal(response.status,404,path);
  checks.push({method:'GET',path,status:response.status});
}
const lsof=execFileSync('lsof',['-nP','-iTCP:44001','-sTCP:LISTEN'],{encoding:'utf8'});
assert.match(lsof,/127\.0\.0\.1:44001 \(LISTEN\)/);
const reviewPaths=['/review/results.html','/review/packet.md','/review/audit.md',
  '/review/run-evidence.json','/review/source-review.md'];
for(const path of reviewPaths){
  const response=await fetch(origin+path,{method:'GET',cache:'no-store'});
  assert.ok([200,404].includes(response.status),path);
  checks.push({method:'GET',path,status:response.status,
    interpretation:response.status===404?'review artifact not yet written':'available'});
}
const report={kind:'gate8-independent-GET-route-audit',status:'PASS',origin,
  listenAddress:'127.0.0.1:44001',checks,postRequestsMade:0};
await writeFile(join(root,'audit/gate-8/route-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',checks:checks.length,reviewRoutesPending:checks.filter(c=>c.interpretation==='review artifact not yet written').length,postRequestsMade:0}));
