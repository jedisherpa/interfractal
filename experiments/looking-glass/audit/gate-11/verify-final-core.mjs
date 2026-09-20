// Independent, read-only verification of the closed Gate 11 software/browser core.
// No implementation imports, browser calls, or writes to sealed evidence.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const audit=path.join(root,'audit/gate-11');
const evidence=path.join(root,'evidence/gate-11');
const full=path.join(evidence,'browser-002-full');
const run=path.join(root,'receiver-summary/runs/G11-RECEIVER-002');
const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const bytes=p=>fs.readFileSync(p);
const shaBytes=b=>crypto.createHash('sha256').update(b).digest('hex');
const sha=p=>shaBytes(bytes(p));
const canon=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?`[${x.map(canon).join(',')}]`:`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canon(x[k])}`).join(',')}}`;
const hash=x=>shaBytes(Buffer.from(canon(x)));
const eq=(a,b)=>canon(a)===canon(b);
const checks=[];
const check=(group,name,condition)=>checks.push({group,name,pass:Boolean(condition)});
const expectedRun='G11-RECEIVER-002', expectedBuild='g11-7ced826c903d40c5a0dd';
const freezePath=path.join(evidence,'CORE_EVIDENCE_FREEZE.json');
const freeze=load(freezePath);
check('closure','freeze SHA-256',sha(freezePath)==='e9ab3b68f78a2b7c5a018ef39bd88efcb79536abd83ee1beb7b94e6df52c232a');
check('closure','54 pinned core files',freeze.count===54&&freeze.entries.length===54);
for(const item of freeze.entries){
  const file=path.join(root,item.path),content=bytes(file);
  check('closure',item.path,content.length===item.bytes&&shaBytes(content)===item.sha256);
}
const prior=[];
for(let gate=0;gate<=10;gate++){
  const file=gate===10?path.join(root,'evidence/gate-10/FREEZE_MANIFEST.json'):path.join(root,`evidence/gate-${gate}/GATE_${gate}_FREEZE.json`);
  const manifest=load(file);
  for(const item of manifest.files){
    const content=bytes(path.join(root,item.path));
    prior.push({gate,item,pass:shaBytes(content)===item.sha256&&(!('bytes'in item)||content.length===item.bytes)});
  }
}
check('historical','1437 prior frozen entries',prior.length===1437);
for(const row of prior)check('historical',`gate${row.gate}:${row.item.path}`,row.pass);

const obs=load(path.join(full,'observations.json'));
const actions=load(path.join(full,'host-actions.json'));
const shots=load(path.join(full,'screenshots.json'));
const cp=load(path.join(run,'checkpoints.json'));
const oracle=load(path.join(audit,'prespec-derivation.json'));
const fixture=load(path.join(root,'docs/gate-11/fixture.json'));
const one=load(path.join(full,'session-one-final-export.json'));
const two=load(path.join(full,'session-two-final-export.json'));
const natural=load(path.join(full,'natural-tour-export.json'));
check('acquisition','full counts',obs.length===100&&actions.length===79&&shots.length===6);
check('acquisition','separate previous counts',load(path.join(evidence,'browser-001/observations.json')).length===75&&load(path.join(evidence,'browser-001/host-actions.json')).length===62&&load(path.join(evidence,'browser-001/screenshots.json')).length===5&&load(path.join(evidence,'browser-002/observations.json')).length===101&&load(path.join(evidence,'browser-002/host-actions.json')).length===80&&load(path.join(evidence,'browser-002/screenshots.json')).length===6);
check('acquisition','all 100 indices and run/build',obs.every((o,i)=>o.index===i&&o.published.runId===expectedRun&&o.published.buildId===expectedBuild));
check('acquisition','complete string-valued snapshots',obs.every(o=>!JSON.stringify(o.published).includes('[MaxDepth]')&&(String(o.transport).includes('JSON text')||String(o.transport).includes('Lossless JSON text'))));
check('acquisition','failed oversized read retained',actions.filter(a=>a.captureError).length===1&&actions.find(a=>a.captureError)?.label==='all-local-history-export'&&obs.some(o=>o.label==='all-local-history-export-recovered'));
const docIds=[...new Set(obs.map(o=>o.published.documentId))];
check('acquisition','two actual document IDs',docIds.length===2&&docIds[0]===one.documentId&&docIds[1]===two.documentId&&one.documentId!==two.documentId);

const byLabel=new Map(obs.map(o=>[o.label,o]));
const maskFor=o=>o.published.semanticPayload.globalCertificate.subsetMask;
const sourcePaths=mask=>{
  const paths=['records.LOT.id','records.LOT.assetType','records.LOT.units'];
  for(const menu of fixture.repairMenu)if(mask&menu.bit)for(const field of Object.values(menu.copy))paths.push(`records.${menu.sourceRecord}.${field}`);
  return paths;
};
const receiverOracle=(payload,receiver)=>{
  const a=payload.additions,count=payload.units>=4;
  if(!count)return {status:'determined',answer:'no',possibleAnswers:['no']};
  if(receiver==='R_COUNT')return {status:'determined',answer:'yes',possibleAnswers:['yes']};
  if(a.calibration?.status==='expired'||a.authorization?.status==='pending')return {status:'determined',answer:'no',possibleAnswers:['no']};
  if(a.calibration?.status==='current'&&a.authorization?.status==='approved')return {status:'determined',answer:'yes',possibleAnswers:['yes']};
  return {status:'insufficient',answer:null,possibleAnswers:['no','yes']};
};
for(const o of obs){
  const p=o.published,s=p.semanticPayload,i=p.informationPayload,v=p.viewport,actual=o.actual;
  check('snapshot',`semantic ${o.index}`,hash(s)===p.semanticFingerprint);
  check('snapshot',`information ${o.index}`,hash(i)===p.informationHash);
  check('snapshot',`payload ${o.index}`,hash(s.payload)===p.payloadHash);
  check('snapshot',`identity ${o.index}`,p.sourceFamilyHash===oracle.familyHash&&s.sourceFamilyHash===oracle.familyHash&&o.document=== (p.documentId===docIds[0]?'full-document-one':'full-document-two'));
  check('metadata',`viewport and scene ${o.index}`,['width','height','scrollX','scrollY','documentWidth','documentHeight'].every(k=>v[k]===actual[k])&&['width','height'].every(k=>p.scene[k]===actual.scene[k])&&v.horizontalOverflow===(actual.documentWidth>actual.width));
  const mask=maskFor(o),wid=s.worldId,expectedLocal=receiverOracle(s.payload,s.receiverId),actualLocal=s.receiverResult;
  const expectedCert=oracle.subsetCertificates[mask],count=s.receiverId==='R_COUNT';
  const expectedBlocks=expectedCert.blocks.map(b=>({worldIds:b.worldIds,answers:b[count?'countAnswers':'releaseAnswers']}));
  const actualBlocks=s.globalCertificate.blocks.map(b=>({worldIds:b.worldIds,answers:b.answers}));
  check('model',`receiver ${o.index}`,actualLocal.status===expectedLocal.status&&actualLocal.answer===expectedLocal.answer&&eq(actualLocal.possibleAnswers,expectedLocal.possibleAnswers));
  check('model',`projection ${o.index}`,p.payloadHash===oracle.projectionPayloadHashes[String(mask)][wid]&&eq(Object.keys(s.payload.additions),expectedCert.fields)&&s.payload.sourceRef.dereferenceWithinReceiver===false&&!('worldId'in s.payload)&&!('fullSourceHash'in s.payload));
  check('model',`certificate ${o.index}`,eq(actualBlocks,expectedBlocks)&&s.globalCertificate.globallySufficient===expectedCert[count?'countGloballySufficient':'releaseGloballySufficient']&&eq(s.globalCertificate.conflictingPairs,count?[]:expectedCert.conflictingReleasePairs));
  check('provenance',`envelope ${o.index}`,s.sourceEnvelope.worldId===wid&&s.sourceEnvelope.fullSourceHash===oracle.worldSourceHashes[wid]&&eq(s.sourceEnvelope.sourceRecordFieldPaths,sourcePaths(mask))&&s.sourceEnvelope.revisionId===s.revisionId);
  check('parity',`semantic/info alignment ${o.index}`,eq(s.payload,i.payload)&&eq(s.receiverResult,i.receiverResult)&&s.receiverId===i.receiver.id&&s.revisionId===i.revision.id);
}
const designated=obs.filter(o=>/^(baseline|after-local|reopen|reload)-cp-/.test(o.label));
check('checkpoint','18 designated observed',designated.length===18);
for(const o of designated){
  const expected=cp.find(row=>row.seconds===o.published.semanticPayload.cursorSeconds);
  check('checkpoint',o.label,Boolean(expected)&&expected.referenceOnly===true&&hash(expected.payload)===o.published.semanticFingerprint&&eq(expected.payload,o.published.semanticPayload));
}
check('checkpoint','all four origin classes',designated.filter(o=>o.label.startsWith('baseline')).length===7&&designated.filter(o=>o.label.startsWith('after-local')).length===7&&designated.filter(o=>o.label.startsWith('reopen')).length===2&&designated.filter(o=>o.label.startsWith('reload')).length===2);
check('checkpoint','final paused zero',byLabel.get('final-default-viewport-paused-zero')?.published.semanticFingerprint===cp[0].semanticFingerprint&&byLabel.get('final-default-viewport-paused-zero')?.published.semanticPayload.paused===true);

const pair=(a,b)=>[byLabel.get(a),byLabel.get(b)];
for(const [name,a,b] of [['minimal repair diagram/plain','critical-apply-two-fields','critical-switch-plain'],['negative source diagram/plain','negative-source-open','negative-plain']]){
  const [x,y]=pair(a,b);check('parity',name,Boolean(x&&y)&&x.published.informationHash===y.published.informationHash&&x.published.semanticPayload.representation!==y.published.semanticPayload.representation);
}
check('first-use','receiver changes without source revision',byLabel.get('initial-count-summary').published.semanticPayload.receiverResult.answer==='yes'&&byLabel.get('critical-select-release').published.semanticPayload.receiverResult.status==='insufficient'&&byLabel.get('critical-select-release').published.payloadHash===byLabel.get('critical-open-source').published.payloadHash);
check('first-use','witness collision with conflicting full answers',(()=>{const w=byLabel.get('critical-open-witness').published.semanticPayload.selectedWitness;return w?.status==='collision'&&eq(w.pair,['W10','W11'])&&w.sourceAnswers.W10==='no'&&w.sourceAnswers.W11==='yes'&&eq(w.payloads.W10,w.payloads.W11);})());
check('first-use','repair separates witness and settles release',(()=>{const s=byLabel.get('critical-apply-two-fields').published.semanticPayload;return s.selectedWitness?.status==='separated'&&s.receiverResult.answer==='yes'&&s.globalCertificate.globallySufficient===true&&s.revisionId==='L1';})());
check('negative','one-field local no, globally insufficient',byLabel.get('negative-source-open').published.semanticPayload.receiverResult.answer==='no'&&byLabel.get('negative-source-open').published.semanticPayload.globalCertificate.globallySufficient===false&&byLabel.get('authorization-W00').published.semanticPayload.receiverResult.answer==='no'&&byLabel.get('authorization-W00').published.semanticPayload.globalCertificate.globallySufficient===false);

const expectedFields={L1:['calibration','authorization'],L2:['calibration'],L3:['authorization'],L4:[],L5:['paint'],L6:['calibration','authorization','paint'],L7:['calibration','authorization']};
const expectedParents={L1:'S0',L2:'S0',L3:'S0',L4:'S0',L5:'S0',L6:'S0',L7:'L1'};
check('revisions','seven retained local records',one.localRevisionHistory.length===7&&eq(one.localRevisionHistory.map(r=>r.id),Object.keys(expectedFields)));
for(const revision of one.localRevisionHistory){
  const mask=revision.fieldsAfter.reduce((n,f)=>n+fixture.repairMenu.find(m=>m.id===f).bit,0);
  const event=one.events.find(e=>e.eventId===revision.originEventReference);
  check('revisions',revision.id,eq(revision.fieldsAfter,expectedFields[revision.id])&&revision.parentId===expectedParents[revision.id]&&revision.parentReferenceOnly===(revision.parentId==='S0')&&revision.sourceFamilyHash===oracle.familyHash&&revision.provenance==='source_informed_software'&&eq(revision.payloadHashes,oracle.projectionPayloadHashes[String(mask)])&&Boolean(event)&&event.type==='repair-apply'&&event.intended.revisionId===revision.id&&event.intended.parentId===revision.parentId);
}
check('revisions','empty and duplicate retained unchanged',one.localRevisionHistory.find(r=>r.id==='L4')?.outcome==='unchanged-content'&&one.localRevisionHistory.find(r=>r.id==='L7')?.outcome==='unchanged-content'&&one.localRevisionHistory.find(r=>r.id==='L5')?.outcome==='new-content');
check('revisions','wrong shortcut exactly three',eq(byLabel.get('critical-apply-two-fields').published.informationPayload.wrongShortcut.disagreementWorlds,oracle.wrongShortcutFalsePositiveWorlds));

function verifyExport(name,record,expectedCount){
  check('exports',`${name} identity`,record.runId===expectedRun&&record.buildId===expectedBuild&&record.provenance==='source_informed_software'&&record.humanParticipants===0&&record.canonicalParentsReferenceOnly===true);
  check('exports',`${name} event prefix`,record.events.length===expectedCount&&record.includedThroughSequence===expectedCount&&record.events.at(-1)?.type==='local-export'&&record.events.at(-1)?.sequence===expectedCount);
  check('exports',`${name} event IDs`,record.events.every((e,j)=>e.sequence===j+1&&e.eventId===`${expectedRun}-ui:${j+1}`&&e.documentId===record.documentId&&e.runId===expectedRun&&e.buildId===expectedBuild&&e.beforeSemanticFingerprint?.length===64&&e.afterSemanticFingerprint?.length===64));
  check('exports',`${name} event provenance`,record.events.every(e=>e.result==='accepted'&&e.origin==='user-control'?e.provenance==='source_informed_software'&&e.actor==='source_informed_software_ui':e.origin!=='user-control'&&e.provenance==='scripted_demonstration'));
  check('exports',`${name} UTC order`,record.events.every((e,j)=>j===0||Date.parse(record.events[j-1].atUtc)<=Date.parse(e.atUtc)));
  check('exports',`${name} source hashes`,record.sourceHashes.family===oracle.familyHash&&eq(record.sourceHashes.worlds,oracle.worldSourceHashes));
}
verifyExport('document one',one,56);verifyExport('document two',two,21);
check('exports','two distinct documents',one.documentId!==two.documentId&&two.documentId===natural.documentId&&one.localRevisionHistory.length===7&&two.localRevisionHistory.length===0);
check('exports','selected input/result provenance',eq(one.evaluatorInput,one.selectedRevision.payloads[one.sourceEnvelope.worldId])&&one.receiverResult.answer==='yes'&&one.globalCertificate.globallySufficient===true&&one.sourceEnvelope.fullSourceHash===oracle.worldSourceHashes[one.sourceEnvelope.worldId]);
const allowedGaps=two.events.slice(0,-1).map((a,j)=>({a,b:two.events[j+1]})).filter(({a,b})=>a.afterSemanticFingerprint!==b.beforeSemanticFingerprint);
check('events','same-time first-document chain',one.events.slice(0,-1).every((a,j)=>a.afterSemanticFingerprint===one.events[j+1].beforeSemanticFingerprint));
check('events','second-document gaps only clock advancement',allowedGaps.every(({a,b})=>b.cursorSeconds>a.cursorSeconds&&b.type!=='tour-stop'));
const scheduled=natural.events.filter(e=>e.origin!=='user-control');
const schedule=[['receiver-select','replay',4],['witness-open','replay',8],['repair-apply','replay',12],['repair-apply','replay',16],['representation-select','replay',20],['canonical-restore','replay',24],['tour-stop','automatic',24]];
check('natural','seven scheduled events exact',eq(scheduled.map(e=>[e.type,e.origin,e.cursorSeconds]),schedule));
check('natural','same boundary restore to stop chain',scheduled[5].afterSemanticFingerprint===scheduled[6].beforeSemanticFingerprint&&scheduled[6].intended.reason==='end-of-sequence');
const play=natural.events.find(e=>e.type==='tour-play'),stop=scheduled.at(-1),elapsed=(Date.parse(stop.atUtc)-Date.parse(play.atUtc))/1000;
check('natural','actual elapsed about 24 seconds',elapsed>=24&&elapsed<24.2);
check('natural','end DOM and active frames',byLabel.get('natural-tour-end').published.semanticPayload.cursorSeconds===24&&byLabel.get('natural-tour-end').published.semanticPayload.paused===true&&byLabel.get('natural-tour-end').published.semanticPayload.endReason==='end-of-sequence'&&['natural-active-a','natural-active-b','natural-active-c'].every(label=>byLabel.get(label).published.semanticPayload.paused===false));
check('natural','12 boundary in event and paused CP',scheduled[2].cursorSeconds===12&&byLabel.get('baseline-cp-12').published.semanticPayload.receiverResult.status==='insufficient');

function jpegSize(buffer){let offset=2;if(buffer[0]!==0xff||buffer[1]!==0xd8)throw Error('not jpeg');while(offset<buffer.length){if(buffer[offset]!==0xff){offset++;continue;}const marker=buffer[++offset];offset++;if(marker===0xd9||marker===0xda)break;if(marker>=0xd0&&marker<=0xd7)continue;const length=buffer.readUInt16BE(offset);if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {height:buffer.readUInt16BE(offset+3),width:buffer.readUInt16BE(offset+5)};offset+=length;}throw Error('JPEG size marker missing');}
for(const shot of shots){
  const file=path.join(full,shot.path),content=bytes(file),dimensions=jpegSize(content),before=obs[shot.beforeObservation],after=obs[shot.afterObservation];
  check('images',shot.name,content.length===shot.bytes&&shaBytes(content)===shot.sha256&&dimensions.width===shot.viewport.width&&dimensions.height===shot.viewport.height&&shot.runId===expectedRun&&shot.buildId===expectedBuild&&before&&after&&before.published.semanticFingerprint===after.published.semanticFingerprint&&before.published.viewport.width===shot.viewport.width&&after.published.viewport.width===shot.viewport.width);
}
check('images','six distinct named originals',shots.length===6&&new Set(shots.map(s=>s.name)).size===6);
const oldIdentity=load(path.join(evidence,'browser-002/historical-replay-identity.json'));
const oldInspector=JSON.parse(oldIdentity.inspector);
const oldResults=fs.readFileSync(path.join(evidence,'browser-002/historical-results-dom.txt'),'utf8');
check('historical','actual Gate10 paused replay identity',oldInspector.runId==='G10-PREDICT-003'&&oldInspector.buildId==='g10-9e34f791d83c1cd7a495'&&oldInspector.semanticPayload.cursorSeconds===0&&oldInspector.semanticPayload.paused===true);
check('historical','separate Gate10 negative results label',oldResults.includes('Bounded negative · Prediction instrument not ready'));

const groups={};for(const row of checks){groups[row.group]??={passed:0,total:0};groups[row.group].total++;if(row.pass)groups[row.group].passed++;}
const failed=checks.filter(x=>!x.pass);
const report={schema:'gate11-independent-final-core-verification-v1',status:failed.length?'FAIL':'PASS',runId:expectedRun,buildId:expectedBuild,closedCoreSha256:sha(freezePath),coreEntries:freeze.entries.length,priorFrozenEntries:prior.length,fullObservations:obs.length,fullHostActions:actions.length,fullOriginals:shots.length,designatedCheckpoints:designated.length,localRevisionCount:one.localRevisionHistory.length,naturalElapsedSeconds:elapsed,naturalScheduledEvents:scheduled.length,firstDocumentEventCount:one.events.length,secondDocumentEventCount:two.events.length,groups,failed,qualifications:['First candidate001 remains blocked by separately reproduced atomic publication race.','First candidate002 object acquisition is transport-limited and preserved separately; only browser-002-full supports complete 100/100 hash checks.','The natural 12-second boundary is present in a scheduled event and paused checkpoint, without a separate active DOM observation during 12–16 seconds.','One oversized single-string read failed after a successful export; the action records captureError and a read-only shallow-chunk retry supplied the complete observation.','No human participants, learning outcome, or diagram advantage were measured.']};
fs.writeFileSync(path.join(audit,'final-core-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,groups,failed:failed.slice(0,20),failedCount:failed.length,naturalElapsedSeconds:elapsed}));
if(failed.length)process.exitCode=1;
