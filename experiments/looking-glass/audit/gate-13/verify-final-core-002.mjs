// Independent read-only verifier for the sealed candidate 002 browser core.
// Imports no Gate 13 implementation module; writes only its own audit result.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = async p => readFile(resolve(root, p));
const parse = async p => JSON.parse(await read(p));
const sha = b => createHash('sha256').update(b).digest('hex');
const canon = x => Array.isArray(x) ? `[${x.map(canon).join(',')}]` : x && typeof x === 'object' ? `{${Object.keys(x).sort().map(k => `${JSON.stringify(k)}:${canon(x[k])}`).join(',')}}` : JSON.stringify(x);
const hash = x => sha(Buffer.from(canon(x)));
const checks = [], errors = [];
function ck(name, pass, detail) { checks.push({ name, pass: !!pass }); if (!pass) errors.push({ name, detail }); }
const b = 'evidence/gate-13/browser-002/';
const f = await parse('docs/gate-13/fixture.json');
const deriv = await parse('audit/gate-13/prespec-derivation.json');
const freeze = await parse('evidence/gate-13/CORE_EVIDENCE_FREEZE_002.json');
const old = await parse('evidence/gate-13/CANDIDATE_001_FAILURE_FREEZE.json');
const obs = await parse(b + 'observations.json');
const acts = await parse(b + 'actions.json');
const shots = await parse(b + 'screenshots.json');
const consoleRows = await parse(b + 'console.json');
const first = await parse(b + 'first-document-final-export.json');
const natural = await parse(b + 'natural-tour-export.json');
const second = await parse(b + 'second-document-final-export.json');
const timing = await parse(b + 'natural-tour-timing.json');
const cp = await parse('misleading-view/runs/G13-MISLEAD-002/checkpoints.json');
const expectedRun = 'G13-MISLEAD-002', expectedBuild = 'g13-5b8514d97acc3485aabf';
const pinnedBad = [];
for (const e of freeze.files) { try { const data = await read(e.path); if (data.length !== e.bytes || sha(data) !== e.sha256) pinnedBad.push(e.path); } catch { pinnedBad.push(e.path); } }
ck('closed core 138 exact pins and freeze identity', sha(await read('evidence/gate-13/CORE_EVIDENCE_FREEZE_002.json')) === 'f6cd344da16e2e8d15ad2cbe21f31c66bdc80a8884f1b6ac0d18aab984d6ab20' && freeze.files.length === 138 && freeze.fileCount === 138 && freeze.browserAcquisitionClosed === true && freeze.runId === expectedRun && freeze.buildId === expectedBuild && !pinnedBad.length, pinnedBad);
const oldBad = [];
for (const e of old.files) { try { const data = await read(e.path); if (data.length !== e.bytes || sha(data) !== e.sha256) oldBad.push(e.path); } catch { oldBad.push(e.path); } }
ck('candidate 001 failure freeze 84 pins unchanged', sha(await read('evidence/gate-13/CANDIDATE_001_FAILURE_FREEZE.json')) === '152c8c74a83e5efcf54f60ee530ad51b88a2d4ad72149f147c986fc94fd526fe' && old.files.length === 84 && !oldBad.length, oldBad);
const prior = await parse('evidence/gate-13/prior-integrity-at-start.json'); let priorCount = 0; const priorBad = [];
for (const m of prior.manifests) { if (sha(await read(m.manifest)) !== m.manifestSha256) priorBad.push(m.manifest); const manifest = await parse(m.manifest); for (const e of manifest.files) { priorCount++; try { const data = await read(e.path); if (sha(data) !== e.sha256 || (e.bytes !== undefined && data.length !== e.bytes)) priorBad.push(e.path); } catch { priorBad.push(e.path); } } }
ck('1745 earlier frozen entries unchanged', priorCount === 1745 && !priorBad.length, priorBad);
ck('frozen prespec and candidate identity', sha(await read('docs/gate-13/PRESPEC_FREEZE.json')) === '5e05e46a031ce84786d1f67c1b194fb457c7817d6300b40d3c35ceed20371269' && deriv.status === 'PASS' && obs.every((o, i) => o.index === i && o.published.runId === expectedRun && o.published.buildId === expectedBuild));
ck('108 complete observations and 91 completed actions', obs.length === 108 && acts.length === 91 && acts.every((a, i) => a.index === i && !a.error && a.afterObservationIndex === a.beforeObservationIndex + 1) && consoleRows.length === 0);

const cases = Object.fromEntries(f.cases.map(c => [c.id, c]));
const hashBad = [], layoutBad = [], svgBad = [], textBad = [], controlBad = [];
for (const o of obs) {
  const p = o.published, s = p.semanticPayload, info = p.informationPayload, actual = o.actual;
  if (p.semanticFingerprint !== hash(s) || p.informationHash !== hash(info)) hashBad.push(o.index);
  const v = p.viewport;
  if (!v || !p.scene || !['width','height','scrollX','scrollY','documentWidth','documentHeight','horizontalOverflow'].every(k => v[k] === actual[k]) || p.scene.width !== actual.scene.width || p.scene.height !== actual.scene.height || p.scene.representation !== s.representation || v.horizontalOverflow !== false) layoutBad.push(o.index);
  const c = cases[s.caseId], disp = s.version === 'corrected' ? c?.correctionDisplay : c?.originalDisplay;
  if (!c || !disp) { svgBad.push(o.index); continue; }
  const [nA,nB] = c.source.records.map(r => r.completedCount), lo = disp.scale.lowerBound, hi = disp.scale.upperBound, w = disp.scale.plotWidth;
  const offsets = [nA-lo,nB-lo], widths = offsets.map(n => w*n/(hi-lo));
  const bars = o.svg.filter(x => x.tag === 'rect' && 'data-count' in x.attributes);
  if (bars.length !== 2 || !bars.every((r,j) => Number(r.attributes['data-count']) === [nA,nB][j] && Number(r.attributes['data-offset']) === offsets[j] && Number(r.attributes['data-width']) === widths[j] && Number(r.attributes.width) === widths[j] && Number(r.attributes.x) === 60) || !disp.scale.ticks.every(t => o.svg.some(x => x.tag === 'text' && x.text === String(t))) || (nA === 0 && !o.svg.some(x => x.tag === 'line' && x.attributes.class === 'zero-marker')) || canon(s.encoding.svgWidths) !== canon(widths) || canon(s.encoding.counts) !== canon({A:nA,B:nB})) svgBad.push(o.index);
  const statement = o.visibleText.find(x => x.selector === '#statement')?.text, scale = o.visibleText.find(x => x.selector === '#scale')?.text;
  if (statement !== (s.version === 'original' ? c.originalDisplay.statement.text : c.correctionDisplay.text) || !scale?.includes(`Source counts A ${nA}, B ${nB}`) || !scale?.includes(`Axis ${lo}–${hi}`)) textBad.push(o.index);
  const controls = Object.fromEntries(o.controls.map(x => [x.id,x]));
  if (!controls.source || controls.source.disabled || controls.check?.disabled !== !info.availableOperations.checkOriginal || controls.correct?.disabled !== !info.availableOperations.applyCorrection || controls.original?.disabled !== !info.availableOperations.showOriginal || controls.correction?.disabled !== !info.availableOperations.showCorrection) controlBad.push(o.index);
}
ck('108 independently recomputed semantic and information hashes', !hashBad.length, hashBad);
ck('108 actual-versus-published viewport and scene measurements', !layoutBad.length, layoutBad);
ck('108 source-derived SVG bars, ticks, and zero markers', !svgBad.length, svgBad);
ck('108 source-bound visible statements and scales', !textBad.length, textBad);
ck('108 actual control availability versus published operations', !controlBad.length, controlBad);

const comparisons = [...Array.from({length:7},(_,j)=>[11+j,j]),...Array.from({length:7},(_,j)=>[73+j,j]),[82,0],[83,6],[85,0],[86,6]];
const cpBad = comparisons.filter(([i,j]) => obs[i].published.semanticFingerprint !== cp[j].semanticFingerprint || canon(obs[i].published.semanticPayload) !== canon(cp[j].payload) || obs[i].published.semanticPayload.paused !== true).map(([i])=>i);
ck('18 exact paused canonical checkpoint comparisons', comparisons.length === 18 && !cpBad.length, cpBad);
const pairs = [[8,9],[48,49],[62,65]];
ck('three actual diagram/plain information parity pairs', pairs.every(([i,j]) => obs[i].published.informationHash === obs[j].published.informationHash && obs[i].published.semanticPayload.representation !== obs[j].published.semanticPayload.representation));
const imageBad = [];
for (const shot of shots) { try { const data = await read(shot.path); if (sha(data) !== shot.sha256 || data.length !== shot.bytes || data[0] !== 0xff || data[1] !== 0xd8 || shot.afterObservationIndex !== shot.beforeObservationIndex + 1 || !obs[shot.beforeObservationIndex] || !obs[shot.afterObservationIndex]) imageBad.push(shot.path); } catch { imageBad.push(shot.path); } }
ck('five untouched, visually inspected JPEGs with hashes and brackets', shots.length === 5 && !imageBad.length, imageBad);

const savedIndices = [...Array.from({length:21},(_,i)=>18+i),87,88,89];
const savedBad = savedIndices.filter(i => { const o = obs[i], s = o.published.semanticPayload, op = o.published.informationPayload.availableOperations, c = Object.fromEntries(o.controls.map(x=>[x.id,x])); return s.mode !== 'saved-tour' || !s.paused || !s.sourceOpen || s.activeCheck !== true || (i >= 22 && s.activeCorrection !== true) || op.checkOriginal !== false || op.applyCorrection !== false || c.check?.disabled !== true || c.correct?.disabled !== true || s.check?.sourceHash !== hash(cases.MISMATCH.source) || (i >= 22 && s.correction?.checkContentHash !== hash(s.check)); });
ck('CP8/12/16/20 source/records/representation/version inspection retains scripted state', savedIndices.length === 24 && !savedBad.length, savedBad);
const ctl = i => Object.fromEntries(obs[i].controls.map(x=>[x.id,x]));
ck('actual canonical version controls succeed at 12,16,20', [[25,26,27],[31,32,33]].every(([a,b,c])=>obs[a].published.semanticPayload.version==='corrected'&&obs[b].published.semanticPayload.version==='original'&&obs[c].published.semanticPayload.version==='corrected'&&!ctl(b).correction.disabled) && obs[37].published.semanticPayload.version==='original'&&!ctl(37).correction.disabled&&obs[38].published.semanticPayload.version==='corrected');
ck('fresh UUID CP20 correction and records succeed without performed local history', obs[87].published.semanticPayload.mode==='saved-tour'&&!ctl(87).correction.disabled&&obs[88].published.semanticPayload.version==='corrected'&&obs[89].published.semanticPayload.recordsOpen===true&&obs[90].published.semanticPayload.mode==='local-review'&&obs[90].published.semanticPayload.version==='original'&&!obs[90].published.semanticPayload.activeCheck&&!obs[90].published.semanticPayload.activeCorrection&&Object.values(natural.localReviews).every(x=>!x.check&&!x.correction));

function completeExport(e,n) { return e.runId === expectedRun && e.buildId === expectedBuild && e.humanParticipants === 0 && e.events.length === n && e.includedThroughSequence === n && e.events.every((x,j)=>x.sequence===j+1&&x.documentId===e.documentId&&x.runId===e.runId&&x.buildId===e.buildId&&/^[0-9a-f]{64}$/.test(x.beforeSemanticFingerprint)&&/^[0-9a-f]{64}$/.test(x.afterSemanticFingerprint)) && e.events.at(-1).type === 'review-export' && e.events.at(-1).origin === 'user-control'; }
ck('first document 65-event export includes own event', completeExport(first,65));
ck('new UUID natural 15 and final 19 events, exact preserved prefix', completeExport(natural,15)&&completeExport(second,19)&&first.documentId!==natural.documentId&&natural.documentId===second.documentId&&canon(natural.events)===canon(second.events.slice(0,15)));
const recBad=[];
for(const row of deriv.derivedCaseResults){const id=row.caseId,c=cases[id],pair=first.localReviews[id],r=pair?.check,ev=first.events.find(x=>x.eventId===r?.envelope.originEventReference);if(!r||r.contentHash!==hash(r.content)||r.envelope.provenance!=='host_controlled_software'||r.envelope.documentId!==first.documentId||r.content.sourceHash!==hash(c.source)||r.content.originalDisplayHash!==hash(c.originalDisplay)||r.content.verdict!==row.originalStatementVerdict||canon(r.content.countRatio)!==canon(row.countRatio)||canon(r.content.originalSvgWidths)!==canon(row.originalSvgWidths)||ev?.type!=='statement-check'||ev.intended.recordId!==r.envelope.recordId||ev.intended.contentHash!==r.contentHash)recBad.push(`${id}:check`);const z=pair?.correction;if(row.correction){const ce=first.events.find(x=>x.eventId===z?.envelope.originEventReference);if(!z||z.contentHash!==hash(z.content)||z.envelope.provenance!=='host_controlled_software'||z.envelope.documentId!==first.documentId||z.content.checkContentHash!==r?.contentHash||z.envelope.checkRecordId!==r?.envelope.recordId||z.content.sourceHash!==hash(c.source)||z.content.correctedDisplayHash!==hash(c.correctionDisplay)||ce?.type!=='correction-apply'||ce.intended.recordId!==z.envelope.recordId||ce.intended.checkRecordId!==r.envelope.recordId)recBad.push(`${id}:correction`);}else if(z!==null)recBad.push(`${id}:unexpected-correction`);if(first.canonicalDefinitions[id].checkContentHash!==r?.contentHash||first.canonicalDefinitions[id].correctionContentHash!==(z?.contentHash??null))recBad.push(`${id}:canonical-content`);}
ck('three performed checks and two corrections independently source/event bound', !recBad.length, recBad);
ck('one check reuse creates no duplicate performed record', first.events.filter(x=>x.type==='statement-check'&&x.result==='accepted').length===3&&first.events.filter(x=>x.type==='statement-check'&&x.result==='reused').length===1&&first.events.filter(x=>x.type==='correction-apply'&&x.result==='accepted').length===2);
ck('scripted definitions remain separate from performed records after reload', Object.values(natural.localReviews).every(x=>!x.check&&!x.correction)&&Object.values(second.localReviews).every(x=>!x.check&&!x.correction)&&Object.values(natural.canonicalDefinitions).every(x=>typeof x.checkContentHash==='string')&&obs[87].published.semanticPayload.activeCheck&&obs[90].published.semanticPayload.check===null);
const boundary={};for(const [name,e] of [['first',first],['natural',natural],['second',second]]){const pairs=e.events.slice(0,-1).map((x,i)=>[x,e.events[i+1]]).filter(([a,b])=>a.cursorSeconds===b.cursorSeconds);boundary[name]={pairs:pairs.length,bad:pairs.filter(([a,b])=>a.afterSemanticFingerprint!==b.beforeSemanticFingerprint).map(([a,b])=>[a.sequence,b.sequence])};}
ck('same-cursor adjacent event chains match',Object.values(boundary).every(x=>!x.bad.length),boundary);
const scheduled=natural.events.filter(x=>['replay','automatic'].includes(x.origin));
ck('seven exact scheduled event identities and scripted provenance',scheduled.length===7&&scheduled.every((x,i)=>x.type===f.savedTour.events[i].type&&x.cursorSeconds===f.savedTour.events[i].atSeconds&&x.origin===f.savedTour.events[i].origin&&x.provenance==='scripted_demonstration')&&scheduled.at(-1).intended.reason==='end-of-sequence');
const play=natural.events.find(x=>x.type==='tour-play'),stop=natural.events.find(x=>x.type==='tour-stop'),elapsed=(Date.parse(stop.atUtc)-Date.parse(play.atUtc))/1000;
ck('natural stop after 24.002 seconds and paused end of sequence',elapsed===24.002&&obs[98].published.semanticPayload.paused===true&&obs[98].published.semanticPayload.cursorSeconds===24&&obs[98].published.semanticPayload.endReason==='end-of-sequence');
const active=obs.slice(92,99).map(x=>x.published.semanticPayload);
ck('active captures in all five 4-second windows',active.length===7&&active[0].cursorSeconds>0&&active[0].cursorSeconds<4&&[[4,8],[8,12],[12,16],[16,20],[20,24]].every(([lo,hi],j)=>active[j+1].cursorSeconds>lo&&active[j+1].cursorSeconds<hi&&!active[j+1].paused)&&active[6].paused&&active[6].cursorSeconds===24&&timing.length===6);
ck('final viewport chronology recorded without inferring reset state',obs[104].actual.width===960&&obs[104].actual.height===720&&obs[107].actual.width===1280&&obs[107].actual.height===720);

const result={schema:'gate13-independent-final-core-002-v1',status:errors.length?'BLOCKED':'PASS',checkCount:checks.length,passCount:checks.length-errors.length,errors,checks,counts:{corePins:freeze.files.length,candidate001FailurePins:old.files.length,priorPins:priorCount,observations:obs.length,actions:acts.length,originalImages:shots.length,checkpointComparisons:comparisons.length,parityPairs:pairs.length,firstEvents:first.events.length,naturalEvents:natural.events.length,secondEvents:second.events.length},mismatches:{pinnedBad,oldBad,priorBad,hashBad,layoutBad,svgBad,textBad,controlBad,cpBad,savedBad,recBad,imageBad},sameCursorChains:boundary,naturalElapsedSeconds:elapsed,scope:'Sealed actual supported-browser evidence and frozen contracts; no implementation imports, no human claim.'};
await writeFile(resolve(root,'audit/gate-13/final-core-verification-002.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checks:result.checkCount,passed:result.passCount,errors:result.errors,counts:result.counts},null,2));
