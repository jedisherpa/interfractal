// Bounded route lifecycle matrix for corrected mutable Gate 9 source.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {Gate9Engine} from '../../matched-observation/engine.mjs';

const root=resolve(import.meta.dirname,'../..');
const fixture=JSON.parse(await readFile(`${root}/docs/gate-9/fixture.json`));
const ids={runId:'G9-MATCHED-003',buildId:'lifecycle-matrix'};
const make=async()=>new Gate9Engine(fixture,ids).init();
const state=e=>JSON.stringify(e.state);
const rows=[];
async function setup(condition,phase){
  const e=await make();await e.newChoice();
  if(phase==='draft')return e;
  await e.choose('xw90');await e.choose('yv90');
  if(condition==='choose')return e;
  await e.selectCondition(condition);
  if(phase==='ready')return e;
  await e.play();
  if(phase==='complete'){
    if(condition==='watch'){await e.localBoundary(2);await e.localBoundary(4);}
    await e.localBoundary(6);
  }
  return e;
}
for(const [condition,phase] of [['choose','draft'],['choose','complete'],['watch','ready'],['watch','running'],['watch','complete'],['static','ready'],['static','running'],['static','complete']]){
  const e=await setup(condition,phase),before=state(e);let stopCalls=0;e.stopClock=()=>{stopCalls++;};
  const malformed=await e.choose({queryId:'xw90'}),offMenu=await e.choose('outside-menu'),invalidCondition=await e.selectCondition('outside-condition');
  const after=state(e);
  rows.push({condition,phase,malformed:malformed.result,offMenu:offMenu.result,invalidCondition:invalidCondition.result,semanticStatePreserved:before===after,invalidConditionStopClockCalls:stopCalls});
}
const timing=[];
for(const condition of ['watch','static']){
  const local=await setup(condition,'running');let localStops=0;local.stopClock=()=>{localStops++;};await local.practice(true);
  timing.push({condition,mode:'exploration',action:'practice-open',clockStopCalls:localStops,presentationPaused:local.state.presentationPaused,tourPaused:local.state.tourPaused,reviewStatus:local.state.reviewStatus});
  const saved=await make();await saved.tourPlay();for(const t of condition==='watch'?[2,4,6]:[2,4,6,8,10,12,14])await saved.advanceTourBoundary(t);
  let tourStops=0;saved.stopTourClock=()=>{tourStops++;};await saved.practice(true);
  timing.push({condition,mode:'saved-tour',action:'practice-open',clockStopCalls:tourStops,presentationPaused:saved.state.presentationPaused,tourPaused:saved.state.tourPaused,reviewStatus:saved.state.reviewStatus});
}
const result={schema:'gate9-prepackage-correction-matrix-v1',routes:rows,practiceTiming:timing};
await writeFile(`${root}/audit/gate-9/prepackage-correction-matrix.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
