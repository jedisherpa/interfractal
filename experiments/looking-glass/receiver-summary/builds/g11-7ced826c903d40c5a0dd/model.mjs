import {evaluateReceiver} from './receiver.mjs';
export const clone=x=>structuredClone(x);
export function canonical(x){return Array.isArray(x)?`[${x.map(canonical).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`:JSON.stringify(x);}
export async function hash(x){const bytes=new TextEncoder().encode(canonical(x)),result=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(result)].map(n=>n.toString(16).padStart(2,'0')).join('');}
export const fieldOrder=['calibration','authorization','paint'];
export function ordered(fields){if(!Array.isArray(fields)||fields.some(x=>!fieldOrder.includes(x)))throw Error('unknown menu field');return fieldOrder.filter(x=>fields.includes(x));}
export function fullAnswer(world,receiverId){
  const {LOT,CAL,AUTH}=world.records;
  if(LOT?.id!=='LOT'||!Number.isSafeInteger(LOT.units)||CAL?.id!=='CAL'||CAL?.lotId!=='LOT'||AUTH?.id!=='AUTH'||AUTH?.lotId!=='LOT')throw Error('invalid full-source binding');
  if(receiverId==='R_COUNT')return LOT.units>=4?'yes':'no';
  if(receiverId==='R_RELEASE')return LOT.units>=4&&CAL.status==='current'&&AUTH.status==='approved'?'yes':'no';
  throw Error('unknown receiver');
}
export function project(fixture,world,fields){
  const selected=ordered(fields),payload=clone(fixture.baseSummaryPayload);
  for(const name of selected){const menu=fixture.repairMenu.find(x=>x.id===name),source=world.records[menu.sourceRecord];const entry={};for(const [dest,field] of Object.entries(menu.copy))entry[dest]=source[field];entry.sourceRef=clone(menu.sourceRef);payload.additions[name]=entry;}
  return payload;
}
export async function sourceHashes(fixture){
  const worlds={};for(const w of fixture.worlds)worlds[w.id]=await hash(w.records);
  return {family:await hash(fixture.worlds),worlds};
}
export function envelope(fixture,world,revisionId,fields,originEventReference,hashes){
  const paths=['records.LOT.id','records.LOT.assetType','records.LOT.units'];
  for(const name of ordered(fields)){const menu=fixture.repairMenu.find(x=>x.id===name);for(const field of Object.values(menu.copy))paths.push(`records.${menu.sourceRecord}.${field}`);}
  return {worldId:world.id,fullSourceHash:hashes.worlds[world.id],sourceRecordFieldPaths:paths,projectionRule:'copy-selected-source-fields/v1',revisionId,originEventReference};
}
export async function makeRevision(fixture,hashes,{id,parentId,fieldsBefore,requestedFields,triggerReceiverId,provenance,originEventReference,parentReferenceOnly=false}){
  const requested=ordered(requestedFields),fieldsAfter=ordered([...fieldsBefore,...requested]),effectiveAddedFields=fieldsAfter.filter(x=>!fieldsBefore.includes(x));
  const payloads={},payloadHashes={},envelopes={};
  for(const world of fixture.worlds){payloads[world.id]=project(fixture,world,fieldsAfter);payloadHashes[world.id]=await hash(payloads[world.id]);envelopes[world.id]=envelope(fixture,world,id,fieldsAfter,originEventReference,hashes);}
  const revision={id,parentId,parentReferenceOnly,fieldsBefore:ordered(fieldsBefore),requestedFields:requested,effectiveAddedFields,fieldsAfter,triggerReceiverId,provenance,originEventReference,sourceFamilyHash:hashes.family,payloads,payloadHashes,envelopes,outcome:effectiveAddedFields.length?'new-content':'unchanged-content'};
  revision.contentHash=await hash({fieldsAfter,payloadHashes,sourceFamilyHash:hashes.family});
  revision.historyHash=await hash(revision);return revision;
}
export function certificate(fixture,receiverId,fields){
  const selected=ordered(fields),groups=new Map();
  for(const world of fixture.worlds){const payload=project(fixture,world,selected),key=canonical(payload);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(world);}
  const blocks=[...groups.values()].map(worlds=>{
    const worldIds=worlds.map(w=>w.id).sort(),answers=[...new Set(worlds.map(w=>fullAnswer(w,receiverId)))].sort(),conflictingPairs=[];
    for(let i=0;i<worlds.length;i++)for(let j=i+1;j<worlds.length;j++)if(fullAnswer(worlds[i],receiverId)!==fullAnswer(worlds[j],receiverId))conflictingPairs.push([worlds[i].id,worlds[j].id].sort());
    return {worldIds,answers,conflictingPairs:conflictingPairs.sort((a,b)=>canonical(a).localeCompare(canonical(b)))};
  }).sort((a,b)=>a.worldIds[0].localeCompare(b.worldIds[0]));
  return {receiverId,fields:selected,blocks,globallySufficient:blocks.every(b=>b.answers.length===1),conflictingPairs:blocks.flatMap(b=>b.conflictingPairs)};
}
export async function allCertificates(fixture){
  const out=[];for(let mask=0;mask<8;mask++){const fields=fieldOrder.filter((_,i)=>mask&(1<<i));for(const receiverId of ['R_COUNT','R_RELEASE']){const c=certificate(fixture,receiverId,fields);c.subsetMask=mask;c.partitionHash=await hash(c.blocks.map(b=>b.worldIds));c.certificateHash=await hash({receiverId,fields,blocks:c.blocks,globallySufficient:c.globallySufficient});out.push(c);}}
  return out;
}
export function witness(fixture,revision,pair,receiverId){if(!pair)return null;const [a,b]=pair.map(id=>fixture.worlds.find(w=>w.id===id));if(!a||!b||a.id===b.id)throw Error('invalid witness pair');const pa=revision.payloads[a.id],pb=revision.payloads[b.id];return {pair:[a.id,b.id],status:canonical(pa)===canonical(pb)?'collision':'separated',payloads:{[a.id]:pa,[b.id]:pb},sourceAnswers:{[a.id]:fullAnswer(a,receiverId),[b.id]:fullAnswer(b,receiverId)},sourceWorlds:{[a.id]:a.records,[b.id]:b.records}};}
export function initialState(fixture){return clone(fixture.initialState);}
export function checkpointState(fixture,seconds){
  if(!fixture.savedTour.checkpointSeconds.includes(seconds))throw Error('invalid checkpoint');const s=initialState(fixture);s.cursorSeconds=seconds;
  if(seconds>=4&&seconds<24)s.receiverId='R_RELEASE';if(seconds>=8&&seconds<24)s.witnessPair=['W10','W11'];if(seconds>=12&&seconds<24)s.revisionId='S1';if(seconds>=16&&seconds<24)s.revisionId='S2';if(seconds>=20&&seconds<24)s.representation='plain';if(seconds===24)s.endReason='end-of-sequence';return s;
}
export function derive(fixture,state,registry,certificates,hashes){
  const revision=registry[state.revisionId],world=fixture.worlds.find(w=>w.id===state.worldId);if(!revision||!world)throw Error('missing revision/world');
  const payload=revision.payloads[world.id],receiverResult=evaluateReceiver(payload,state.receiverId),globalCertificate=certificates.find(c=>c.receiverId===state.receiverId&&canonical(c.fields)===canonical(revision.fieldsAfter));
  const parentResult=revision.parentId&&registry[revision.parentId]?evaluateReceiver(registry[revision.parentId].payloads[world.id],state.receiverId):null;
  const selectedWitness=witness(fixture,revision,state.witnessPair,state.receiverId),source=state.fullSourceOpen?clone(world.records):null;
  const wrongShortcut={label:fixture.wrongShortcut.label,disagreementWorlds:fixture.worlds.filter(w=>fullAnswer(w,'R_COUNT')!==fullAnswer(w,'R_RELEASE')).map(w=>w.id)};
  const common={receiver:clone(fixture.receivers.find(r=>r.id===state.receiverId)),worldId:world.id,revision:clone(revision),parentResult:clone(parentResult),payload:clone(payload),receiverResult:clone(receiverResult),globalCertificate:clone(globalCertificate),selectedWitness:clone(selectedWitness),fullSource:source,sourceEnvelope:clone(revision.envelopes[world.id]),wrongShortcut};
  const semanticPayload={schema:'gate11-semantic-v1',mode:state.mode,cursorSeconds:state.cursorSeconds,paused:state.paused,endReason:state.endReason,representation:state.representation,worldId:state.worldId,receiverId:state.receiverId,revisionId:state.revisionId,repairDraft:clone(state.repairDraft),witnessPair:clone(state.witnessPair),fullSourceOpen:state.fullSourceOpen,certificateOpen:state.certificateOpen,revisionContentHash:revision.contentHash,payload:clone(payload),receiverResult:clone(receiverResult),globalCertificate:clone(globalCertificate),selectedWitness:clone(selectedWitness),fullSource:source,sourceEnvelope:clone(revision.envelopes[world.id]),sourceFamilyHash:hashes.family};
  const informationPayload={schema:'gate11-information-v1',...common,certificateOpen:state.certificateOpen,fullSourceOpen:state.fullSourceOpen,revisionHistory:clone(Object.values(registry)),allCertificates:state.certificateOpen?clone(certificates):null,repairDraft:clone(state.repairDraft),relationTypes:clone(fixture.relationTypes)};
  return {semanticPayload,informationPayload,common};
}
