// Blind, independent finite-key derivation. Reads ONLY the five public frozen
// source/task/schema files and their source-task freeze. No author key/solver import.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const project=resolve(import.meta.dirname,'../../..'),design='preparation/materials-v1/design/';
const read=async name=>readFile(resolve(project,design+name));
const parse=async name=>JSON.parse(await read(name));
const sha=b=>createHash('sha256').update(b).digest('hex');
const names=['world.json','allocations.json','development-tasks.json','withheld-tasks.json','snapshot.schema.json'];
const [world,alloc,dev,held,schema,freeze]=await Promise.all([...names,'SOURCE_TASK_FREEZE.json'].map(parse));
const inputPins=[];
for(const name of names){const bytes=await read(name),pin=freeze.files.find(x=>x.path===design+name);if(!pin||pin.sha256!==sha(bytes)||pin.bytes!==bytes.length)throw Error(`frozen source mismatch ${name}`);inputPins.push({path:design+name,sha256:sha(bytes),bytes:bytes.length});}
const freezeSha=sha(await read('SOURCE_TASK_FREEZE.json'));
if(freezeSha!=='e2e5593615bb8a746138da0b558cb9e5274e1b7d000edcf4a705b1f26445e183'||freeze.authorKeyFileExistsAtFreeze!==false||freeze.auditorAuthorKeyAccessAuthorized!==false)throw Error('source-task freeze identity mismatch');

const bits={supported:[true,false],refuted:[false,true],conflicted:[true,true],unknown:[false,false]};
const uniq=a=>[...new Set(a)].sort();
function atom(status,evidence=[],missingDependencies=[],reason=''){
  if(!bits[status])throw Error(`bad status ${status}`);
  return {status,evidence:status==='unknown'?[]:uniq(evidence),missingDependencies:uniq(missingDependencies),reason};
}
function fromBits(pos,neg,posIds=[],negIds=[],missing=[],rule=''){
  const status=pos?(neg?'conflicted':'supported'):(neg?'refuted':'unknown');
  return atom(status,[...posIds,...negIds,...(rule?[rule]:[])],status==='unknown'?missing:[],rule);
}
function and(parts,rule='R02'){
  const pos=parts.every(x=>bits[x.status][0]),neg=parts.some(x=>bits[x.status][1]);
  return fromBits(pos,neg,parts.flatMap(x=>x.evidence),[],parts.flatMap(x=>x.missingDependencies),rule);
}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function activeFacts(facts,cutoff){const time=facts.filter(x=>(x.occurredTick??cutoff)<=cutoff);const superseded=new Set(time.flatMap(x=>x.supersedes??[]));return time.filter(x=>!superseded.has(x.id));}
function claimSet(facts,predicate,match){return facts.filter(x=>x.predicate===predicate&&match(x.arguments??{},x));}
function bool(facts,predicate,argumentsWanted,missing){const found=claimSet(facts,predicate,a=>Object.entries(argumentsWanted).every(([k,v])=>a[k]===v));return fromBits(found.some(x=>x.value===true),found.some(x=>x.value===false),found.filter(x=>x.value===true).map(x=>x.id),found.filter(x=>x.value===false).map(x=>x.id),[missing], 'R04');}
function numeric(facts,predicate,argumentsWanted,needed,missing){const found=claimSet(facts,predicate,a=>Object.entries(argumentsWanted).every(([k,v])=>a[k]===v));return fromBits(found.some(x=>typeof x.value==='number'&&x.value>=needed),found.some(x=>typeof x.value==='number'&&x.value<needed),found.filter(x=>typeof x.value==='number'&&x.value>=needed).map(x=>x.id),found.filter(x=>typeof x.value==='number'&&x.value<needed).map(x=>x.id),[missing],'R03');}
function commitment(facts,req,plan){const found=claimSet(facts,'resource_commitment',a=>a.actor===req.actor&&a.resource===req.resource&&a.plan===plan.id&&a.planVersion===plan.version);const yes=found.filter(x=>x.value===true&&x.arguments.quantity>=req.quantity),no=found.filter(x=>x.value===false&&x.arguments.quantity===req.quantity);return fromBits(yes.length>0,no.length>0,yes.map(x=>x.id),no.map(x=>x.id),[`commitment ${req.actor}/${req.resource} ${plan.id}@${plan.version} quantity ${req.quantity}`],'R05');}
function inspection(facts,plan){if(!plan.inspectionRequired)return atom('supported',['R07'],[],'inspection not required');const found=claimSet(facts,'inspection_report',a=>a.plan===plan.id&&a.planVersion===plan.version&&a.scope==='release');return fromBits(found.some(x=>x.value===true),found.some(x=>x.value===false),found.filter(x=>x.value===true).map(x=>x.id),found.filter(x=>x.value===false).map(x=>x.id),[`release inspection ${plan.id}@${plan.version}`],'R07');}
function demandRecord(facts){const vals=claimSet(facts,'demand',()=>true);return vals.length?{value:vals.length===1?vals[0].value:null,version:vals.length===1?vals[0].arguments.requirementVersion:null,evidence:vals.map(x=>x.id),ambiguous:vals.length>1}: {value:null,version:null,evidence:[],ambiguous:false};}
function planEvaluation(facts,plan){const dr=demandRecord(facts);const physical=and(plan.requires.map(r=>numeric(facts,'capacity',{actor:r.actor,resource:r.resource},r.quantity,`capacity ${r.actor}/${r.resource}`)),'R07');const demand=dr.value===null?atom('unknown',[],['active demand'],'R07'):fromBits(plan.output>=dr.value,plan.output<dr.value,dr.evidence,dr.evidence,[],'R07');const commit=and(plan.requires.map(r=>commitment(facts,r,plan)),'R07');const inspect=inspection(facts,plan);return {physical,demand,commitment:commit,inspection:inspect,readiness:and([physical,demand,commit,inspect],'R07'),output:plan.output,cost:plan.cost};}
function choose(rows){const ready=Object.entries(rows).filter(([,x])=>x.readiness.status==='supported').sort((a,b)=>a[1].cost-b[1].cost||a[0].localeCompare(b[0]));return ready.length?{selection:ready[0][0],output:ready[0][1].output,cost:ready[0][1].cost,evidence:uniq([...ready[0][1].readiness.evidence,'R08'])}:{selection:'none_supported',output:null,cost:null,evidence:['R08'],missingDependencies:uniq(Object.values(rows).flatMap(x=>x.readiness.missingDependencies))};}
function context(cards){const facts=activeFacts(cards.flatMap(c=>c.claims.map(x=>({...x,occurredTick:c.occurredTick}))),world.cutoffTick);return {facts,cardIds:cards.map(x=>x.id)};}
function primitiveValue(facts,predicate,args,missing){const found=claimSet(facts,predicate,a=>Object.entries(args).every(([k,v])=>a[k]===v));const distinct=uniq(found.map(x=>JSON.stringify(x.value)));return {value:distinct.length===1?JSON.parse(distinct[0]):null,evidence:distinct.length===1?uniq(found.map(x=>x.id)):[],missingDependencies:distinct.length?[]:[missing],alternativeValues:distinct.length>1?distinct.map(x=>JSON.parse(x)):[]};}
function development(contextId,cards){const {facts,cardIds}=context(cards),dem=demandRecord(facts),rows=Object.fromEntries(world.plans.map(p=>[p.id,planEvaluation(facts,p)]));const cap={};for(const [name,actor,resource] of [['press','ARA','press'],['cart','BEA','cart'],['varnish','CY','varnish']])cap[name]=primitiveValue(facts,'capacity',{actor,resource},`capacity ${actor}/${resource}`);
  const D01={values:{demand:dem.value,requirementVersion:dem.version},atoms:{demand:{value:dem.value,evidence:dem.evidence,missingDependencies:dem.value===null?['active demand']:[]},requirementVersion:{value:dem.version,evidence:dem.evidence,missingDependencies:dem.version===null?['active demand version']:[]}}};
  const D02={values:Object.fromEntries(Object.entries(cap).map(([k,v])=>[k,v.value])),atoms:cap};
  const target=(predicate,a,missing)=>bool(facts,predicate,a,missing);
  const D03={atoms:{araUnderstands:target('understands',{actor:'ARA',plan:'P12',planVersion:1},'ARA understands P12@1'),araEndorses:target('endorses',{actor:'ARA',plan:'P12',planVersion:1},'ARA endorses P12@1'),araPress6:commitment(facts,{actor:'ARA',resource:'press',quantity:6},world.plans.find(x=>x.id==='P12')),beaEndorses:target('endorses',{actor:'BEA',plan:'P12',planVersion:1},'BEA endorses P12@1'),beaCart2:commitment(facts,{actor:'BEA',resource:'cart',quantity:2},world.plans.find(x=>x.id==='P12'))}};
  const P10=world.plans.find(x=>x.id==='P10');
  const D04={atoms:{araExplores:target('explores',{actor:'ARA',plan:'P10',planVersion:1},'ARA explores P10@1'),araUnderstands:target('understands',{actor:'ARA',plan:'P10',planVersion:1},'ARA understands P10@1'),araPress5:commitment(facts,{actor:'ARA',resource:'press',quantity:5},P10),beaCart1:commitment(facts,{actor:'BEA',resource:'cart',quantity:1},P10),cyVarnish1:commitment(facts,{actor:'CY',resource:'varnish',quantity:1},P10)}};
  const mandate=claimSet(facts,'mandate',a=>a.actor==='DEV'&&a.complete===true);const mandateOp=op=>mandate.length?fromBits(mandate.some(x=>x.value.includes(op)),mandate.some(x=>!x.value.includes(op)),mandate.filter(x=>x.value.includes(op)).map(x=>x.id),mandate.filter(x=>!x.value.includes(op)).map(x=>x.id),[],'R06'):atom('unknown',[],[`complete DEV mandate for ${op}`],'R06');
  const D05={atoms:{modelAttributesAraEndorsement:target('model_attributes_endorsement',{actor:'ARA',plan:'P12',planVersion:1},'model attribution ARA/P12@1'),araEndorses:D03.atoms.araEndorses,devMayDescribe:mandateOp('describe'),devMayCommit:mandateOp('commit')}};
  const D06={atoms:{inspection:inspection(facts,P10)}};
  const D07={atoms:Object.fromEntries(Object.entries(rows).flatMap(([id,x])=>['physical','demand','commitment','inspection','readiness'].map(k=>[`${id}.${k}`,x[k]])))};
  const D08={values:choose(rows),atoms:{selection:{value:choose(rows).selection,evidence:choose(rows).evidence,missingDependencies:choose(rows).missingDependencies??[]},output:{value:choose(rows).output,evidence:choose(rows).evidence,missingDependencies:choose(rows).missingDependencies??[]},cost:{value:choose(rows).cost,evidence:choose(rows).evidence,missingDependencies:choose(rows).missingDependencies??[]}}};
  for(const x of [D03,D04,D05,D06,D07])x.values=Object.fromEntries(Object.entries(x.atoms).map(([k,v])=>[k,v.status]));
  const tasks={D01,D02,D03,D04,D05,D06,D07,D08};
  if(contextId==='UNION'){
    const lineages=new Map();
    const cy=claimSet(facts,'resource_commitment',(a,x)=>a.actor==='CY'&&a.plan==='P10'&&a.planVersion===1&&a.resource==='varnish'&&x.value===true);for(const x of cy){const key=x.lineageId??x.id;if(!lineages.has(key))lineages.set(key,[]);lineages.get(key).push(x);}
    const qty=cy.length?Math.max(...cy.map(x=>x.arguments.quantity)):0;
    tasks.D09={values:{lineageCount:lineages.size,maxQuantity:qty},atoms:{lineageCount:{value:lineages.size,evidence:uniq([...cy.map(x=>x.id),'R09']),missingDependencies:[]},maxQuantity:{value:qty,evidence:uniq([...cy.map(x=>x.id),'R05','R09']),missingDependencies:[]}},reason:'F-C13-1 and F-C14-1 restate one lineage K-CY-P10; preserve both source references.'};
    const c06=cards.find(x=>x.id==='C06'),c13=cards.find(x=>x.id==='C13'),c14=cards.find(x=>x.id==='C14');
    tasks.D10={values:{C06_C13:'same_surface_different_relation',C13_C14:'different_surface_same_relation'},atoms:{C06_C13:{value:'same_surface_different_relation',evidence:['F-C06-1','F-C13-1','R04'],missingDependencies:[]},C13_C14:{value:'different_surface_same_relation',evidence:['F-C13-1','F-C14-1','R09'],missingDependencies:[]}},reason:`C06 and C13 share surface ${JSON.stringify(c06.surfaceText)} but predicates/roles differ; C13 and C14 differ in surface yet same actor-plan-version-resource-quantity and lineage.`};
  }
  return {contextId,cardIds,activeClaimIds:uniq(facts.map(x=>x.id)),tasks};
}
// Exact packet scopes and one union; no peer outputs or author oracle consulted.
const cardById=Object.fromEntries(world.cards.map(x=>[x.id,x]));
const packets=alloc.packets.map(p=>development(p.agentId,p.cardIds.map(id=>cardById[id])));
const union=development('UNION',world.cards);
const devCount=packets.reduce((n,p)=>n+Object.keys(p.tasks).length,0)+Object.keys(union.tasks).length;

function transfer(c){const facts=activeFacts(c.facts.map(x=>({...x,occurredTick:x.occurredTick??c.cutoffTick})),c.cutoffTick);const rows=Object.fromEntries(c.plans.map(p=>[p.id,planEvaluation(facts,p)]));const t=held.tasks.find(x=>x.contextIds.includes(c.id));
  if(t.id!=='W06'){
    const p=c.plans[0],r=rows[p.id],sel=choose(rows),endorses=bool(facts,'endorses',{actor:'LIN',plan:'Q7',planVersion:1},'LIN endorses Q7@1'),utterance=facts.find(x=>x.id===c.surfaceBindingClaimId);return {contextId:c.id,taskId:t.id,activeClaimIds:uniq(facts.map(x=>x.id)),values:{physical:r.physical.status,demand:r.demand.status,commitment:r.commitment.status,inspection:r.inspection.status,readiness:r.readiness.status,selection:sel.selection,linEndorsesV1:endorses.status,utterancePredicate:utterance?.predicate??null},atoms:{physical:r.physical,demand:r.demand,commitment:r.commitment,inspection:r.inspection,readiness:r.readiness,selection:{value:sel.selection,evidence:sel.evidence,missingDependencies:sel.missingDependencies??[]},linEndorsesV1:endorses,utterancePredicate:{value:utterance?.predicate??null,evidence:utterance?[utterance.id,'R04']:[],missingDependencies:utterance?[]:['surface binding claim']}},reason:'The same surface “Ready.” has a typed relation determined by its bound claim, never by wording alone.'};
  }
  const bundles=c.allowedBundles.map(ids=>{const plans=ids.map(id=>c.plans.find(p=>p.id===id));const needs=new Map();for(const p of plans)for(const r of p.requires){const key=`${r.actor}/${r.resource}`;needs.set(key,{actor:r.actor,resource:r.resource,quantity:(needs.get(key)?.quantity??0)+r.quantity});}
    const physical=and([...needs.values()].map(r=>numeric(facts,'capacity',{actor:r.actor,resource:r.resource},r.quantity,`capacity ${r.actor}/${r.resource}`)),'R10');
    const output=plans.reduce((n,p)=>n+p.output,0),cost=plans.reduce((n,p)=>n+p.cost,0),d=demandRecord(facts);
    const demand=d.value===null?atom('unknown',[],['active demand'],'R10'):fromBits(output>=d.value,output<d.value,d.evidence,d.evidence,[],'R10');
    const commitmentStatus=and(plans.flatMap(p=>p.requires.map(r=>commitment(facts,r,p))),'R10');
    const inspectionStatus=and(plans.map(p=>inspection(facts,p)),'R10');
    const readiness=and([physical,demand,commitmentStatus,inspectionStatus],'R10');
    return {planIds:ids,physical,demand,commitment:commitmentStatus,inspection:inspectionStatus,readiness,output,cost};});
  const ready=bundles.filter(x=>x.readiness.status==='supported').sort((a,b)=>a.cost-b.cost||a.planIds.join(',').localeCompare(b.planIds.join(',')));
  return {contextId:c.id,taskId:t.id,activeClaimIds:uniq(facts.map(x=>x.id)),bundles,selection:ready.length?ready[0].planIds:'none_supported',selectionEvidence:ready.length?uniq([...ready[0].readiness.evidence,'R10']):['R10'],reason:'The surface summary is identical across W06 contexts, but exact resource identity changes the X+Y bundle capacity test.'};
}
const transfers=held.contexts.map(transfer);
const result={schema:'materials-v1-independent-blind-key-001',status:'BLIND_UNCOMPARED',scope:'Engineering audit only; no four research-agent snapshots or humans.',sourceTaskFreezeSha256:freezeSha,inputFiles:inputPins,counts:{packetContexts:packets.length,packetTaskContexts:packets.reduce((n,p)=>n+Object.keys(p.tasks).length,0),unionTaskContexts:Object.keys(union.tasks).length,totalDevelopmentTaskContexts:devCount,withheldTasks:held.tasks.length,withheldContexts:transfers.length},packetContexts:packets,union,withheldContexts:transfers,consequentialAmbiguities:[{id:'A01',issue:'A task-level unknown aggregate may have some known subcomponents. Its top-level evidence is empty by the task provenance rule, while the named missing dependencies and separately listed components retain the known sources.',disposition:'Preserve component evidence; score unknown aggregate as unknown, not as a negative fact.'},{id:'A02',issue:'W03 asks LIN endorsement at version 1 even though Q7 catalog version is 2.',disposition:'Version-1 endorsement remains refuted from W03-F5; plan-v2 commitment is unknown because supplied grants bind version 1.'},{id:'A03',issue:'W05 contains positive and negative exact commitment claims without supersession.',disposition:'Commitment and readiness are conflicted, not eligible; do not let a positive claim cancel an explicit refusal.'},{id:'A04',issue:'C13 and C14 have different surface text but one lineage. Counting source references is 2; counting distinct grants is 1.',disposition:'Retain both references while deduplicating lineages.'},{id:'A05',issue:'Bundle W06-SHARED has independent positive plan grants for X and Y but one physical bay unit.',disposition:'Combined two-unit demand exceeds capacity; do not infer simultaneous capacity from separate conditional grants.'}],authorKeyCompared:false};
await writeFile(resolve(import.meta.dirname,'blind-key-001.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,counts:result.counts,packetSelections:packets.map(x=>[x.contextId,x.tasks.D08.values.selection]),unionSelection:union.tasks.D08.values.selection,withheldSelections:transfers.map(x=>[x.contextId,x.values?.selection??x.selection])},null,2));
