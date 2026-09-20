#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const base=resolve(import.meta.dirname,'..');
const expected=readFileSync(join(base,'package-candidate-003/review/index.html'));
const h=b=>createHash('sha256').update(b).digest('hex');
const probes=[
  ['/',200],['/index.html',200],['/?x=1',404],['/index.html?x=1',404],
  ['/research-team/design/AUTHOR_ANSWER_KEY.json',404],
  ['/transfer-phase-bound/withheld-tasks.json',404],
  ['/participants/A1/world.json',404],['/package-candidate-003/MANIFEST.json',404],
  ['/audit/blind-key-001.json',404],['/../design/AUTHOR_ANSWER_KEY.json',404],
  ['/%2e%2e/design/AUTHOR_ANSWER_KEY.json',404],['/index.html/extra',404],
];
const results=[];const errors=[];
for(const [path,expect] of probes){const response=await fetch('http://127.0.0.1:44009'+path,{redirect:'manual'});const bytes=Buffer.from(await response.arrayBuffer());const ok=response.status===expect&&(expect!==200||h(bytes)===h(expected));results.push({path,status:response.status,bytes:bytes.length,sha256:h(bytes),pass:ok});if(!ok)errors.push(path);}
for(const method of ['HEAD','POST']){const response=await fetch('http://127.0.0.1:44009/',{method});const bytes=Buffer.from(await response.arrayBuffer());const ok=response.status===404;results.push({method,path:'/',status:response.status,bytes:bytes.length,pass:ok});if(!ok)errors.push(`${method} /`);}
const report={schemaVersion:'materials-preview-routes-audit/1',status:errors.length?'FAIL':'PASS',expectedHtmlSha256:h(expected),results,errors};
writeFileSync(join(base,'audit/preview-routes-003.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,probes:results.length,errors:errors.length}));if(errors.length)process.exitCode=1;
