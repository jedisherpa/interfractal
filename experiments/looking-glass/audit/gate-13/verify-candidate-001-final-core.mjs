// Independent read-only verification of the sealed Gate 13 browser core.
// Imports no Gate 13 implementation module and writes only its own audit result.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'../..');
const read=async p=>readFile(resolve(root,p)),parse=async p=>JSON.parse(await read(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const canonical=x=>Array.isArray(x)?`[${x.map(canonical).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`:JSON.stringify(x);
const hash=x=>sha(Buffer.from(canonical(x)));
const checks=[],errors=[];
function check(name,pass,detail){checks.push({name,pass:!!pass});if(!pass)errors.push({name,detail});}
const f=await parse('docs/gate-13/fixture.json'),d=await parse('audit/gate-13/prespec-derivation.json');
const freeze=await parse('evidence/gate-13/CORE_EVIDENCE_FREEZE.json');
const observations=await parse('evidence/gate-13/browser-001/observations.json');
const actions=await parse('evidence/gate-13/browser-001/actions.json');
const shots=await parse('evidence/gate-13/browser-001/screenshots.json');
const cp=await parse('misleading-view/runs/G13-MISLEAD-001/checkpoints.json');
const first=await parse('evidence/gate-13/browser-001/first-document-final-export.json');
const tour=await parse('evidence/gate-13/browser-001/natural-tour-export.json');
const second=await parse('evidence/gate-13/browser-001/second-document-final-export.json');
const timing=await parse('evidence/gate-13/browser-001/natural-tour-timing.json');
const historical=await parse('evidence/gate-13/historical-browser-links.json');

const pinnedBad=[];
for(const entry of freeze.files){try{const b=await read(entry.path);if(b.length!==entry.bytes||sha(b)!==entry.sha256)pinnedBad.push(entry.path);}catch{pinnedBad.push(entry.path);}}
check('closed core 68 exact immutable pins and freeze identity',sha(await read('evidence/gate-13/CORE_EVIDENCE_FREEZE.json'))==='c281619d92f293e7019c5835ef6df5eb51fe9bfb19b17260dc5140daf9059b35'&&freeze.fileCount===68&&freeze.files.length===68&&freeze.browserAcquisitionClosed===true&&pinnedBad.length===0,pinnedBad);
const prior=await parse('evidence/gate-13/prior-integrity-at-start.json');
let priorCount=0;const priorBad=[];
for(const m of prior.manifests){if(sha(await read(m.manifest))!==m.manifestSha256)priorBad.push(m.manifest);const manifest=await parse(m.manifest);for(const entry of manifest.files){priorCount++;try{const b=await read(entry.path);if(sha(b)!==entry.sha256||(entry.bytes!==undefined&&b.length!==entry.bytes))priorBad.push(entry.path);}catch{priorBad.push(entry.path);}}}
check('all 1745 prior frozen entries unchanged',priorCount===1745&&priorBad.length===0,priorBad);
check('prespec and immutable candidate identity',sha(await read('docs/gate-13/PRESPEC_FREEZE.json'))==='5e05e46a031ce84786d1f67c1b194fb457c7817d6300b40d3c35ceed20371269'&&freeze.runId==='G13-MISLEAD-001'&&freeze.buildId==='g13-daa720242d62cd4c184f'&&d.status==='PASS');
check('actual observation/action denominators',observations.length===90&&observations.every((o,i)=>o.index===i)&&actions.length===71&&actions.every((a,i)=>a.index===i)&&actions.filter(a=>a.error).length===1&&actions.filter(a=>!a.error).length===70);

const hashBad=[],layoutBad=[],geometryBad=[],labelBad=[],controlBad=[];
const caseById=Object.fromEntries(f.cases.map(c=>[c.id,c]));
for(const o of observations){
  const p=o.published,s=p.semanticPayload,i=p.informationPayload,a=o.actual;
  if(p.runId!=='G13-MISLEAD-001'||p.buildId!=='g13-daa720242d62cd4c184f'||p.semanticFingerprint!==hash(s)||p.informationHash!==hash(i))hashBad.push(o.index);
  const v=p.viewport;
  if(!v||!p.scene||!['width','height','scrollX','scrollY','documentWidth','documentHeight','horizontalOverflow'].every(k=>v[k]===a[k])||p.scene.width!==a.scene.width||p.scene.height!==a.scene.height||p.scene.representation!==s.representation||v.horizontalOverflow!==false)layoutBad.push(o.index);
  const c=caseById[s.caseId],disp=s.version==='corrected'?c?.correctionDisplay:c?.originalDisplay;
  if(!c||!disp){geometryBad.push(o.index);continue;}
  const [nA,nB]=c.source.records.map(r=>r.completedCount),lo=disp.scale.lowerBound,hi=disp.scale.upperBound,w=disp.scale.plotWidth;
  const offsets=[nA-lo,nB-lo],widths=offsets.map(x=>w*x/(hi-lo));
  const rectangles=o.svg.filter(x=>x.tag==='rect'&&'data-count' in x.attributes);
  const exact=rectangles.length===2&&rectangles.every((r,j)=>Number(r.attributes['data-count'])===[nA,nB][j]&&Number(r.attributes['data-offset'])===offsets[j]&&Number(r.attributes['data-width'])===widths[j]&&Number(r.attributes.width)===widths[j]&&Number(r.attributes.x)===60);
  const ticks=disp.scale.ticks.every(t=>o.svg.some(x=>x.tag==='text'&&x.text===String(t)));
  const zeroMarker=nA!==0||o.svg.some(x=>x.tag==='line'&&x.attributes.class==='zero-marker');
  if(!exact||!ticks||!zeroMarker||canonical(s.encoding.counts)!==canonical({A:nA,B:nB})||canonical(s.encoding.svgWidths)!==canonical(widths))geometryBad.push(o.index);
  const statement=o.visibleText.find(x=>x.selector==='#statement')?.text,scale=o.visibleText.find(x=>x.selector==='#scale')?.text;
  if(statement!==(s.version==='original'?c.originalDisplay.statement.text:c.correctionDisplay.text)||!scale?.includes(`Source counts A ${nA}, B ${nB}`)||!scale?.includes(`Axis ${lo}–${hi}`))labelBad.push(o.index);
  const controls=Object.fromEntries(o.controls.map(x=>[x.id,x]));
  if(!controls.source||controls.source.disabled||controls.check?.disabled!==(s.mode!=='local-review')||controls.correct?.disabled===i.availableOperations.applyCorrection||controls.original?.disabled===i.availableOperations.showOriginal||controls.correction?.disabled===i.availableOperations.showCorrection)controlBad.push(o.index);
}
check('90 independently recomputed semantic and information hashes',hashBad.length===0,hashBad);
check('90 actual-versus-published viewport and scene records',layoutBad.length===0,layoutBad);
check('90 source-derived SVG count/offset/width/tick/zero-marker records',geometryBad.length===0,geometryBad);
check('90 source-bound visible statement and scale labels',labelBad.length===0,labelBad);
check('90 substantive control enablement records',controlBad.length===0,controlBad);

const cpBad=[];
const comparisons=[...Array.from({length:7},(_,i)=>[18+i,i]),...Array.from({length:7},(_,i)=>[59+i,i]),[68,0],[69,6],[71,0],[72,6]];
for(const [obsIndex,cpIndex] of comparisons){const o=observations[obsIndex],ref=cp[cpIndex];if(o.published.semanticFingerprint!==ref.semanticFingerprint||canonical(o.published.semanticPayload)!==canonical(ref.payload)||o.published.semanticPayload.paused!==true)cpBad.push(obsIndex);}
check('18 designated paused checkpoint comparisons exact',comparisons.length===18&&cpBad.length===0,cpBad);
const parity=[[15,16],[34,35],[48,51]];
check('three actual visual/plain information pairs exact',parity.every(([a,b])=>observations[a].published.informationHash===observations[b].published.informationHash&&observations[a].published.semanticPayload.representation!==observations[b].published.semanticPayload.representation));

const imageBad=[];
for(const s of shots){try{const b=await read(s.path);if(sha(b)!==s.sha256||b.length!==s.bytes||observations[s.beforeObservationIndex].index!==s.beforeObservationIndex||observations[s.afterObservationIndex].index!==s.afterObservationIndex||s.afterObservationIndex!==s.beforeObservationIndex+1||b[0]!==0xff||b[1]!==0xd8)imageBad.push(s.path);}catch{imageBad.push(s.path);}}
check('six untouched JPEGs with exact hashes and before/after brackets',shots.length===6&&imageBad.length===0,imageBad);
const consoleRows=await parse('evidence/gate-13/browser-001/console.json');
check('console collection has no errors',Array.isArray(consoleRows)&&consoleRows.every(x=>!['error','warning'].includes(String(x.type).toLowerCase())));

function exportShape(e,length){return e.runId==='G13-MISLEAD-001'&&e.buildId==='g13-daa720242d62cd4c184f'&&e.humanParticipants===0&&e.events.length===length&&e.includedThroughSequence===length&&e.events.every((x,j)=>x.sequence===j+1&&x.documentId===e.documentId&&x.runId===e.runId&&x.buildId===e.buildId&&/^[0-9a-f]{64}$/.test(x.beforeSemanticFingerprint)&&/^[0-9a-f]{64}$/.test(x.afterSemanticFingerprint))&&e.events.at(-1).type==='review-export'&&e.events.at(-1).origin==='user-control';}
check('47-event first export complete including its own event',exportShape(first,47));
check('11-event natural and 15-event second exports complete',exportShape(tour,11)&&exportShape(second,15)&&tour.documentId===second.documentId&&first.documentId!==second.documentId&&canonical(tour.events)===canonical(second.events.slice(0,11)));
const recordBad=[];
for(const row of d.derivedCaseResults){const id=row.caseId,c=caseById[id],pair=first.localReviews[id],record=pair.check;
  const event=first.events.find(x=>x.eventId===record?.envelope.originEventReference);
  if(!record||record.contentHash!==hash(record.content)||record.envelope.provenance!=='host_controlled_software'||record.envelope.documentId!==first.documentId||record.content.caseId!==id||record.content.sourceHash!==hash(c.source)||record.content.originalDisplayHash!==hash(c.originalDisplay)||record.content.verdict!==row.originalStatementVerdict||canonical(record.content.countRatio)!==canonical(row.countRatio)||canonical(record.content.originalSvgWidths)!==canonical(row.originalSvgWidths)||event?.type!=='statement-check'||event.intended.recordId!==record.envelope.recordId||event.intended.contentHash!==record.contentHash)recordBad.push(`${id}:check`);
  const correction=pair.correction;
  if(row.correction){const ce=first.events.find(x=>x.eventId===correction?.envelope.originEventReference);if(!correction||correction.contentHash!==hash(correction.content)||correction.envelope.provenance!=='host_controlled_software'||correction.envelope.documentId!==first.documentId||correction.content.checkContentHash!==record.contentHash||correction.envelope.checkRecordId!==record.envelope.recordId||correction.content.sourceHash!==row.sourceSha256||correction.content.originalDisplayHash!==row.originalDisplaySha256||correction.content.correctedDisplayHash!==hash(c.correctionDisplay)||canonical(correction.content.newSvgWidths)!==canonical(row.correction.svgWidths)||ce?.type!=='correction-apply'||ce.intended.recordId!==correction.envelope.recordId||ce.intended.checkRecordId!==record.envelope.recordId)recordBad.push(`${id}:correction`);}else if(correction!==null)recordBad.push(`${id}:unexpected-correction`);
  if(first.canonicalDefinitions[id].checkContentHash!==record.contentHash||first.canonicalDefinitions[id].correctionContentHash!==(correction?.contentHash??null))recordBad.push(`${id}:canonical-content`);
}
check('three local checks, two corrections and immutable source/check/event provenance',recordBad.length===0,recordBad);
check('one deliberate reused check did not create duplicate record',first.events.filter(x=>x.type==='statement-check'&&x.result==='reused').length===1&&first.events.filter(x=>x.type==='statement-check'&&x.result==='accepted').length===3&&first.events.filter(x=>x.type==='correction-apply'&&x.result==='accepted').length===2);
check('reload creates new UUID and no local review records',Object.values(tour.localReviews).every(x=>!x.check&&!x.correction)&&Object.values(second.localReviews).every(x=>!x.check&&!x.correction)&&first.documentId!==tour.documentId);
check('canonical definitions are not performed local records',Object.values(tour.canonicalDefinitions).every(x=>typeof x.checkContentHash==='string')&&observations[71].published.semanticPayload.activeCheck===false&&observations[71].published.semanticPayload.activeCorrection===false&&Object.values(tour.localReviews).every(x=>!x.check&&!x.correction));

const sameBoundary={};
for(const [name,e] of [['first',first],['natural',tour],['second',second]]){const pairs=e.events.slice(0,-1).map((x,i)=>[x,e.events[i+1]]).filter(([a,b])=>a.cursorSeconds===b.cursorSeconds);sameBoundary[name]={pairs:pairs.length,bad:pairs.filter(([a,b])=>a.afterSemanticFingerprint!==b.beforeSemanticFingerprint).map(([a,b])=>[a.sequence,b.sequence])};}
check('all same-cursor adjacent event chains',Object.values(sameBoundary).every(x=>x.bad.length===0),sameBoundary);
const scheduled=tour.events.filter(x=>['replay','automatic'].includes(x.origin));
const eventExpected=f.savedTour.events;
check('natural tour seven exact scheduled events and provenance',scheduled.length===7&&scheduled.every((x,i)=>x.type===eventExpected[i].type&&x.cursorSeconds===eventExpected[i].atSeconds&&x.origin===eventExpected[i].origin&&x.provenance==='scripted_demonstration')&&scheduled.at(-1).intended.reason==='end-of-sequence');
const play=tour.events.find(x=>x.type==='tour-play');const stop=tour.events.find(x=>x.type==='tour-stop');
const elapsed=(Date.parse(stop.atUtc)-Date.parse(play.atUtc))/1000;
check('natural 24.002-second stop measured from event UTC',elapsed===24.002&&observations[80].published.semanticPayload.paused===true&&observations[80].published.semanticPayload.cursorSeconds===24&&observations[80].published.semanticPayload.endReason==='end-of-sequence');
const active=observations.slice(74,81).map(x=>x.published.semanticPayload);
check('active DOM samples in all five prescribed intervals',active.length===7&&active[0].paused===false&&[[4,8],[8,12],[12,16],[16,20],[20,24]].every(([lo,hi],j)=>active[j+1].cursorSeconds>lo&&active[j+1].cursorSeconds<hi&&!active[j+1].paused)&&active[6].cursorSeconds===24&&active[6].paused===true&&timing.length===6);

const noEffect=actions[5],disabled=actions[6];
const controlAt=n=>Object.fromEntries(observations[n].controls.map(c=>[c.id,c]));
check('retained completed-click non-transition is truthfully identifiable',!noEffect.error&&observations[5].published.semanticPayload.version==='corrected'&&observations[6].published.semanticPayload.version==='corrected'&&observations[5].published.semanticFingerprint===observations[6].published.semanticFingerprint&&!controlAt(5).original.disabled&&!controlAt(6).original.disabled&&first.events.filter(e=>e.type==='version-select'&&Date.parse(e.atUtc)>=Date.parse(noEffect.startedAtUtc)&&Date.parse(e.atUtc)<=Date.parse(noEffect.actionCompletedAtUtc)).length===0);
check('dependent disabled-control failure and recovery preserved',!!disabled.error&&String(disabled.error).includes('disabled')&&controlAt(6).correction.disabled&&observations[12].published.semanticPayload.version==='original'&&observations[13].published.semanticPayload.version==='corrected'&&observations[14].published.semanticPayload.version==='original'&&observations[15].published.semanticPayload.version==='corrected');
check('source panel before checking and accurate true/zero controls',!observations[3].panels.find(x=>x.id==='source').hidden&&observations[3].published.semanticPayload.activeCheck===false&&observations[27].published.semanticPayload.check?.verdict===true&&controlAt(27).correct.disabled===true&&observations[33].published.semanticPayload.check?.verdict===false&&observations[33].published.semanticPayload.check?.countRatio.status==='undefined'&&observations[34].published.semanticPayload.correction?.difference===10);
check('historical Gate 12 links show exact paused replay and result',historical.replay.url==='http://127.0.0.1:44005/'&&historical.replay.domSnapshot.includes('G12-COORD-002')&&historical.replay.domSnapshot.includes('g12-3c5526361a7cb2cc5c4a')&&historical.results.url==='http://127.0.0.1:44005/review/results.html'&&historical.results.domSnapshot.includes('PASS within the declared software scope'));
check('final instrument returns paused zero, default viewport later observed',observations[85].published.semanticPayload.paused===true&&observations[85].published.semanticPayload.cursorSeconds===0&&observations[86].actual.width===960&&observations[89].actual.width===1279&&observations[89].actual.height===904);

const followObs=await parse('evidence/gate-13/browser-001-followup/observations.json');
const followActions=await parse('evidence/gate-13/browser-001-followup/actions.json');
const followConsole=await parse('evidence/gate-13/browser-001-followup/console.json');
const followShots=await parse('evidence/gate-13/browser-001-followup/screenshots.json');
const followHashBad=followObs.filter(o=>o.published.semanticFingerprint!==hash(o.published.semanticPayload)||o.published.informationHash!==hash(o.published.informationPayload)||o.published.viewport.width!==o.actual.width||o.published.scene.width!==o.actual.scene.width).map(o=>o.index);
check('six follow-up observations independently hash/layout valid',followObs.length===6&&followHashBad.length===0,followHashBad);
const followShot=followShots[0],followBytes=await read(followShot.path);
check('three actual follow-up controls and one bracketed original retained',followActions.length===3&&followShots.length===1&&sha(followBytes)===followShot.sha256&&followBytes.length===followShot.bytes&&followShot.beforeObservationIndex===3&&followShot.afterObservationIndex===4);
const c20=Object.fromEntries(followObs[1].controls.map(x=>[x.id,x]));
check('actual enabled canonical correction click and keyboard retry both fail',c20.correction.disabled===false&&followObs[1].published.semanticPayload.cursorSeconds===20&&followObs[1].published.semanticPayload.activeCorrection===true&&followObs[1].published.semanticFingerprint===followObs[2].published.semanticFingerprint&&followObs[2].published.semanticFingerprint===followObs[5].published.semanticFingerprint&&followConsole.length===2&&followConsole.every(x=>x.level==='error'&&x.message.includes('Error: correction not active')&&x.message.includes('semanticNow')));

const result={schema:'gate13-independent-final-core-verification-v1',status:errors.length?'BLOCKED':'PASS',checkCount:checks.length,passCount:checks.length-errors.length,errors,checks,corePins:freeze.files.length,priorPins:priorCount,observations:observations.length,actions:{attempted:actions.length,toolCompleted:actions.length-actions.filter(x=>x.error).length,toolFailed:actions.filter(x=>x.error).length,completedWithoutObservedTransition:1},originalJpegs:shots.length,followup:{observations:followObs.length,actions:followActions.length,originalJpegs:followShots.length,consoleErrors:followConsole.length,hashMismatchIndices:followHashBad},hashMismatchIndices:hashBad,layoutMismatchIndices:layoutBad,geometryMismatchIndices:geometryBad,labelMismatchIndices:labelBad,controlMismatchIndices:controlBad,checkpointMismatchIndices:cpBad,recordMismatches:recordBad,sameBoundary,elapsedNaturalSeconds:elapsed,blockingIssues:['Published canonical applyCorrection availability contradicts disabled actual control at observations 20, 61, 76.','Enabled canonical correction version control at checkpoint 20 fails on actual click and keyboard retry with Error: correction not active; local() switches to empty local review while retaining scripted activeCorrection. Controlled immutable handler repro establishes related CP12 source/representation/records failures and Show original provenance loss.'],qualification:'The main first-use local correction path and replay checks passed, but the canonical-to-local control defect blocks candidate001 acceptance. Initial separate Show original non-transition cause remains unestablished; later local keyboard/click recovery succeeded. No human susceptibility or debrief effect tested.'};
await writeFile(resolve(root,'audit/gate-13/candidate-001-final-core-verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checks:result.checkCount,passed:result.passCount,errors:result.errors,corePins:result.corePins,priorPins:result.priorPins,observations:result.observations,actions:result.actions,sameBoundary:result.sameBoundary},null,2));
