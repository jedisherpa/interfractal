// Read-only HTTP audit for the exact Gate 2 snapshot served at the local preview port.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../..');
const runId=process.argv[2]??'G2-HOPF-002';
const run=JSON.parse(fs.readFileSync(path.join(root,'correspondence/runs',runId,'run.json')));
const base=`http://127.0.0.1:43995`;
const build=path.join(root,'correspondence/builds',run.buildId);
const assertions=[];
const check=(name,pass,detail)=>assertions.push({name,pass:Boolean(pass),...(detail===undefined?{}:{detail})});
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function compare(name,uri,file){
  try{
    const response=await fetch(base+uri,{cache:'no-store'});
    const bytes=Buffer.from(await response.arrayBuffer());
    const expected=fs.readFileSync(file);
    check(name,response.status===200&&bytes.equals(expected),{status:response.status,servedSha256:sha(bytes),expectedSha256:sha(expected)});
  }catch(error){check(name,false,String(error));}
}
await compare('index is exact snapshot','/',path.join(build,'index.html'));
for(const file of ['app.mjs','model.mjs','mapping.mjs','style.css','fictional-records.json','reference-mappings.json'])
  await compare(`${file} is exact snapshot`,`/${file}`,path.join(build,file));
for(const [uri,file] of [
  ['/api/run',`correspondence/runs/${runId}/run.json`],
  ['/api/current-run',`correspondence/runs/${runId}/run.json`],
  ['/api/checkpoints',`correspondence/runs/${runId}/checkpoints.json`],
  ['/api/events',`correspondence/runs/${runId}/events.jsonl`],
  ['/runs/G2-HOPF-001/run.json','correspondence/runs/G2-HOPF-001/run.json']
])await compare(`${uri} canonical bytes`,uri,path.join(root,file));
for(const uri of ['/AGENTS.md','/PROJECT_STATUS.json','/server.mjs','/../AGENTS.md','/runs/../builds/g2-d8107c62a9ca1f71/model.mjs']){
  try{const response=await fetch(base+uri,{cache:'no-store'});check(`${uri} not exposed`,response.status!==200,{status:response.status});}
  catch(error){check(`${uri} not exposed`,false,String(error));}
}
const result={runId,buildId:run.buildId,base,checkedAtUtc:new Date().toISOString(),assertions,
  summary:{passed:assertions.filter(x=>x.pass).length,total:assertions.length,failed:assertions.filter(x=>!x.pass).map(x=>x.name)}};
const output=path.join(import.meta.dirname,`${runId}-route-audit.json`);
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file:output,...result.summary}));
if(result.summary.failed.length)process.exitCode=1;
