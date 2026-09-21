// Read-only HTTP route and exact-byte audit of the candidate server.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const runId='G5-PENTERACT-001';
const run=JSON.parse(await readFile(resolve(root,'five-dimensional/runs',runId,'run.json')));
const buildId=run.buildId,base='http://127.0.0.1:43998';
const cases=[
  ['/',`five-dimensional/builds/${buildId}/index.html`],
  ['/style.css',`five-dimensional/builds/${buildId}/style.css`],
  ['/app.mjs',`five-dimensional/builds/${buildId}/app.mjs`],
  ['/model.mjs',`five-dimensional/builds/${buildId}/model.mjs`],
  ['/api/run',`five-dimensional/runs/${runId}/run.json`],
  ['/api/current-run',`five-dimensional/runs/${runId}/run.json`],
  ['/api/checkpoints',`five-dimensional/runs/${runId}/checkpoints.json`],
  ['/api/events',`five-dimensional/runs/${runId}/events.jsonl`],
  ['/api/evidence','evidence/gate-5/run-evidence.json'],
  [`/runs/${runId}/run.json`,`five-dimensional/runs/${runId}/run.json`],
  [`/runs/${runId}/observation-cases.json`,`five-dimensional/runs/${runId}/observation-cases.json`],
  [`/runs/${runId}/slice-cases.json`,`five-dimensional/runs/${runId}/slice-cases.json`]
];
const sha=x=>createHash('sha256').update(x).digest('hex');
const results=[];
for(const [url,path] of cases){
  const response=await fetch(base+url,{cache:'no-store'});
  assert.equal(response.status,200,`${url} status`);
  const body=Buffer.from(await response.arrayBuffer()),expected=await readFile(resolve(root,path));
  assert.equal(sha(body),sha(expected),`${url} bytes`);
  results.push({url,status:response.status,bytes:body.length,sha256:sha(body)});
}
for(const url of ['/does-not-exist','/server.mjs','/runs/not-a-run.json']){
  const response=await fetch(base+url);assert.equal(response.status,404,`${url} status`);
  results.push({url,status:404});
}
const result={kind:'read-only-exact-route-audit',runId,buildId,baseUrl:base,passed:results.length,
  cases:results,allChecksPassed:true};
await writeFile(resolve(root,`audit/gate-5/${runId}-route-audit.json`),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({runId,buildId,passed:results.length,allChecksPassed:true}));
