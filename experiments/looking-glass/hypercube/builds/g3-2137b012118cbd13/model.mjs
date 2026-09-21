export const RUN_ID = 'G3-TESSERACT-001';
export const DURATION_MS = 32_000;
export const STEP_MS = 1_000;
export const CHECKPOINTS_MS = Object.freeze([0, 8_000, 16_000, 24_000, 32_000]);
export const CAMERA = Object.freeze({ yaw: Math.PI / 6, pitch: Math.PI / 9 });
export const SCALE = 80;
export const SOURCE = Object.freeze(Array.from({ length: 16 }, (_, n) => {
  const bits = n.toString(2).padStart(4, '0');
  return Object.freeze({ id: `v${bits}`, q: Object.freeze([...bits].map(bit => bit === '0' ? -1 : 1)) });
}));
export const EDGES = Object.freeze(SOURCE.flatMap((a, i) => SOURCE.slice(i + 1)
  .filter(b => a.q.reduce((count, value, axis) => count + (value !== b.q[axis] ? 1 : 0), 0) === 1)
  .map(b => Object.freeze({ id: `e-${a.id}-${b.id}`, from: a.id, to: b.id }))));
export const MARKED_PAIR = Object.freeze(['v1110', 'v1111']);

export function clampTime(ms) {
  if (!Number.isFinite(ms)) throw new TypeError('Simulation time must be finite');
  return Math.max(0, Math.min(DURATION_MS, Math.round(ms)));
}
export function angleAt(ms) {
  const t = clampTime(ms);
  return t <= DURATION_MS / 2 ? Math.PI * t / DURATION_MS : Math.PI * (DURATION_MS - t) / DURATION_MS;
}
// Column-vector x–w plane rotation. y and z are unchanged.
export function rotateXW([x, y, z, w], theta) {
  if (!Number.isFinite(theta)) throw new TypeError('Rotation angle must be finite');
  const c = Math.cos(theta), s = Math.sin(theta);
  return [c * x - s * w, y, z, s * x + c * w];
}
export function projectionMatrix(theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [[c, 0, 0, -s], [0, 1, 0, 0], [0, 0, 1, 0]];
}
export function rotationMatrix(theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [[c, 0, 0, -s], [0, 1, 0, 0], [0, 0, 1, 0], [s, 0, 0, c]];
}
export function projected3(q, theta) { return rotateXW(q, theta).slice(0, 3); }
// Separate ordinary camera; screen coordinates are actual SVG viewBox units.
export function displayProjection([x, y, z], camera = CAMERA) {
  const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  const a = cy * x - sy * z;
  const b = sy * x + cy * z;
  const vertical = cp * y - sp * b;
  return { cameraCoordinates: [a, vertical, sp * y + cp * b],
    normalizedScreen: [a, -vertical], screen: [320 + SCALE * a, 210 - SCALE * vertical] };
}
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
export function modelAt(ms, options = {}) {
  const simulationTimeMs = clampTime(ms);
  const theta = options.sourceAngleOverride ?? angleAt(simulationTimeMs);
  const camera = { yaw: options.cameraYawOverride ?? CAMERA.yaw, pitch: CAMERA.pitch };
  if (!Number.isFinite(theta) || !Number.isFinite(camera.yaw)) throw new TypeError('View angles must be finite');
  const vertices = SOURCE.map(({ id, q }) => {
    const rotatedSource = rotateXW(q, theta);
    const projected = rotatedSource.slice(0, 3);
    return { id, originalSource: [...q], rotatedSource, projected, ...displayProjection(projected, camera) };
  });
  const byId = Object.fromEntries(vertices.map(v => [v.id, v]));
  const [a, b] = MARKED_PAIR.map(id => byId[id]);
  const projectionSites = [];
  for (const vertex of vertices) {
    let site = projectionSites.find(s => distance(s.projected, vertex.projected) < 1e-10);
    if (!site) { site = { projected: vertex.projected, sourceIds: [] }; projectionSites.push(site); }
    site.sourceIds.push(vertex.id);
  }
  return {
    simulationTimeMs, sourceObject: 'solid 4D hypercube vertices and wireframe boundary edges',
    sourceDimension: 4, boundaryDimension: 3, wireframeDimension: 1,
    rotation: { plane: 'x–w', theta, matrix: rotationMatrix(theta) },
    projection: { description: 'orthographic P(x′,y′,z′,w′)=(x′,y′,z′)', matrix: [[1,0,0,0],[0,1,0,0],[0,0,1,0]],
      composedMatrix: projectionMatrix(theta) },
    camera, displayProjection: 'a=cos(yaw)x−sin(yaw)z; b=sin(yaw)x+cos(yaw)z; vertical=cos(pitch)y−sin(pitch)b; screen=(320+80a,210−80vertical)',
    fixedScaleSvgUnitsPerR3Unit: SCALE, selectedVertexIds: [...MARKED_PAIR],
    pairSourceDistance: distance(a.originalSource, b.originalSource),
    pairProjectedDistance: distance(a.projected, b.projected),
    vertices, edges: EDGES, projectionSites
  };
}
export function geometryState(s) {
  const byId = Object.fromEntries(s.vertices.map(v => [v.id, v]));
  return { rotation: s.rotation, projection: s.projection,
    vertices: s.vertices.map(v => ({ id: v.id, rotatedSource: v.rotatedSource, projected: v.projected })),
    projectionSites: s.projectionSites,
    edges: s.edges.map(e => ({ id: e.id, from: e.from, to: e.to,
      projectedLength: distance(byId[e.from].projected, byId[e.to].projected),
      collapsed: distance(byId[e.from].projected, byId[e.to].projected) < 1e-10 })) };
}
export function checkpointState(s) {
  return { simulationTimeMs: s.simulationTimeMs, theta: s.rotation.theta, camera: s.camera,
    selectedVertexIds: s.selectedVertexIds, geometry: geometryState(s) };
}
export function displayState(s) {
  return { camera: s.camera,
    points: s.vertices.map(v => ({ id: v.id, cameraCoordinates: v.cameraCoordinates,
      normalizedScreen: v.normalizedScreen, screen: v.screen })) };
}
export function cameraMatrix(camera = CAMERA) {
  const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  return [[cy, 0, -sy], [-sp * sy, cp, -sp * cy], [cp * sy, sp, cp * cy]];
}
// Reduced-row-echelon rank with fixed pivot tolerance; inputs are known projection matrices.
export function matrixRank(rows, tolerance = 1e-10) {
  const a = rows.map(row => [...row]);
  let rank = 0;
  for (let col = 0; col < 4 && rank < a.length; col++) {
    let pivot = rank;
    for (let row = rank + 1; row < a.length; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < tolerance) continue;
    [a[rank], a[pivot]] = [a[pivot], a[rank]];
    const d = a[rank][col];
    for (let j = col; j < 4; j++) a[rank][j] /= d;
    for (let row = 0; row < a.length; row++) if (row !== rank) {
      const factor = a[row][col];
      for (let j = col; j < 4; j++) a[row][j] -= factor * a[rank][j];
    }
    rank++;
  }
  return rank;
}
// Solver inputs are opaque matching IDs, measured raw p, and caller-supplied known PR matrices.
// This routine has no source fixture, ID decoding, angle or hidden coordinate access.
export function reconstruct(observations, tolerance = 1e-10) {
  if (!observations.length || observations.some(o => o.id !== observations[0].id ||
    !Array.isArray(o.matrix) || o.matrix.length !== 3 || o.matrix.some(row => row.length !== 4) ||
    !Array.isArray(o.projected) || o.projected.length !== 3)) throw new TypeError('Matched ID, 3D p and known 3x4 matrices required');
  const rows = observations.flatMap(o => o.matrix);
  const values = observations.flatMap(o => o.projected);
  const rank = matrixRank(rows, tolerance);
  if (rank < 4) return { rank, reconstructed: null, residual: null };
  const augmented = rows.map((row, i) => [...row, values[i]]);
  let pivotRow = 0;
  for (let col = 0; col < 4; col++) {
    let pivot = pivotRow;
    for (let i = pivotRow + 1; i < augmented.length; i++) if (Math.abs(augmented[i][col]) > Math.abs(augmented[pivot][col])) pivot = i;
    if (Math.abs(augmented[pivot][col]) < tolerance) continue;
    [augmented[pivotRow], augmented[pivot]] = [augmented[pivot], augmented[pivotRow]];
    const d = augmented[pivotRow][col];
    for (let j = col; j < 5; j++) augmented[pivotRow][j] /= d;
    for (let i = 0; i < augmented.length; i++) if (i !== pivotRow) {
      const factor = augmented[i][col];
      for (let j = col; j < 5; j++) augmented[i][j] -= factor * augmented[pivotRow][j];
    }
    pivotRow++;
  }
  const reconstructed = augmented.slice(0, 4).map(row => row[4]);
  const residual = Math.max(...rows.map((row, i) => Math.abs(row.reduce((sum, value, j) => sum + value * reconstructed[j], 0) - values[i])));
  return { rank, reconstructed, residual };
}
export function observabilityFor(id, viewAngles = [0, Math.PI / 2]) {
  if (!SOURCE.some(v => v.id === id)) throw new Error(`Unknown source ID ${id}`);
  const observations = viewAngles.map(theta => ({ id, theta, matrix: projectionMatrix(theta),
    projected: modelAt(0, { sourceAngleOverride: theta }).vertices.find(v => v.id === id).projected }));
  const solved = reconstruct(observations);
  const hiddenTruth = SOURCE.find(v => v.id === id).q;
  return { sourceId: id, observations, ...solved,
    truthComparisonAfterReconstruction: solved.reconstructed ? distance(solved.reconstructed, hiddenTruth) : null };
}
