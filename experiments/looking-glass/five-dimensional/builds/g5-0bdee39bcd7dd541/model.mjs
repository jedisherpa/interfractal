export const RUN_ID = 'G5-PENTERACT-001';
export const DURATION_MS = 40_000;
export const SAMPLE_MS = 100;
export const STEP_MS = 1_000;
export const CHECKPOINTS_MS = Object.freeze([0, 5_000, 10_000, 15_000, 20_000, 25_000, 30_000, 35_000, 40_000]);
export const CAMERA = Object.freeze({ yaw: Math.PI / 6, pitch: Math.PI / 9 });
export const SCALE = 80;
export const VIEW_BOX = Object.freeze([0, 0, 640, 420]);
export const SOURCE5 = Object.freeze(Array.from({ length: 32 }, (_, n) => {
  const bits = n.toString(2).padStart(5, '0');
  return Object.freeze({ id: `v${bits}`, q: Object.freeze([...bits].map(b => b === '0' ? -1 : 1)) });
}));
export const SOURCE4 = Object.freeze(Array.from({ length: 16 }, (_, n) => {
  const bits = n.toString(2).padStart(4, '0');
  return Object.freeze({ id: `v${bits}`, q: Object.freeze([...bits].map(b => b === '0' ? -1 : 1)) });
}));
export function edgesOf(vertices) {
  return vertices.flatMap((a, i) => vertices.slice(i + 1).filter(b =>
    a.q.reduce((count, value, axis) => count + (value !== b.q[axis] ? 1 : 0), 0) === 1)
    .map(b => Object.freeze({ id: `e-${a.id}-${b.id}`, from: a.id, to: b.id })));
}
export const EDGES5 = Object.freeze(edgesOf(SOURCE5));
export const EDGES4 = Object.freeze(edgesOf(SOURCE4));
export const PROJECT5 = Object.freeze([[1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0]]);
export const PROJECT4 = Object.freeze([[1,0,0,0],[0,1,0,0],[0,0,1,0]]);
export const SELECTED_IDS = Object.freeze(['v00000','v00010','v00001','v00011']);
const finite = (n, label) => { if (!Number.isFinite(n)) throw new TypeError(`${label} must be finite`); return n; };
const mul = (a, b) => a.map(row => b[0].map((_, j) => row.reduce((sum, x, k) => sum + x * b[k][j], 0)));
const apply = (m, q) => m.map(row => row.reduce((sum, x, i) => sum + x * q[i], 0));
const identity = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => +(i === j)));
const distance = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
export function clampTime(ms) {
  finite(ms, 'Time');
  return Math.max(0, Math.min(DURATION_MS, Math.round(ms / SAMPLE_MS) * SAMPLE_MS));
}
export function anglesAt(ms) {
  const t = clampTime(ms);
  const ramp = Math.PI / 2;
  if (t <= 10_000) return { alpha: ramp * t / 10_000, beta: 0 };
  if (t <= 20_000) return { alpha: ramp, beta: ramp * (t - 10_000) / 10_000 };
  if (t <= 30_000) return { alpha: ramp * (30_000 - t) / 10_000, beta: ramp };
  return { alpha: 0, beta: ramp * (40_000 - t) / 10_000 };
}
export function rotationXW(alpha, dimensions = 5) {
  finite(alpha, 'x–w angle');
  if (dimensions !== 4 && dimensions !== 5) throw new TypeError('Rotation dimension must be 4 or 5');
  const m = identity(dimensions), c = Math.cos(alpha), s = Math.sin(alpha);
  m[0][0] = c; m[0][3] = -s; m[3][0] = s; m[3][3] = c;
  return m;
}
export function rotationYV(beta) {
  finite(beta, 'y–v angle');
  const m = identity(5), c = Math.cos(beta), s = Math.sin(beta);
  m[1][1] = c; m[1][4] = -s; m[4][1] = s; m[4][4] = c;
  return m;
}
// Column vectors: first R_xw(alpha), then R_yv(beta). The disjoint planes commute.
export function rotation5(alpha, beta) { return mul(rotationYV(beta), rotationXW(alpha)); }
export function projectionMatrix5(alpha, beta) { return mul(PROJECT5, rotation5(alpha, beta)); }
export function projectionMatrix4(alpha) { return mul(PROJECT4, rotationXW(alpha, 4)); }
export function displayProjection([x,y,z], camera = CAMERA) {
  finite(camera.yaw, 'Camera yaw'); finite(camera.pitch, 'Camera pitch');
  const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw), cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  const a = cy*x-sy*z, b = sy*x+cy*z, vertical = cp*y-sp*b;
  return { cameraCoordinates: [a, vertical, sp*y+cp*b], normalizedScreen: [a, -vertical],
    screen: [320+SCALE*a, 210-SCALE*vertical] };
}
export function cameraMatrix(camera = CAMERA) {
  const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw), cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  return [[cy,0,-sy],[-sp*sy,cp,-sp*cy],[cp*sy,sp,cp*cy]];
}
export function slice5(w, v, radius = 1) {
  finite(w, 'Slice w'); finite(v, 'Slice v'); finite(radius, 'Ball radius');
  if (radius <= 0) throw new RangeError('Ball radius must be positive');
  const discriminant = radius*radius-w*w-v*v;
  const kind = discriminant < 0 ? 'empty' : discriminant === 0 ? 'point' : 'solid';
  return { constraints: { w, v }, sourceCenter5: [0,0,0,0,0], sourceRadius: radius,
    discriminant, kind, classification: kind === 'solid' ? (w === 0 && v === 0 ? 'center' : 'interior') :
      kind === 'point' ? 'boundary-point' : 'empty', radius: kind === 'empty' ? null : Math.sqrt(discriminant),
    center3: kind === 'empty' ? null : [0,0,0],
    set: kind === 'empty' ? '∅' : kind === 'point' ? '{(0,0,0)}' : '{(x,y,z): x²+y²+z² ≤ 1−w²−v²}' };
}
function sitesOf(vertices) {
  const sites = [];
  for (const vertex of vertices) {
    let site = sites.find(s => s.projected.every((x,i) => Math.abs(x-vertex.projected[i]) <= 1e-10));
    if (!site) { site = { projected: vertex.projected, sourceIds: [] }; sites.push(site); }
    site.sourceIds.push(vertex.id);
  }
  return sites;
}
function screenMetrics(vertices) {
  const groups = [], radiusPairs = [];
  for (const vertex of vertices) {
    let group = groups.find(g => g.screen.every((x,i) => Math.abs(x-vertex.screen[i]) <= 1e-10));
    if (!group) { group = { screen: vertex.screen, sourceIds: [] }; groups.push(group); }
    group.sourceIds.push(vertex.id);
  }
  for (let i = 0; i < vertices.length; i++) for (let j = i+1; j < vertices.length; j++) {
    const d = distance(vertices[i].screen, vertices[j].screen);
    if (d < 8) radiusPairs.push({ a: vertices[i].id, b: vertices[j].id, distanceSvgUnits: d });
  }
  return { exactCoincidenceGroups: groups.filter(g => g.sourceIds.length > 1),
    exactScreenSiteCount: groups.length, coincidentMarkerExcess: vertices.length-groups.length,
    glyphOverlapPairCount: radiusPairs.length, glyphOverlapPairs: radiusPairs,
    definition: 'center distance <8 SVG units for radius-4 glyphs; proxy, not perceived visibility' };
}
export function shapeAt(dimension, alpha, beta = 0, camera = CAMERA) {
  if (dimension !== 4 && dimension !== 5) throw new TypeError('Shape dimension must be 4 or 5');
  const sources = dimension === 5 ? SOURCE5 : SOURCE4, edges = dimension === 5 ? EDGES5 : EDGES4;
  const matrix = dimension === 5 ? rotation5(alpha, beta) : rotationXW(alpha, 4);
  const composedProjection = dimension === 5 ? projectionMatrix5(alpha, beta) : projectionMatrix4(alpha);
  const vertices = sources.map(({ id, q }) => {
    const rotatedSource = apply(matrix, q), projected = rotatedSource.slice(0,3);
    return { id, originalSource: [...q], rotatedSource, projected, ...displayProjection(projected, camera) };
  });
  const byId = Object.fromEntries(vertices.map(v => [v.id, v]));
  const projectedEdges = edges.map(e => ({ ...e, projectedLength: distance(byId[e.from].projected, byId[e.to].projected),
    collapsed: distance(byId[e.from].projected, byId[e.to].projected) <= 1e-10 }));
  const sites = sitesOf(vertices);
  return { dimension, solidDimension: dimension, boundaryDimension: dimension-1, wireframeDimension: 1,
    sourceVertices: sources, sourceEdges: edges, rotation: { alpha, beta: dimension === 5 ? beta : null,
      order: dimension === 5 ? 'R_yv(beta) × R_xw(alpha), column vectors' : 'R_xw(alpha)', matrix },
    projection: { matrix: dimension === 5 ? PROJECT5 : PROJECT4, composedMatrix: composedProjection,
      description: `orthographic first three of rotated R${dimension}` },
    camera, fixedScaleSvgUnitsPerR3Unit: SCALE, vertices, edges: projectedEdges,
    projectionSites: sites, metrics: { vertexCount: vertices.length, edgeCount: edges.length,
      uniqueProjectedSites: sites.length, collapsedEdges: projectedEdges.filter(e => e.collapsed).length,
      nonzeroProjectedEdges: projectedEdges.filter(e => !e.collapsed).length,
      screen: screenMetrics(vertices) } };
}
export function modelAt(ms, options = {}) {
  const simulationTimeMs = clampTime(ms), scheduled = anglesAt(simulationTimeMs);
  const alpha = options.alphaOverride ?? scheduled.alpha, beta = options.betaOverride ?? scheduled.beta;
  finite(alpha, 'x–w angle'); finite(beta, 'y–v angle');
  const camera = { yaw: options.cameraYawOverride ?? CAMERA.yaw, pitch: CAMERA.pitch };
  const w = options.sliceWOverride ?? 0, v = options.sliceVOverride ?? 0;
  const slice = slice5(w, v);
  return { simulationTimeMs, source5: shapeAt(5, alpha, beta, camera),
    comparator4: shapeAt(4, alpha, 0, camera), slice,
    sourceBall5: { dimension: 5, boundaryDimension: 4, center5: [0,0,0,0,0], radius: 1,
      inequality: 'x²+y²+z²+w²+v² ≤ 1' },
    sliceProjection: { matrix: PROJECT5, center3: [0,0,0], radius: 1,
      description: 'Full orthographic xyz projection of the unrotated 5D ball; independent of w/v slice' },
    camera, interface: { selectedVertexId: options.selectedVertexId ?? 'v00000',
      observationCondition: options.observationCondition ?? 'base',
      task: options.task ?? { id: 'none', stage: 'none' } },
    controls: { alphaOverride: options.alphaOverride ?? null, betaOverride: options.betaOverride ?? null,
      cameraYawOverride: options.cameraYawOverride ?? null, sliceWOverride: options.sliceWOverride ?? null,
      sliceVOverride: options.sliceVOverride ?? null }, displayOptions: { inspectorOpen: !!options.inspectorOpen } };
}
export function sourceState() { return { modelVersion: 'gate-5-model-v1', source5: SOURCE5,
  edges5: EDGES5, source4: SOURCE4, edges4: EDGES4, ball5: 'x²+y²+z²+w²+v² ≤ 1' }; }
export function rotationState(s) { return { alpha:s.source5.rotation.alpha,beta:s.source5.rotation.beta,
  rotation:s.source5.rotation.matrix,vertices:s.source5.vertices.map(v=>({id:v.id,rotatedSource:v.rotatedSource})) }; }
export function projectionState(s) { return { matrix:s.source5.projection.matrix,
  composedMatrix:s.source5.projection.composedMatrix,vertices:s.source5.vertices.map(v=>({id:v.id,projected:v.projected})),
  projectionSites:s.source5.projectionSites,edges:s.source5.edges }; }
export function comparatorState(s) { return { source4:SOURCE4,edges4:EDGES4,alpha:s.comparator4.rotation.alpha,
  projection:s.comparator4.projection,vertices:s.comparator4.vertices.map(v=>({id:v.id,projected:v.projected})),
  projectionSites:s.comparator4.projectionSites,edges:s.comparator4.edges }; }
export function sliceState(s) { return { sourceBall5:s.sourceBall5,slice:s.slice,
  fullProjection:s.sliceProjection }; }
export function geometryState(s) { return { simulationTimeMs: s.simulationTimeMs,
  source5: { rotation: s.source5.rotation, projection: s.source5.projection,
    vertices: s.source5.vertices.map(v => ({ id: v.id, originalSource: v.originalSource,
      rotatedSource: v.rotatedSource, projected: v.projected })), edges: s.source5.edges,
    projectionSites: s.source5.projectionSites, metrics: s.source5.metrics },
  comparator4: { rotation: s.comparator4.rotation, projection: s.comparator4.projection,
    vertices: s.comparator4.vertices.map(v => ({ id: v.id, originalSource: v.originalSource,
      rotatedSource: v.rotatedSource, projected: v.projected })), edges: s.comparator4.edges,
    projectionSites: s.comparator4.projectionSites, metrics: s.comparator4.metrics },
  slice: s.slice, sliceProjection: s.sliceProjection }; }
export function displayState(s) { return { camera: s.camera,
  source5: s.source5.vertices.map(v => ({ id: v.id, cameraCoordinates: v.cameraCoordinates, screen: v.screen })),
  comparator4: s.comparator4.vertices.map(v => ({ id: v.id, cameraCoordinates: v.cameraCoordinates, screen: v.screen })),
  displayOptions: s.displayOptions, viewBox: VIEW_BOX, scale: SCALE }; }
export function checkpointState(s) { return { simulationTimeMs: s.simulationTimeMs,
  source: sourceState(), geometry: geometryState(s), camera: s.camera,
  controls: s.controls, interface:s.interface, displayOptions: s.displayOptions,
  mode: Object.values(s.controls).every(v => v === null) &&
    s.interface.selectedVertexId === 'v00000' && s.interface.observationCondition === 'base' &&
    s.interface.task.id === 'none' && s.interface.task.stage === 'none' && !s.displayOptions.inspectorOpen ?
    'saved-run' : 'exploration' }; }
export function matrixRank(rows, n, tolerance = 1e-10) {
  if (!rows.length || rows.some(row => row.length !== n || row.some(x => !Number.isFinite(x)))) throw new TypeError('Finite rectangular matrix required');
  const a = rows.map(row => [...row]); let rank = 0;
  for (let col = 0; col < n && rank < a.length; col++) {
    let pivot = rank;
    for (let i = rank+1; i < a.length; i++) if (Math.abs(a[i][col]) > Math.abs(a[pivot][col])) pivot = i;
    if (Math.abs(a[pivot][col]) < tolerance) continue;
    [a[rank], a[pivot]] = [a[pivot], a[rank]];
    const d = a[rank][col];
    for (let j = col; j < n; j++) a[rank][j] /= d;
    for (let i = 0; i < a.length; i++) if (i !== rank) {
      const f = a[i][col]; for (let j = col; j < n; j++) a[i][j] -= f*a[rank][j];
    }
    rank++;
  }
  return rank;
}
// This inverse sees only opaque correspondence IDs, known matrices and raw measured xyz.
export function reconstruct(observations, tolerance = 1e-10) {
  if (!observations.length || observations.some(o => o.id !== observations[0].id ||
    !Array.isArray(o.matrix) || o.matrix.length !== 3 || o.matrix.some(r => r.length !== 5 || r.some(x => !Number.isFinite(x))) ||
    !Array.isArray(o.projected) || o.projected.length !== 3 || o.projected.some(x => !Number.isFinite(x))))
    throw new TypeError('Matched ID, finite 3D p and known 3×5 matrices required');
  const rows = observations.flatMap(o => o.matrix), values = observations.flatMap(o => o.projected);
  const rank = matrixRank(rows, 5, tolerance);
  if (rank < 5) return { rank, reconstructed: null, residual: null };
  const a = rows.map((row, i) => [...row, values[i]]); let pivotRow = 0;
  for (let col = 0; col < 5; col++) {
    let pivot = pivotRow;
    for (let i = pivotRow+1; i < a.length; i++) if (Math.abs(a[i][col]) > Math.abs(a[pivot][col])) pivot = i;
    if (Math.abs(a[pivot][col]) < tolerance) throw new Error('Rank disagreement');
    [a[pivotRow], a[pivot]] = [a[pivot], a[pivotRow]];
    const d = a[pivotRow][col]; for (let j = col; j <= 5; j++) a[pivotRow][j] /= d;
    for (let i = 0; i < a.length; i++) if (i !== pivotRow) {
      const f = a[i][col]; for (let j = col; j <= 5; j++) a[i][j] -= f*a[pivotRow][j];
    }
    pivotRow++;
  }
  const reconstructed = a.slice(0,5).map(row => row[5]);
  const residual = Math.max(...rows.map((row,i) => Math.abs(row.reduce((sum,x,j) => sum+x*reconstructed[j],0)-values[i])));
  return { rank, reconstructed, residual };
}
export function observationsFor(id, views = [[0,0],[Math.PI/2,0],[0,Math.PI/2]]) {
  if (!SOURCE5.some(v => v.id === id)) throw new Error(`Unknown ID ${id}`);
  return views.map(([alpha,beta]) => ({ id, alpha, beta, matrix: projectionMatrix5(alpha,beta),
    projected: shapeAt(5,alpha,beta).vertices.find(v => v.id === id).projected }));
}
