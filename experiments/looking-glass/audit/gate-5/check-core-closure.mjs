import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=async p=>JSON.parse(await readFile(resolve(root,p)));
const closure=await read('evidence/gate-5/CORE_EVIDENCE_CLOSED.json');
assert.equal(closure.runId,'G5-PENTERACT-001');assert.equal(closure.buildId,'g5-0bdee39bcd7dd541');
assert.equal(closure.files.length,23);
const sha=x=>createHash('sha256').update(x).digest('hex');
for(const file of closure.files){const bytes=await readFile(resolve(root,file.path));
  assert.equal(bytes.length,file.bytes,`${file.path} bytes`);assert.equal(sha(bytes),file.sha256,`${file.path} SHA-256`);}
const observations=await read('evidence/gate-5/browser-observations.json');
const actions=await read('evidence/gate-5/action-trace.json');
const captures=await read('evidence/gate-5/capture-index.json');
const activity=(await readFile(resolve(root,'evidence/gate-5/observed-activity.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
const consoleReview=await read('evidence/gate-5/console-review.json');
const history=await read('evidence/gate-5/historical-ui-review.json');
assert.equal(closure.observations,observations.length);assert.equal(closure.rootActions,actions.length);
assert.equal(closure.successfulRootActions,actions.filter(a=>a.success).length);
assert.equal(closure.originalCaptures,captures.length);assert.equal(closure.observedEvents,activity.length);
assert.deepEqual(Object.fromEntries(Object.entries(closure.sessions).sort()),
  Object.fromEntries([...new Set(activity.map(e=>e.sessionId))].sort().map(id=>[id,activity.filter(e=>e.sessionId===id).length])));
assert.equal(consoleReview.entries.length,0);
assert.equal(closure.finalSimulationTimeMs,observations.at(-1).state.simulationTimeMs);
assert.equal(closure.finalPlaying,observations.at(-1).state.playing);
assert.equal(observations.at(-1).state.mode,'saved-run');
assert.equal(history.length,2);assert.equal(history.filter(x=>x.screenshotError).length,2);
assert.equal(closure.historyScreenshotToolFailures,2);
const result={kind:'closed-core-byte-integrity',runId:closure.runId,buildId:closure.buildId,
  filesVerified:closure.files.length,observations:observations.length,rootActions:actions.length,
  originals:captures.length,observedEvents:activity.length,sessions:Object.keys(closure.sessions).length,
  consoleEntries:0,documentedHistoricalScreenshotFailures:2,allChecksPassed:true};
await writeFile(resolve(root,'audit/gate-5/core-closure-integrity.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
