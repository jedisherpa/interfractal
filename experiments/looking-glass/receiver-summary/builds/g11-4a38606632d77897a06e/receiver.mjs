// Pure receiver boundary. No fixture, world, provenance envelope, registry, resolver or network import.
const baseRef={familyId:'G11-SCANNER-FAMILY-001',logicalRecordId:'LOT',fields:['id','assetType','units'],dereferenceWithinReceiver:false};
const refs={
  calibration:{familyId:'G11-SCANNER-FAMILY-001',logicalRecordId:'CAL',fields:['lotId','status'],dereferenceWithinReceiver:false},
  authorization:{familyId:'G11-SCANNER-FAMILY-001',logicalRecordId:'AUTH',fields:['lotId','status'],dereferenceWithinReceiver:false},
  paint:{familyId:'G11-SCANNER-FAMILY-001',logicalRecordId:'LOT',fields:['paint'],dereferenceWithinReceiver:false}
};
const keys=(o,expected)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===[...expected].sort().join('|');
const canonical=x=>Array.isArray(x)?`[${x.map(canonical).join(',')}]`:x&&typeof x==='object'?`{${Object.keys(x).sort().map(k=>`${JSON.stringify(k)}:${canonical(x[k])}`).join(',')}}`:JSON.stringify(x);
const same=(a,b)=>canonical(a)===canonical(b);
const invalid=reason=>({status:'invalid-summary',possibleAnswers:[],answer:null,reason,missingRelevant:[]});
export function evaluateReceiver(payload,receiverId){
  if(!['R_COUNT','R_RELEASE'].includes(receiverId))return invalid('unknown receiver');
  if(!keys(payload,['schema','lotId','assetType','units','sourceRef','additions']))return invalid('payload fields');
  if(payload.schema!=='gate11-receiver-summary-v1'||payload.lotId!=='LOT'||payload.assetType!=='field-scanner'||!Number.isSafeInteger(payload.units)||payload.units<0)return invalid('base values');
  if(!keys(payload.sourceRef,['familyId','logicalRecordId','fields','dereferenceWithinReceiver'])||!same(payload.sourceRef,baseRef))return invalid('base logical reference');
  const a=payload.additions;if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(k=>!Object.hasOwn(refs,k)))return invalid('addition fields');
  for(const [name,entry] of Object.entries(a)){
    const expected=name==='paint'?['value','sourceRef']:['forLot','status','sourceRef'];
    if(!keys(entry,expected)||!keys(entry.sourceRef,['familyId','logicalRecordId','fields','dereferenceWithinReceiver'])||!same(entry.sourceRef,refs[name]))return invalid(`${name} structure/reference`);
    if(name==='paint'){if(entry.value!=='amber')return invalid('paint enum');}
    else if(entry.forLot!=='LOT'||!(name==='calibration'?['current','expired']:['approved','pending']).includes(entry.status))return invalid(`${name} binding/status`);
  }
  if(payload.units<4)return {status:'determined',possibleAnswers:['no'],answer:'no',reason:'Supplied count is below four.',missingRelevant:[]};
  if(receiverId==='R_COUNT')return {status:'determined',possibleAnswers:['yes'],answer:'yes',reason:'Supplied count is at least four.',missingRelevant:[]};
  if(a.calibration?.status==='expired')return {status:'determined',possibleAnswers:['no'],answer:'no',reason:'Supplied calibration is expired.',missingRelevant:Object.keys(a).includes('authorization')?[]:['authorization']};
  if(a.authorization?.status==='pending')return {status:'determined',possibleAnswers:['no'],answer:'no',reason:'Supplied authorization is pending.',missingRelevant:Object.keys(a).includes('calibration')?[]:['calibration']};
  if(a.calibration?.status==='current'&&a.authorization?.status==='approved')return {status:'determined',possibleAnswers:['yes'],answer:'yes',reason:'Count and both supplied dependencies pass.',missingRelevant:[]};
  return {status:'insufficient',possibleAnswers:['no','yes'],answer:null,reason:'Supplied fields permit both release answers.',missingRelevant:['calibration','authorization'].filter(k=>!Object.hasOwn(a,k))};
}
