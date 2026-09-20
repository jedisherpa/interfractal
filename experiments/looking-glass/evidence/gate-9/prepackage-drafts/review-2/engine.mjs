import {baseline,completeSummary,deriveStatic,deriveTrace,deriveWatch,hash,informationHash,newState,observe,reference,semanticFingerprint,visibleIndices} from './core.mjs';

export class Gate9Engine {
  constructor(fixture, ids, onChange=()=>{}) {
    this.fixture=fixture; this.ids=ids; this.onChange=onChange;
    this.state=newState(fixture); this.events=[]; this.registry=[];
    this.sessionId=crypto.randomUUID(); this.draftId=crypto.randomUUID();
    this.choiceEventIds=[]; this.choiceEventRecords=[]; this.selectedTrace=null; this.sequence=0;
  }
  async init() { this.contextHash=await hash(this.fixture.commonContext); await this.changed(); return this; }
  async changed() { this.state.completedSummary=completeSummary(this.fixture,this.state); await this.onChange(); }
  async event(type, origin, payload, change, accepted=true) {
    const before=await semanticFingerprint(this.state), seq=++this.sequence;
    if (accepted && change) await change();
    const current=this.state;
    current.completedSummary=completeSummary(this.fixture,current);
    const after=await semanticFingerprint(current);
    const scripted=origin==='replay'||(origin==='automatic'&&current.mode==='saved-tour');
    const record={sequence:seq,eventId:`${this.sessionId}:${seq}`,atUtc:new Date().toISOString(),sessionId:this.sessionId,runId:this.ids.runId,buildId:this.ids.buildId,tourSeconds:current.tourSeconds,localSeconds:current.localSeconds,origin,actor:scripted?'scripted_demonstration':'unattributed_local',provenance:scripted?'scripted_demonstration':'local_control',type,intended:payload,result:accepted?'accepted':'rejected',beforeFingerprint:before,afterFingerprint:after};
    this.events.push(record); await this.changed(); return record;
  }
  async choose(queryId, origin='user-control') {
    const allowed=typeof queryId==='string' && this.fixture.choiceContract.selectableQueryIds.includes(queryId);
    if(allowed&&origin==='user-control'&&this.state.mode==='saved-tour'&&this.state.condition==='choose'&&this.state.phase==='draft')await this.newChoice();
    const accepted=allowed && this.state.condition==='choose' && this.state.phase==='draft' && this.state.choices.length<2;
    const record=await this.event('choose-query',origin,{queryId},async()=>{
      const index=this.state.choices.length+1;
      this.state.choices.push(queryId);
      this.state.occurrences.push({index,queryId,observation:observe(reference(this.fixture).source,queryId)});
      this.state.acquiredOccurrenceIndices.push(index);
    },accepted);
    if (accepted) {this.choiceEventIds.push(record.eventId);this.choiceEventRecords.push(record);}
    if (accepted && this.state.choices.length===2) await this.seal();
    return record;
  }
  async seal() {
    return this.event('trace-seal','automatic',{reason:'choice-budget-complete'},async()=>{
      const trace=deriveTrace(this.fixture,this.contextHash,this.state.choices);
      // The draft's actual accepted records must regenerate this exact payload.
      if (JSON.stringify(trace.occurrences)!==JSON.stringify(this.state.occurrences)) throw Error('choice/trace divergence');
      const traceHash=await hash(trace);
      const envelope={provenance:this.state.mode==='saved-tour'?'scripted_demonstration':'local_control',sessionId:this.sessionId,draftId:this.draftId,acceptedChoiceEventIds:[...this.choiceEventIds],acceptedChoiceEvents:[...this.choiceEventRecords],choiceQueryIds:[...this.state.choices],sealedAtUtc:new Date().toISOString()};
      if(this.reconstructionContext)envelope.canonicalRunEventSource=this.reconstructionContext;
      const entry={trace,traceHash,envelope}; this.registry.push(entry); this.selectedTrace=entry;
      this.state.trace=trace; this.state.traceHash=traceHash; this.state.phase='complete';
    });
  }
  async newChoice() {
    if(this.state.mode==='saved-tour'&&!this.state.tourPaused){this.stopTourClock?.();await this.tourPause();}
    this.stopClock?.();
    if (this.state.condition==='choose' && this.state.phase==='draft' && this.state.choices.length) await this.event('abandon-draft','user-control',{draftId:this.draftId},()=>{});
    this.draftId=crypto.randomUUID(); this.choiceEventIds=[];this.choiceEventRecords=[];this.reconstructionContext=null;
    return this.event('new-choice','user-control',{},()=>{this.state=newState(this.fixture,'exploration');this.selectedTrace=null;});
  }
  async selectTrace(index) {
    const entry=Number.isInteger(index)?this.registry[index]:null;
    if(entry&&this.state.mode==='saved-tour'&&!this.state.tourPaused){this.stopTourClock?.();await this.tourPause();}
    return this.event('trace-select','user-control',{registryIndex:index,traceHash:entry?.traceHash??null},()=>{this.selectedTrace=entry; this.state.trace=entry.trace; this.state.traceHash=entry.traceHash; this.state.choices=[...entry.envelope.choiceQueryIds]; this.state.occurrences=entry.trace.occurrences;this.state.condition='choose';this.state.phase='complete';this.state.localSeconds=0;this.state.presentationPaused=true;this.state.acquiredOccurrenceIndices=[0,1,2];},!!entry);
  }
  async selectCondition(condition,origin='user-control') {
    const entry=this.selectedTrace;
    const accepted=['choose','watch','static'].includes(condition) && !!entry;
    if(accepted&&origin==='user-control'&&this.state.mode==='saved-tour'&&!this.state.tourPaused){this.stopTourClock?.();await this.tourPause();}
    this.stopClock?.();
    return this.event('condition-select',origin,{condition,traceHash:entry?.traceHash??null},async()=>{
      const s=this.state;
      const view=condition==='watch'?await deriveWatch(entry.trace):condition==='static'?await deriveStatic(entry.trace):{parentTraceHash:entry.traceHash,occurrences:entry.trace.occurrences};
      if(view.parentTraceHash!==entry.traceHash)throw Error('Route parent trace mismatch');
      s.condition=condition;s.trace=entry.trace;s.traceHash=entry.traceHash;s.choices=[...entry.envelope.choiceQueryIds];s.occurrences=view.occurrences;s.localSeconds=0;s.presentationPaused=true;s.reviewStatus='standard-playback';
      s.phase=condition==='choose'?'complete':'ready';s.acquiredOccurrenceIndices=condition==='watch'?[0]:[0,1,2];
    },accepted);
  }
  async play(origin='user-control') {
    const s=this.state;
    const accepted=['watch','static'].includes(s.condition)&&s.phase!=='complete'&&s.presentationPaused;
    if(accepted&&origin==='user-control'&&s.mode==='saved-tour'&&!s.tourPaused)this.stopTourClock?.();
    return this.event('presentation-play',origin,{condition:s.condition},()=>{s.phase='running';s.presentationPaused=false;if(origin==='user-control')s.tourPaused=true;},accepted);
  }
  async pause() {
    const s=this.state;
    const accepted=['watch','static'].includes(s.condition)&&s.phase==='running'&&!s.presentationPaused;
    if(accepted&&s.mode==='saved-tour'&&!s.tourPaused)this.stopTourClock?.();
    return this.event('presentation-pause','user-control',{},()=>{s.presentationPaused=true;s.tourPaused=true;s.reviewStatus='manual-review';},accepted);
  }
  async restart() {
    const s=this.state;
    const accepted=['watch','static'].includes(s.condition)&&!!s.trace;
    if(accepted&&s.mode==='saved-tour'&&!s.tourPaused)this.stopTourClock?.();
    return this.event('presentation-restart','user-control',{},()=>{s.localSeconds=0;s.phase='ready';s.presentationPaused=true;s.tourPaused=true;s.acquiredOccurrenceIndices=s.condition==='watch'?[0]:[0,1,2];s.reviewStatus='manual-review';},accepted);
  }
  async step(direction) {
    const s=this.state, next=direction>0?Math.min(6,Math.floor(s.localSeconds/2)*2+2):Math.max(0,Math.ceil(s.localSeconds/2)*2-2);
    const accepted=s.condition==='watch'&&!!s.trace&&s.presentationPaused&&direction!==0&&next!==s.localSeconds;
    if(accepted&&s.mode==='saved-tour'&&!s.tourPaused)this.stopTourClock?.();
    return this.event('presentation-step','user-control',{direction,nextLocalSeconds:next,reason:next===6?'manual-review-complete':undefined},()=>{
      s.localSeconds=next;s.tourPaused=true;s.reviewStatus='manual-review';s.phase=next===6?'complete':'running';
      const index=visibleIndices(s)[0];if(!s.acquiredOccurrenceIndices.includes(index))s.acquiredOccurrenceIndices.push(index);
      if(next===6 && s.acquiredOccurrenceIndices.length!==3) throw Error('cannot complete unvisited watch');
    },accepted);
  }
  async finishSheet() {
    const s=this.state;
    const accepted=s.condition==='static'&&!!s.trace&&s.phase!=='complete';
    if(accepted&&s.mode==='saved-tour'&&!s.tourPaused)this.stopTourClock?.();
    return this.event('finish-sheet-review','user-control',{reason:'manual-review-complete'},()=>{s.localSeconds=6;s.phase='complete';s.presentationPaused=true;s.tourPaused=true;s.reviewStatus='manual-review';},accepted);
  }
  async localBoundary(seconds,origin='automatic') {
    const s=this.state; if(s.presentationPaused||s.phase!=='running') return;
    if(s.condition==='watch' && (seconds===2||seconds===4)) {
      const index=seconds/2,accepted=s.localSeconds<seconds&&s.acquiredOccurrenceIndices.includes(index-1)&&!s.acquiredOccurrenceIndices.includes(index);
      return this.event('observation-presented',origin,{index},()=>{s.localSeconds=seconds;s.acquiredOccurrenceIndices.push(index);},accepted);
    }
    if(seconds===6 && ['watch','static'].includes(s.condition)) {
      const accepted=s.localSeconds<6&&(s.condition==='static'||[0,1,2].every(i=>s.acquiredOccurrenceIndices.includes(i)));
      return this.event('presentation-stop','automatic',{reason:'end-of-presentation',localSeconds:6},()=>{s.localSeconds=6;s.phase='complete';s.presentationPaused=true;},accepted);
    }
  }
  async practice(open) {
    if(this.state.mode==='saved-tour'&&!this.state.tourPaused){this.stopTourClock?.();await this.tourPause();}
    return this.event(open?'practice-open':'practice-close','user-control',{},()=>{this.state.practiceOpen=open;});
  }
  async exportRoute() {
    const s=this.state, accepted=s.phase==='complete'&&!!s.trace;
    const record=await this.event('trace-export','user-control',{condition:s.condition},()=>{},accepted);
    if(!accepted) return {error:'Complete this route before exporting.'};
    const entry=this.selectedTrace, acquired=s.acquiredOccurrenceIndices.map(i=>s.occurrences[i]);
    return {schema:'gate9-route-export-v1',runId:this.ids.runId,buildId:this.ids.buildId,sessionId:this.sessionId,eventId:record.eventId,trace:entry.trace,traceHash:entry.traceHash,envelope:entry.envelope,traceRegistry:this.registry,route:{condition:s.condition,phase:s.phase,reviewStatus:s.reviewStatus,parentTraceHash:entry.traceHash,occurrences:entry.trace.occurrences,acquiredOccurrenceIndices:[...s.acquiredOccurrenceIndices],contextHash:this.contextHash,informationHash:await informationHash(this.fixture,this.contextHash,entry.trace.occurrences),acquiredInformationHash:await informationHash(this.fixture,this.contextHash,acquired),summary:s.completedSummary},events:this.events};
  }
  async advanceTourBoundary(seconds) {
    if(this.state.mode!=='saved-tour') throw Error('tour boundary in exploration');
    this.state.tourSeconds=seconds;
    if(seconds===2) await this.choose('xw90','replay');
    else if(seconds===4) await this.choose('yv90','replay');
    else if(seconds===6) { await this.selectCondition('watch','replay'); await this.play('replay'); }
    else if(seconds===8) await this.localBoundary(2,'replay');
    else if(seconds===10) await this.localBoundary(4,'replay');
    else if(seconds===12) await this.localBoundary(6,'automatic');
    else if(seconds===14) { await this.selectCondition('static','replay'); await this.play('replay'); }
    else if(seconds===20) await this.localBoundary(6,'automatic');
    else if(seconds===24) await this.event('tour-stop','automatic',{reason:'end-of-sequence'},()=>{this.state.tourPaused=true;this.state.presentationPaused=true;});
    else throw Error('not a tour boundary');
  }
  async restoreCheckpoint(seconds) {
    const checkpoints=this.fixture.savedTour.checkpointsSeconds;
    if(!checkpoints.includes(seconds)) return this.event('tour-checkpoint','user-control',{seconds},null,false);
    this.stopClock?.();
    const replay=new Gate9Engine(this.fixture,this.ids);
    await replay.init();
    for(const t of checkpoints.slice(1)) { if(t>seconds) break; await replay.advanceTourBoundary(t); }
    const restored=structuredClone(replay.state);restored.tourPaused=true;restored.presentationPaused=true;
    const restoredFromEventId=`${this.sessionId}:${this.sequence+1}`;
    const canonicalRunEventSource={runId:this.ids.runId,eventsRoute:'/api/events',restoredFromEventId,choiceEventSequences:replay.choiceEventRecords.map(e=>e.sequence)};
    // These are pointers into the immutable scripted run, not fabricated actions in this session.
    const reconstructedRefs=replay.choiceEventRecords.map(e=>({
      eventId:`${this.ids.runId}-scripted-demonstration:${e.sequence}`,
      source:'canonical-run-reference',referenceOnly:true,origin:'replay',type:'choose-query',
      sequence:e.sequence,intended:{queryId:e.intended.queryId},result:'accepted',
      canonicalRunEventSource:{runId:this.ids.runId,eventsRoute:'/api/events',sequence:e.sequence},
      restoredFromEventId
    }));
    return this.event('tour-checkpoint','user-control',{seconds},()=>{
      this.state=restored;
      if(replay.selectedTrace){
        const entry=structuredClone(replay.selectedTrace);
        entry.envelope={provenance:'scripted_demonstration',sessionId:`${this.ids.runId}-scripted-demonstration`,draftId:'canonical-draft',choiceQueryIds:[...entry.envelope.choiceQueryIds],acceptedChoiceEventIds:reconstructedRefs.map(e=>e.eventId),acceptedChoiceEvents:reconstructedRefs,canonicalRunEventSource,reconstructedAtUtc:new Date().toISOString()};
        this.registry.push(entry);this.selectedTrace=entry;
      }else this.selectedTrace=null;
      this.choiceEventIds=reconstructedRefs.map(e=>e.eventId);
      this.choiceEventRecords=reconstructedRefs;
      this.reconstructionContext=reconstructedRefs.length?canonicalRunEventSource:null;
    });
  }
  async reopenSavedStart() {
    this.stopClock?.();
    return this.event('tour-reopen','user-control',{},()=>{this.state=newState(this.fixture);this.selectedTrace=null;this.choiceEventIds=[];this.choiceEventRecords=[];this.reconstructionContext=null;});
  }
  async tourPlay() {
    if(this.state.mode!=='saved-tour'||this.state.tourSeconds===24) await this.reopenSavedStart();
    return this.event('tour-play','user-control',{},()=>{this.state.tourPaused=false;if(this.state.phase==='running')this.state.presentationPaused=false;});
  }
  async tourPause() {
    return this.event('tour-pause','user-control',{},()=>{
      const s=this.state;s.tourPaused=true;s.presentationPaused=true;
      if(['watch','static'].includes(s.condition)&&s.phase==='running')s.reviewStatus='manual-review';
    },this.state.mode==='saved-tour'&&!this.state.tourPaused);
  }
}
