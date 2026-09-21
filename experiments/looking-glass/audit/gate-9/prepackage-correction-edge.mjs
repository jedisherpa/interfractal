// Targeted independent edge checks for the corrected mutable Gate 9 source.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Gate9Engine} from '../../matched-observation/engine.mjs';

const root=resolve(import.meta.dirname,'../..');
const fixture=JSON.parse(await readFile(`${root}/docs/gate-9/fixture.json`));
const ids={runId:'G9-MATCHED-003',buildId:'mutable-correction-audit'};
const make=async()=>new Gate9Engine(fixture,ids).init();
const problems=[],checks={};
const check=(name,condition,detail=null)=>{checks[name]={pass:!!condition,detail};if(!condition)problems.push(name);};
const snapshot=e=>JSON.stringify(e.state);

const rejected=await make();await rejected.newChoice();await rejected.choose('xw90');await rejected.choose('yv90');await rejected.selectCondition('watch');await rejected.play();
let localStops=0;rejected.stopClock=()=>{localStops++;};
const before=snapshot(rejected),bad=await rejected.selectCondition('invalid-condition');
check('rejected condition preserves semantic state',bad.result==='rejected'&&snapshot(rejected)===before&&bad.beforeFingerprint===bad.afterFingerprint);
check('rejected condition preserves running clock',localStops===0,{stopClockCalls:localStops});

const fromSaved=await make();let tourStops=0;fromSaved.stopTourClock=()=>{tourStops++;};await fromSaved.tourPlay();
await fromSaved.choose('xw90','user-control');await fromSaved.choose('yv90','user-control');
check('actual query cancels active tour and enters exploration',tourStops===1&&fromSaved.state.mode==='exploration'&&fromSaved.state.tourPaused&&fromSaved.selectedTrace.envelope.provenance==='local_control',{tourStops,mode:fromSaved.state.mode,provenance:fromSaved.selectedTrace.envelope.provenance});

const practiceTour=await make();let practiceTourStops=0;practiceTour.stopTourClock=()=>{practiceTourStops++;};await practiceTour.tourPlay();await practiceTour.practice(true);
check('opening practice pauses active global tour',practiceTourStops===1&&practiceTour.state.tourPaused&&practiceTour.state.practiceOpen,{practiceTourStops});

const practiceLocal=await make();await practiceLocal.newChoice();await practiceLocal.choose('xw90');await practiceLocal.choose('yv90');await practiceLocal.selectCondition('watch');await practiceLocal.play();let practiceLocalStops=0;practiceLocal.stopClock=()=>{practiceLocalStops++;};await practiceLocal.practice(true);
checks['opening practice during local playback']={pass:practiceLocalStops===1&&practiceLocal.state.presentationPaused&&practiceLocal.state.reviewStatus==='manual-review',detail:{localStopCalls:practiceLocalStops,presentationPaused:practiceLocal.state.presentationPaused,reviewStatus:practiceLocal.state.reviewStatus}};

const provenance=await make();await provenance.newChoice();await provenance.choose('xw90');await provenance.choose('yv90');const oldExport=await provenance.exportRoute();
const oldIdentity={condition:provenance.state.condition,phase:provenance.state.phase,traceHash:provenance.state.traceHash};
await provenance.restoreCheckpoint(4);
const newIdentity={condition:provenance.state.condition,phase:provenance.state.phase,traceHash:provenance.state.traceHash};
const oldClearPredicate=provenance.state.phase!=='complete'||provenance.state.condition!==oldIdentity.condition||provenance.state.traceHash!==oldIdentity.traceHash;
check('same-hash completed route export invalidates on provenance change',oldClearPredicate||oldExport.envelope.provenance===provenance.selectedTrace.envelope.provenance,{oldIdentity,newIdentity,oldProvenance:oldExport.envelope.provenance,newProvenance:provenance.selectedTrace.envelope.provenance,oldClearPredicate});

const canonical=await make();canonical.sessionId=`${ids.runId}-scripted-demonstration`;canonical.draftId='canonical-draft';for(const t of [2,4])await canonical.advanceTourBoundary(t);
const refs=provenance.selectedTrace.envelope.acceptedChoiceEvents,canonicalEvents=canonical.events.filter(e=>e.type==='choose-query');
check('restored references resolve to canonical choice events',refs.length===2&&refs.every((ref,i)=>ref.referenceOnly&&ref.canonicalRunEventSource.sequence===canonicalEvents[i].sequence&&ref.eventId===canonicalEvents[i].eventId&&ref.intended.queryId===canonicalEvents[i].intended.queryId&&ref.restoredFromEventId===provenance.events.at(-1).eventId));

const output={schema:'gate9-prepackage-correction-edge-v1',status:problems.length?'BLOCKED':'PASS',checks,problems};
await writeFile(`${root}/audit/gate-9/prepackage-correction-edge.json`,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
