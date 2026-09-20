#!/usr/bin/env node
// Read-only verification of host-acquired candidate001 browser evidence.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
const base=resolve(import.meta.dirname,'..');const ev=join(base,'evidence/browser-candidate-001');
const j=p=>JSON.parse(readFileSync(p));const h=b=>createHash('sha256').update(b).digest('hex');
const world=j(join(base,'design/world.json'));
const observations=j(join(ev,'observations.json'));const actions=j(join(ev,'actions.json'));const screenshots=j(join(ev,'screenshots.json'));const consoleLog=j(join(ev,'console.json'));
const errors=[];let records=0;
for(const o of observations){
 if(o.url!=='http://127.0.0.1:44007/'||o.title!=='Looking Glass materials review')errors.push(`identity ${o.index}`);
 if(o.details.length!==18)errors.push(`record count ${o.index}`);
 for(let i=0;i<18;i++){if(JSON.stringify(JSON.parse(o.details[i].record))!==JSON.stringify(world.cards[i]))errors.push(`record ${o.index}/${i}`);records++;}
 if(o.viewport.width!==1280||o.viewport.height!==720||o.viewport.documentWidth>o.viewport.width)errors.push(`viewport ${o.index}`);
}
for(const s of screenshots){const bytes=readFileSync(s.path);if(bytes.length!==s.bytes||h(bytes)!==s.sha256||s.beforeObservationIndex<0||s.afterObservationIndex>=observations.length||s.beforeObservationIndex>=s.afterObservationIndex)errors.push(`image ${s.label}`);}
if(actions.length!==7||actions.some(a=>a.toolCompleted!==true))errors.push('actions');
if(consoleLog.length!==0)errors.push('console');
const opens=o=>o.details.map((d,i)=>d.open?world.cards[i].id:null).filter(Boolean);
for(const [i,expect] of [[4,'C04'],[8,'C12'],[12,'C18']])if(!opens(observations[i]).includes(expect))errors.push(`open ${expect}`);
if(opens(observations.at(-1)).length)errors.push('reload collapse');
const result={schemaVersion:'materials-browser-evidence-audit/1',candidate:'001',status:errors.length?'FAIL':'PASS',observations:observations.length,sourceRecordsMatched:records,hostActionCalls:actions.length,originalJpegs:screenshots.length,consoleEntries:consoleLog.length,limits:['Only 1280x720 was observed','Researcher full-union overview, not participant isolation','No actual model or human observations'],errors};
writeFileSync(join(base,'audit/browser-verification-001.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,records,images:screenshots.length,errors:errors.length}));if(errors.length)process.exitCode=1;
