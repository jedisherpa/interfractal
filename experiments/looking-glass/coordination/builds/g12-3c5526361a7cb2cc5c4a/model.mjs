export const clone=x=>structuredClone(x);
export function canonical(x){return Array.isArray(x)?`[${x.map(canonical).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`:JSON.stringify(x);}
export async function hash(x){const bytes=new TextEncoder().encode(canonical(x)),digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');}
const groups=['ARCHIVE','DISPATCH'],modes=['P1','P2','P3'];
const reject=message=>{throw Error(message);};
export function validateFixture(f){
  if(!f||f.schema!=='gate12-public-fixture-v1'||canonical(f.fixedModeOrder)!==canonical(modes)||canonical(f.groups.map(x=>x.id))!==canonical(groups))reject('invalid fixture identity');
  if(f.sourceModes.length!==3||f.sourceModes.some((x,i)=>x.id!==modes[i]||!Number.isSafeInteger(x.retainedChannels)||!Number.isSafeInteger(x.sendMinutes)||x.retainedChannels<0||x.sendMinutes<0))reject('invalid source modes');
  for(const id of ['R_DETAIL','R_SPEED'])if(!f.references.some(x=>x.id===id&&x.version===1))reject('invalid references');
  if(canonical(f.procedure.tieBreakOrder)!==canonical(modes)||f.procedure.id!=='MINIMAX_RANK'||f.procedure.version!==1)reject('invalid procedure');return true;
}
export function assignment(f,id){const x=f.referenceAssignments.find(x=>x.id===id);if(!x)reject('unknown assignment');return x;}
export function scenario(f,id){const x=f.availabilityScenarios.find(x=>x.id===id);if(!x||x.eligibleModeIds.some(m=>!modes.includes(m))||new Set(x.eligibleModeIds).size!==x.eligibleModeIds.length)reject('unknown/invalid scenario');return x;}
export function reference(f,id){const x=f.references.find(x=>x.id===id);if(!x||x.version!==1)reject('unknown reference');return x;}
export function rankModes(f,referenceId){validateFixture(f);const metric=referenceId==='R_DETAIL'?'retainedChannels':referenceId==='R_SPEED'?'sendMinutes':reject('unknown reference');const sorted=[...f.sourceModes].sort((a,b)=>referenceId==='R_DETAIL'?b[metric]-a[metric]||modes.indexOf(a.id)-modes.indexOf(b.id):a[metric]-b[metric]||modes.indexOf(a.id)-modes.indexOf(b.id));return sorted.map((mode,rank)=>({modeId:mode.id,rank,referencedValue:mode[metric],sourcePath:`sourceModes.${mode.id}.${metric}`}));}
export function proposalContent(f,assignmentId,groupId,sourceHash,provenance){
  validateFixture(f);if(!groups.includes(groupId))reject('unknown group');if(!['source_informed_software','scripted_demonstration'].includes(provenance))reject('invalid provenance');
  const assigned=assignment(f,assignmentId).referencesByGroup[groupId],ref=reference(f,assigned?.id);if(assigned.version!==ref.version)reject('reference version mismatch');
  const ranking=rankModes(f,ref.id);return {groupId,reference:{id:ref.id,version:ref.version,question:ref.question,ordering:ref.ordering,scope:ref.scope},sourceHash,ranking,preferredModeId:ranking[0].modeId,derivation:`${ref.id}@${ref.version}: ordered ${ranking.map(x=>`${x.modeId}=${x.referencedValue}`).join(', ')}; rank 0 is first over all three modes.`,provenance};
}
export async function makeProposal(f,assignmentId,groupId,sourceHash,provenance,envelope){const content=proposalContent(f,assignmentId,groupId,sourceHash,provenance);return {content,contentHash:await hash(content),envelope:clone(envelope)};}
const exactKeys=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&canonical(Object.keys(o).sort())===canonical([...keys].sort());
export async function evaluateProcedure(f,sourceHash,assignmentId,proposalsByGroup,scenarioId,procedureId){
  validateFixture(f);assignment(f,assignmentId);const available=scenario(f,scenarioId);if(procedureId!=='MINIMAX_RANK')reject('unknown procedure');
  if(!proposalsByGroup||typeof proposalsByGroup!=='object'||Array.isArray(proposalsByGroup)||Object.keys(proposalsByGroup).some(x=>!groups.includes(x)))reject('invalid proposal groups');
  const present={};for(const groupId of groups)if(Object.hasOwn(proposalsByGroup,groupId)){
    const record=proposalsByGroup[groupId];if(!record||!exactKeys(record.content,['groupId','reference','sourceHash','ranking','preferredModeId','derivation','provenance'])||record.content.groupId!==groupId||record.content.sourceHash!==sourceHash)reject('invalid proposal content/source');
    const expected=proposalContent(f,assignmentId,groupId,sourceHash,record.content.provenance);if(canonical(record.content)!==canonical(expected)||record.contentHash!==await hash(record.content))reject('proposal binding/hash mismatch');present[groupId]=record;
  }
  const missingGroupIds=groups.filter(g=>!present[g]),firstChoicesByGroup=Object.fromEntries(groups.filter(g=>present[g]).map(g=>[g,present[g].content.preferredModeId]));
  const differentFirstChoices=missingGroupIds.length?null:firstChoicesByGroup.ARCHIVE!==firstChoicesByGroup.DISPATCH;
  const base={assignmentId,scenarioId,eligibleModeIds:clone(available.eligibleModeIds),proposalContentHashesByGroup:Object.fromEntries(groups.filter(g=>present[g]).map(g=>[g,present[g].contentHash])),procedure:{id:f.procedure.id,version:f.procedure.version,question:f.procedure.question,score:f.procedure.score,tieBreakOrder:clone(f.procedure.tieBreakOrder)},status:null,missingGroupIds,scoreRows:[],tiedMinimizers:[],selectedModeId:null,tieBreakUsed:false,firstChoicesByGroup,differentFirstChoices,matchesFirstChoiceByGroup:{ARCHIVE:null,DISPATCH:null},jointAction:null};
  if(missingGroupIds.length){base.status='blocked-missing-proposal';return base;}
  if(!available.eligibleModeIds.length){base.status='blocked-no-eligible-option';return base;}
  base.scoreRows=available.eligibleModeIds.map(modeId=>{const ranksByGroup=Object.fromEntries(groups.map(g=>[g,present[g].content.ranking.find(r=>r.modeId===modeId).rank]));return {modeId,ranksByGroup,worstRank:Math.max(...Object.values(ranksByGroup))};});
  const best=Math.min(...base.scoreRows.map(x=>x.worstRank));base.tiedMinimizers=f.procedure.tieBreakOrder.filter(m=>base.scoreRows.some(r=>r.modeId===m&&r.worstRank===best));base.selectedModeId=base.tiedMinimizers[0];base.tieBreakUsed=base.tiedMinimizers.length>1;base.status='procedure-selected';base.jointAction={operation:'simulate-shared-export',modeId:base.selectedModeId,slotCount:1,enacted:false};base.matchesFirstChoiceByGroup=Object.fromEntries(groups.map(g=>[g,base.selectedModeId===firstChoicesByGroup[g]]));return base;
}
export async function makeOutcome(f,sourceHash,assignmentId,proposals,scenarioId,envelope){const content=await evaluateProcedure(f,sourceHash,assignmentId,proposals,scenarioId,'MINIMAX_RANK');return {content,contentHash:await hash(content),envelope:clone(envelope)};}
export function initialState(f){return clone(f.initialState);}
export function checkpointState(f,seconds){if(!f.savedTour.checkpoints.includes(seconds))reject('invalid checkpoint');const s=initialState(f);s.cursorSeconds=seconds;if(seconds>=4&&seconds<24)s.recordedGroups=['ARCHIVE'];if(seconds>=8&&seconds<24)s.recordedGroups=['ARCHIVE','DISPATCH'];if(seconds>=12&&seconds<20)s.currentOutcomeId='C-A-ALL';if(seconds>=16&&seconds<24)s.representation='plain';if(seconds>=20&&seconds<24){s.scenarioId='EXTREMES';s.currentOutcomeId='C-A-EXTREMES';}if(seconds===24)s.endReason='end-of-sequence';return s;}
export function derive(f,sourceHash,state,branch,branches){
  const recorded=Object.fromEntries(state.recordedGroups.filter(g=>branch.proposals[g]).map(g=>[g,clone(branch.proposals[g].content)]));
  const current=state.currentOutcomeId?branch.outcomes.find(o=>o.envelope.recordId===state.currentOutcomeId):null;
  const inspected=state.inspectedOutcomeId?branch.outcomes.find(o=>o.envelope.recordId===state.inspectedOutcomeId):null;
  const activeOutcome=current?clone(current.content):null,inspectedOutcome=inspected?clone(inspected.content):null;
  const semanticPayload={schema:'gate12-semantic-v1',mode:state.mode,representation:state.representation,cursorSeconds:state.cursorSeconds,paused:state.paused,endReason:state.endReason,assignmentId:state.assignmentId,scenarioId:state.scenarioId,recordedGroups:clone(state.recordedGroups),proposals:recorded,currentOutcome:activeOutcome,inspectedOutcome,sourceInspectorOpen:state.sourceInspectorOpen,recordInspectorOpen:state.recordInspectorOpen};
  const informationPayload={schema:'gate12-information-v1',sourceModes:clone(f.sourceModes),sourceHash,references:clone(f.references),assignment:clone(assignment(f,state.assignmentId)),scenario:clone(scenario(f,state.scenarioId)),procedure:clone(f.procedure),proposals:recorded,currentOutcome:activeOutcome,inspectedOutcome,sourceInspectorOpen:state.sourceInspectorOpen,recordInspectorOpen:state.recordInspectorOpen,selectedBranchHistory:{assignmentId:branch.assignmentId,proposals:Object.fromEntries(Object.entries(branch.proposals).map(([g,r])=>[g,{content:r.content,contentHash:r.contentHash}])),outcomes:branch.outcomes.map(o=>({content:o.content,contentHash:o.contentHash}))},branchIndex:branches.map(b=>({assignmentId:b.assignmentId,proposalCount:Object.keys(b.proposals).length,outcomeCount:b.outcomes.length}))};
  return {semanticPayload,informationPayload};
}
