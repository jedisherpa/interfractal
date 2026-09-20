// Read-only independent Gate 12 closed-core verification. No runtime implementation imports.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'../..');
const load=async p=>readFile(resolve(root,p));
const json=async p=>JSON.parse(await load(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const canon=x=>Array.isArray(x)?`[${x.map(canon).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canon(x[k])}`).join(',')}}`:JSON.stringify(x);
const hash=x=>sha(Buffer.from(canon(x)));
const errors=[],checks=[];
function check(name,pass,detail){checks.push({name,pass:!!pass});if(!pass)errors.push({name,detail});}
function same(a,b){return canon(a)===canon(b);}

const freeze=await json('evidence/gate-12/CORE_EVIDENCE_FREEZE.json');
const freezeHash=sha(await load('evidence/gate-12/CORE_EVIDENCE_FREEZE.json'));
const coreFailures=[];
for(const item of freeze.files){const bytes=await load(item.path);if(bytes.length!==item.bytes||sha(bytes)!==item.sha256)coreFailures.push(item.path);}
check('102 closed core pins',freezeHash==='cdcbfb68c8fec722a217075d30c14b76e69803e753296fc3bde8a6ea936335f6'&&freeze.files.length===102&&coreFailures.length===0,coreFailures);

const priorManifests=['evidence/gate-0/GATE_0_FREEZE.json','evidence/gate-1/GATE_1_FREEZE.json','evidence/gate-2/GATE_2_FREEZE.json','evidence/gate-3/GATE_3_FREEZE.json','evidence/gate-4/GATE_4_FREEZE.json','evidence/gate-5/GATE_5_FREEZE.json','evidence/gate-6/GATE_6_FREEZE.json','evidence/gate-7/GATE_7_FREEZE.json','evidence/gate-8/GATE_8_FREEZE.json','evidence/gate-9/GATE_9_FREEZE.json','evidence/gate-10/FREEZE_MANIFEST.json','evidence/gate-11/FREEZE_MANIFEST.json'];
let priorCount=0;const priorFailures=[];
for(const path of priorManifests){const manifest=await json(path);for(const item of manifest.files){priorCount++;try{const bytes=await load(item.path);if(sha(bytes)!==item.sha256||(item.bytes!==undefined&&bytes.length!==item.bytes))priorFailures.push(item.path);}catch{priorFailures.push(item.path);}}}
check('1613 historical frozen entries',priorCount===1613&&priorFailures.length===0,priorFailures);

const obs=await json('evidence/gate-12/browser-002/observations.json');
const actions=await json('evidence/gate-12/browser-002/actions.json');
const fixture=await json('docs/gate-12/fixture.json');
const prespec=await json('audit/gate-12/prespec-derivation.json');
const run=await json('coordination/runs/G12-COORD-002/run.json');
const checkpoints=await json('coordination/runs/G12-COORD-002/checkpoints.json');
check('actual acquisition scope',obs.length===93&&actions.length===79&&obs.every((o,i)=>o.index===i)&&actions.every((a,i)=>a.index===i)&&actions.every(a=>!a.error));
check('observation and action brackets',actions.every(a=>Number.isInteger(a.beforeObservationIndex)&&Number.isInteger(a.afterObservationIndex)&&a.beforeObservationIndex>=0&&a.afterObservationIndex<obs.length&&a.beforeObservationIndex<a.afterObservationIndex));
const sourceHash=hash(fixture.sourceModes);
check('source identity',sourceHash===prespec.sourceHash&&sourceHash===run.sourceModesHash&&run.runId==='G12-COORD-002'&&run.buildId==='g12-3c5526361a7cb2cc5c4a');

const observationFailures={semantic:[],information:[],viewport:[],scene:[],identity:[],truncation:[],history:[]};
for(const o of obs){const p=o.published,s=p.semanticPayload,a=o.actual,v=p.viewport,sc=p.scene;
  if(hash(s)!==p.semanticFingerprint)observationFailures.semantic.push(o.index);
  if(hash(p.informationPayload)!==p.informationHash)observationFailures.information.push(o.index);
  if(!['width','height','scrollX','scrollY','documentWidth','documentHeight','horizontalOverflow'].every(k=>v[k]===a[k]))observationFailures.viewport.push(o.index);
  if(sc.width!==a.scene.width||sc.height!==a.scene.height||sc.representation!==s.representation)observationFailures.scene.push(o.index);
  if(p.runId!==run.runId||p.buildId!==run.buildId||p.sourceHash!==sourceHash||!(o.url.startsWith('http://127.0.0.1:44005/'))||p.documentId!==(o.index<78?obs[0].published.documentId:obs[78].published.documentId))observationFailures.identity.push(o.index);
  if(JSON.stringify(o).includes('[MaxDepth]')||JSON.stringify(o).includes('[Truncated]'))observationFailures.truncation.push(o.index);
  try{const h=JSON.parse(o.historyText);if(h.localBranchCount!==p.branchRegistry.filter(b=>!b.canonical).length||h.branchId!==p.selectedBranchId||h.proposalRecords.length!==Object.keys(p.selectedBranchRecord.proposals).length||h.outcomeRecords.length!==p.selectedBranchRecord.outcomes.length)observationFailures.history.push(o.index);}catch{observationFailures.history.push(o.index);}
}
for(const [kind,bad] of Object.entries(observationFailures))check(`93 ${kind} observations`,bad.length===0,bad);
check('two real document identities and local reload isolation',obs[0].published.documentId!==obs[78].published.documentId&&obs[77].published.branchRegistry.length===3&&obs[78].published.branchRegistry.length===1&&obs[78].published.semanticPayload.proposals&&Object.keys(obs[78].published.semanticPayload.proposals).length===0);
check('paused 1280 and 960 no horizontal overflow',obs.some(o=>o.actual.width===1280&&o.actual.height===720&&!o.actual.horizontalOverflow)&&obs.some(o=>o.actual.width===960&&o.actual.height===720&&!o.actual.horizontalOverflow)&&obs[92].actual.width===1280&&obs[92].actual.height===720);

const cpIndices=[15,16,17,18,19,20,21,67,68,69,70,71,72,73,75,76,79,80];
const cpSeconds=[0,4,8,12,16,20,24,0,4,8,12,16,20,24,0,24,0,24];
const cpBad=[];
for(let i=0;i<cpIndices.length;i++){const o=obs[cpIndices[i]],p=o.published,s=p.semanticPayload,expected=checkpoints.find(x=>x.seconds===cpSeconds[i]);if(s.cursorSeconds!==cpSeconds[i]||s.paused!==true||p.semanticFingerprint!==expected?.semanticFingerprint)cpBad.push(cpIndices[i]);}
check('18 designated paused checkpoint comparisons',cpBad.length===0&&checkpoints.length===7,cpBad);
for(const [a,b] of [[5,9],[44,45]])check(`diagram/plain information parity ${a}/${b}`,obs[a].published.informationHash===obs[b].published.informationHash&&obs[a].published.semanticPayload.representation==='diagram'&&obs[b].published.semanticPayload.representation==='plain');

const expectedStates={3:{status:'blocked-missing-proposal',selectedModeId:null,differentFirstChoices:null},5:{status:'procedure-selected',selectedModeId:'P2',differentFirstChoices:true},24:{status:'procedure-selected',selectedModeId:'P1',differentFirstChoices:true,tieBreakUsed:true},26:{status:'blocked-no-eligible-option',selectedModeId:null,differentFirstChoices:true},28:{status:'procedure-selected',selectedModeId:'P2',differentFirstChoices:true},44:{status:'procedure-selected',selectedModeId:'P3',differentFirstChoices:false},52:{status:'blocked-no-eligible-option',selectedModeId:null,differentFirstChoices:true},58:{status:'procedure-selected',selectedModeId:'P1',differentFirstChoices:true,tieBreakUsed:true}};
for(const [index,expected] of Object.entries(expectedStates)){const o=obs[Number(index)],actual=o.published.semanticPayload.currentOutcome;const text=o.visibleText.find(x=>x.selector==='#joint-result')?.text??'';check(`actual outcome at observation ${index}`,!!actual&&Object.entries(expected).every(([k,v])=>actual[k]===v)&&text.includes(actual.status)&&text.includes(actual.differentFirstChoices===true?'Different local recommendations retained':actual.differentFirstChoices===false?'Same modeled first choice':'Incomplete local records'),actual);}
check('earlier blocked inspection uses recorded context',obs[30].published.semanticPayload.inspectedOutcome?.status==='blocked-missing-proposal'&&obs[30].published.semanticPayload.inspectedOutcome?.scenarioId==='ALL');
check('earlier tie inspected under current ALL',obs[32].published.semanticPayload.scenarioId==='ALL'&&obs[32].published.semanticPayload.inspectedOutcome?.scenarioId==='EXTREMES'&&obs[32].published.semanticPayload.inspectedOutcome?.selectedModeId==='P1');
check('active samples exact and non-substitute',obs[86].published.semanticPayload.paused===false&&obs[86].published.semanticPayload.cursorSeconds>0&&obs[86].published.semanticPayload.cursorSeconds<4&&obs[87].published.semanticPayload.cursorSeconds>8&&obs[87].published.semanticPayload.cursorSeconds<12&&obs[88].published.semanticPayload.cursorSeconds>20&&obs[88].published.semanticPayload.cursorSeconds<24);

const exportsByName={local:await json('evidence/gate-12/browser-002/document-1-local-export.json'),final1:await json('evidence/gate-12/browser-002/document-1-final-export.json'),final2:await json('evidence/gate-12/browser-002/document-2-final-export.json')};
for(const [name,index] of [['local',62],['final1',77],['final2',90]]){const e=exportsByName[name];check(`export ${name} exact observed bytes`,same(e,JSON.parse(obs[index].exportText)));check(`export ${name} includes own event`,e.includedThroughSequence===e.events.length&&e.events.at(-1).type==='local-export'&&e.events.at(-1).sequence===e.includedThroughSequence&&e.humanParticipants===0);}
check('export prefixes and two document isolation',exportsByName.local.documentId===exportsByName.final1.documentId&&exportsByName.final1.documentId!==exportsByName.final2.documentId&&same(exportsByName.local.events,exportsByName.final1.events.slice(0,exportsByName.local.events.length))&&exportsByName.final2.localBranches.length===0);
check('all displayed export prefixes truthful',obs.filter(o=>o.exportText).every(o=>{let e;try{e=JSON.parse(o.exportText);}catch{return false;}const final=e.documentId===exportsByName.final1.documentId?exportsByName.final1:exportsByName.final2;return e.events.length===e.includedThroughSequence&&e.events.at(-1).type==='local-export'&&same(e.events,final.events.slice(0,e.events.length));}));

const branches=exportsByName.final1.localBranches;
check('two branches, four proposals, five outcomes, correct assignments',branches.length===2&&branches[0].id==='L1'&&branches[0].assignmentId==='BASE'&&branches[1].id==='L2'&&branches[1].assignmentId==='DETAIL_CONTROL'&&branches.reduce((n,b)=>n+Object.keys(b.proposals).length,0)===4&&branches.reduce((n,b)=>n+b.outcomes.length,0)===5);
const rankOrder={R_DETAIL:[...fixture.sourceModes].sort((a,b)=>b.retainedChannels-a.retainedChannels).map(x=>x.id),R_SPEED:[...fixture.sourceModes].sort((a,b)=>a.sendMinutes-b.sendMinutes).map(x=>x.id)};
const proposalErrors=[],outcomeErrors=[];
const events1=exportsByName.final1.events;
const byEvent1=new Map(events1.map(e=>[e.eventId,e]));
for(const branch of branches){for(const [g,r] of Object.entries(branch.proposals)){
  const assigned=fixture.referenceAssignments.find(x=>x.id===branch.assignmentId).referencesByGroup[g].id,ref=fixture.references.find(x=>x.id===assigned),metric=assigned==='R_DETAIL'?'retainedChannels':'sendMinutes',ordered=rankOrder[assigned],event=byEvent1.get(r.envelope.originEventReference);
  const expectedRanking=ordered.map((modeId,rank)=>({modeId,rank,referencedValue:fixture.sourceModes.find(x=>x.id===modeId)[metric],sourcePath:`sourceModes.${modeId}.${metric}`}));
  if(r.content.groupId!==g||r.content.reference.id!==assigned||r.content.reference.version!==ref.version||r.content.sourceHash!==sourceHash||!same(r.content.ranking,expectedRanking)||r.content.preferredModeId!==ordered[0]||r.content.provenance!=='source_informed_software'||r.contentHash!==hash(r.content)||r.envelope.branchId!==branch.id||r.envelope.documentId!==exportsByName.final1.documentId||event?.type!=='proposal-record'||event.intended.recordId!==r.envelope.recordId||event.intended.groupId!==g)proposalErrors.push(r.envelope.recordId);
  }
  for(const r of branch.outcomes){const c=r.content,present=Object.keys(c.proposalContentHashesByGroup),expected=prespec.outcomes.find(x=>x.assignmentId===branch.assignmentId&&x.scenarioId===c.scenarioId&&same(x.presentGroups,['ARCHIVE','DISPATCH'].filter(g=>present.includes(g)))),event=byEvent1.get(r.envelope.originEventReference);
    const valid=expected&&Object.keys(expected).filter(k=>k!=='presentGroups').every(k=>same(c[k],expected[k]))&&c.eligibleModeIds&&c.procedure.id==='MINIMAX_RANK'&&c.jointAction?.enacted!==true&&r.contentHash===hash(c)&&r.envelope.branchId===branch.id&&r.envelope.documentId===exportsByName.final1.documentId&&event?.type==='procedure-evaluate'&&event.intended.recordId===r.envelope.recordId&&event.intended.status===c.status&&present.every(g=>c.proposalContentHashesByGroup[g]===branch.proposals[g].contentHash&&r.envelope.proposalRecordIds[g]===branch.proposals[g].envelope.recordId);
    if(!valid)outcomeErrors.push(r.envelope.recordId);
  }
}
check('four local proposal mathematical/provenance records',proposalErrors.length===0,proposalErrors);
check('five local outcome mathematical/provenance records',outcomeErrors.length===0,outcomeErrors);
check('earlier immutable records survive later exports',exportsByName.local.localBranches.length===2&&branches.every((b,i)=>Object.entries(exportsByName.local.localBranches[i].proposals).every(([g,r])=>same(r,b.proposals[g]))&&exportsByName.local.localBranches[i].outcomes.every((r,j)=>same(r,b.outcomes[j]))));
const created=events1.filter(e=>e.type==='procedure-evaluate'&&e.intended.recordId),reused=events1.filter(e=>e.type==='procedure-evaluate'&&e.result==='reused');
check('five created outcomes and three honest reuses',created.length===5&&reused.length===3&&reused.every(e=>branches.some(b=>b.outcomes.some(r=>r.envelope.recordId===e.intended.reusedRecordId))));

function validateEvents(events,documentId){const bad=[],chains=[];for(let i=0;i<events.length;i++){const e=events[i];if(e.sequence!==i+1||e.eventId!==`G12-COORD-002-ui:${i+1}`||e.documentId!==documentId||e.runId!==run.runId||e.buildId!==run.buildId||!Number.isFinite(Date.parse(e.atUtc))||!/^[a-f0-9]{64}$/.test(e.beforeSemanticFingerprint)||!/^[a-f0-9]{64}$/.test(e.afterSemanticFingerprint)||!['user-control','replay','automatic'].includes(e.origin)||e.provenance!==(e.origin==='user-control'?'source_informed_software':'scripted_demonstration'))bad.push(i+1);
    if(i>0&&events[i-1].cursorSeconds===e.cursorSeconds){chains.push([i,i+1]);if(events[i-1].afterSemanticFingerprint!==e.beforeSemanticFingerprint)bad.push(`chain-${i}-${i+1}`);}
  }return {bad,chainCount:chains.length};}
const ev1=validateEvents(events1,exportsByName.final1.documentId),events2=exportsByName.final2.events,ev2=validateEvents(events2,exportsByName.final2.documentId);
check('54 event envelopes and 38 same-cursor chains',events1.length===54&&ev1.bad.length===0&&ev1.chainCount===38,ev1.bad);
check('18 second-document envelopes and 5 same-cursor chains',events2.length===18&&ev2.bad.length===0&&ev2.chainCount===5,ev2.bad);
for(const [obsIndex,eventSeq] of [[1,1],[2,2],[3,3],[4,4],[5,5],[9,6],[14,8],[21,15],[24,18],[26,20],[28,22],[30,23],[32,24],[44,35],[66,43],[77,54]])check(`actual state/event join ${obsIndex}/${eventSeq}`,obs[obsIndex].published.semanticFingerprint===events1[eventSeq-1].afterSemanticFingerprint);
for(const [obsIndex,eventSeq] of [[79,1],[80,2],[81,3],[82,4],[84,7],[85,8],[89,17],[90,18]])check(`second-document state/event join ${obsIndex}/${eventSeq}`,obs[obsIndex].published.semanticFingerprint===events2[eventSeq-1].afterSemanticFingerprint);

const scheduled=events2.filter(e=>e.origin==='replay'||e.origin==='automatic'),spec=fixture.savedTour.events;
check('natural eight scheduled event identities/order',scheduled.length===8&&scheduled.every((e,i)=>e.type===spec[i].type&&e.origin===spec[i].origin&&e.cursorSeconds===spec[i].seconds&&same(e.intended,spec[i].payload)));
check('natural 20 and 24 same-boundary chains',scheduled[4].afterSemanticFingerprint===scheduled[5].beforeSemanticFingerprint&&scheduled[6].afterSemanticFingerprint===scheduled[7].beforeSemanticFingerprint&&scheduled[7].intended.reason==='end-of-sequence');
const naturalDuration=(Date.parse(scheduled[7].atUtc)-Date.parse(events2[8].atUtc))/1000;
check('natural elapsed time and final stop',naturalDuration>=23.9&&naturalDuration<=24.2&&obs[89].published.semanticPayload.cursorSeconds===24&&obs[89].published.semanticPayload.paused===true&&obs[89].published.semanticPayload.endReason==='end-of-sequence'&&obs[91].published.semanticPayload.cursorSeconds===0&&obs[91].published.semanticPayload.paused===true,naturalDuration);

function jpegDimensions(bytes){if(bytes[0]!==0xff||bytes[1]!==0xd8)return null;let i=2;while(i<bytes.length){if(bytes[i]!==0xff){i++;continue;}while(bytes[i]===0xff)i++;const marker=bytes[i++];if(marker===0xd9||marker===0xda)break;if(marker===0xd8||marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;const size=bytes.readUInt16BE(i);if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {height:bytes.readUInt16BE(i+3),width:bytes.readUInt16BE(i+5)};i+=size;}return null;}
const images=await json('evidence/gate-12/browser-002/screenshots.json'),imageFailures=[];
for(const im of images){const bytes=await readFile(im.path),size=jpegDimensions(bytes),before=obs[im.beforeObservationIndex],after=obs[im.afterObservationIndex];if(bytes.length!==im.bytes||sha(bytes)!==im.sha256||!size||size.width!==before.actual.width||size.height!==before.actual.height||size.width!==after.actual.width||size.height!==after.actual.height||before.published.semanticFingerprint!==after.published.semanticFingerprint||before.published.informationHash!==after.published.informationHash||!before.label.endsWith('before-image')||!after.label.endsWith('after-image'))imageFailures.push(im.label);}
check('five original image hashes/dimensions/brackets',images.length===5&&imageFailures.length===0,imageFailures);

const links=await json('evidence/gate-12/historical-browser-links.json');
check('actual Gate11 historical replay/result visits',links.replay?.url==='http://127.0.0.1:44004/'&&links.replay?.domSnapshot?.includes('G11-RECEIVER-002')&&links.replay?.domSnapshot?.includes('g11-7ced826c903d40c5a0dd')&&links.results?.url==='http://127.0.0.1:44004/review/results.html');
const old=await json('evidence/gate-12/browser-001/acquisition-summary.json');
check('candidate001 failure preserved separately',old.status==='BLOCKED_RETAINED_OUTCOME_INSPECTION'&&old.observations===43&&old.hostActions===31&&old.originalImages===6);

const result={schema:'gate12-final-core-independent-verification-v1',status:errors.length?'BLOCKED':'PASS',coreFreezeSha256:freezeHash,corePinnedFiles:freeze.files.length,corePinFailures:coreFailures,historicalPinnedEntries:priorCount,historicalFailures:priorFailures,observations:obs.length,hostActions:actions.length,observationHashAndMetadataCounts:Object.fromEntries(Object.entries(observationFailures).map(([k,v])=>[k,{passed:obs.length-v.length,total:obs.length,badIndices:v}])),designatedCheckpointCount:cpIndices.length,checkpointFailures:cpBad,diagramPlainPairs:[[5,9],[44,45]],document1:{events:events1.length,branches:branches.length,proposals:branches.reduce((n,b)=>n+Object.keys(b.proposals).length,0),outcomes:branches.reduce((n,b)=>n+b.outcomes.length,0),reusedEvaluations:reused.length},document2:{events:events2.length,naturalScheduled:scheduled.length,naturalDurationSeconds:naturalDuration,activeObservedIndices:[86,87,88],missingSeparateActiveWindows:['4–8','12–16','16–20']},originalImages:images.length,checkCount:checks.length,passCount:checks.length-errors.length,errors,checks,humanParticipants:0,scope:'read-only closed-core, model, provenance, event and historical-byte audit; no human outcome'};
await writeFile(resolve(root,'audit/gate-12/final-core-verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checkCount:result.checkCount,passCount:result.passCount,errors:result.errors,corePins:result.corePinnedFiles,historical:result.historicalPinnedEntries,observations:result.observations,checkpointCount:result.designatedCheckpointCount,naturalDurationSeconds:result.document2.naturalDurationSeconds},null,2));
