// Read-only preservation audit; run before and after browser trials.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../..');
const runId=process.argv[2]??'G2-HOPF-002';
const label=process.argv[3]??'initial';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
const checks=[];
for(const [group,manifest] of [
  ['gate-0','evidence/gate-0/GATE_0_FREEZE.json'],
  ['gate-1','evidence/gate-1/GATE_1_FREEZE.json'],
  ['gate-2-prespec','docs/gate-2/PRESPEC_FREEZE.json']
]){
  const m=read(manifest),failures=[];
  for(const file of m.files){
    const full=path.join(root,file.path);
    if(!fs.existsSync(full)){failures.push({path:file.path,reason:'missing'});continue;}
    const bytes=fs.readFileSync(full),actual=sha(bytes);
    if(actual!==file.sha256||(file.bytes!==undefined&&bytes.length!==file.bytes))
      failures.push({path:file.path,expected:file.sha256,actual,expectedBytes:file.bytes,actualBytes:bytes.length});
  }
  checks.push({group,manifest,files:m.files.length,failures,pass:failures.length===0});
}
const run=read(`correspondence/runs/${runId}/run.json`);
const build=read(`correspondence/builds/${run.buildId}/build.json`);
const buildFailures=[];
for(const file of build.sourceFiles){
  const full=path.join(root,'correspondence/builds',run.buildId,file.path);
  if(!fs.existsSync(full)){buildFailures.push({path:file.path,reason:'missing'});continue;}
  const actual=sha(fs.readFileSync(full));
  if(actual!==file.sha256)buildFailures.push({path:file.path,expected:file.sha256,actual});
}
checks.push({group:'gate-2-build',manifest:`correspondence/builds/${run.buildId}/build.json`,files:build.sourceFiles.length,failures:buildFailures,pass:buildFailures.length===0});
const canonical=['run.json','initial-state.json','checkpoints.json','events.jsonl'];
const runFiles=canonical.map(file=>{
  const bytes=fs.readFileSync(path.join(root,'correspondence/runs',runId,file));
  return {path:`correspondence/runs/${runId}/${file}`,sha256:sha(bytes),bytes:bytes.length};
});
const result={runId,buildId:run.buildId,label,checkedAtUtc:new Date().toISOString(),checks,runFiles,
  summary:{passed:checks.filter(x=>x.pass).length,total:checks.length,failed:checks.filter(x=>!x.pass).map(x=>x.group)}};
const output=path.join(import.meta.dirname,`${runId}-${label}-integrity.json`);
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file:output,...result.summary}));
if(result.summary.failed.length)process.exitCode=1;
