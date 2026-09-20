import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as model from '../../ambiguity/builds/g8-f5c5ee62889da529/model.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const evidenceDir=join(root,'evidence/gate-8');
const runDir=join(root,'ambiguity/runs/G8-AMBIGUITY-001');
const fixture=JSON.parse(await readFile(join(root,'docs/gate-8/fixture.json')));
const observations=JSON.parse(await readFile(join(evidenceDir,'browser-observations.json')));
const acceptedSessions=new Set(observations.map(o=>o.state?.sessionId).filter(Boolean));
const raw=(await readFile(join(evidenceDir,'all-activity-through-core.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
const events=raw.filter(e=>acceptedSessions.has(e.sessionId));
const preservedAccepted=(await readFile(join(evidenceDir,'observed-activity.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
assert.deepEqual(events,preservedAccepted);
const bySession=new Map();
for(const e of events){
  assert.equal(e.schema,'gate8-ui-event-v1');
  assert.equal(e.runId,'G8-AMBIGUITY-001');
  assert.equal(e.buildId,'g8-f5c5ee62889da529');
  assert.equal(e.actor,'unattributed_local');
  assert.ok(['user-control','replay','automatic'].includes(e.origin));
  assert.ok(Number.isFinite(Date.parse(e.timeUtc)));
  assert.ok(Number.isFinite(e.simulationCursorSeconds));
  assert.ok(e.simulationCursorSeconds>=0&&e.simulationCursorSeconds<=32);
  for(const key of ['beforeSemanticFingerprint','afterSemanticFingerprint']) assert.match(e[key],/^[0-9a-f]{64}$/);
  assert.ok(!/approval|participant-answer|score/.test(e.type));
  if(e.type==='tour-stop'){
    assert.equal(e.origin,'automatic');
    assert.equal(e.reason,'end-of-sequence');
    assert.equal(e.simulationCursorSeconds,32);
    assert.equal(e.afterSemanticFingerprint,model.semanticFingerprint(model.stateAt(32,fixture),fixture));
  }
  if(e.origin==='replay') assert.ok(['case-select','add-query'].includes(e.type));
  if(e.type==='add-query'&&e.result==='already-selected')
    assert.equal(e.beforeSemanticFingerprint,e.afterSemanticFingerprint);
  if(e.type==='add-query'&&e.result==='off-menu')
    assert.equal(e.beforeSemanticFingerprint,e.afterSemanticFingerprint);
  if(!bySession.has(e.sessionId)) bySession.set(e.sessionId,[]);
  bySession.get(e.sessionId).push(e);
}
for(const [session,rows] of bySession){
  rows.forEach((e,i)=>assert.equal(e.seq,i+1,`${session} sequence`));
  for(let i=1;i<rows.length;i++){
    assert.ok(Date.parse(rows[i].timeUtc)>=Date.parse(rows[i-1].timeUtc),`${session} timestamp order`);
    if(rows[i].simulationCursorSeconds===24&&rows[i-1].simulationCursorSeconds===24&&rows[i].origin==='replay')
      assert.equal(rows[i].beforeSemanticFingerprint,rows[i-1].afterSemanticFingerprint);
    if(rows[i].type==='tour-stop'&&rows[i-1].type==='add-query')
      assert.equal(rows[i].beforeSemanticFingerprint,rows[i-1].afterSemanticFingerprint);
  }
}
const planned=(await readFile(join(runDir,'events.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
const replays=[];
for(const [session,rows] of bySession){
  for(let i=0;i<rows.length;i++) if(rows[i].type==='tour-replay-from-start'){
    const following=rows.slice(i+1);
    const replayEvents=following.filter(e=>e.origin==='replay'||e.type==='tour-stop');
    if(replayEvents.some(e=>e.type==='tour-stop')){
      assert.equal(replayEvents.length,planned.length);
      for(let j=0;j<planned.length;j++){
        const actual=replayEvents[j],expected=planned[j];
        // Actual playback advances a fractional cursor between discrete events. Its
        // before hash records that truthful current state; the planned fixture uses
        // the exact boundary cursor for the same before state. After hashes agree.
        for(const key of ['origin','type','simulationCursorSeconds','afterSemanticFingerprint'])
          assert.equal(actual[key],expected[key],`replay ${session} ${j} ${key}`);
        assert.deepEqual(actual.intended,expected.intended);
        assert.equal(actual.reason,expected.reason);
      }
      replays.push({sessionId:session,startSeq:rows[i].seq,eventsMatched:replayEvents.length,
        stopSeq:replayEvents.at(-1).seq});
    }
  }
}
const report={kind:'gate8-independent-observed-event-audit',status:replays.length?'PASS':'PENDING',
  totalActivityRows:raw.length,acceptedEventRows:events.length,
  acceptedSessions:[...acceptedSessions],sessionEventCounts:Object.fromEntries([...bySession].map(([s,rows])=>[s,rows.length])),
  completeNaturalReplays:replays,excludedRows:raw.length-events.length,
  note:'Excluded activity rows remain preserved. Across boundaries, actual before hashes include fractional elapsed cursor; planned before hashes use the boundary cursor. Same-boundary chains and all after hashes are checked.'};
await writeFile(join(root,'audit/gate-8/event-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
