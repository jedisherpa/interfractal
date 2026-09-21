export const RUN_ID = 'G4-SLICES-002';
export const DURATION_MS = 40_000;
export const STEP_MS = 1_000;
export const CHECKPOINTS_MS = Object.freeze([0, 8_000, 16_000, 20_000, 24_000, 32_000, 40_000]);
export const SAMPLE_MS = 100;
export const RADIUS = 1;
export const CANDIDATE_CENTERS = Object.freeze([0.5, -0.5]);
export const CAMERA = Object.freeze({ yaw: Math.PI / 6, pitch: Math.PI / 9 });
export const SCALE = 80;
export const DISPLAY_OPTIONS = Object.freeze({ labels: true, depthCues: true, reducedMotionManualControls: true, inspectorOpen: false });
export const PROJECTION = Object.freeze([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]]);
export const SOURCE_DESCRIPTORS = Object.freeze([
  { id: 'ball-center', center4: [0, 0, 0, 0], radius: 1, dimension: 4, inequality: 'x²+y²+z²+w² ≤ 1' },
  { id: 'ball-plus', center4: [0, 0, 0, 0.5], radius: 1, dimension: 4, inequality: 'x²+y²+z²+(w−0.5)² ≤ 1' },
  { id: 'ball-minus', center4: [0, 0, 0, -0.5], radius: 1, dimension: 4, inequality: 'x²+y²+z²+(w+0.5)² ≤ 1' }
]);

export function clampTime(ms) {
  if (!Number.isFinite(ms)) throw new TypeError('Simulation time must be finite');
  return Math.max(0, Math.min(DURATION_MS, Math.round(ms / SAMPLE_MS) * SAMPLE_MS));
}
export function sliceLevelAt(ms) {
  const t = clampTime(ms);
  return t <= DURATION_MS / 2 ? 1.25 * t / (DURATION_MS / 2) : 1.25 * (DURATION_MS - t) / (DURATION_MS / 2);
}
export function movieAngleAt(ms) {
  const t = clampTime(ms);
  return t <= DURATION_MS / 2 ? Math.PI * t / DURATION_MS : Math.PI * (DURATION_MS - t) / DURATION_MS;
}
export function rotationMatrix(theta) {
  if (!Number.isFinite(theta)) throw new TypeError('Angle must be finite');
  const c = Math.cos(theta), s = Math.sin(theta);
  return [[c, 0, 0, -s], [0, 1, 0, 0], [0, 0, 1, 0], [s, 0, 0, c]];
}
export function rotateXW(q, theta) {
  const m = rotationMatrix(theta);
  return m.map(row => row.reduce((sum, n, i) => sum + n * q[i], 0));
}
export function sliceAt(wLevel, centerW = 0) {
  if (!Number.isFinite(wLevel) || !Number.isFinite(centerW)) throw new TypeError('Slice parameters must be finite');
  const delta = wLevel - centerW;
  const discriminant = RADIUS * RADIUS - delta * delta;
  const kind = discriminant < 0 ? 'empty' : discriminant === 0 ? 'point' : 'solid';
  const classification = kind === 'solid' ? delta === 0 ? 'center' : 'interior' :
    kind === 'point' ? 'boundary-point' : 'empty';
  return { levelW: wLevel, sourceCenterW: centerW, deltaW: delta, discriminant,
    kind, classification, isEmpty: kind === 'empty', isPoint: kind === 'point',
    radius: kind === 'empty' ? null : Math.sqrt(discriminant),
    center3: kind === 'empty' ? null : [0, 0, 0],
    set: kind === 'empty' ? '∅' : kind === 'point' ? '{(0,0,0)}' :
      '{(x,y,z): x²+y²+z² ≤ radius²}' };
}
export function fixedProjection(centerW = 0) {
  if (!Number.isFinite(centerW)) throw new TypeError('Source center must be finite');
  return { sourceCenter4: [0, 0, 0, centerW], matrix: PROJECTION, center3: [0, 0, 0], radius: 1,
    classification: 'solid-3d-ball', set: '{(x,y,z): x²+y²+z² ≤ 1}' };
}
export function turnedProjection(centerW, theta) {
  const center3 = rotateXW([0, 0, 0, centerW], theta).slice(0, 3);
  return { sourceCenter4: [0, 0, 0, centerW], rotation: rotationMatrix(theta),
    matrix: PROJECTION, center3, radius: 1, classification: 'solid-3d-ball' };
}
export function ambiguityAt(levelW = 0) {
  return { candidateClass: 'two unit 4D balls with known center w=+0.5 or w=-0.5',
    declaredInitialView: 'orthographic xyz projection and w=0 slice',
    intervention: 'known slice level w=+0.5', levelW,
    candidates: CANDIDATE_CENTERS.map(centerW => ({ id: centerW > 0 ? 'ball-plus' : 'ball-minus',
      sourceCenter4: [0, 0, 0, centerW], fixedProjection: fixedProjection(centerW),
      initialSlice: sliceAt(0, centerW), selectedSlice: sliceAt(levelW, centerW) })) };
}
export function movieSampleAt(index) {
  if (!Number.isInteger(index) || index < 0 || index > DURATION_MS / SAMPLE_MS) throw new RangeError('Invalid movie sample');
  const timeMs = index * SAMPLE_MS;
  const angle = movieAngleAt(timeMs);
  const source = turnedProjection(0.5, angle);
  return { index, simulationTimeMs: timeMs, angleRadians: angle,
    rotatedCenter4: rotateXW([0, 0, 0, 0.5], angle),
    sourceProjection: { center3: source.center3, radius: source.radius } };
}
export function movieSamples() {
  return Array.from({ length: DURATION_MS / SAMPLE_MS + 1 }, (_, i) => movieSampleAt(i));
}
export function displayPoint([x, y, z], camera = CAMERA) {
  const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  const a = cy * x - sy * z;
  const b = sy * x + cy * z;
  const v = cp * y - sp * b;
  return [320 + SCALE * a, 210 - SCALE * v];
}
export function modelAt(ms, options = {}) {
  const simulationTimeMs = clampTime(ms);
  const sliceLevelW = options.sliceLevelOverride ?? sliceLevelAt(simulationTimeMs);
  const camera = { yaw: options.cameraYawOverride ?? CAMERA.yaw, pitch: CAMERA.pitch };
  const ambiguityLevelW = options.ambiguityLevelOverride ?? 0;
  const displayOptions = { ...DISPLAY_OPTIONS, ...options.displayOptions };
  const movieIndex = Math.min(DURATION_MS / SAMPLE_MS, Math.round(simulationTimeMs / SAMPLE_MS));
  const savedMovie = movieSampleAt(movieIndex);
  const movieAngleOverride = options.movieAngleOverride ?? null;
  const sourceProjection = movieAngleOverride === null ? savedMovie.sourceProjection :
    turnedProjection(0.5, movieAngleOverride);
  const sourceAngleRadians = movieAngleOverride ?? savedMovie.angleRadians;
  const movie = { ...savedMovie, sourceId: 'ball-plus', sourceCenter4: [0, 0, 0, 0.5],
    sourceAngleRadians, rotationMatrix: rotationMatrix(sourceAngleRadians),
    projectionMatrix: PROJECTION,
    rotatedCenter4: rotateXW([0, 0, 0, 0.5], sourceAngleRadians),
    sourceProjection: { center3: sourceProjection.center3, radius: sourceProjection.radius },
    stored3dFrame: options.movieFrame ?? null,
    intervention: movieAngleOverride === null ? 'saved-turn' : 'known-source-turn-override' };
  movie.comparison = movie.stored3dFrame ? {
    centerDistance: Math.hypot(...movie.sourceProjection.center3.map((v, i) => v - movie.stored3dFrame.center[i])),
    radiusDifference: Math.abs(movie.sourceProjection.radius - movie.stored3dFrame.radius) } : null;
  return { simulationTimeMs, source: { id: 'ball-center', dimension: 4, radius: RADIUS, center4: [0, 0, 0, 0],
      inequality: 'x²+y²+z²+w² ≤ 1' },
    slice: sliceAt(sliceLevelW), projection: fixedProjection(), camera, displayOptions,
    ambiguity: ambiguityAt(ambiguityLevelW), movie,
    controls: { sliceLevelOverride: options.sliceLevelOverride ?? null,
      cameraYawOverride: options.cameraYawOverride ?? null,
      ambiguityLevelOverride: options.ambiguityLevelOverride ?? null,
      movieAngleOverride } };
}
export function sourceState() { return { modelVersion: 'gate-4-model-v1', descriptors: SOURCE_DESCRIPTORS }; }
export function sliceState(s) { return { sourceId: s.source.id, slice: s.slice }; }
export function projectionState(s) { return { sourceId: s.source.id, projection: s.projection }; }
export function movieState(s) { return { sourceId: s.movie.sourceId,
  sourceAngleRadians: s.movie.sourceAngleRadians, rotatedCenter4: s.movie.rotatedCenter4,
  sourceProjection: s.movie.sourceProjection, stored3dFrame: s.movie.stored3dFrame,
  sampleIndex: s.movie.index, comparison: s.movie.comparison }; }
export function geometryState(s) { return { simulationTimeMs: s.simulationTimeMs,
  slice: s.slice, projection: s.projection, ambiguity: s.ambiguity,
  movie: s.movie } ; }
export function checkpointState(s) { return { simulationTimeMs: s.simulationTimeMs,
  source: sourceState(), slice: sliceState(s), projection: projectionState(s),
  movie: movieState(s), ambiguity: s.ambiguity, camera: s.camera,
  displayOptions: s.displayOptions, controls: s.controls,
  mode: Object.values(s.controls).every(v => v === null) ? 'saved-run' : 'exploration' }; }
export function displayState(s) { return { camera: s.camera, displayOptions: s.displayOptions, slice: s.slice,
  projection: s.projection, ambiguity: s.ambiguity, movie: s.movie,
  sliceCenterScreen: s.slice.center3 ? displayPoint(s.slice.center3, s.camera) : null,
  projectionCenterScreen: displayPoint(s.projection.center3, s.camera) }; }
