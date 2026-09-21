// Gate 9 model. No dependency on browser state or presentation recipes.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}

// SHA-256 over UTF-8, shared by Node and the browser; Web Crypto works on localhost.
export async function hash(value) {
  const bytes = new TextEncoder().encode(canonical(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a < 0n ? -a : a; }
export function rational(text) {
  if (typeof text !== 'string' || !/^-?\d+(?:\/[1-9]\d*)?$/.test(text)) throw Error('invalid rational');
  const [ns, ds = '1'] = text.split('/');
  let n = BigInt(ns), d = BigInt(ds);
  if (!d) throw Error('zero denominator');
  const g = gcd(n, d); n /= g; d /= g;
  return n === 0n ? '0' : d === 1n ? String(n) : `${n}/${d}`;
}
function neg(text) { const n = rational(text); return n === '0' ? '0' : n.startsWith('-') ? n.slice(1) : `-${n}`; }
export function observe(source, queryId) {
  if (!Array.isArray(source) || source.length !== 5) throw Error('invalid source');
  const [x,y,z,w,v] = source.map(rational);
  const xyz = queryId === 'project' ? [x,y,z] : queryId === 'xw90' ? [neg(w),y,z] : queryId === 'yv90' ? [x,neg(v),z] : null;
  if (!xyz) throw Error('off-menu query');
  return {kind:'point', pointId:'P', xyz};
}
export function context(fixture) { return fixture.commonContext; }
export function reference(fixture) { return fixture.commonContext.worlds.find(w => w.id === fixture.commonContext.referenceWorldId); }
export function baseline(fixture) { return {index:0,queryId:'project',observation:observe(reference(fixture).source,'project')}; }
export function deriveTrace(fixture, contextHash, choices) {
  if (!Array.isArray(choices) || choices.length !== 2 || choices.some(q => !fixture.choiceContract.selectableQueryIds.includes(q))) throw Error('expected exactly two menu choices');
  return {schema:'gate9-choice-trace-v1',fixtureId:fixture.fixtureId,caseId:fixture.commonContext.caseId,referenceWorldId:fixture.commonContext.referenceWorldId,contextHash,occurrences:[baseline(fixture),...choices.map((q,i)=>({index:i+1,queryId:q,observation:observe(reference(fixture).source,q)}))]};
}
export function deriveWatch(trace) { return {parentTraceHash:null, occurrences:trace.occurrences, schedule:[0,2,4,6]}; }
export function deriveStatic(trace) { return {parentTraceHash:null, occurrences:trace.occurrences}; }
export function uniqueObservations(fixture, occurrences) {
  const byId = new Map(occurrences.map(o => [o.queryId,{queryId:o.queryId,observation:o.observation}]));
  return fixture.commonContext.queries.filter(q => byId.has(q.id)).map(q => byId.get(q.id));
}
export async function informationHash(fixture, contextHash, occurrences) { return hash({contextHash,observations:uniqueObservations(fixture,occurrences)}); }
export function compatibility(fixture, occurrences) {
  const selected = uniqueObservations(fixture,occurrences);
  const worlds = fixture.commonContext.worlds.filter(w => selected.every(({queryId,observation}) => canonical(observe(w.source,queryId)) === canonical(observation)));
  const propertyValues = [...new Map(worlds.map(w => [canonical(w.propertyValue),w.propertyValue])).values()];
  return {compatibleWorldIds:worlds.map(w=>w.id),propertyDetermined:propertyValues.length === 1,remainingPropertyValues:propertyValues};
}
export function visibleIndices(state) {
  if (state.condition === 'static') return [0,1,2];
  if (state.condition === 'watch') return [Math.min(2,Math.floor(state.localSeconds/2))];
  return [state.choices.length];
}
export function acquiredOccurrences(state) {
  return state.acquiredOccurrenceIndices.map(i => state.occurrences[i]);
}
export function completeSummary(fixture, state) {
  if (state.phase !== 'complete' || !state.trace) return null;
  return compatibility(fixture,state.trace.occurrences);
}
export function semanticState(state) {
  return {mode:state.mode,condition:state.condition,phase:state.phase,tourPaused:state.tourPaused,presentationPaused:state.presentationPaused,tourSeconds:state.tourSeconds,localSeconds:state.localSeconds,choices:state.choices,acquiredOccurrenceIndices:state.acquiredOccurrenceIndices,trace:state.trace,traceHash:state.traceHash,visibleOccurrenceIndices:visibleIndices(state),completedSummary:state.completedSummary,reviewStatus:state.reviewStatus,practiceOpen:state.practiceOpen};
}
export async function semanticFingerprint(state) { return hash(semanticState(state)); }
export function newState(fixture, mode='saved-tour') {
  return {mode,condition:'choose',phase:'draft',tourPaused:true,presentationPaused:true,tourSeconds:0,localSeconds:0,choices:[],occurrences:[baseline(fixture)],acquiredOccurrenceIndices:[0],trace:null,traceHash:null,completedSummary:null,reviewStatus:'standard-playback',practiceOpen:false};
}
