export const RUN_ID = 'G0-CUBE-002';
export const DURATION_MS = 20_000;
export const STEP_MS = 1_000;
export const CHECKPOINTS_MS = Object.freeze([0, 10_000, 20_000]);
export const CAMERA = Object.freeze({ yawStart: Math.PI / 6, yawEnd: Math.PI / 3, pitch: Math.PI / 9 });
export const SOURCE = Object.freeze(Array.from({ length: 8 }, (_, n) => {
  const bits = n.toString(2).padStart(3, '0');
  return Object.freeze({ id: `v${bits}`, q: Object.freeze([...bits].map(b => b === '0' ? -1 : 1)) });
}));
export const EDGES = Object.freeze(SOURCE.flatMap((v, i) => SOURCE.slice(i + 1).filter(w =>
  [...v.id.slice(1)].reduce((sum, bit, axis) => sum + Number(bit !== w.id[axis + 1]), 0) === 1
).map(w => Object.freeze({ id: `${v.id}-${w.id}`, from: v.id, to: w.id }))));

export function clampTime(timeMs) {
  if (!Number.isFinite(timeMs)) throw new TypeError('Simulation time must be finite');
  return Math.max(0, Math.min(DURATION_MS, Math.round(timeMs)));
}

export function cameraAt(timeMs, yawOverride = null) {
  const t = clampTime(timeMs);
  const yaw = yawOverride === null ? CAMERA.yawStart + (CAMERA.yawEnd - CAMERA.yawStart) * t / DURATION_MS : yawOverride;
  if (!Number.isFinite(yaw)) throw new TypeError('Camera yaw must be finite');
  return { yaw, pitch: CAMERA.pitch };
}

// Column vector convention: c = Rx(pitch) · Ry(yaw) · q. Orthographic screen = (cx, -cy).
export function project(q, camera) {
  const [x, y, z] = q;
  const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw);
  const cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  const x1 = cy * x + sy * z;
  const z1 = -sy * x + cy * z;
  const y1 = cp * y - sp * z1;
  const z2 = sp * y + cp * z1;
  return { camera: [x1, y1, z2], screen: [x1, -y1] };
}

export function modelAt(timeMs, yawOverride = null) {
  const t = clampTime(timeMs);
  const camera = cameraAt(t, yawOverride);
  return {
    simulationTimeMs: t,
    sourceObject: 'ordinary-3d-wire-cube',
    sourceDimension: 3,
    sourceRotation: 'identity',
    camera,
    projection: 'orthographic',
    fixedScalePxPerUnit: 138,
    selectedVertexId: 'v111',
    vertices: SOURCE.map(v => ({ id: v.id, source: [...v.q], ...project(v.q, camera) })),
    edges: EDGES.map(e => ({ ...e })),
  };
}

export function canonicalState(state) { return JSON.stringify(state); }
