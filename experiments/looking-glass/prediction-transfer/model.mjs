// Public Gate 10 state and fingerprint rules. This module contains no assessment key.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export async function fingerprint(value) {
  const bytes=new TextEncoder().encode(canonical(value));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function clone(value) { return structuredClone(value); }
export function freshState() {
  return {mode:'saved-tour',cursorSeconds:0,paused:true,caseId:'T01',practiceOpen:false,draftOption:null,responsePhase:'none',response:null,revealedResult:null,attachedAttempt:null,pendingAction:null,reviewStatus:'standard-playback'};
}
export function canonicalStateAt(fixture,seconds) {
  if(!fixture.savedTour.checkpoints.includes(seconds))throw Error('Not a checkpoint');
  const s=freshState();s.cursorSeconds=seconds;s.caseId=fixture.savedTour.caseOrder[seconds/4];if(seconds===fixture.savedTour.durationSeconds)s.reviewStatus='end-of-sequence';return s;
}
export function semanticPayload(state,fixture) {
  const task=fixture.tasks.find(x=>x.id===state.caseId);
  if(!task)throw Error('Unknown case');
  return {schema:'gate10-semantic-v1',mode:state.mode,cursorSeconds:state.cursorSeconds,paused:state.paused,caseId:state.caseId,practiceOpen:state.practiceOpen,practice:state.practiceOpen?clone(fixture.practice):null,task:clone(task),formulas:clone(fixture.formulas),pointQueries:clone(fixture.pointQueries),rendering:clone(fixture.rendering),draftOption:state.draftOption,responsePhase:state.responsePhase,response:clone(state.response),revealedResult:clone(state.revealedResult),attachedAttempt:clone(state.attachedAttempt),pendingAction:clone(state.pendingAction),reviewStatus:state.reviewStatus};
}
export function ledgerPayload(ledger,metadata) {
  return {schema:'gate10-local-ledger-v1',provenance:'source_informed_software',humanEligible:false,firstExposureHumanEligible:false,attempts:clone(ledger),reviewMetadata:clone(metadata)};
}
export function exportResponseIsCurrent(captured,current){
  return captured.epoch===current.epoch&&captured.mode==='local-review'&&current.mode==='local-review'&&captured.sessionId===current.sessionId;
}
export function rationalToNumber(text){const [n,d='1']=text.split('/');const value=Number(n)/Number(d);if(!Number.isFinite(value))throw Error('Nonfinite drawing value');return value;}
export function decimal(text,places=6){const s=rationalToNumber(text).toFixed(places);return Number(s)===0?Number(0).toFixed(places):s;}
export function pointScreen(xyz,yawDegrees=0,pitchDegrees=20,scale=50){
  const [x,y,z]=xyz.map(rationalToNumber),yaw=yawDegrees*Math.PI/180,pitch=pitchDegrees*Math.PI/180;
  const u=x*Math.cos(yaw)+z*Math.sin(yaw),depth=-x*Math.sin(yaw)+z*Math.cos(yaw),v=y*Math.cos(pitch)-depth*Math.sin(pitch);
  return {x:140+scale*u,y:100-scale*v};
}
