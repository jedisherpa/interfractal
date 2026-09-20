// Gate 2 mathematical model. q=[Re z1,Im z1,Re z2,Im z2] lies on S³ ⊂ R⁴.
export const RUN_ID = 'G2-HOPF-001';
export const DURATION_MS = 24_000;
export const STEP_MS = 1_000;
export const CHECKPOINTS_MS = Object.freeze([0, 6_000, 12_000, 18_000, 24_000]);
export const SAMPLE_COUNT = 128;
export const CLIP_RADIUS = 4;
export const CAMERA = Object.freeze({ yaw: Math.PI / 6, pitch: Math.PI / 9 });
const seam = 1e-6;
const seamX = -Math.sqrt(1 - seam * seam);
export const BASES = Object.freeze([
  { id: 'north', label: 'North pole', p: [0, 0, 1] },
  { id: 'south', label: 'South pole · infinity case', p: [0, 0, -1] },
  { id: 'east', label: 'Equator east', p: [1, 0, 0] },
  { id: 'west', label: 'Equator west', p: [-1, 0, 0] },
  { id: 'front', label: 'Equator forward', p: [0, 1, 0] },
  { id: 'back', label: 'Equator back', p: [0, -1, 0] },
  { id: 'seam-plus', label: 'Longitude seam +', p: [seamX, seam, 0] },
  { id: 'seam-minus', label: 'Longitude seam −', p: [seamX, -seam, 0] }
].map(item => Object.freeze({ ...item, p: Object.freeze(item.p) })));
export const CANONICAL_BASE_ID = 'east';
export const FIBER_BASE_IDS = Object.freeze(BASES.map(base => base.id));

export function clampTime(ms) {
  if (!Number.isFinite(ms)) throw new TypeError('Simulation time must be finite');
  return Math.max(0, Math.min(DURATION_MS, Math.round(ms)));
}
export function norm(v) { return Math.hypot(...v); }
export function normalizedBase(p) {
  if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite)) throw new TypeError('Base point requires three finite coordinates');
  const m = norm(p);
  if (m < 1e-12) throw new RangeError('Base point cannot be zero');
  return p.map(v => v / m);
}
export function baseById(id) { return BASES.find(base => base.id === id) || null; }
export function baseFromLatLon(latitudeDegrees, longitudeDegrees) {
  const lat = latitudeDegrees * Math.PI / 180, lon = longitudeDegrees * Math.PI / 180;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(latitudeDegrees) > 90) throw new RangeError('Invalid latitude or longitude');
  return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
}
export function chartValid(p, chart) {
  const v = normalizedBase(p);
  if (chart === 'N') return v[2] > -1 + 1e-12;
  if (chart === 'S') return v[2] < 1 - 1e-12;
  throw new RangeError('Chart must be N or S');
}
export function localSection(p, chart) {
  const [X, Y, Z] = normalizedBase(p);
  if (!chartValid([X, Y, Z], chart)) throw new RangeError(`Chart ${chart} is undefined at this pole`);
  if (chart === 'N') {
    const a = Math.sqrt((1 + Z) / 2), den = Math.sqrt(2 * (1 + Z));
    return [a, 0, X / den, -Y / den];
  }
  const c = Math.sqrt((1 - Z) / 2), den = Math.sqrt(2 * (1 - Z));
  return [X / den, Y / den, c, 0];
}
export function phaseMultiply([a, b, c, d], gamma) {
  if (!Number.isFinite(gamma)) throw new TypeError('Phase must be finite');
  const u = Math.cos(gamma), v = Math.sin(gamma);
  return [u * a - v * b, v * a + u * b, u * c - v * d, v * c + u * d];
}
export function hopf([a, b, c, d]) {
  return [2 * (a * c + b * d), 2 * (b * c - a * d), a * a + b * b - c * c - d * d];
}
export function fiberPoint(p, gamma, chart = 'N') { return phaseMultiply(localSection(p, chart), gamma); }
export function chartCompensatedPhase(p, gamma, fromChart, toChart) {
  if (!chartValid(p, toChart)) throw new RangeError(`Chart ${toChart} is undefined at this pole`);
  if (fromChart === toChart) return gamma;
  const longitude = Math.atan2(p[1], p[0]);
  return fromChart === 'N' ? gamma - longitude : gamma + longitude;
}
export function stereographic(q) {
  const denominator = 1 - q[3];
  if (Math.abs(denominator) < 1e-12) return { kind: 'infinity', point: null, denominator };
  const point = [q[0] / denominator, q[1] / denominator, q[2] / denominator];
  return { kind: norm(point) <= CLIP_RADIUS ? 'inside' : 'clipped', point, denominator };
}
export function cameraProject([x, y, z], camera = CAMERA) {
  const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw), cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  const xx = cy * x + sy * z, z1 = -sy * x + cy * z;
  const yy = cp * y - sp * z1, zz = sp * y + cp * z1;
  return { screen: [xx, -yy], depth: zz };
}
export function sampleFiber(p, chart = 'N') {
  const samples = Array.from({ length: SAMPLE_COUNT }, (_, j) => {
    const gamma = 2 * Math.PI * j / SAMPLE_COUNT;
    const q = fiberPoint(p, gamma, chart);
    return { index: j, gamma, q, h: hopf(q), representation: stereographic(q) };
  });
  return samples;
}
// Fixed model state; the browser's viewport/pixel transform is separately reported by the renderer.
export function modelAt(timeMs, options = {}) {
  const t = clampTime(timeMs);
  const baseId = options.baseId ?? CANONICAL_BASE_ID;
  const base = baseById(baseId);
  const p = options.basePoint ? normalizedBase(options.basePoint) : base?.p;
  if (!p) throw new RangeError(`Unknown base ${baseId}`);
  const chart = options.chart ?? (chartValid(p, 'N') ? 'N' : 'S');
  const phase = options.phaseOverride ?? 2 * Math.PI * t / DURATION_MS;
  const camera = { yaw: options.cameraYawOverride ?? CAMERA.yaw, pitch: CAMERA.pitch };
  if (!Number.isFinite(camera.yaw)) throw new TypeError('Camera yaw must be finite');
  const q = fiberPoint(p, phase, chart);
  const fibers = BASES.map(item => ({ id: item.id, p: [...item.p], samples: sampleFiber(item.p, chartValid(item.p, 'N') ? 'N' : 'S') }));
  const selectedSamples = base ? fibers.find(f => f.id === baseId)?.samples : sampleFiber(p, chart);
  const selectedRepresentation = stereographic(q);
  return {
    simulationTimeMs: t, model: 'Hopf S³→S² with stereographic S³→R³', sourceDimension: 3, ambientDimension: 4,
    baseId: base ? baseId : 'custom', basePoint: [...p], chart, phase, sourcePoint: q, hopfPoint: hopf(q),
    sourceNorm: norm(q), selectedRepresentation, selectedSamples,
    fibers, camera, clipping: { radius: CLIP_RADIUS, excludedS3Point: [0, 0, 0, 1], policy: 'split at infinity; clip to R³ radius 4; no closure across excluded point' },
    sampling: { samplesPerFiber: SAMPLE_COUNT, sampledBaseIds: FIBER_BASE_IDS },
    display: { projection: 'orthographic', order: 'Rx(pitch)·Ry(yaw)·stereographicPoint', scaleSvgUnitsPerR3Unit: 55, center: [320, 210] }
  };
}
export function geometryState(state) {
  return { baseId: state.baseId, basePoint: state.basePoint,
    chart: state.chart, phase: state.phase, sourcePoint: state.sourcePoint, hopfPoint: state.hopfPoint,
    selectedRepresentation: state.selectedRepresentation, clipping: state.clipping,
    sampling: state.sampling, sampledFibers: state.fibers };
}
export function canonicalState(value) { return JSON.stringify(value); }
