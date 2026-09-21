export const RUN_ID='G6-LOCAL-002';
export const DURATION_MS=30_000,SAMPLE_MS=100,STEP_MS=1_000;
export const CHECKPOINTS_MS=[0,5000,10000,15000,20000,25000,30000];
export const AUTHOR='Gate 6 synthetic fixture editor; AI-authored simulation';
export const CONTEXTS=[
  {id:'G6_LOCAL_HALL',label:'Hall local context',focusId:'venue-hall',recordIds:['venue-hall','weather-context'],localReferenceId:'R_CAPACITY_60'},
  {id:'G6_LOCAL_FIELD',label:'Field local context',focusId:'venue-field',recordIds:['venue-field','weather-context'],localReferenceId:'R_EXISTING_ACCESS'}
];
export const CLAIM={id:'G6-CLAIM-TRANSFER',from:'G6_LOCAL_HALL',to:'G6_LOCAL_FIELD',type:'transfers-resource',status:'unsupported',
  sourceIds:[],evidencePointers:[],includedInSupportedTraversal:false,
  wording:'Claimed Hall→Field resource transfer; no supplied record supports it.',
  nonInference:'A drawn link or short distance establishes no transfer, authority, capability or influence.'};
export function clampTime(ms){if(!Number.isFinite(Number(ms)))throw new TypeError('Finite time required');return Math.max(0,Math.min(DURATION_MS,Math.round(Number(ms)/SAMPLE_MS)*SAMPLE_MS));}
export function scheduledAt(ms){const t=clampTime(ms);return {
  referenceId:t>=5000&&t<10000?'R_EXISTING_ACCESS':'R_CAPACITY_60',
  requirementVersion:t>=20000&&t<30000?2:1,summaryVersion:t>=20000&&t<30000?3:t>=15000&&t<20000?2:1,
  expandedIds:t>=15000&&t<30000?['G6_LOCAL_HALL','G6_LOCAL_FIELD']:[],selectedContextId:null,
  traceMode:t>=20000&&t<30000?'requirement':t>=15000&&t<20000?'budget':'none',traceLocalId:null,
  alternativesOpen:t>=25000&&t<30000,claimsOpen:t>=25000&&t<30000,
  inspectedRelationId:t>=25000&&t<30000?CLAIM.id:null,view:'graph',layout:'ordinary',inspectorOpen:false,sourceListOpen:false};}
export function mapRecord(r,id){if(r.kind!=='venue')return {status:'unmapped',answer:null,reason:'Context record outside this venue criterion.'};
  if(id==='R_CAPACITY_60')return {status:'mapped',answer:r.facts.capacityHouseholds>=60?'yes':'no',reason:`${r.facts.capacityHouseholds} households ${r.facts.capacityHouseholds>=60?'meets':'is below'} the 60-household threshold.`};
  if(id==='R_EXISTING_ACCESS')return {status:'mapped',answer:r.facts.alreadyWheelchairAccessible?'yes':'no',reason:r.facts.alreadyWheelchairAccessible?'Already accessible.':`Requires ${r.facts.requiredAccessEquipment.name}.`};
  throw Error(`Unknown reference ${id}`);}
export function dependencies(v,w){const f=v.facts;
  const hire={id:`${v.id}:hire`,kind:'venue-hire',label:'Venue hire',costTokens:f.hireTokens,sourceId:v.id,recordSha256:v.contentSha256,evidencePointers:[`${v.id}.facts.hireTokens`]};
  const requiredEquipment=[];
  if(f.requiredAccessEquipment)requiredEquipment.push({id:`${v.id}:access`,kind:'access',label:f.requiredAccessEquipment.name,costTokens:f.requiredAccessEquipment.costTokens,sourceId:v.id,recordSha256:v.contentSha256,evidencePointers:[`${v.id}.facts.requiredAccessEquipment`],availability:'unknown-not-supplied'});
  if(f.requiredPowerEquipment)requiredEquipment.push({id:`${v.id}:power`,kind:'power',label:f.requiredPowerEquipment.name,costTokens:f.requiredPowerEquipment.costTokens,sourceId:v.id,recordSha256:v.contentSha256,evidencePointers:[`${v.id}.facts.requiredPowerEquipment`],availability:'unknown-not-supplied'});
  if(w.facts.rainCertain&&f.shelterRequiredInRain)requiredEquipment.push({id:`${v.id}:shelter`,kind:'rain-shelter',label:'Rain shelter',costTokens:f.shelterCostTokens,sourceId:v.id,recordSha256:v.contentSha256,evidencePointers:[`${v.id}.facts.shelterRequiredInRain`,`${v.id}.facts.shelterCostTokens`,`${w.id}.facts.rainCertain`],contextSourceId:w.id,contextSourceSha256:w.contentSha256,availability:'unknown-not-supplied'});
  return {hire,requiredEquipment,venueEquipmentCostTokens:hire.costTokens+requiredEquipment.reduce((sum,e)=>sum+e.costTokens,0),availability:'unknown-not-supplied'};}
export function receiver(version){if(![1,2].includes(version))throw Error('Receiver version');return {id:'G6_RECEIVER',version,minimumCapacityHouseholds:version===1?60:70,maximumVenueEquipmentCostTokens:8,scope:'Listed venue plus required equipment numeric screen with explicit obligations; availability and full event feasibility unknown',author:AUTHOR,trigger:version===1?'Initial synthetic receiving task':'Derivative requirement capacity 60→70; Gate 2 facts and references unchanged'};}
export function evaluateOutward(p){const fields=['candidateCapacityHouseholds','venueEquipmentCostTokens','requiredEquipment','requiredEquipmentComplete','receiverId','receiverVersion','receiverMinimumCapacityHouseholds','receiverMaximumVenueEquipmentCostTokens'];
  const missingFields=fields.filter(k=>!Object.hasOwn(p,k)||p[k]===null);
  if(p.requiredEquipmentComplete!==undefined&&p.requiredEquipmentComplete!==true)missingFields.push('requiredEquipmentComplete.true');
  if(Array.isArray(p.requiredEquipment)&&p.requiredEquipment.some(e=>!e||typeof e.id!=='string'||typeof e.label!=='string'||!Number.isInteger(e.costTokens)||e.costTokens<0||!Array.isArray(e.evidence)||e.evidence.length===0||e.evidence.some(x=>!x.recordId||!x.contentSha256||!x.field)))missingFields.push('requiredEquipment.completeEvidence');
  if(Object.hasOwn(p,'requiredEquipment')&&!Array.isArray(p.requiredEquipment))missingFields.push('requiredEquipment.array');
  if(Object.hasOwn(p,'receiverId')&&(p.receiverId!=='G6_RECEIVER'||![1,2].includes(p.receiverVersion)||
    p.receiverMinimumCapacityHouseholds!==(p.receiverVersion===1?60:70)||p.receiverMaximumVenueEquipmentCostTokens!==8))missingFields.push('receiverBinding');
  if(Object.hasOwn(p,'candidateCapacityHouseholds')&&!Number.isInteger(p.candidateCapacityHouseholds))missingFields.push('candidateCapacityHouseholds.integer');
  if(Object.hasOwn(p,'venueEquipmentCostTokens')&&(!Number.isInteger(p.venueEquipmentCostTokens)||p.venueEquipmentCostTokens<0))missingFields.push('venueEquipmentCostTokens.nonnegativeInteger');
  if(p.venueHire&&Array.isArray(p.requiredEquipment)&&p.venueEquipmentCostTokens!==p.venueHire.costTokens+p.requiredEquipment.reduce((sum,e)=>sum+e.costTokens,0))missingFields.push('venueEquipmentCostTokens.sum');
  if(missingFields.length)return {status:'insufficient-summary',missingFields,numericScreenPass:null,capacityPass:null,budgetPass:null,scope:'Outward payload only; no full-source fallback'};
  const capacityPass=p.candidateCapacityHouseholds>=p.receiverMinimumCapacityHouseholds,budgetPass=p.venueEquipmentCostTokens<=p.receiverMaximumVenueEquipmentCostTokens;
  return {status:'evaluated-numeric-screen',missingFields:[],capacityPass,budgetPass,numericScreenPass:capacityPass&&budgetPass,scope:'Listed venue plus required equipment only; availability unknown'};}
const refIdentity=r=>({id:r.id,version:r.version,mappingVersion:r.mappingVersion,wording:r.wording,scope:r.scope,author:r.author,criteria:r.criteria});
function outward(c,v,dep,ref,req,version){const mapping=mapRecord(v,ref.id);
  const base={localId:c.id,label:c.label,selectedVenueId:v.id,selectedVenueSha256:v.contentSha256,selectedVenueSource:v.source,
    reference:refIdentity(ref),criterion:{status:mapping.status,answer:mapping.answer,reason:mapping.answer===null?'Context unmapped':`Selected venue ${mapping.answer==='yes'?'satisfies':'does not satisfy'} the stated criterion.`,evidencePointer:ref.id==='R_CAPACITY_60'?`${v.id}.facts.capacityHouseholds`:`${v.id}.facts.alreadyWheelchairAccessible`},
    summaryRuleId:'G6_OUTWARD',summaryVersion:version,dependencyDetail:'omitted',localManifestPointer:`local:${c.id}`};
  if(version===1)return base;
  return {...base,dependencyDetail:'source-backed obligations disclosed',candidateCapacityHouseholds:v.facts.capacityHouseholds,
    venueEquipmentCostTokens:dep.venueEquipmentCostTokens,requiredEquipment:dep.requiredEquipment,venueHire:dep.hire,
    requiredEquipmentComplete:true,
    receiverId:req.id,receiverVersion:req.version,receiverMinimumCapacityHouseholds:req.minimumCapacityHouseholds,
    receiverMaximumVenueEquipmentCostTokens:req.maximumVenueEquipmentCostTokens,availability:'unknown-not-supplied',narrowScope:req.scope};}
export function modelAt(ms,records,referenceFixture,gateFixture,overrides={}){
  if(records.length!==4)throw Error('Four Gate 2 records required');const byId=Object.fromEntries(records.map(r=>[r.id,r]));
  if(['venue-hall','venue-field','venue-studio','weather-context'].some(id=>!byId[id]))throw Error('Missing Gate 2 record');
  const controls={...scheduledAt(ms),...overrides};const ref=referenceFixture.referenceDefinitions.find(r=>r.id===controls.referenceId);
  if(!ref)throw Error('Unknown reference');const req=gateFixture.receiverRequirements.find(r=>r.version===controls.requirementVersion);
  const localManifests=gateFixture.localContexts;
  const assignments=referenceFixture.expectedAssignments;
  const contexts=CONTEXTS.map((c,i)=>{const v=byId[c.focusId],dep=dependencies(v,byId['weather-context']);const activeSummary=outward(c,v,dep,ref,req,controls.summaryVersion);
    activeSummary.headline=controls.summaryVersion===1?
      gateFixture.summaryRules.initialHeadlineByReference[ref.id][activeSummary.criterion.answer]:
      `${activeSummary.criterion.answer==='yes'?'Meets':'Does not meet'} ${ref.id==='R_CAPACITY_60'?'capacity':'existing-access'} criterion; listed cost ${dep.venueEquipmentCostTokens}/8; receiver ≥${req.minimumCapacityHouseholds}.`;
    activeSummary.revisionId=`${c.id}-SUMMARY-${controls.summaryVersion}`;
    const matched=gateFixture.dependencies.filter(d=>d.localId===c.id);
    if(matched.length!==dep.requiredEquipment.length||matched.some(d=>!dep.requiredEquipment.some(e=>e.kind===d.kind&&e.costTokens===d.costTokens)))throw Error('Fixture dependency differs from source-derived obligations');
    dep.requiredEquipment=matched;
    activeSummary.requiredEquipment&& (activeSummary.requiredEquipment=matched);
    const outwardEvaluation=evaluateOutward(activeSummary);
    if(controls.summaryVersion>=2)activeSummary.receiverEvaluation=outwardEvaluation;
    return {id:c.id,label:c.label,manifest:localManifests[i],records:c.recordIds.map(id=>byId[id]),localCriterion:assignments[c.localReferenceId].find(a=>a.recordId===v.id),outerCriterion:assignments[ref.id].find(a=>a.recordId===v.id),dependency:dep,summaryHistory:gateFixture.summaryRevisionHistory.filter(h=>h.localId===c.id),activeSummary,outwardEvaluation,expanded:controls.expandedIds.includes(c.id)};});
  const supportedRelations=gateFixture.supportedRelations;
  const proposals=gateFixture.referenceProposals,claim=gateFixture.unsupportedClaim;
  return {schemaVersion:'gate-6-local-model-v1',simulationTimeMs:clampTime(ms),sourceRecords:records,referenceDefinitions:referenceFixture.referenceDefinitions,assignments,localManifests,contexts,largerReference:refIdentity(ref),requirement:req,supportedRelations,claim,inspectedRelation:[...supportedRelations,claim].find(r=>r.id===controls.inspectedRelationId)||null,proposals,disagreement:'Hall retains capacity; Field retains existing access. Both alternatives persist; no average or endorsement.',trace:{trigger:gateFixture.receiverRequirements[1],affected:[{localId:'G6_LOCAL_HALL',recordId:'venue-hall',field:'facts.capacityHouseholds'},{localId:'G6_LOCAL_FIELD',recordId:'venue-field',field:'facts.capacityHouseholds'}],revisions:contexts.map(c=>c.summaryHistory[2])},controls};}
export const sourceState=s=>({records:s.sourceRecords,referenceDefinitions:s.referenceDefinitions,assignments:s.assignments});
export const localState=s=>({manifests:s.localManifests,contexts:s.contexts.map(c=>({id:c.id,records:c.records,dependency:c.dependency,localCriterion:c.localCriterion}))});
export const supportedRelationState=s=>s.supportedRelations;
export const mappingState=s=>({reference:s.largerReference,assignments:s.assignments[s.largerReference.id]});
export const summaryState=s=>s.contexts.map(c=>({id:c.id,activeSummary:c.activeSummary}));
export const summaryHistoryState=s=>s.contexts.map(c=>({id:c.id,history:c.summaryHistory}));
export const receiverState=s=>({requirement:s.requirement,evaluations:s.contexts.map(c=>({id:c.id,result:c.outwardEvaluation}))});
export const semanticState=s=>({source:sourceState(s),local:localState(s),supportedRelations:supportedRelationState(s),mapping:mappingState(s),summary:summaryState(s),summaryHistory:summaryHistoryState(s),receiver:receiverState(s),claim:s.claim,proposals:s.proposals,trace:s.trace});
export const checkpointState=s=>({simulationTimeMs:s.simulationTimeMs,semantic:semanticState(s),controls:s.controls,inspectedRelation:s.inspectedRelation});
