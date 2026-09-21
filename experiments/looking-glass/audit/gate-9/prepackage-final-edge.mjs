// Third prepackage review: read the actual app predicates and exercise model edges.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Gate9Engine} from '../../matched-observation/engine.mjs';

const root=resolve(import.meta.dirname,'../..');
const fixture=JSON.parse(await readFile(`${root}/docs/gate-9/fixture.json`));
const app=await readFile(`${root}/matched-observation/app.mjs`,'utf8');
const ids={runId:'G9-MATCHED-003',buildId:'mutable-final-audit'};
const make=async()=>new Gate9Engine(fixture,ids).init();
const checks={},failures=[];
const check=(name,pass,details)=>{checks[name]={pass:!!pass,details};if(!pass)failures.push(name);};

const e=await make();await e.newChoice();await e.choose('xw90');await e.choose('yv90');
const oldExport=await e.exportRoute();
const prior={condition:e.state.condition,hash:e.state.traceHash,mode:e.state.mode,entry:e.selectedTrace,provenance:e.selectedTrace.envelope.provenance,sessionId:e.sessionId};
await e.restoreCheckpoint(4);
const actualNewExport=await e.exportRoute();
const extract=name=>{
  const line=app.split('\n').find(x=>x.trim().startsWith(`const ${name}=`));
  if(!line)throw Error(`Missing ${name} predicate`);
  return line.trim().slice(`const ${name}=`.length,-1);
};
const predicate=extract('changedExportIdentity');
const stalePredicate=extract('staleRoute');
const evaluate=expression=>Function('s','engine','lastExportKind','lastExportMode','lastExportTraceEntry','lastExportSessionId','lastExportCondition','lastExportTraceHash','lastExportProvenance',`return (${expression});`)(e.state,e,'route',prior.mode,prior.entry,prior.sessionId,prior.condition,prior.hash,prior.provenance);
const changed=evaluate(predicate),stale=evaluate(stalePredicate);
check('actual app invalidates same-hash completed export after provenance switch',changed&&stale&&oldExport.envelope.provenance==='local_control'&&actualNewExport.envelope.provenance==='scripted_demonstration',{changedExportIdentity:changed,staleRoute:stale,oldHash:prior.hash,newHash:e.state.traceHash,oldProvenance:oldExport.envelope.provenance,newProvenance:actualNewExport.envelope.provenance});

const refs=e.selectedTrace.envelope.acceptedChoiceEvents;
const canonical=await make();canonical.sessionId=`${ids.runId}-scripted-demonstration`;canonical.draftId='canonical-draft';await canonical.advanceTourBoundary(2);await canonical.advanceTourBoundary(4);
const canonicalChoices=canonical.events.filter(x=>x.type==='choose-query');
check('restored references resolve to canonical run choices',refs.length===2&&refs.every((r,i)=>r.referenceOnly&&r.eventId===canonicalChoices[i].eventId&&r.intended.queryId===canonicalChoices[i].intended.queryId&&r.canonicalRunEventSource.sequence===canonicalChoices[i].sequence),{referenceCount:refs.length});

await e.selectCondition('watch');
check('actual app hides unfinished-watch old export and event export',app.includes("if(unfinishedWatch||changedExportIdentity||staleRoute)")&&app.includes("$('export-events').disabled=unfinishedWatch")&&app.includes("choices:unfinishedWatch?s.choices.slice(0,Math.max(0,s.acquiredOccurrenceIndices.length-1)):s.choices"),{phase:e.state.phase,condition:e.state.condition});
check('actual app masks unacquired registry query labels',app.includes("unfinishedWatch?`${i+1}. sealed trace · ${entry.traceHash.slice(0,12)}`"),null);

const running=await make();await running.newChoice();await running.choose('xw90');await running.choose('yv90');await running.selectCondition('watch');await running.play();
let stops=0;running.stopClock=()=>{stops++;};
const before=JSON.stringify(running.state),invalid=await running.selectCondition('invalid');
check('invalid condition does not stop local clock',invalid.result==='rejected'&&stops===0&&JSON.stringify(running.state)===before,{stopCalls:stops});
await running.practice(true);
check('local practice pauses and labels manual review',stops===1&&running.state.presentationPaused&&running.state.reviewStatus==='manual-review'&&running.events.slice(-2).map(x=>x.type).join(',')==='presentation-pause,practice-open',{stopCalls:stops,reviewStatus:running.state.reviewStatus});

const out={schema:'gate9-prepackage-final-edge-v1',status:failures.length?'BLOCKED':'PASS',checks,failures};
await writeFile(`${root}/audit/gate-9/prepackage-final-edge.json`,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
