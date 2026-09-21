// Gate 9 mutable-source audit. Expected values come from independently reviewed
// prespec predictions; SHA-256 below does not import the instrument canonicalizer.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {Gate9Engine} from '../../matched-observation/engine.mjs';
import {deriveWatch,deriveStatic} from '../../matched-observation/core.mjs';

const root=resolve(import.meta.dirname,'../..');
const fixture=JSON.parse(await readFile(`${root}/docs/gate-9/fixture.json`));
const predictions=JSON.parse(await readFile(`${root}/docs/gate-9/independent-predictions.json`));
const source=await readFile(`${root}/matched-observation/app.mjs`,'utf8');
const errors=[],results={};
const canonical=v=>Array.isArray(v)?`[${v.map(canonical).join(',')}]`:v&&typeof v==='object'?`{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`:JSON.stringify(v);
const hash=v=>createHash('sha256').update(canonical(v)).digest('hex');
const same=(label,a,b)=>{if(canonical(a)!==canonical(b))errors.push({label,actual:a,expected:b});};
const truth=(label,v)=>{if(!v)errors.push({label});};
const ids={runId:'G9-MATCHED-003',buildId:'mutable-prepackage-audit'};
const make=async()=>new Gate9Engine(fixture,ids).init();
const contextHash=hash(fixture.commonContext);
same('external context hash',contextHash,predictions.contextHash);
let allNinePassed=true;
for(const expected of predictions.allOrderedChoiceResults){
  const e=await make(),choices=expected.choiceQueryIds;
  await e.newChoice();
  for(const bad of [null,{},'off-menu']){
    const before=canonical(e.state),event=await e.choose(bad);
    if(event.result!=='rejected'||canonical(e.state)!==before||event.beforeFingerprint!==event.afterFingerprint)allNinePassed=false;
  }
  if((await e.selectCondition('watch')).result!=='rejected')allNinePassed=false;
  await e.choose(choices[0]);await e.choose(choices[1]);
  const trace=e.state.trace;
  if(hash(trace)!==expected.traceHash||canonical(trace.occurrences)!==canonical(expected.occurrences))allNinePassed=false;
  const env=e.selectedTrace.envelope,ownEventIds=new Set(e.events.map(x=>x.eventId));
  if(!env.acceptedChoiceEventIds.every(id=>ownEventIds.has(id)))allNinePassed=false;
  const second=e.events.findLast(x=>x.type==='choose-query'&&x.result==='accepted');
  const seal=e.events.findLast(x=>x.type==='trace-seal');
  if(second.afterFingerprint!==seal.beforeFingerprint)allNinePassed=false;
  const before=canonical(e.state),extra=await e.choose('yv90');
  if(extra.result!=='rejected'||canonical(e.state)!==before)allNinePassed=false;
  const choose=await e.exportRoute();
  const watchModel=await deriveWatch(trace),staticModel=await deriveStatic(trace);
  if(watchModel.parentTraceHash!==expected.traceHash||staticModel.parentTraceHash!==expected.traceHash||canonical(watchModel.occurrences)!==canonical(trace.occurrences)||canonical(staticModel.occurrences)!==canonical(trace.occurrences))allNinePassed=false;
  await e.selectCondition('watch');
  if(canonical(e.state.acquiredOccurrenceIndices)!=='[0]'||e.state.phase!=='ready')allNinePassed=false;
  await e.play();
  for(const jump of [4,6]){const pre=canonical(e.state),event=await e.localBoundary(jump);if(event.result!=='rejected'||canonical(e.state)!==pre)allNinePassed=false;}
  await e.localBoundary(2);await e.localBoundary(4);await e.localBoundary(6);
  const watch=await e.exportRoute();
  await e.selectCondition('static');await e.play();await e.localBoundary(6);
  const stat=await e.exportRoute();
  for(const route of [choose,watch,stat]){
    if(route.route.informationHash!==expected.informationHash||route.route.acquiredInformationHash!==expected.informationHash||route.route.parentTraceHash!==expected.traceHash||canonical(route.route.occurrences)!==canonical(trace.occurrences))allNinePassed=false;
  }
  if(canonical(watch.route.summary.compatibleWorldIds)!==canonical(expected.compatibleWorldIds))allNinePassed=false;
  const saved=canonical(e.registry[0]);await e.newChoice();
  if(canonical(e.registry[0])!==saved||(await e.selectCondition('watch')).result!=='rejected')allNinePassed=false;
}
results.nineTraceRoutes=allNinePassed?'PASS':'FAIL';
truth('nine trace routes',allNinePassed);

const replacement=await make();
await replacement.choose('xw90');
const newEvent=await replacement.newChoice();
const nextEvent=await replacement.choose('project');
results.newChoiceFingerprintChains=newEvent.afterFingerprint===nextEvent.beforeFingerprint?'PASS':'FAIL';
truth('new-choice afterFingerprint joins next beforeFingerprint',newEvent.afterFingerprint===nextEvent.beforeFingerprint);
const restore=await make();
const restoreEvent=await restore.restoreCheckpoint(2),playEvent=await restore.tourPlay();
results.checkpointFingerprintChains=restoreEvent.afterFingerprint===playEvent.beforeFingerprint?'PASS':'FAIL';
truth('checkpoint afterFingerprint joins tour-play beforeFingerprint',restoreEvent.afterFingerprint===playEvent.beforeFingerprint);
await restore.advanceTourBoundary(4);
const restoredEnvelope=restore.selectedTrace.envelope;
const restoredIds=new Set(restore.events.map(x=>x.eventId));
const restoredIdsJoin=restoredEnvelope.acceptedChoiceEventIds.every(id=>restoredIds.has(id));
const declaredReconstruction=!!restoredEnvelope.restoredFromEventId||!!restoredEnvelope.canonicalRunEventSource;
results.restoredChoiceReferenceProvenance={joinsCurrentSessionLog:restoredIdsJoin,declaresCanonicalOrReconstructionSource:declaredReconstruction};
truth('checkpoint-restored choice references join actual events or declare a canonical/reconstruction source',restoredIdsJoin||declaredReconstruction);
const reopenEvent=await restore.reopenSavedStart(),followingEvent=await restore.tourPlay();
results.reopenFingerprintChains=reopenEvent.afterFingerprint===followingEvent.beforeFingerprint?'PASS':'FAIL';
truth('reopen afterFingerprint joins next beforeFingerprint',reopenEvent.afterFingerprint===followingEvent.beforeFingerprint);

const misclassified=await make();
await misclassified.choose('xw90','user-control');await misclassified.choose('yv90','user-control');
results.userChoiceFromSavedStartProvenance={mode:misclassified.state.mode,envelope:misclassified.selectedTrace.envelope.provenance,origins:misclassified.selectedTrace.envelope.acceptedChoiceEvents.map(e=>e.origin)};
truth('user-control choices from saved start must not become scripted demonstration',misclassified.selectedTrace.envelope.provenance!=='scripted_demonstration');

const manual=await make();await manual.newChoice();await manual.choose('yv90');await manual.choose('xw90');await manual.selectCondition('watch');
for(let i=0;i<3;i++)await manual.step(1);
const manualWatch=manual.events.findLast(e=>e.type==='presentation-step');
await manual.selectCondition('static');await manual.finishSheet();
const manualSheet=manual.events.findLast(e=>e.type==='finish-sheet-review');
results.manualReview=manualWatch.intended.reason==='manual-review-complete'&&manualSheet.intended.reason==='manual-review-complete'&&manual.state.reviewStatus==='manual-review'?'PASS':'FAIL';
truth('manual completion reasons/status',results.manualReview==='PASS');

const interruptedTour=await make();await interruptedTour.tourPlay();
for(const t of [2,4,6])await interruptedTour.advanceTourBoundary(t);
await interruptedTour.pause();
results.tourPausedAfterManualPresentationPause=interruptedTour.state.tourPaused;
truth('manual presentation pause pauses the active saved tour',interruptedTour.state.tourPaused);

results.priorFullExportPersistsOnWatch=source.includes("$('export-output').textContent=lastExport")&&!source.includes("$('export-output').textContent=''");
truth('full prior export cleared on entry to unfinished watch',!results.priorFullExportPersistsOnWatch);
results.manualControlsCanOrphanRunningTour=source.includes("$('presentation-pause').addEventListener('click',()=>action(async()=>{stopAny();await engine.pause();}))")&&source.includes("$('presentation-restart').addEventListener('click',()=>action(async()=>{stopAny();await engine.restart();}))");
truth('manual presentation pause/restart must mark or pause an active tour',!results.manualControlsCanOrphanRunningTour);

const out={schema:'gate9-prepackage-audit-v1',status:errors.length?'BLOCKED':'PASS',candidate:'mutable source before G9-MATCHED-003 packaging',contextHash,results,errors};
await writeFile(`${root}/audit/gate-9/prepackage-audit.json`,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
