import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const paths=['independent-results.json','history-integrity.json','build-audit.json',
  'route-audit.json','browser-audit.json','event-audit.json','core-audit.json'];
const checks=[];
for(const name of paths){
  const path=`audit/gate-8/${name}`;
  const bytes=await readFile(join(root,path));
  const record=JSON.parse(bytes);
  if(name==='independent-results.json') assert.equal(record.predictionComparison,'all checked fields agree');
  else if(name==='history-integrity.json') assert.equal(record.allUnchanged,true);
  else assert.equal(record.status,'PASS',name);
  checks.push({path,sha256:sha(bytes),bytes:bytes.length,status:'PASS'});
}
const auditBytes=await readFile(join(root,'audit/gate-8/AUDIT.md'));
const clarificationBytes=await readFile(join(root,'audit/gate-8/prespec-clarification-addendum.md'));
const coreBytes=await readFile(join(root,'evidence/gate-8/CORE_TRIAL_CLOSED.json'));
const result={kind:'gate8-independent-final-checks',gate:8,runId:'G8-AMBIGUITY-001',
  buildId:'g8-f5c5ee62889da529',status:'PASS_WITH_RECORDED_QUALIFICATIONS',
  prespecFreezeSha256:'38f1cbae00339eb9d4d1f1ee097fdb124b120c598ecea4c69c3ee7af8c19e7b8',
  coreClosureSha256:sha(coreBytes),auditSha256:sha(auditBytes),
  clarificationAddendumSha256:sha(clarificationBytes),checks,
  qualifications:['Initial server-stop acquisition preserved separately; accepted core recollected with exact same immutable build.',
    'First resumed 960 px original is 960x540 despite CSS viewport 960x720; later settled original is 960x720.',
    'Three handoff review routes had not yet been written when read-only route audit ran.',
    'No human result or OS reduced-motion preference claim.'],
  participantCount:0,nextGateApproved:false};
assert.equal(result.coreClosureSha256,'2ec12a77e41c2d3ce05ca77e79c1f37aac2e89a105e2060e1012ddaf447adcbf');
await writeFile(join(root,'audit/gate-8/final-checks.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checks:checks.length,auditSha256:result.auditSha256,
  coreClosureSha256:result.coreClosureSha256},null,2));
