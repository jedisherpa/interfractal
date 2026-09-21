import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root=path.resolve(import.meta.dirname,'../..');
const base=process.argv[2]??'http://127.0.0.1:43996';
const runId=process.argv[3]??'G3-TESSERACT-001';
const run=JSON.parse(fs.readFileSync(path.join(root,'hypercube/runs',runId,'run.json')));
const buildDir=path.join(root,'hypercube/builds',run.buildId);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const checks=[];
for(const [url,file] of [
  ['/',path.join(buildDir,'index.html')],
  ['/style.css',path.join(buildDir,'style.css')],
  ['/app.mjs',path.join(buildDir,'app.mjs')],
  ['/model.mjs',path.join(buildDir,'model.mjs')],
  ['/api/run',path.join(root,'hypercube/runs',runId,'run.json')],
  ['/api/checkpoints',path.join(root,'hypercube/runs',runId,'checkpoints.json')],
  ['/api/events',path.join(root,'hypercube/runs',runId,'events.jsonl')],
  [`/runs/${runId}/initial-state.json`,path.join(root,'hypercube/runs',runId,'initial-state.json')],
  ['/api/evidence',path.join(root,'evidence/gate-3/run-evidence.json')],
]){
  try{
    const response=await fetch(new URL(url,base));
    const actual=Buffer.from(await response.arrayBuffer());
    const expected=fs.readFileSync(file);
    checks.push({url,status:response.status,pass:response.status===200&&actual.equals(expected),expectedSha256:sha(expected),actualSha256:sha(actual)});
  }catch(error){checks.push({url,pass:false,error:String(error)});}
}
for(const url of ['/not-an-asset','/package.json','/api/private','/runs/%2e%2e%2f%2e%2e%2finputs%2fLOOKING_GLASS_CODEX_ORCHESTRATOR_PROMPT.md',
  '/evidence/gate-3/%2e%2e%2f%2e%2e%2finputs%2fLOOKING_GLASS_CODEX_ORCHESTRATOR_PROMPT.md']){
  try{const response=await fetch(new URL(url,base));
    checks.push({url,status:response.status,pass:response.status!==200});
  }catch(error){checks.push({url,pass:false,error:String(error)});}
}
const result={checkedAtUtc:new Date().toISOString(),base,runId:run.runId,buildId:run.buildId,
  pass:checks.every(c=>c.pass),passed:checks.filter(c=>c.pass).length,failed:checks.filter(c=>!c.pass).length,checks};
fs.writeFileSync(path.join(import.meta.dirname,`${run.runId}-route-audit.json`),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pass:result.pass,passed:result.passed,failed:result.failed,failures:checks.filter(c=>!c.pass)}));
if(!result.pass)process.exitCode=1;
