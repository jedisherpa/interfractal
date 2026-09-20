import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const dir=join(root,'evidence/gate-8');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async path=>JSON.parse(await readFile(path));
const closedBytes=await readFile(join(dir,'CORE_TRIAL_CLOSED.json'));
assert.equal(sha(closedBytes),'2ec12a77e41c2d3ce05ca77e79c1f37aac2e89a105e2060e1012ddaf447adcbf');
const closed=JSON.parse(closedBytes);
assert.equal(closed.runId,'G8-AMBIGUITY-001');
assert.equal(closed.buildId,'g8-f5c5ee62889da529');
assert.equal(closed.files.length,25);
for(const entry of closed.files){
  const bytes=await readFile(join(root,entry.path));
  assert.equal(bytes.length,entry.bytes,entry.path);
  assert.equal(sha(bytes),entry.sha256,entry.path);
}
const observations=await json(join(dir,'browser-observations.json'));
const actions=await json(join(dir,'action-trace.json'));
const captures=await json(join(dir,'capture-index.json'));
const dimensions=await json(join(dir,'capture-dimensions.json'));
const checkpoints=await json(join(dir,'checkpoint-review.json'));
const historical=await json(join(dir,'historical-browser-review.json'));
const consoleReview=await json(join(dir,'console-review.json'));
const notes=await json(join(dir,'COLLECTION_NOTES.json'));
const observedActivity=(await readFile(join(dir,'observed-activity.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
const allActivity=(await readFile(join(dir,'all-activity-through-core.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
assert.deepEqual(observedActivity,allActivity);
assert.equal(observations.length,197);
assert.equal(actions.length,83);
assert.ok(actions.every(a=>a.success===true));
assert.equal(captures.length,14);
assert.equal(dimensions.length,14);
assert.equal(checkpoints.length,36);
assert.equal(observedActivity.length,79);
assert.deepEqual([...new Set(observations.map(o=>o.state.sessionId))].sort(),closed.acceptedBrowserSessionIds.slice().sort());
assert.deepEqual([...new Set(observedActivity.map(e=>e.sessionId))].sort(),closed.acceptedBrowserSessionIds.slice().sort());
assert.ok(observations.every(o=>o.state.scene.scrollWidth<=o.state.scene.clientWidth));
assert.equal(historical.url,'http://127.0.0.1:44000/');
assert.match(historical.domSnapshot,/G7-INTERPRET-002 · g7-90e64952eb028069/);
assert.match(historical.domSnapshot,/PAUSED · SAVED TOUR/);
assert.equal(consoleReview.entries.length,0);
assert.equal(notes.humanParticipants,0);
assert.equal(observations[0].state.cursorSeconds,0);
assert.equal(observations[0].state.paused,true);
const dimensionMap=new Map(dimensions.map(d=>[d.path,d]));
for(const [i,capture] of captures.entries()){
  assert.equal(capture.index,i);
  assert.equal(capture.original,true);
  assert.ok(capture.beforeObservation>=0&&capture.beforeObservation<observations.length);
  assert.ok(capture.afterObservation>=capture.beforeObservation&&capture.afterObservation<observations.length);
  const dim=dimensionMap.get(capture.path);assert.ok(dim,capture.path);
  const output=execFileSync('sips',['-g','pixelWidth','-g','pixelHeight',join(root,capture.path)],{encoding:'utf8'});
  const width=Number(output.match(/pixelWidth: (\d+)/)?.[1]);
  const height=Number(output.match(/pixelHeight: (\d+)/)?.[1]);
  assert.equal(width,dim.width,capture.path);
  assert.equal(height,dim.height,capture.path);
  const bytes=await readFile(join(root,capture.path));
  assert.equal(sha(bytes),capture.sha256,capture.path);
  assert.equal(bytes.length,capture.bytes,capture.path);
}
const first960=dimensionMap.get('evidence/gate-8/screenshots/001-resumed-layout-960.jpg');
const settled960=dimensionMap.get('evidence/gate-8/screenshots/001-resumed-settled-layout-960.jpg');
assert.deepEqual([first960.width,first960.height],[960,540]);
assert.deepEqual([settled960.width,settled960.height],[960,720]);
const active=captures.find(c=>c.path.endsWith('tour-active.jpg'));
const natural=captures.find(c=>c.path.endsWith('tour-natural-end.jpg'));
assert.ok(active&&natural);
assert.equal(observations[active.beforeObservation].state.paused,false);
assert.equal(observations[active.afterObservation].state.paused,false);
assert.equal(observations[natural.beforeObservation].state.cursorSeconds,32);
assert.equal(observations[natural.beforeObservation].state.paused,true);
assert.equal(observations[natural.afterObservation].state.cursorSeconds,32);
assert.equal(observations[natural.afterObservation].state.paused,true);
const fullReplay=observedActivity.find(e=>e.type==='tour-replay-from-start'&&e.sessionId===naturalSession());
const stop=observedActivity.find(e=>e.type==='tour-stop'&&e.sessionId===naturalSession());
assert.ok(fullReplay&&stop);
const elapsedMs=Date.parse(stop.timeUtc)-Date.parse(fullReplay.timeUtc);
assert.ok(elapsedMs>=32000&&elapsedMs<33000,`continuous tour elapsed ${elapsedMs}ms`);
function naturalSession(){return observations[natural.beforeObservation].state.sessionId;}
const failed=await json(join(dir,'failed-acquisitions/G8-AMBIGUITY-001-server-stop/INCOMPLETE_ACQUISITION.json'));
assert.equal(failed.status,'incomplete acquisition preserved, not accepted core');
assert.deepEqual(failed.counts,{observations:43,actions:17,originalCaptures:4});
const report={kind:'gate8-independent-closed-core-audit',status:'PASS',
  coreSha256:sha(closedBytes),pinnedFiles:closed.files.length,
  observations:observations.length,successfulActions:actions.length,
  originalCaptures:captures.length,checkpoints:checkpoints.length,
  activityRows:observedActivity.length,continuousReplayElapsedMs:elapsedMs,
  historicalGate7Link:'opened paused correct run/build',consoleEntries:0,
  first960Capture:[first960.width,first960.height],settled960Capture:[settled960.width,settled960.height],
  failedAcquisitionPreserved:true};
await writeFile(join(root,'audit/gate-8/core-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
