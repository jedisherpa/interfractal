#!/usr/bin/env node
// Read-only independent review of actual candidate002 preview acquisition.
import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {join,resolve} from 'node:path';
const base=resolve(import.meta.dirname,'..'),ev=join(base,'evidence/browser-candidate-002'),j=p=>JSON.parse(readFileSync(p)),h=b=>createHash('sha256').update(b).digest('hex');
const world=j(join(base,'design/world.json')),obs=j(join(ev,'observations.json')),actions=j(join(ev,'actions.json')),shots=j(join(ev,'screenshots.json')),consoleRows=j(join(ev,'console.json'));
const errors=[];let records=0;
for(const o of obs){if(o.url!=='http://127.0.0.1:44008/'||o.title!=='Looking Glass materials review')errors.push(`identity ${o.index}`);if(o.details.length!==18)errors.push(`count ${o.index}`);for(let i=0;i<18;i++){if(JSON.stringify(JSON.parse(o.details[i].record))!==JSON.stringify(world.cards[i]))errors.push(`record ${o.index}/${i}`);records++;}if(o.viewport.documentWidth>o.viewport.width)errors.push(`overflow ${o.index}`);}
for(const s of shots){const b=readFileSync(s.path);if(b.length!==s.bytes||h(b)!==s.sha256||s.beforeObservationIndex>=s.afterObservationIndex||s.afterObservationIndex>=obs.length)errors.push(`image ${s.label}`);}
if(actions.length!==7||actions.some(a=>!a.toolCompleted))errors.push('tool completions');
if(consoleRows.length)errors.push('console');
const open=i=>obs[i].details[3].open;
const sequence=[[2,false],[3,false],[5,false],[6,true],[7,false],[8,true],[10,true],[11,false],[12,true],[13,false]];
for(const [i,expected] of sequence)if(open(i)!==expected)errors.push(`C04 transition ${i}`);
const expectedViewports=['1280x720','1279x904'];const observedViewports=[...new Set(obs.map(o=>`${o.viewport.width}x${o.viewport.height}`))].sort();if(JSON.stringify(observedViewports)!==JSON.stringify(expectedViewports.sort()))errors.push('viewports');
const a=readFileSync(join(base,'package-candidate-001/review/index.html'),'utf8'),b=readFileSync(join(base,'package-candidate-002/review/index.html'),'utf8');if(a.replaceAll('candidate 001','candidate 002')!==b)errors.push('preview parity beyond candidate label');
const out={schemaVersion:'materials-browser-evidence-audit/2',candidate:'002',status:errors.length?'FAIL':'PASS_QUALIFIED',observations:obs.length,sourceRecordsMatched:records,toolCompletions:actions.length,intentMatchedTransitions:5,intentMismatches:2,originalJpegs:shots.length,consoleEntries:consoleRows.length,viewports:observedViewports,previewOnlyCandidateLabelChanged:true,qualification:'First completed click did not open C04; next action labeled close actually opened it. Failure and labels retained; later keyboard/mouse transitions succeeded. Viewport shift cause unknown.',limits:['Researcher full-union overview, not participant isolation','No actual model or human observations'],errors};
writeFileSync(join(base,'audit/browser-verification-002.json'),JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:out.status,records,images:shots.length,errors:errors.length}));if(errors.length)process.exitCode=1;
