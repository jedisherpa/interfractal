// Audit saved semantic events, actual task actions, isolation and restoration.
// Pass live activity path only for preliminary checks; final default is the closed evidence snapshot.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const activityPath=resolve(root,process.argv[2]||'evidence/gate-5/observed-activity.jsonl');
const events=(await readFile(activityPath,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
const observations=JSON.parse(await readFile(resolve(root,'evidence/gate-5/browser-observations.json')));
const actionTrace=JSON.parse(await readFile(resolve(root,'evidence/gate-5/action-trace.json')));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<=1e-10,`${label}: ${a} != ${b}`);
const sessions=new Map();
for(const event of events){
  assert.equal(event.kind,'observed-ui');assert.equal(event.actor,'unspecified-ui');
  assert.equal(event.runId,'G5-PENTERACT-001');assert.equal(event.buildId,'g5-0bdee39bcd7dd541');
  assert.ok(['manual-control','automatic-playback','programmatic-restore'].includes(event.origin));
  assert.ok(Number.isFinite(Date.parse(event.wallTimeUtc)));
  assert.ok(event.before?.checkpointSha256&&event.observed?.checkpointSha256);
  assert.equal(event.simTimeBeforeMs,event.before.simulationTimeMs);
  assert.equal(event.simTimeAfterMs,event.observed.simulationTimeMs);
  assert.equal(event.mode,event.observed.mode);
  if(!sessions.has(event.sessionId))sessions.set(event.sessionId,[]);
  sessions.get(event.sessionId).push(event);
}
for(const list of sessions.values()){
  assert.equal(list[0].type,'replay.open');assert.equal(list[0].origin,'programmatic-restore');
  assert.equal(list[0].simTimeAfterMs,0);assert.equal(list[0].observed.playing,false);
  for(let i=0;i<list.length;i++)assert.equal(list[i].seq,i+1,'monotonic session sequence');
}
const type=t=>events.filter(e=>e.type===t);
const t1=type('task.inspect').filter(e=>e.payload.taskId==='T1');
const t2=type('task.inspect').filter(e=>e.payload.taskId==='T2');
const turns=type('comparison.source-turn').filter(e=>e.payload.taskId==='T2');
const routeTurns=turns.slice(0,2);
assert.equal(t1.length,2);assert.deepEqual(t1.map(e=>e.payload.targetDimension),[4,5]);
assert.deepEqual(t1[0].payload.site.sourceIds,['v0000','v0001']);
assert.deepEqual(t1[1].payload.site.sourceIds,['v00000','v00001','v00010','v00011']);
assert.ok(turns.length>=2);assert.deepEqual(routeTurns.map(e=>e.payload.changedPlane),['x–w','y–v']);
assert.deepEqual(routeTurns.map(e=>e.payload.sourceActions),[1,2]);
near(routeTurns[0].payload.actualAlpha,Math.PI/4,'T2 alpha');near(routeTurns[0].payload.actualBeta,0,'T2 beta held');
near(routeTurns[1].payload.actualAlpha,Math.PI/4,'T2 alpha held');near(routeTurns[1].payload.actualBeta,Math.PI/4,'T2 beta');
assert.equal(routeTurns[1].before.comparatorSha256,routeTurns[1].observed.comparatorSha256,'beta leaves computed 4D');
assert.deepEqual(t2.map(e=>e.payload.targetDimension),[4,5,4,5]);
assert.deepEqual(t2.map(e=>e.payload.sourceActions),[1,1,2,2]);
assert.deepEqual(t2[0].payload.site.sourceIds,['v0000','v1001']);
assert.deepEqual(t2[1].payload.site.sourceIds,['v00000','v00001','v10010','v10011']);
assert.deepEqual(t2[2].payload.site.sourceIds,['v0000','v1001']);
assert.deepEqual(t2[3].payload.site.sourceIds,['v00000','v01001','v10010','v11011']);
for(const e of [...t1,...t2]){
  assert.equal(e.origin,'manual-control');
  assert.equal(e.before.checkpointSha256,e.observed.checkpointSha256,'inspection count excluded from checkpoint hash');
}
for(const e of type('camera.set')){
  assert.equal(e.before.sourceSha256,e.observed.sourceSha256);
  assert.equal(e.before.rotationSha256,e.observed.rotationSha256);
  assert.equal(e.before.projectionSha256,e.observed.projectionSha256);
  assert.equal(e.before.comparatorSha256,e.observed.comparatorSha256);
  assert.equal(e.before.sliceSha256,e.observed.sliceSha256);
}
for(const e of [...type('slice.set'),...type('slice.preset')]){
  assert.equal(e.before.rotationSha256,e.observed.rotationSha256);
  assert.equal(e.before.projectionSha256,e.observed.projectionSha256);
  assert.equal(e.before.comparatorSha256,e.observed.comparatorSha256);
}
const automatic=type('playback.pause').filter(e=>e.origin==='automatic-playback');
assert.ok(automatic.length>=1);for(const e of automatic){
  assert.equal(e.payload.reason,'end-of-sequence');assert.equal(e.simTimeAfterMs,40000);
  assert.equal(e.observed.playing,false);
}
const manual=type('playback.pause').filter(e=>e.origin==='manual-control');
assert.ok(manual.length>=1);
const steps=type('playback.step');assert.ok(steps.length>=2);
for(const e of steps){assert.equal(e.payload.requestedDeltaMs,1000);assert.equal(e.observed.playing,false);}
const seeks=type('playback.seek');assert.ok(seeks.length>=3);
for(const e of seeks){
  assert.ok(Number.isFinite(e.payload.requestedSimulationTimeMs));
  assert.equal(e.payload.clampedBeforeRoundingMs,Math.max(0,Math.min(40000,e.payload.requestedSimulationTimeMs)));
  assert.equal(e.simTimeAfterMs,100*Math.round(e.payload.clampedBeforeRoundingMs/100));
}
assert.ok(seeks.some(e=>Math.abs(e.payload.requestedSimulationTimeMs-8050)<=1e-10&&e.simTimeAfterMs===8100));
assert.ok(seeks.some(e=>e.payload.requestedSimulationTimeMs<0&&e.simTimeAfterMs===0));
assert.ok(seeks.some(e=>e.payload.requestedSimulationTimeMs>40000&&e.simTimeAfterMs===40000));
const base=observations.filter(o=>o.label.startsWith('baseline-checkpoint-'));
const repeat=observations.filter(o=>o.label.startsWith('repeat-checkpoint-'));
const reopened=observations.filter(o=>o.label.startsWith('reopen-checkpoint-'));
const reloaded=observations.filter(o=>o.label.startsWith('reload-checkpoint-'));
assert.equal(base.length,9);assert.equal(repeat.length,9);
assert.equal(reopened.length,9);assert.equal(reloaded.length,9);
for(let i=0;i<9;i++){
  assert.equal(base[i].state.simulationTimeMs,5000*i);
  assert.equal(repeat[i].state.simulationTimeMs,5000*i);
  for(const group of [repeat,reopened,reloaded]){
    assert.equal(group[i].state.simulationTimeMs,5000*i);
    assert.equal(base[i].state.checkpointSha256,group[i].state.checkpointSha256);
  }
}
const reloadStart=observations.find(o=>o.label==='reload-saved-run');
assert.ok(reloadStart);assert.equal(reloadStart.state.simulationTimeMs,0);
assert.equal(reloadStart.state.playing,false);assert.equal(reloadStart.state.checkpointSha256,base[0].state.checkpointSha256);
const naturalEnd=observations.find(o=>o.label==='natural-auto-end');
assert.ok(naturalEnd);assert.equal(naturalEnd.state.simulationTimeMs,40000);assert.equal(naturalEnd.state.playing,false);
for(const [leg,low,high] of [['first',0,10000],['second',10000,20000],['return',20000,40000]]){
  const pair=observations.filter(o=>o.label.startsWith(`active-${leg}-leg-capture-`));
  assert.equal(pair.length,2);assert.ok(pair.every(o=>o.state.playing&&o.state.simulationTimeMs>low&&o.state.simulationTimeMs<high));
}
const held=observations.find(o=>o.label==='manual-pause-held');
const paused=observations.find(o=>o.label==='manual-pause');
assert.ok(held&&paused);assert.equal(held.state.simulationTimeMs,paused.state.simulationTimeMs);
assert.equal(held.state.checkpointSha256,paused.state.checkpointSha256);
assert.ok(Date.parse(held.observedAtUtc)-Date.parse(paused.observedAtUtc)>=1000);
const byIndex=new Map(observations.map(o=>[o.index,o]));
for(const action of actionTrace){
  assert.ok(action.index>=1);assert.ok(typeof action.label==='string');
  if(action.success){assert.ok(byIndex.has(action.beforeObservation)&&byIndex.has(action.afterObservation));
    assert.ok(action.beforeObservation<action.afterObservation);}
}
const result={kind:'saved-actual-event-and-restoration-audit',activityPath,runId:'G5-PENTERACT-001',
  sessions:sessions.size,events:events.length,actionTraceEntries:actionTrace.length,
  t1Inspects:t1.length,t2RouteSourceTurns:routeTurns.length,otherT2SourceTurns:turns.length-routeTurns.length,t2Inspects:t2.length,
  automaticStops:automatic.length,manualPauses:manual.length,steps:steps.length,seeks:seeks.length,
  checkpointGroups:4,checkpointTimesPerGroup:9,activeLegs:3,allChecksPassed:true,
  scope:'Saved observed UI events and root computer-use trace; no generated fixture events counted as actions.'};
await writeFile(resolve(root,'audit/gate-5/G5-PENTERACT-001-activity-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
