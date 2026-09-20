import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname,resolve,join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {Gate9Engine} from './engine.mjs';
import {canonical,compatibility,deriveStatic,deriveTrace,deriveWatch,hash,informationHash,observe,semanticFingerprint,visibleIndices} from './core.mjs';

const dir=dirname(fileURLToPath(import.meta.url)),root=basename(dirname(dir))==='builds'?resolve(dir,'../../..'):resolve(dir,'..');
const fixture=JSON.parse(await readFile(join(root,'docs/gate-9/fixture.json')));
const predictions=JSON.parse(await readFile(join(root,'docs/gate-9/independent-predictions.json')));
const contextHash=await hash(fixture.commonContext);
assert.equal(contextHash,predictions.contextHash);
assert.equal(createHash('sha256').update(canonical(fixture.commonContext)).digest('hex'),contextHash);
const expectedRows=predictions.allOrderedChoiceResults;
let checked=0;
for(const expected of expectedRows){
  const choices=expected.choiceQueryIds,trace=deriveTrace(fixture,contextHash,choices);
  assert.deepEqual(trace.occurrences,expected.occurrences);
  assert.equal(await hash(trace),expected.traceHash);
  assert.equal(await informationHash(fixture,contextHash,trace.occurrences),expected.informationHash);
  assert.deepEqual(compatibility(fixture,trace.occurrences).compatibleWorldIds,expected.compatibleWorldIds);
  assert.deepEqual(deriveWatch(trace).occurrences,trace.occurrences);
  assert.deepEqual(deriveStatic(trace).occurrences,trace.occurrences);
  assert.equal(trace.occurrences.length,3);
  const e=await new Gate9Engine(fixture,{runId:'G9-MATCHED-001',buildId:'test'}).init();
  await e.newChoice();
  const rejectMalformed=await e.choose({queryId:'xw90'});assert.equal(rejectMalformed.result,'rejected');assert.equal(rejectMalformed.beforeFingerprint,rejectMalformed.afterFingerprint);
  const rejectOffMenu=await e.choose('rotate-all');assert.equal(rejectOffMenu.result,'rejected');assert.equal(rejectOffMenu.beforeFingerprint,rejectOffMenu.afterFingerprint);
  assert.equal((await e.selectCondition('watch')).result,'rejected');
  await e.choose(choices[0]);await e.choose(choices[1]);
  assert.equal(e.state.traceHash,expected.traceHash);
  const second=e.events.filter(x=>x.type==='choose-query'&&x.result==='accepted').at(-1),seal=e.events.at(-1);
  assert.equal(seal.type,'trace-seal');assert.equal(seal.intended.reason,'choice-budget-complete');assert.equal(second.afterFingerprint,seal.beforeFingerprint);
  const before=await semanticFingerprint(e.state),over=await e.choose('xw90');assert.equal(over.result,'rejected');assert.equal(over.beforeFingerprint,before);assert.equal(over.afterFingerprint,before);
  const chooseExport=await e.exportRoute();assert.equal(chooseExport.route.acquiredInformationHash,expected.informationHash);
  await e.selectCondition('watch');
  assert.deepEqual(e.state.acquiredOccurrenceIndices,[0]);assert.equal(e.state.phase,'ready');assert.deepEqual(visibleIndices(e.state),[0]);
  await e.play();await e.localBoundary(2);await e.localBoundary(4);await e.localBoundary(6);
  assert.equal(e.state.phase,'complete');assert.deepEqual(e.state.acquiredOccurrenceIndices,[0,1,2]);
  const watchExport=await e.exportRoute();assert.equal(watchExport.route.informationHash,expected.informationHash);assert.equal(watchExport.route.acquiredInformationHash,expected.informationHash);
  assert.deepEqual(watchExport.route.occurrences,chooseExport.route.occurrences);
  await e.selectCondition('static');assert.deepEqual(e.state.acquiredOccurrenceIndices,[0,1,2]);assert.equal(e.state.phase,'ready');
  await e.play();await e.localBoundary(6);
  const staticExport=await e.exportRoute();assert.equal(staticExport.route.informationHash,expected.informationHash);assert.deepEqual(staticExport.route.occurrences,chooseExport.route.occurrences);
  assert.equal(staticExport.route.parentTraceHash,expected.traceHash);
  const saved=JSON.stringify(e.registry[0]);await e.newChoice();assert.equal(JSON.stringify(e.registry[0]),saved);assert.equal(e.selectedTrace,null);
  assert.equal((await e.selectCondition('static')).result,'rejected');
  for(const w of fixture.commonContext.worlds)for(const q of fixture.commonContext.queries)assert.deepEqual(observe(w.source,q.id),predictions.exactObservations[w.id][q.id]);
  checked++;
}
assert.equal(checked,9);
const tour=await new Gate9Engine(fixture,{runId:'G9-MATCHED-001',buildId:'test'}).init();
const observed=[];
for(const t of fixture.savedTour.checkpointsSeconds){
  if(t)await tour.advanceTourBoundary(t);
  const s=tour.state,expected=predictions.savedCheckpoints.find(x=>x.seconds===t);
  observed.push({seconds:t,condition:s.condition,phase:s.phase,traceHash:s.traceHash,acquiredOccurrenceIndices:[...s.acquiredOccurrenceIndices],visibleOccurrenceIndices:visibleIndices(s)});
  assert.equal(s.condition,expected.condition);assert.equal(s.phase,expected.phase);assert.equal(s.traceHash,expected.traceHash);
  assert.deepEqual(s.acquiredOccurrenceIndices,expected.acquiredOccurrenceIndices);assert.deepEqual(visibleIndices(s),expected.visibleOccurrenceIndices);
}
assert.equal(tour.events.filter(x=>['choose-query','trace-seal','condition-select','presentation-play','observation-presented','presentation-stop','tour-stop'].includes(x.type)).length,12);
for(let i=1;i<tour.events.length;i++)if(tour.events[i].tourSeconds===tour.events[i-1].tourSeconds)assert.equal(tour.events[i-1].afterFingerprint,tour.events[i].beforeFingerprint);
const checkpoint=await new Gate9Engine(fixture,{runId:'G9-MATCHED-001',buildId:'test'}).init();
for(const t of fixture.savedTour.checkpointsSeconds){await checkpoint.restoreCheckpoint(t);assert.equal(checkpoint.state.tourSeconds,t);assert.equal(checkpoint.state.tourPaused,true);assert.equal(checkpoint.state.presentationPaused,true);}
const manual=await new Gate9Engine(fixture,{runId:'G9-MATCHED-001',buildId:'test'}).init();await manual.newChoice();await manual.choose('yv90');await manual.choose('xw90');await manual.selectCondition('watch');await manual.step(1);await manual.step(1);await manual.step(1);assert.equal(manual.state.phase,'complete');assert.equal(manual.state.reviewStatus,'manual-review');await manual.selectCondition('static');await manual.finishSheet();assert.equal(manual.state.phase,'complete');assert.equal(manual.state.reviewStatus,'manual-review');
console.log(JSON.stringify({status:'passed',allOrderedChoiceCount:checked,canonicalScheduledEventCount:12,savedCheckpointCount:10,contextHash,checks:['exact records','independent prediction hashes','nine choice routes','repeat retention','state-preserving invalid choices','trace registry','manual review','canonical event chain','checkpoint restore']},null,2));
