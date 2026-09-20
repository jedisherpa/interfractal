#!/usr/bin/env node
// Independent read-only audit of sealed Gate 10 browser evidence.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const at=p=>path.join(root,p);
const read=p=>JSON.parse(fs.readFileSync(at(p),'utf8'));
const bytes=p=>fs.readFileSync(at(p));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const canonical=x=>Array.isArray(x)?`[${x.map(canonical).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`:JSON.stringify(x);
const hash=x=>sha(Buffer.from(canonical(x)));
const failures=[];
const check=(name,condition)=>{if(!condition)failures.push(name);};
const runId='G10-PREDICT-003',buildId='g10-9e34f791d83c1cd7a495';
const freezePath='evidence/gate-10/CORE_EVIDENCE_FREEZE.json';
const freeze=read(freezePath),freezeHash=sha(bytes(freezePath));
check('closed core freeze hash',freezeHash==='a8310e939ba5d3020d890613ca305f7b71179b5e7c88a97bc064bd588006fd28');
check('closed core identity and count',freeze.runId===runId&&freeze.buildId===buildId&&freeze.entries.length===22&&freeze.count===22);
const coreFiles=[];
for(const pin of freeze.entries){const b=bytes(pin.path);const mode=fs.statSync(at(pin.path)).mode&0o777;const ok=b.length===pin.bytes&&sha(b)===pin.sha256;check(`core ${pin.path}`,ok);check(`core read-only ${pin.path}`,mode===0o444);coreFiles.push({path:pin.path,bytes:b.length,sha256:sha(b),mode:mode.toString(8),match:ok});}
const obs=read('evidence/gate-10/browser/observations.json');
const hostActions=read('evidence/gate-10/browser/host-actions.json');
check('65 full observations',obs.length===65);check('49 host semantic actions',hostActions.length===49);
const observationAudit=[];const staleViewport=[];const dimensions=[];const controlAudit=[];
for(const [i,o] of obs.entries()){
  const s=o.snapshot,p=s.semanticPayload,l=s.ledgerPayload;
  const semanticHash=hash(p),ledgerHash=hash(l);
  check(`observation ${i} semantic hash`,semanticHash===s.semanticFingerprint);
  check(`observation ${i} ledger hash`,ledgerHash===s.ledgerFingerprint);
  check(`observation ${i} identity`,s.runId===runId&&s.buildId===buildId&&s.schema==='gate10-published-snapshot-v1');
  check(`observation ${i} withheld`,p.revealedResult===null&&p.response===null&&p.responsePhase==='none'&&o.body.includes('Target result withheld')&&!o.body.includes('Software grade:'));
  check(`observation ${i} case supports`,p.task.id===p.caseId&&o.svgs.length===p.task.supports.length&&p.task.supports.every(v=>o.body.includes(v.id)));
  check(`observation ${i} scene`,s.scene.caseId===p.caseId&&s.scene.renderedCardCount===o.svgs.length&&s.scene.cardRects.length===o.svgs.length&&s.scene.cardRects.every((r,j)=>r.width===o.svgs[j].rect.width&&r.height===o.svgs[j].rect.height));
  const v=o.viewport,sv=s.viewport;
  check(`observation ${i} no horizontal overflow`,v.documentWidth<=v.width);
  const vpSame=canonical(v)===canonical(sv);
  if(!vpSame)staleViewport.push({index:i,label:o.label,observed:v,published:sv});
  dimensions.push(...o.svgs.map(z=>[z.rect.width,z.rect.height]));
  const control=id=>o.controls.find(c=>c.id===id);
  const disabled=id=>control(id)?.disabled===true;
  const responseLocked=disabled('commit')&&disabled('skip')&&disabled('reveal')&&o.controls.filter(c=>c.type==='radio').every(c=>c.disabled===true);
  const savedLocked=p.mode!=='saved-tour'||(disabled('start')&&disabled('export-ledger')&&disabled('export-events')&&disabled('pause')===p.paused&&disabled('play')===!p.paused);
  const practiceLocked=!p.practiceOpen||(disabled('start')&&disabled('export-ledger')&&disabled('export-events'));
  check(`observation ${i} response controls`,responseLocked);
  check(`observation ${i} saved controls`,savedLocked);
  check(`observation ${i} practice controls`,practiceLocked);
  controlAudit.push({index:i,label:o.label,responseLocked,savedLocked,practiceLocked});
  observationAudit.push({index:i,label:o.label,semanticHashMatch:semanticHash===s.semanticFingerprint,ledgerHashMatch:ledgerHash===s.ledgerFingerprint,viewportMatch:vpSame,snapshotRevision:s.snapshotRevision,mode:p.mode,cursorSeconds:p.cursorSeconds,paused:p.paused,caseId:p.caseId,reviewStatus:p.reviewStatus});
}
check('four known export-height metadata mismatches',canonical(staleViewport.map(x=>x.index))===canonical([27,36,54,61])&&staleViewport.every(x=>Object.keys(x.observed).every(k=>k==='documentHeight'||x.observed[k]===x.published[k])));
check('all visible SVG border boxes 282 by 202',dimensions.length===130&&dimensions.every(([w,h])=>w===282&&h===202));
check('scene declared content size',obs.every(o=>o.snapshot.scene.cardWidthCss===280&&o.snapshot.scene.cardHeightCss===200));
const cp=read('prediction-transfer/runs/G10-PREDICT-003/checkpoints.json');
const cpLabels=[...Array.from({length:6},(_,i)=>`baseline-cp-${i*4}`),...Array.from({length:6},(_,i)=>`after-blocked-review-cp-${i*4}`),'after-reopen-cp-0','after-reopen-cp-20','after-reload-cp-0','after-reload-cp-20'];
const checkpointAudit=[];
for(const label of cpLabels){const o=obs.find(x=>x.label===label);const seconds=Number(label.split('-').at(-1));const expected=cp.find(x=>x.seconds===seconds);const p=o?.snapshot.semanticPayload;const match=!!o&&!!expected&&canonical(p)===canonical(expected.payload)&&o.snapshot.semanticFingerprint===expected.semanticFingerprint&&p.mode==='saved-tour'&&p.paused&&p.response===null&&p.revealedResult===null&&o.exportText==='';check(`designated checkpoint ${label}`,match);checkpointAudit.push({label,seconds,match,reviewStatus:p?.reviewStatus??null});}
check('16 designated checkpoint comparisons',cpLabels.length===16&&checkpointAudit.every(x=>x.match));
const eventFile='evidence/gate-10/browser/session-two-natural-tour-events.json';
const natural=read(eventFile).events;
const scheduled=natural.filter(x=>x.origin==='replay'||x.origin==='automatic');
const expectedEvents=fs.readFileSync(at('prediction-transfer/runs/G10-PREDICT-003/events.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const naturalAudit=scheduled.map((event,i)=>({type:event.type,seconds:event.cursorSeconds,origin:event.origin,intended:event.intended,beforeMatch:event.beforeSemanticFingerprint===expectedEvents[i].beforeSemanticFingerprint,afterMatch:event.afterSemanticFingerprint===expectedEvents[i].afterSemanticFingerprint}));
check('six natural scheduled event payloads',scheduled.length===6&&naturalAudit.every((x,i)=>x.type===expectedEvents[i].type&&x.seconds===expectedEvents[i].cursorSeconds&&x.origin===expectedEvents[i].origin&&canonical(x.intended)===canonical(expectedEvents[i].intended)&&x.beforeMatch&&x.afterMatch));
check('natural same-boundary join',scheduled[4].afterSemanticFingerprint===scheduled[5].beforeSemanticFingerprint);
const elapsedMs=Date.parse(natural.find(x=>x.type==='tour-stop').atUtc)-Date.parse(natural.find(x=>x.type==='tour-play').atUtc);
check('natural elapsed near 20 seconds',elapsedMs>=20000&&elapsedMs<20500);
check('natural end visible',obs.some(o=>o.label==='natural-tour-end-after-image'&&o.snapshot.semanticPayload.cursorSeconds===20&&o.snapshot.semanticPayload.paused&&o.snapshot.semanticPayload.reviewStatus==='end-of-sequence'));
const exportFiles=['session-one-events-pre-reset.json','session-one-events-final.json','session-two-natural-tour-events.json','session-two-events-final.json'];
const eventAudit=[];
for(const filename of exportFiles){const events=read(`evidence/gate-10/browser/${filename}`).events;
  const valid=events.every((e,i)=>e.sequence===i+1&&e.eventId===`${runId}-ui:${i+1}`&&e.runId===runId&&e.buildId===buildId&&/^[a-f0-9]{64}$/.test(e.beforeSemanticFingerprint)&&/^[a-f0-9]{64}$/.test(e.afterSemanticFingerprint)&&(
    e.origin==='user-control'?e.actor==='source_informed_software_ui'&&e.provenance==='source_informed_software':
    e.origin==='api'?e.actor==='source_informed_software_api'&&e.provenance==='source_informed_software':
    ['replay','automatic'].includes(e.origin)&&e.actor==='scripted_demonstration'&&e.provenance==='scripted_demonstration'));
  check(`UI events ${filename}`,valid);
  eventAudit.push({file:filename,count:events.length,valid,origins:Object.fromEntries([...new Set(events.map(e=>e.origin))].map(k=>[k,events.filter(e=>e.origin===k).length]))});
}
const e1=read('evidence/gate-10/browser/session-one-events-final.json').events,e1pre=read('evidence/gate-10/browser/session-one-events-pre-reset.json').events;
const e2=read('evidence/gate-10/browser/session-two-events-final.json').events,e2natural=natural;
check('event export prefixes',canonical(e1.slice(0,e1pre.length))===canonical(e1pre)&&canonical(e2.slice(0,e2natural.length))===canonical(e2natural));
check('missing first-start UI ack preserved',e1.some(e=>e.type==='attempt-start-request')&&!e1.some(e=>e.type==='attempt-start-ack'||e.type==='commit-ack'||e.type==='reveal-ack'));
function jpegSize(b){if(b[0]!==0xff||b[1]!==0xd8)throw Error('not JPEG');let i=2;while(i<b.length){if(b[i]!==0xff){i++;continue;}while(b[i]===0xff)i++;const m=b[i++];if(m===0xd9||m===0xda)break;if(m===0x01||(m>=0xd0&&m<=0xd7))continue;const len=b.readUInt16BE(i);if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(m))return {width:b.readUInt16BE(i+5),height:b.readUInt16BE(i+3)};i+=len;}throw Error('JPEG dimensions absent');}
const screenshots=read('evidence/gate-10/browser/screenshots.json');const imageAudit=[];
for(const shot of screenshots){const p=`evidence/gate-10/${shot.path}`,b=bytes(p),dim=jpegSize(b);const before=obs.find(x=>x.label===`${shot.label}-before-image`),after=obs.find(x=>x.label===`${shot.label}-after-image`);const ok=sha(b)===shot.sha256&&before?.snapshot.snapshotRevision===shot.beforeRevision&&after?.snapshot.snapshotRevision===shot.afterRevision&&dim.width===before?.viewport.width&&dim.height===before?.viewport.height;check(`original ${shot.label}`,ok);imageAudit.push({label:shot.label,sha256:sha(b),bytes:b.length,...dim,beforeRevision:shot.beforeRevision,afterRevision:shot.afterRevision,bracketMatch:ok});}
check('six original images',imageAudit.length===6);
const service=fs.readFileSync(at('evidence/gate-10/browser/server-actions-closed.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
check('actual service actions 2 mutations 4 exports',service.length===6&&canonical(service.map(x=>x.type))===canonical(['session-start','attempt-start','ledger-export','ledger-export','ledger-export','ledger-export']));
const ledgerNames=['session-one-ledger-before-practice.json','session-one-ledger-after-practice.json','session-one-ledger-final.json'];
const ledgers=ledgerNames.map(n=>read(`evidence/gate-10/browser/${n}`));
check('orphan answering attempt persists',ledgers.every(l=>l.attempts.length===1&&l.attempts[0].caseId==='T01'&&l.attempts[0].status==='answering'&&l.attempts[0].response===null&&l.attempts[0].commitEventReference===null&&l.attempts[0].revealEventReference===null));
check('new document no retained session ledger',read('evidence/gate-10/browser/session-two-ledger-final.json').attempts.length===0);
check('historical Gate9 visible identity',fs.readFileSync(at('evidence/gate-10/browser/historical-link-dom.txt'),'utf8').includes('G9-MATCHED-003 · g9-15c3bf973fe0c6cd'));
const prior=read('evidence/gate-10/prior-integrity-at-start.json');let priorCount=0;const historical=[];
for(let gate=0;gate<=9;gate++){const manifest=`evidence/gate-${gate}/GATE_${gate}_FREEZE.json`,m=read(manifest),start=prior.manifests.find(x=>x.gate===gate);const manifestHash=sha(bytes(manifest));check(`historical manifest gate${gate}`,manifestHash===start.manifestSha256);let count=0;for(const pin of m.files){const b=bytes(pin.path);const ok=sha(b)===pin.sha256&&(pin.bytes===undefined||b.length===pin.bytes);check(`historical ${pin.path}`,ok);count++;}priorCount+=count;historical.push({gate,manifestSha256:manifestHash,entriesVerified:count});}
check('all 1260 historical entries',priorCount===1260&&priorCount===prior.entriesVerified);
const historicPaths=[...Array(10).keys()].flatMap(g=>[`docs/gate-${g}`,`evidence/gate-${g}`,`audit/gate-${g}`]);
let historicGitDiff=[];try{historicGitDiff=execFileSync('git',['diff','--name-only','9e39c0332d7b34f60a9e779cdbff7fd93e6acee1','--',...historicPaths],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);}catch(e){failures.push(`historical git diff command: ${e.message}`);}
check('no tracked historical diff from Gate10 base',historicGitDiff.length===0);
const result={schema:'gate10-independent-closed-browser-verification-v1',status:failures.length?'FAIL':'PASS_WITH_QUALIFICATIONS',runId,buildId,coreFreezeSha256:freezeHash,coreEntryCount:coreFiles.length,observationCount:obs.length,semanticHashesVerified:observationAudit.filter(x=>x.semanticHashMatch).length,ledgerHashesVerified:observationAudit.filter(x=>x.ledgerHashMatch).length,withheldObservationCount:obs.filter(o=>o.snapshot.semanticPayload.revealedResult===null&&o.body.includes('Target result withheld')).length,controlInvariantCount:controlAudit.filter(x=>x.responseLocked&&x.savedLocked&&x.practiceLocked).length,noHorizontalOverflowCount:obs.filter(o=>o.viewport.documentWidth<=o.viewport.width).length,designatedCheckpointCount:checkpointAudit.length,checkpointMatches:checkpointAudit.filter(x=>x.match).length,naturalTourElapsedMs:elapsedMs,naturalScheduledEventCount:scheduled.length,hostSemanticActionCount:hostActions.length,originalImageCount:imageAudit.length,serviceEventCount:service.length,serviceEventTypes:service.map(x=>x.type),historicalEntryCount:priorCount,historicGitDiff,staleViewport,contentCssDimensions:{width:280,height:200},observedSvgBorderBoxDimensions:{width:282,height:202},eventAudit,checkpointAudit,naturalAudit,imageAudit,failures,scope:'Read-only sealed actual browser evidence; prediction workflow remains blocked and human learning untested'};
fs.writeFileSync(at('audit/gate-10/browser-final-verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,observationCount:result.observationCount,semanticHashesVerified:result.semanticHashesVerified,ledgerHashesVerified:result.ledgerHashesVerified,checkpointMatches:result.checkpointMatches,naturalScheduledEventCount:result.naturalScheduledEventCount,naturalTourElapsedMs:result.naturalTourElapsedMs,originalImageCount:result.originalImageCount,historicalEntryCount:result.historicalEntryCount,staleViewportCount:staleViewport.length,failures},null,2));
if(failures.length)process.exitCode=1;
