export const RUN_ID = 'G1-CUBE-001';
export const DURATION_MS = 40_000;
export const STEP_MS = 1_000;
export const CHECKPOINTS_MS = Object.freeze([0, 10_000, 20_000, 30_000, 40_000]);
export const CAMERA = Object.freeze({ yaw: Math.PI / 6, pitch: Math.PI / 9 });
export const SOURCE = Object.freeze(Array.from({ length: 8 }, (_, n) => {
  const bits = n.toString(2).padStart(3, '0');
  return Object.freeze({ id: `v${bits}`, q: Object.freeze([...bits].map(bit => bit === '0' ? -1 : 1)) });
}));
export const EDGES = Object.freeze(SOURCE.flatMap((v, i) => SOURCE.slice(i + 1)
  .filter(w => [...v.id.slice(1)].filter((bit, axis) => bit !== w.id[axis + 1]).length === 1)
  .map(w => Object.freeze({ id: `${v.id}-${w.id}`, from: v.id, to: w.id }))));
export const MARKED_PAIR = Object.freeze(['v110', 'v111']);

export function clampTime(timeMs) {
  if (!Number.isFinite(timeMs)) throw new TypeError('Simulation time must be finite');
  return Math.max(0, Math.min(DURATION_MS, Math.round(timeMs)));
}
export function angleAt(timeMs) {
  const t = clampTime(timeMs);
  return t <= 20_000 ? Math.PI * t / 40_000 : Math.PI * (40_000 - t) / 40_000;
}
export function rotateSource([x, y, z], theta) {
  if (!Number.isFinite(theta)) throw new TypeError('Source angle must be finite');
  const c = Math.cos(theta), s = Math.sin(theta);
  return [c * x - s * z, y, s * x + c * z];
}
// Column vectors: display c=Rx(pitch)·Ry(yaw)·rotatedSource. SVG screen=(cx,-cy).
export function displayProjection([x, y, z], camera) {
  const cy = Math.cos(camera.yaw), sy = Math.sin(camera.y);
  const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  const cx = cy * x + sy * z;
  const z1 = -sy * x + cy * z;
  const yy = cp * y - sp * z1;
  const cz = sp * y + cp * z1;
  return { cameraCoordinates: [cx, yy, cz], screen: [cx, -yy] };
}
export function modelAt(timeMs, options = {}) {
  const t = clampTime(timeMs);
  const theta = options.sourceAngleOverride ?? angleAt(t);
  const yaw = options.cameraYawOverride ?? CAMERA.yaw;
  if (!Number.isFinite(theta) || !Number.isFinite(yaw)) throw new TypeError('View angles must be finite');
  const camera = { yaw, pitch: CAMERA.pitch };
  const vertices = SOURCE.map(({ id, q }) => {
    const rotatedSource = rotateSource(q, theta);
    return { id, originalSource: [...q], rotatedSource, shadow: rotatedSource.slice(0, 2), ...displayProjection(rotatedSource, camera) };
  });
  const byId = Object.fromEntries(vertices.map(v => [v.id, v]));
  const [a, b] = MARKED_PAIR.map(id => byId[id]);
  const pairShadowDistance = Math.hypot(a.shadow[0] - b.shadow[0], a.shadow[1] - b.shadow[1]);
  const pairSourceDistance = Math.hypot(...a.originalSource.map((value, i) => value - b.originalSource[i]));
  const nearPoint = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-10;
  const shadowSites = [];
  for (const vertex of vertices) {
    let site = shadowSites.find(item => nearPoint(item.xy, vertex.shadow));
    if (!site) { site = { xy: vertex.shadow, sourceIds: [], multiplicity: 0 }; shadowSites.push(site); }
    site.sourceIds.push(vertex.id); site.multiplicity++;
  }
  const edges = EDGES.map(edge => ({ ...edge, shadowCollapsed: nearPoint(byId[edge.from].shadow, byId[edge.to].shadow) }));
  const nonzeroShadowSegments = [];
  for (const edge of edges.filter(item => !item.shadowCollapsed)) {
    const endpoints = [byId[edge.from].shadow, byId[edge.to].shadow];
    let segment = nonzeroShadowSegments.find(item =>
      (nearPoint(item.endpoints[0], endpoints[0]) && nearPoint(item.endpoints[1], endpoints[1])) ||
      (nearPoint(item.endpoints[0], endpoints[1]) && nearPoint(item.endpoints[1], endpoints[0])));
    if (!segment) { segment = { endpoints, sourceEdgeIds: [], multiplicity: 0 }; nonzeroShadowSegments.push(segment); }
    segment.sourceEdgeIds.push(edge.id); segment.multiplicity++;
  }
  return {
    simulationTimeMs: t, sourceObject: 'ordinary-3d-wire-cube', sourceDimension: 3,
    sourceRotation: { axis: 'y', matrix: 'Ry(theta): x′=cosθx−sinθz; y′=y; z′=sinθx+cosθz', theta },
    shadowProjection: 'orthographic P=(x′,y′), independent of display camera',
    camera, displayProjection: 'orthographic c=Rx(pitch)·Ry(yaw)·rotatedSource; SVG screen=(cx,−cy)',
    fixedScalePxPerUnit: 95, selectedVertexIds: MARKED_PAIR,
    paneMapping: { source: { viewBox: [0, 0, 500, 360], center: [250, 180], svgPixel: '(250+95·screenX,180+95·screenY)' },
      shadow: { viewBox: [0, 0, 500, 360], center: [250, 180], svgPixel: '(250+95·x′,180−95·y′)' } },
    pairSourceDistance, pairShadowDistance, vertices,
    shadowSites, nonzeroShadowSegments, edges
  };
}
export function geometryState(state) {
  return {
    sourceRotation: state.sourceRotation,
    vertices: state.vertices.map(v => ({ id: v.id, originalSource: v.originalSource, rotatedSource: v.rotatedSource, shadow: v.shadow })),
    shadowProjection: state.shadowProjection,
    shadowSites: state.shadowSites,
    nonzeroShadowSegments: state.nonzeroShadowSegments,
    edges: state.edges
  };
}
export function canonicalState(state) { return JSON.stringify(state); }
