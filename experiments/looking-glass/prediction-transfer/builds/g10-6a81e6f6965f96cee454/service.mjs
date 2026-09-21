import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {appendFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {canonical} from './model.mjs';

export class ApiError extends Error { constructor(status,code){super(code);this.status=status;this.code=code;} }
const fail=(status,code)=>{throw new ApiError(status,code);};
const token=()=>randomBytes(32).toString('base64url');
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(x);
function exact(body,keys){
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join('|')!==[...keys].sort().join('|'))fail(400,'invalid_fields');
}
function stateHash(session){
  if(!session)return null;
  const safe={sessionId:session.id,activeAttemptId:session.activeAttemptId,attempts:session.attempts.map(a=>({attemptId:a.id,caseId:a.caseId,ordinal:a.ordinal,priorReveal:a.priorReveal,status:a.status,response:a.response,commitEventRef:a.commitEventRef,revealEventRef:a.revealEventRef,softwareGrade:a.reveal?a.reveal.softwareGrade:null}))};
  return createHash('sha256').update(canonical(safe)).digest('hex');
}

export class PredictionService {
  // now is an in-process test seam only; it is never exposed through HTTP.
  constructor({fixture,key,runId,buildId,logPath=null,now=()=>Date.now()}){
    this.fixture=fixture;this.key=key;this.runId=runId;this.buildId=buildId;this.logPath=logPath;this.now=now;
    this.sessions=new Map();this.events=[];this.sequence=0;
  }
  atUtc(){return new Date(this.now()).toISOString();}
  async record(type,session=null,attempt=null,details={},before=null,result='accepted'){
    const sequence=++this.sequence,eventId=`${this.runId}-api:${sequence}`;
    const record={schema:'gate10-service-event-v1',sequence,eventId,atUtc:this.atUtc(),runId:this.runId,buildId:this.buildId,origin:'api',actor:'software_validation_api',provenance:'source_informed_software',type,result,sessionId:session?.id??null,attemptId:attempt?.id??null,caseId:attempt?.caseId??null,intended:details,beforeSemanticFingerprint:before,afterSemanticFingerprint:stateHash(session)};
    this.events.push(record);
    if(this.logPath){await mkdir(dirname(this.logPath),{recursive:true});await appendFile(this.logPath,JSON.stringify(record)+'\n');}
    return record;
  }
  session(body){exact(body,['actor']);if(body.actor!=='software_validation')fail(400,'invalid_actor');
    for(const [key,s] of this.sessions)if(this.now()>=s.expiresAtMs)this.sessions.delete(key);
    if([...this.sessions.values()].filter(s=>this.now()<s.expiresAtMs).length>=64)fail(429,'session_capacity');
    const s={id:randomUUID(),token:token(),createdAtMs:this.now(),expiresAtMs:this.now()+30*60*1000,attempts:[],activeAttemptId:null,startRequests:new Map(),commitRequests:new Map(),revealRequests:new Map()};this.sessions.set(s.token,s);return s;
  }
  requireSession(value){if(typeof value!=='string'||value.length>128)fail(401,'invalid_session');const s=this.sessions.get(value);if(!s)fail(401,'invalid_session');if(this.now()>=s.expiresAtMs)fail(410,'session_expired');return s;}
  requireBuild(value){if(value!==this.buildId)fail(409,'build_mismatch');}
  requireAttempt(s,id,caseId=null){const a=s.attempts.find(x=>x.id===id);if(!a||caseId!==null&&a.caseId!==caseId)fail(403,'attempt_mismatch');return a;}
  task(caseId){const t=this.fixture.tasks.find(x=>x.id===caseId);if(!t)fail(400,'invalid_case');return t;}
  async handle(path,body){
    try{
      if(path==='/api/session'){
        const s=this.session(body);await this.record('session-start',s,null,{actor:'software_validation'},null);
        return {status:201,body:{sessionToken:s.token,sessionId:s.id,buildId:this.buildId,expiresAtUtc:new Date(s.expiresAtMs).toISOString(),humanEligible:false}};
      }
      if(path==='/api/start')return await this.start(body);
      if(path==='/api/commit')return await this.commit(body);
      if(path==='/api/reveal')return await this.reveal(body);
      if(path==='/api/close')return await this.close(body);
      if(path==='/api/export')return await this.export(body);
      fail(404,'not_found');
    }catch(e){
      if(!(e instanceof ApiError))throw e;
      const s=body&&typeof body==='object'?this.sessions.get(body.sessionToken):null;
      const active=s&&this.now()<s.expiresAtMs?s:null;
      const fp=stateHash(active);
      await this.record('api-reject',active,null,{route:path,reason:e.code},fp,'rejected');
      return {status:e.status,body:{error:e.code}};
    }
  }
  async start(body){
    exact(body,['sessionToken','buildId','caseId','requestId']);const s=this.requireSession(body.sessionToken);this.requireBuild(body.buildId);this.task(body.caseId);if(!validId(body.requestId))fail(400,'invalid_request_id');
    const request=canonical({buildId:body.buildId,caseId:body.caseId});const old=s.startRequests.get(body.requestId);
    if(old){if(old.request!==request)fail(409,'request_conflict');await this.record('attempt-start-retry',s,s.attempts.find(a=>a.id===old.result.attemptId),{requestId:body.requestId},stateHash(s));return {status:200,body:old.result};}
    if(s.attempts.length>=32)fail(429,'attempt_capacity');
    if(s.activeAttemptId){const prev=this.requireAttempt(s,s.activeAttemptId);if(prev.status==='answering'){const before=stateHash(s);prev.status='abandoned';await this.record('attempt-abandon',s,prev,{reason:'new-review'},before);}s.activeAttemptId=null;}
    const ordinal=s.attempts.filter(a=>a.caseId===body.caseId).length+1;
    const priorReveal=s.attempts.some(a=>a.caseId===body.caseId&&!!a.reveal);
    const a={id:randomUUID(),caseId:body.caseId,ordinal,priorReveal,status:'answering',response:null,receipt:null,commitEventRef:null,commitSequence:null,committedAtUtc:null,reveal:null,revealEventRef:null,startedAtUtc:this.atUtc()};
    const before=stateHash(s);s.attempts.push(a);s.activeAttemptId=a.id;
    const event=await this.record('attempt-start',s,a,{requestId:body.requestId,ordinal,priorReveal},before);
    const result={attemptId:a.id,caseId:a.caseId,ordinal,priorReveal,status:'answering',provenance:'source_informed_software',firstExposureHumanEligible:false,eventReference:event.eventId};
    s.startRequests.set(body.requestId,{request,result});return {status:201,body:result};
  }
  async commit(body){
    exact(body,['sessionToken','buildId','caseId','attemptId','requestId','response']);const s=this.requireSession(body.sessionToken);this.requireBuild(body.buildId);const t=this.task(body.caseId);const a=this.requireAttempt(s,body.attemptId,body.caseId);if(!validId(body.requestId))fail(400,'invalid_request_id');
    exact(body.response,['kind','optionId']);const r=body.response;
    if(r.kind==='answer'){if(typeof r.optionId!=='string'||!t.options.some(o=>o.id===r.optionId))fail(400,'invalid_option');}
    else if(r.kind==='skip'){if(r.optionId!==null)fail(400,'invalid_skip');}
    else fail(400,'invalid_response_kind');
    const request=canonical({buildId:body.buildId,caseId:body.caseId,attemptId:body.attemptId,response:r});const old=s.commitRequests.get(body.requestId);
    if(old){if(old.request!==request)fail(409,'request_conflict');await this.record('commit-retry',s,a,{requestId:body.requestId},stateHash(s));return {status:200,body:old.result};}
    if(a.status!=='answering'||s.activeAttemptId!==a.id)fail(409,'attempt_locked');
    const before=stateHash(s);a.response={kind:r.kind,optionId:r.optionId};a.receipt=token();a.status=r.kind==='skip'?'skipped':'committed';a.committedAtUtc=this.atUtc();
    a.commitSequence=this.sequence+1;a.commitEventRef=`${this.runId}-api:${a.commitSequence}`;
    const event=await this.record('commit-ack',s,a,{requestId:body.requestId,response:a.response},before);
    const result={receipt:a.receipt,attemptId:a.id,caseId:a.caseId,response:a.response,locked:true,grading:'withheld',eventReference:event.eventId,commitSequence:event.sequence,committedAtUtc:a.committedAtUtc};
    s.commitRequests.set(body.requestId,{request,result});return {status:201,body:result};
  }
  async reveal(body){
    exact(body,['sessionToken','buildId','caseId','attemptId','receipt','requestId']);const s=this.requireSession(body.sessionToken);this.requireBuild(body.buildId);this.task(body.caseId);const a=this.requireAttempt(s,body.attemptId,body.caseId);
    if(!validId(body.requestId))fail(400,'invalid_request_id');
    if(!a.receipt||typeof body.receipt!=='string'||body.receipt!==a.receipt||!a.commitEventRef)fail(403,'invalid_receipt');
    const request=canonical({buildId:body.buildId,caseId:body.caseId,attemptId:body.attemptId,receipt:body.receipt});const old=s.revealRequests.get(body.requestId);
    if(old&&old.request!==request)fail(409,'request_conflict');
    if(a.reveal){
      if(!old){s.revealRequests.set(body.requestId,{request});await this.record('reveal-repeat',s,a,{requestId:body.requestId,firstRevealEventRef:a.revealEventRef},stateHash(s));}
      return {status:200,body:{...a.reveal,repeated:true,firstRevealEventReference:a.revealEventRef}};
    }
    const answer=this.key.answers.find(x=>x.caseId===a.caseId);if(!answer)throw Error('Private answer missing');
    const softwareGrade=a.response.kind==='skip'?null:a.response.optionId===answer.expectedOptionId?'correct':'incorrect';
    const before=stateHash(s);a.status='revealed';a.revealEventRef=`${this.runId}-api:${this.sequence+1}`;
    a.reveal={attemptId:a.id,caseId:a.caseId,target:structuredClone(answer.target),explanation:answer.explanation,expectedOptionId:answer.expectedOptionId,softwareGrade,repeated:false,eventReference:a.revealEventRef,revealSequence:this.sequence+1,revealedAtUtc:this.atUtc()};
    await this.record('reveal-ack',s,a,{requestId:body.requestId,commitEventRef:a.commitEventRef,softwareGrade},before);
    s.revealRequests.set(body.requestId,{request});return {status:201,body:a.reveal};
  }
  async close(body){
    exact(body,['sessionToken','buildId','attemptId','reason']);const s=this.requireSession(body.sessionToken);this.requireBuild(body.buildId);const a=this.requireAttempt(s,body.attemptId);
    if(!['inspect-other-case','reopen-saved','new-review','hide-result'].includes(body.reason))fail(400,'invalid_close_reason');
    const before=stateHash(s),wasActive=s.activeAttemptId===a.id;
    if(a.status==='answering')a.status='abandoned';if(wasActive)s.activeAttemptId=null;
    const event=await this.record('attempt-detach',s,a,{reason:body.reason,abandoned:a.status==='abandoned'},before);
    return {status:200,body:{attemptId:a.id,caseId:a.caseId,status:a.status,detached:true,eventReference:event.eventId}};
  }
  async export(body){
    exact(body,['sessionToken','buildId']);const s=this.requireSession(body.sessionToken);this.requireBuild(body.buildId);
    const attempts=s.attempts.map(a=>({attemptId:a.id,caseId:a.caseId,ordinal:a.ordinal,priorReveal:a.priorReveal,status:a.status,provenance:'source_informed_software',firstExposureHumanEligible:false,response:a.response,commitEventReference:a.commitEventRef,commitSequence:a.commitSequence,committedAtUtc:a.committedAtUtc,revealEventReference:a.revealEventRef,softwareGrade:a.reveal?a.reveal.softwareGrade:null,target:a.reveal?structuredClone(a.reveal.target):null,explanation:a.reveal?a.reveal.explanation:null}));
    await this.record('ledger-export',s,null,{attemptCount:attempts.length},stateHash(s));
    return {status:200,body:{schema:'gate10-redacted-ledger-v1',sessionId:s.id,buildId:this.buildId,provenance:'source_informed_software',humanEligible:false,firstExposureHumanEligible:false,attempts}};
  }
}
