import {hashJson} from './hash.mjs';

export const RUN_ID = 'G8-AMBIGUITY-001';
export const DURATION_SECONDS = 32;
export const CHECKPOINT_SECONDS = [0, 4, 8, 12, 16, 20, 24, 28, 32];
const TOLERANCE = '1/10000000000';

const abs = n => n < 0n ? -n : n;
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return abs(a); }
export function rational(value) {
  let n, d;
  if (typeof value === 'object' && value && 'n' in value && 'd' in value) {
    n = BigInt(value.n); d = BigInt(value.d);
  } else {
    const parts = String(value).split('/');
    if (parts.length > 2 || !parts.every(part => /^-?\d+$/.test(part))) throw new Error(`Invalid rational: ${value}`);
    n = BigInt(parts[0]); d = parts.length === 2 ? BigInt(parts[1]) : 1n;
  }
  if (d === 0n) throw new Error('Zero denominator');
  if (d < 0n) { n = -n; d = -d; }
  if (n === 0n) return {n: 0n, d: 1n};
  const divisor = gcd(abs(n), d);
  return {n: n / divisor, d: d / divisor};
}
export const rationalString = value => {
  const {n, d} = rational(value);
  return d === 1n ? String(n) : `${n}/${d}`;
};
export const add = (a, b) => {
  const x = rational(a), y = rational(b);
  return rational({n: x.n * y.d + y.n * x.d, d: x.d * y.d});
};
export const sub = (a, b) => {
  const y = rational(b);
  return add(a, {n: -y.n, d: y.d});
};
export const multiply = (a, b) => {
  const x = rational(a), y = rational(b);
  return rational({n: x.n * y.n, d: x.d * y.d});
};
export const negate = a => {
  const x = rational(a);
  return rationalString({n: -x.n, d: x.d});
};
export const compareRational = (a, b) => {
  const x = rational(a), y = rational(b);
  const delta = x.n * y.d - y.n * x.d;
  return delta < 0n ? -1 : delta > 0n ? 1 : 0;
};
export const rationalNumber = a => {
  const x = rational(a);
  return Number(x.n) / Number(x.d);
};
export const roundedLabel = a => {
  const number = rationalNumber(a);
  const rounded = number.toFixed(2);
  return rounded === '-0.00' ? '0.00' : rounded;
};

export function observe(world, query) {
  if (query.kind === 'project' && world.source) return {
    kind: 'point', pointId: 'P', xyz: world.source.slice(0, 3).map(rationalString)
  };
  if (query.kind === 'xw90' && world.source) return {
    kind: 'point', pointId: 'P', xyz: [negate(world.source[3]), rationalString(world.source[1]), rationalString(world.source[2])]
  };
  if (query.kind === 'yv90' && world.source && world.source.length === 5) return {
    kind: 'point', pointId: 'P', xyz: [rationalString(world.source[0]), negate(world.source[4]), rationalString(world.source[2])]
  };
  if (query.kind === 'project' && world.center) return {
    kind: 'ball', center: world.center.slice(0, 3).map(rationalString), radiusSquared: rationalString(world.radiusSquared)
  };
  if (query.kind === 'slice' && world.center) {
    const offset = sub(query.setting, world.center[3]);
    const q = sub(world.radiusSquared, multiply(offset, offset));
    const comparison = compareRational(q, '0');
    if (comparison < 0) return {kind: 'empty'};
    return {kind: comparison === 0 ? 'point' : 'ball', center: world.center.slice(0, 3).map(rationalString),
      radiusSquared: rationalString(q)};
  }
  throw new Error(`Unsupported source/query combination: ${query.id}`);
}

const sameShape = (a, b) => a.kind === b.kind && (a.pointId ?? null) === (b.pointId ?? null);
const numericFields = observation => observation.kind === 'empty' ? [] :
  observation.xyz || [...observation.center, observation.radiusSquared];
export function compareObservations(a, b) {
  if (!sameShape(a, b)) return {exactEqual: false, withinTolerance: false, roundedLabelsEqual: false};
  const left = numericFields(a), right = numericFields(b);
  if (left.length !== right.length) return {exactEqual: false, withinTolerance: false, roundedLabelsEqual: false};
  const exactEqual = left.every((value, i) => compareRational(value, right[i]) === 0);
  const withinTolerance = left.every((value, i) => {
    const difference = sub(value, right[i]);
    return compareRational({n: abs(difference.n), d: difference.d}, TOLERANCE) <= 0;
  });
  const roundedLabelsEqual = left.every((value, i) => roundedLabel(value) === roundedLabel(right[i]));
  return {exactEqual, withinTolerance, roundedLabelsEqual};
}
export function caseById(fixture, caseId) {
  const found = fixture.cases.find(item => item.id === caseId);
  if (!found) throw new Error(`Unknown case: ${caseId}`);
  return found;
}
export function worldById(caseData, worldId) {
  const found = caseData.worlds.find(item => item.id === worldId);
  if (!found) throw new Error(`Unknown world: ${worldId}`);
  return found;
}
export const propertyEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function orderedQueryIds(caseData, selectedAdditionalQueryIds = []) {
  const chosen = new Set([...caseData.baselineQueryIds, ...selectedAdditionalQueryIds]);
  return caseData.queries.filter(query => chosen.has(query.id)).map(query => query.id);
}
export function observationBundle(caseData, world, selectedAdditionalQueryIds = []) {
  return orderedQueryIds(caseData, selectedAdditionalQueryIds).map(queryId => {
    const query = caseData.queries.find(item => item.id === queryId);
    return {queryId, observation: observe(world, query)};
  });
}
export function compareBundles(left, right) {
  if (left.length !== right.length || left.some((item, i) => item.queryId !== right[i].queryId))
    return {exactEqual: false, withinTolerance: false, roundedLabelsEqual: false};
  const comparisons = left.map((item, i) => compareObservations(item.observation, right[i].observation));
  return {exactEqual: comparisons.every(item => item.exactEqual),
    withinTolerance: comparisons.every(item => item.withinTolerance),
    roundedLabelsEqual: comparisons.every(item => item.roundedLabelsEqual)};
}
export function candidatePairs(caseData) {
  const pairs = [];
  for (let i = 0; i < caseData.worlds.length; i++)
    for (let j = i + 1; j < caseData.worlds.length; j++) pairs.push([caseData.worlds[i], caseData.worlds[j]]);
  return pairs;
}
export function pairDiagnostics(caseData, selectedAdditionalQueryIds = []) {
  return candidatePairs(caseData).map(([a, b]) => ({pair: [a.id, b.id],
    propertyEqual: propertyEqual(a.propertyValue, b.propertyValue),
    ...compareBundles(observationBundle(caseData, a, selectedAdditionalQueryIds),
      observationBundle(caseData, b, selectedAdditionalQueryIds))}));
}
function querySubsets(queryIds) {
  const subsets = [];
  for (let mask = 0; mask < 2 ** queryIds.length; mask++)
    subsets.push(queryIds.filter((_, index) => mask & (1 << index)));
  return subsets.sort((a, b) => a.length - b.length || a.join('\0').localeCompare(b.join('\0')));
}
export function enumerateCertificate(caseData) {
  const baselinePairs = pairDiagnostics(caseData);
  const baselineCollisionPairs = baselinePairs.filter(pair => !pair.propertyEqual && pair.exactEqual).map(pair => pair.pair);
  const separatingPairsByAdditionalQuery = Object.fromEntries(caseData.additionalQueryIds.map(queryId => [queryId,
    pairDiagnostics(caseData, [queryId]).filter(pair => !pair.propertyEqual && !pair.exactEqual).map(pair => pair.pair)]));
  const subsets = querySubsets(caseData.additionalQueryIds).map(additionalQueryIds => {
    const unresolvedUnequalPropertyPairs = pairDiagnostics(caseData, additionalQueryIds)
      .filter(pair => !pair.propertyEqual && pair.exactEqual).map(pair => pair.pair);
    return {additionalQueryIds, familyPropertyDetermined: unresolvedUnequalPropertyPairs.length === 0,
      unresolvedUnequalPropertyPairs};
  });
  const valid = subsets.filter(subset => subset.familyPropertyDetermined);
  const size = valid.length ? valid[0].additionalQueryIds.length : null;
  const minimum = valid.length ? {status: 'determined', size,
    subsets: valid.filter(subset => subset.additionalQueryIds.length === size).map(subset => subset.additionalQueryIds)} :
    {status: 'none-in-menu', size: null, subsets: [],
      fullMenuSurvivingPairs: subsets.find(subset => subset.additionalQueryIds.length === caseData.additionalQueryIds.length)
        .unresolvedUnequalPropertyPairs};
  const outsideMenu = caseData.outsideMenuQueries.map(query => ({queryId: query.id, selectable: false,
    observations: Object.fromEntries(caseData.worlds.map(world => [world.id, observe(world, query)]))}));
  return {caseId: caseData.id, baselineCollisionPairs, baselinePairDiagnostics: baselinePairs,
    separatingPairsByAdditionalQuery, subsets, subsetCountExamined: subsets.length, minimum, outsideMenu};
}

export function stateAt(cursorSeconds, fixture) {
  const t = Math.max(0, Math.min(DURATION_SECONDS, Number(cursorSeconds)));
  let caseId = 'G8-C01', selectedAdditionalQueryIds = [];
  if (t >= 28) { caseId = 'G8-C04'; if (t >= 32) selectedAdditionalQueryIds = ['xw90']; }
  else if (t >= 20) { caseId = 'G8-C03'; if (t >= 24) selectedAdditionalQueryIds = ['sliceMinus2', 'slicePlus2']; }
  else if (t >= 8) { caseId = 'G8-C02'; if (t >= 12) selectedAdditionalQueryIds = ['xw90'];
    if (t >= 16) selectedAdditionalQueryIds = ['xw90', 'yv90']; }
  else if (t >= 4) selectedAdditionalQueryIds = ['xw90'];
  const caseData = caseById(fixture, caseId);
  return {caseId, referenceWorldId: caseData.defaultReferenceWorldId, selectedAdditionalQueryIds,
    cameraYawDegrees: 0, certificateVisible: false, cursorSeconds: t, mode: 'saved-replay', paused: true};
}
export function deriveView(state, fixture) {
  const caseData = caseById(fixture, state.caseId);
  const reference = worldById(caseData, state.referenceWorldId);
  const observedBundle = observationBundle(caseData, reference, state.selectedAdditionalQueryIds);
  const compatibleWorldIds = caseData.worlds.filter(world =>
    compareBundles(observedBundle, observationBundle(caseData, world, state.selectedAdditionalQueryIds)).exactEqual)
    .map(world => world.id);
  const localPropertyDetermined = compatibleWorldIds.every(id =>
    propertyEqual(reference.propertyValue, worldById(caseData, id).propertyValue));
  return {caseId: caseData.id, referenceWorldId: reference.id,
    selectedAdditionalQueryIds: orderedQueryIds(caseData, state.selectedAdditionalQueryIds)
      .filter(id => caseData.additionalQueryIds.includes(id)),
    observedBundle, compatibleWorldIds, localPropertyDetermined,
    pairDiagnostics: pairDiagnostics(caseData, state.selectedAdditionalQueryIds),
    certificate: state.certificateVisible ? enumerateCertificate(caseData) : null};
}
export function informationFingerprint(state, fixture) {
  const view = deriveView(state, fixture);
  return hashJson({caseId: view.caseId, observedBundle: view.observedBundle});
}
export function semanticFingerprint(state, fixture) {
  const view = deriveView(state, fixture);
  return hashJson({caseId: state.caseId, referenceWorldId: state.referenceWorldId,
    selectedAdditionalQueryIds: view.selectedAdditionalQueryIds, observedBundle: view.observedBundle,
    compatibleWorldIds: view.compatibleWorldIds, localPropertyDetermined: view.localPropertyDetermined,
    cameraYawDegrees: state.cameraYawDegrees, certificateVisible: state.certificateVisible,
    cursorSeconds: state.cursorSeconds, mode: state.mode, paused: state.paused});
}
export function transition(state, action, fixture) {
  const type = action.type, value = action.value;
  if (type === 'checkpoint' || type === 'reopen') return {state: stateAt(type === 'reopen' ? 0 : value, fixture), result: 'restored'};
  if (type === 'previous' || type === 'next') {
    const target = type === 'previous' ? [...CHECKPOINT_SECONDS].reverse().find(t => t < state.cursorSeconds) :
      CHECKPOINT_SECONDS.find(t => t > state.cursorSeconds);
    return {state: stateAt(target ?? state.cursorSeconds, fixture), result: target === undefined ? 'boundary' : 'restored'};
  }
  if (type === 'play') return {state: {...stateAt(state.cursorSeconds >= 32 ? 0 : state.cursorSeconds, fixture), paused: false}, result: 'playing'};
  if (type === 'pause') return {state: {...stateAt(state.cursorSeconds, fixture), paused: true}, result: 'paused'};
  if (type === 'replay') return {state: {...stateAt(0, fixture), paused: false}, result: 'playing'};
  let next = {...state, selectedAdditionalQueryIds: [...state.selectedAdditionalQueryIds],
    mode: 'exploration', paused: true};
  if (type === 'case') {
    let caseData;
    try { caseData = caseById(fixture, value); } catch { return {state, result: 'invalid-case'}; }
    next = {...next, caseId: caseData.id, referenceWorldId: caseData.defaultReferenceWorldId,
      selectedAdditionalQueryIds: [], cameraYawDegrees: 0, certificateVisible: false};
  } else if (type === 'reference') {
    const caseData = caseById(fixture, state.caseId);
    if (!caseData.worlds.some(world => world.id === value)) return {state, result: 'invalid-reference'};
    next = {...next, referenceWorldId: value, selectedAdditionalQueryIds: [],
      cameraYawDegrees: 0, certificateVisible: false};
  } else if (type === 'add-query') {
    const caseData = caseById(fixture, state.caseId);
    if (!caseData.additionalQueryIds.includes(value)) return {state, result: 'off-menu'};
    if (state.selectedAdditionalQueryIds.includes(value)) return {state, result: 'already-selected'};
    next.selectedAdditionalQueryIds.push(value);
    next.selectedAdditionalQueryIds = caseData.additionalQueryIds.filter(id => next.selectedAdditionalQueryIds.includes(id));
  } else if (type === 'reset-observations') {
    next.selectedAdditionalQueryIds = [];
    next.certificateVisible = false;
  } else if (type === 'camera') {
    if (!fixture.cameraYawDegrees.includes(value)) return {state, result: 'invalid-camera'};
    next.cameraYawDegrees = value;
  } else if (type === 'certificate') next.certificateVisible = Boolean(value);
  else return {state, result: 'invalid-action'};
  return {state: next, result: 'applied'};
}
