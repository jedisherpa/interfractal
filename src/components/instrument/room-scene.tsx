import { Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { WellRig } from "@/components/game/well-rig.tsx";
import { FormationRig } from "@/components/instrument/formation-rig.tsx";
import {
  CUBE_ENTRANCES,
  SHELL_RADIUS,
  WELLNESS_IDS,
  type IntroBeat,
  type WorldId,
} from "@/lib/instrument/cosmology.ts";
import { FORM_CAMERA_R, FACE_OPACITY, rainbowAt } from "@/lib/instrument/formation.ts";
import { orbit } from "@/lib/instrument/orbit.ts";
import {
  CUBE_OVERSHOOT,
  OTHER_HALF_OPACITY,
  SHELL_OVERSHOOT,
  beatLocalProgress,
  bloomScale,
  bloomState,
  introCameraPosition,
  introElapsed,
  introProgress,
  markIntroFrame,
  resetIntroClock,
} from "@/lib/instrument/motion.ts";
import {
  currentCarry,
  currentEnding,
  currentFrame,
  currentOverlay,
  currentRain,
  useInstrument,
} from "@/lib/instrument/store.ts";
import { TETRA } from "@/workshop/geometry.ts";
import { fibreSafe, holonomyAngle, PI, state, stereographic } from "@/workshop/hopf.ts";
import type { VertexId } from "@/workshop/types.ts";

const WORLD_DRESS: Record<Exclude<WorldId, "C9">, "garden" | "forest" | "desert" | "core"> = {
  W1: "garden",
  W2: "forest",
  W3: "desert",
  W4: "core",
};

const CLEAR: Record<WorldId, string> = {
  C9: "#16345c",
  W1: "#5f93cf",
  W2: "#0a2430",
  W3: "#38536f",
  W4: "#020204",
};

const FOG: Record<WorldId, string> = {
  C9: "#6a93c4",
  W1: "#d3e2f5",
  W2: "#123344",
  W3: "#b9ab9c",
  W4: "#1e0533",
};

const faceTint = new THREE.Color();

function rainbowFromGeometry(src: THREE.BufferGeometry, seed = 0): THREE.BufferGeometry {
  const geo = src.index ? src.toNonIndexed() : src.clone();
  src.dispose();
  const pos = geo.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const faces = Math.floor(pos.count / 3);
  for (let f = 0; f < faces; f += 1) {
    faceTint.setHex(rainbowAt(f + seed));
    for (let k = 0; k < 3; k += 1) {
      const j = (f * 3 + k) * 3;
      colors[j] = faceTint.r;
      colors[j + 1] = faceTint.g;
      colors[j + 2] = faceTint.b;
    }
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

function rainbowCube(s: number): THREE.BufferGeometry {
  const v: [number, number, number][] = [
    [-s, -s, -s],
    [s, -s, -s],
    [s, s, -s],
    [-s, s, -s],
    [-s, -s, s],
    [s, -s, s],
    [s, s, s],
    [-s, s, s],
  ];
  const quads: [number, number, number, number][] = [
    [0, 1, 2, 3],
    [5, 4, 7, 6],
    [1, 5, 6, 2],
    [4, 0, 3, 7],
    [3, 2, 6, 7],
    [4, 5, 1, 0],
  ];
  const pos: number[] = [];
  const col: number[] = [];
  quads.forEach((q, fi) => {
    faceTint.setHex(rainbowAt(fi + 9));
    const tris: [number, number, number][] = [
      [q[0], q[1], q[2]],
      [q[0], q[2], q[3]],
    ];
    for (const tri of tris) {
      for (const vi of tri) {
        const p = v[vi]!;
        pos.push(p[0], p[1], p[2]);
        col.push(faceTint.r, faceTint.g, faceTint.b);
      }
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

function rainbowTetra(scale: number): THREE.BufferGeometry {
  const faces: VertexId[][] = [
    ["V0", "V1", "V2"],
    ["V0", "V1", "V3"],
    ["V0", "V2", "V3"],
    ["V1", "V2", "V3"],
  ];
  const pos: number[] = [];
  const col: number[] = [];
  faces.forEach((face, fi) => {
    faceTint.setHex(rainbowAt(fi + 21));
    for (const id of face) {
      const p = TETRA[id]!;
      pos.push(p[0] * scale, p[1] * scale, p[2] * scale);
      col.push(faceTint.r, faceTint.g, faceTint.b);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return geo;
}

function FaceFill({ geometry }: { geometry: THREE.BufferGeometry }) {
  return (
    <mesh geometry={geometry} renderOrder={1}>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={FACE_OPACITY}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Nested solids: X, Y, Z, X… Adjacent layers flip handedness. ≤ 0.75 Hz. */
const NEST_AXIS: Record<WorldId, 0 | 1 | 2> = { W1: 0, W2: 1, W3: 2, W4: 0, C9: 1 };
const NEST_RATE: Record<WorldId, number> = { W1: 0.38, W2: -0.32, W3: 0.28, W4: -0.24, C9: 0.18 };

function SpinOnAxis({
  axis,
  rate,
  children,
}: {
  axis: 0 | 1 | 2;
  rate: number;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const reduced = useInstrument((s) => s.reducedMotion);
  useFrame((_, dt) => {
    if (reduced || !ref.current) return;
    const w = rate * Math.min(dt, 0.1);
    if (axis === 0) ref.current.rotation.x += w;
    else if (axis === 1) ref.current.rotation.y += w;
    else ref.current.rotation.z += w;
  });
  return <group ref={ref}>{children}</group>;
}

const KEEP_ABOVE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.002);
const KEEP_BELOW = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.002);

function applyClip(root: THREE.Object3D, plane: THREE.Plane) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.Material & { clippingPlanes?: THREE.Plane[] | null };
      if (mat.clippingPlanes?.[0] !== plane) {
        mat.clippingPlanes = [plane];
        mat.needsUpdate = true;
      }
    }
  });
}

function setOpacityIfChanged(mat: THREE.Material, opacity: number) {
  const next = Number(opacity.toFixed(6));
  const current = (mat as THREE.Material & { opacity?: number }).opacity;
  if (current !== next) {
    (mat as THREE.Material & { opacity: number }).opacity = next;
  }
}

function ClippedCopy({ plane, children }: { plane: THREE.Plane; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const passes = useRef(0);
  useLayoutEffect(() => {
    passes.current = 0;
  }, [plane]);
  useFrame(() => {
    if (!ref.current || passes.current > 8) return;
    applyClip(ref.current, plane);
    passes.current += 1;
  });
  return <group ref={ref}>{children}</group>;
}

/** Cut at y = 0. The inverted copy is the upper half reflected through the equator. */
function EquatorialHalf({ invert, children }: { invert: boolean; children: ReactNode }) {
  return (
    <ClippedCopy plane={invert ? KEEP_BELOW : KEEP_ABOVE}>
      <group scale={[1, invert ? -1 : 1, 1]}>{children}</group>
    </ClippedCopy>
  );
}

function EquatorCut() {
  const windowLine = useMemo(() => {
    const s = 4.4;
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-s, 0, -s),
      new THREE.Vector3(s, 0, -s),
      new THREE.Vector3(s, 0, s),
      new THREE.Vector3(-s, 0, s),
    ]);
    const line = new THREE.LineLoop(
      g,
      new THREE.LineBasicMaterial({
        color: 0x5ec8c5,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
        toneMapped: false,
      }),
    );
    line.renderOrder = 8;
    return line;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
        <circleGeometry args={[36, 80]} />
        <meshBasicMaterial
          color="#8aa0ae"
          transparent
          opacity={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <ringGeometry args={[35.2, 36.1, 96]} />
        <meshBasicMaterial
          color="#f8d8a8"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <gridHelper args={[48, 24, "#3a443f", "#1a201c"]} />
      <primitive object={windowLine} />
    </group>
  );
}

function CameraRig({ intro }: { intro: boolean }) {
  const { camera } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    if (intro) {
      const now = performance.now();
      markIntroFrame(now);
      const [x, y, z] = introCameraPosition(introProgress(introElapsed(now)));
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
      return;
    }
    const cap = Math.min(dt, 0.1);
    orbit.step(cap);
    const forming = useInstrument.getState().formStage !== "idle";
    const stage = useInstrument.getState().formStage;
    const r = forming ? Math.min(orbit.radius, FORM_CAMERA_R) : orbit.radius;
    const pitch =
      forming && (stage === "pattern" || stage === "roles" || stage === "spokes" || stage === "miss")
        ? Math.max(orbit.pitch, stage === "pattern" ? 0.72 : 0.52)
        : orbit.pitch;
    const cp = Math.cos(pitch);
    tmp.set(
      Math.sin(orbit.yaw) * r * cp,
      Math.sin(pitch) * r,
      Math.cos(orbit.yaw) * r * cp,
    );
    camera.position.lerp(tmp, 1 - Math.exp(-cap * 3.8));
    const lookY = useInstrument.getState().formStage === "pattern" ? 0.05 : 0;
    camera.lookAt(0, lookY, 0);
  });
  return null;
}

function FiberFamily({
  spin,
  fill,
  room,
  size = 1,
}: {
  spin: number;
  fill: number;
  room: boolean;
  size?: number;
}) {
  const { upper, lower, materials } = useMemo(() => {
    const upperGroup = new THREE.Group();
    const lowerGroup = new THREE.Group();
    const mats: {
      upper: THREE.MeshBasicMaterial;
      lower: THREE.MeshBasicMaterial;
      link: boolean;
      bead: boolean;
      index: number;
    }[] = [];
    let index = 0;
    const addMesh = (
      geometry: THREE.BufferGeometry,
      makeMaterial: () => THREE.MeshBasicMaterial,
      userData: Record<string, boolean> = {},
    ) => {
      const upperMat = makeMaterial();
      const lowerMat = makeMaterial();
      upperMat.clippingPlanes = [KEEP_ABOVE];
      lowerMat.clippingPlanes = [KEEP_BELOW];
      lowerMat.opacity = Math.min(1, (lowerMat.opacity || 1) * OTHER_HALF_OPACITY);
      const upperMesh = new THREE.Mesh(geometry, upperMat);
      const lowerMesh = new THREE.Mesh(geometry, lowerMat);
      Object.assign(upperMesh.userData, userData);
      Object.assign(lowerMesh.userData, userData);
      upperGroup.add(upperMesh);
      lowerGroup.add(lowerMesh);
      mats.push({
        upper: upperMat,
        lower: lowerMat,
        link: Boolean(userData.link),
        bead: Boolean(userData.bead),
        index,
      });
      index += 1;
    };
    for (let i = 0; i < 16; i += 1) {
      const theta = 0.42 + (i % 8) * 0.15;
      const phi = (i * Math.PI) / 8;
      const raw = fibreSafe(theta, phi, 96);
      if (!raw || raw.length < 8) continue;
      const curve = new THREE.CatmullRomCurve3(
        raw.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
        true,
      );
      // Same tube in intro and room so the 2× bundle matches the inner diameter from frame one.
      const tubeR = 0.04 / size;
      const geo = new THREE.TubeGeometry(curve, 96, tubeR, 8, true);
      addMesh(geo, () =>
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0xf4f1ea : 0x9eb8ae,
          transparent: true,
          opacity: 0.92,
          toneMapped: false,
        }),
      );
    }
    if (size === 1) {
      const pair = [
        { theta: PI / 3, phi: 0, color: 0x5ec8c5 },
        { theta: PI / 3, phi: (2 * PI) / 3, color: 0xd4787a },
      ];
      for (const spec of pair) {
        const linked = fibreSafe(spec.theta, spec.phi, 128);
        if (!linked || linked.length < 8) continue;
        const curve = new THREE.CatmullRomCurve3(
          linked.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
          true,
        );
        const geo = new THREE.TubeGeometry(curve, 128, 0.07, 10, true);
        addMesh(
          geo,
          () =>
            new THREE.MeshBasicMaterial({
              color: spec.color,
              transparent: true,
              opacity: 0.95,
              toneMapped: false,
              depthTest: false,
            }),
          { link: true },
        );
      }
      try {
        const ghost = stereographic(state(PI / 3, 0, 0));
        const live = stereographic(state(PI / 3, 0, holonomyAngle(PI / 3)));
        const ghostGeo = new THREE.SphereGeometry(0.11, 12, 12);
        addMesh(
          ghostGeo,
          () =>
            new THREE.MeshBasicMaterial({
              color: 0xc9c2b0,
              transparent: true,
              opacity: 1,
              depthTest: false,
              toneMapped: false,
            }),
          { bead: true },
        );
        const ghostBead = upperGroup.children.at(-1) as THREE.Mesh;
        const ghostMirror = lowerGroup.children.at(-1) as THREE.Mesh;
        ghostBead.position.set(ghost[0], ghost[1], ghost[2]);
        ghostMirror.position.copy(ghostBead.position);
        const liveGeo = new THREE.SphereGeometry(0.14, 12, 12);
        addMesh(
          liveGeo,
          () =>
            new THREE.MeshBasicMaterial({
              color: 0x5ec8c5,
              transparent: true,
              opacity: 1,
              depthTest: false,
              toneMapped: false,
            }),
          { bead: true },
        );
        const liveBead = upperGroup.children.at(-1) as THREE.Mesh;
        const liveMirror = lowerGroup.children.at(-1) as THREE.Mesh;
        liveBead.position.set(live[0], live[1], live[2]);
        liveMirror.position.copy(liveBead.position);
      } catch {
        /* stereographic pole excluded */
      }
    }
    return { upper: upperGroup, lower: lowerGroup, materials: mats };
  }, [size]);
  const grow = useRef(5.52 * size);
  const upperScale = useRef(5.52 * size);
  const lowerScale = useRef(5.52 * size);
  useLayoutEffect(() => {
    applyClip(upper, KEEP_ABOVE);
    applyClip(lower, KEEP_BELOW);
  }, [lower, upper]);
  useFrame((_, dt) => {
    const cap = Math.min(dt, 0.1);
    const forming = room && useInstrument.getState().formStage !== "idle";
    const pattern = forming && useInstrument.getState().formStage === "pattern";
    const base = forming ? (pattern ? 1.15 : 1.85) : 5.52;
    const target = base * size;
    grow.current += (target - grow.current) * Math.min(1, cap * (forming ? 4.2 : 3.4));
    upperScale.current = grow.current;
    lowerScale.current = grow.current;
    upper.scale.setScalar(upperScale.current);
    lower.scale.setScalar(lowerScale.current);
    if (spin) {
      upper.rotation.y += cap * spin;
      lower.rotation.y += cap * spin;
    }
    materials.forEach(({ upper: upperMat, lower: lowerMat, link, bead, index }) => {
      if (bead) {
        setOpacityIfChanged(upperMat, 1);
        setOpacityIfChanged(lowerMat, OTHER_HALF_OPACITY);
        return;
      }
      const baseOpacity = link ? (forming ? 0.42 : 0.92) : forming ? 0.07 + (index % 2) * 0.03 : 0.55 + fill * 0.4 + (index % 2) * 0.08;
      setOpacityIfChanged(upperMat, baseOpacity);
      setOpacityIfChanged(lowerMat, baseOpacity * OTHER_HALF_OPACITY);
    });
  });
  return (
    <>
      <primitive object={upper} />
      <primitive object={lower} />
    </>
  );
}

function bloomScalar(
  intro: boolean,
  reduced: boolean,
  beat: IntroBeat,
  gate: IntroBeat,
  rest: number,
  overshoot: number,
  now: number,
  world: WorldId,
) {
  if (!intro) {
    if (gate === "cube") return rest;
    const id =
      gate === "L4" ? "W4" : gate === "L3" ? "W3" : gate === "L2" ? "W2" : gate === "L1" ? "W1" : gate === "C9" ? "C9" : null;
    if (!id) return rest;
    return world === id || world === "C9" ? rest : 0;
  }
  const state = bloomState(intro, beat, gate);
  if (state.settled) return rest;
  if (!state.active) return 0;
  if (reduced) return rest;
  return bloomScale(beatLocalProgress(introElapsed(now), gate), rest, overshoot);
}

function BloomPresence({
  intro,
  reduced,
  beat,
  gate,
  rest,
  overshoot,
  world,
  children,
}: {
  intro: boolean;
  reduced: boolean;
  beat: IntroBeat;
  gate: IntroBeat;
  rest: number;
  overshoot: number;
  world: WorldId;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const syncScale = (now: number) => {
    if (!ref.current) return;
    ref.current.scale.setScalar(bloomScalar(intro, reduced, beat, gate, rest, overshoot, now, world));
  };
  useLayoutEffect(() => {
    syncScale(performance.now());
  }, [beat, gate, intro, overshoot, reduced, rest, world]);
  useFrame(() => {
    syncScale(performance.now());
  });
  return <group ref={ref}>{children}</group>;
}

function ImpossibleCube({
  scale,
  opacity,
  beads,
  handed = 1,
}: {
  scale: number;
  opacity: number;
  beads?: boolean;
  handed?: 1 | -1;
}) {
  const edges = useMemo(() => {
    const s = 1.15;
    const v: [number, number, number][] = [
      [-s, -s, -s],
      [s, -s, -s],
      [s, s, -s],
      [-s, s, -s],
      [-s, -s, s],
      [s, -s, s],
      [s, s, s],
      [-s, s, s],
    ];
    const pairs: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];
    return { v, pairs };
  }, []);
  const faces = useMemo(() => rainbowCube(1.15), []);
  return (
    <SpinOnAxis axis={2} rate={-0.26 * handed}>
    <group scale={scale}>
      <FaceFill geometry={faces} />
      {edges.pairs.map(([a, b], i) => (
        <Line
          key={i}
          points={[new THREE.Vector3(...edges.v[a]!), new THREE.Vector3(...edges.v[b]!)]}
          color="#f4f1ea"
          lineWidth={2}
          transparent
          opacity={opacity}
        />
      ))}
      {beads
        ? WELLNESS_IDS.map((id) => {
            const v = CUBE_ENTRANCES[id];
            return (
              <mesh key={id} position={[v[0] * 1.15, v[1] * 1.15, v[2] * 1.15]}>
                <sphereGeometry args={[0.12, 12, 12]} />
                <meshBasicMaterial color="#f4f1ea" />
              </mesh>
            );
          })
        : null}
    </group>
    </SpinOnAxis>
  );
}

function Shell({ id, active, handed = 1 }: { id: WorldId; active: boolean; handed?: 1 | -1 }) {
  const r = SHELL_RADIUS[id];
  const color =
    id === "C9" ? "#d7ddd6" : id === "W1" ? "#b7c4b0" : id === "W2" ? "#8aa0ae" : id === "W3" ? "#6d8f86" : "#c9c2b0";
  const faces = useMemo(() => rainbowFromGeometry(new THREE.IcosahedronGeometry(r, 1), r * 10), [r]);
  return (
    <SpinOnAxis axis={NEST_AXIS[id]} rate={NEST_RATE[id] * handed}>
      <FaceFill geometry={faces} />
      <mesh>
        <icosahedronGeometry args={[r, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={active ? 0.45 : 0.16} />
      </mesh>
    </SpinOnAxis>
  );
}

function WellnessBeads({ listen = true }: { listen?: boolean }) {
  const aligned = useInstrument((s) => s.aligned);
  const world = useInstrument((s) => s.world);
  const toggle = useInstrument((s) => s.toggleWellness);
  const interactive = world === "W1";
  return (
    <group>
      {WELLNESS_IDS.map((id) => {
        const v = CUBE_ENTRANCES[id];
        const p: [number, number, number] = [v[0] * 2.35, v[1] * 2.35, v[2] * 2.35];
        const on = aligned[id];
        return (
          <mesh
            key={id}
            position={p}
            onClick={(e) => {
              e.stopPropagation();
              if (interactive && listen) toggle(id);
            }}
          >
            {on ? <octahedronGeometry args={[0.22, 0]} /> : <sphereGeometry args={[0.16, 12, 12]} />}
            <meshStandardMaterial
              color={on ? "#d7ddd6" : "#5c6560"}
              emissive={on ? "#9aa894" : "#000000"}
              emissiveIntensity={on ? 0.4 : 0}
              roughness={0.45}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function TetraEdges({ handed = 1 }: { handed?: 1 | -1 }) {
  const tick = useInstrument((s) => s.tick);
  void tick;
  const overlay = currentOverlay();
  const faces = useMemo(() => rainbowTetra(6.4), []);
  return (
    <SpinOnAxis axis={0} rate={0.3 * handed}>
    <group>
      <FaceFill geometry={faces} />
      {overlay.edges.map((edge) => {
        const a = TETRA[edge.from as VertexId];
        const b = TETRA[edge.to as VertexId];
        const pts = [
          new THREE.Vector3(a[0] * 6.4, a[1] * 6.4, a[2] * 6.4),
          new THREE.Vector3(b[0] * 6.4, b[1] * 6.4, b[2] * 6.4),
        ];
        const locked = edge.kind === "locked";
        const dashed = edge.kind === "dashed-withdrawn";
        return (
          <Line
            key={`${edge.from}-${edge.to}`}
            points={pts}
            color={locked ? "#d7ddd6" : dashed ? "#9a3b12" : "#3d4440"}
            dashed={dashed}
            lineWidth={locked ? 1.8 : 1}
            transparent
            opacity={locked ? 0.9 : 0.35}
          />
        );
      })}
    </group>
    </SpinOnAxis>
  );
}

function CarryArcs() {
  const tick = useInstrument((s) => s.tick);
  void tick;
  const marks = currentCarry();
  return (
    <group>
      {marks.map((m, i) => (
        <mesh key={`${m.from}-${m.to}-${i}`} position={[0, 8.4 - i * 0.35, 0]}>
          <boxGeometry args={[m.direction === "down" ? 0.55 : 0.22, 0.08, 0.08]} />
          <meshBasicMaterial color={m.direction === "down" ? "#8aa0ae" : "#c9c2b0"} />
        </mesh>
      ))}
    </group>
  );
}

function Rain() {
  const tick = useInstrument((s) => s.tick);
  void tick;
  const points = useMemo(() => {
    const arr = new Float32Array(180);
    for (let i = 0; i < 60; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = Math.random() * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  const ref = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.position.y -= dt * 2.4;
    if (ref.current.position.y < -6) ref.current.position.y = 4;
  });
  if (!currentRain()) return null;
  return (
    <points ref={ref} geometry={points}>
      <pointsMaterial color="#9eb0a8" size={0.07} transparent opacity={0.65} />
    </points>
  );
}

function ClusterShards() {
  const tick = useInstrument((s) => s.tick);
  const world = useInstrument((s) => s.world);
  void tick;
  const ending = currentEnding();
  const shards = useMemo(
    () => WELLNESS_IDS.map((_, i) => rainbowFromGeometry(new THREE.TetrahedronGeometry(0.28, 0), i * 5)),
    [],
  );
  if (ending !== "clusterfuck" || world === "C9") return null;
  return (
    <group>
      {WELLNESS_IDS.map((id, i) => {
        const v = CUBE_ENTRANCES[id];
        return (
          <group key={id} position={[v[0] * (4 + i * 0.15), v[1] * 3.2, v[2] * (4 + i * 0.2)]}>
            <FaceFill geometry={shards[i]!} />
            <mesh>
              <tetrahedronGeometry args={[0.28, 0]} />
              <meshBasicMaterial color="#9a3b12" wireframe />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function LiveWell() {
  const world = useInstrument((s) => s.world);
  const wellOpen = useInstrument((s) => s.wellOpen);
  const reduced = useInstrument((s) => s.reducedMotion);
  const tick = useInstrument((s) => s.tick);
  const forming = useInstrument((s) => s.formStage !== "idle");
  void tick;
  if (world === "C9" || forming) return null;
  const frame = currentFrame();
  const overlay = currentOverlay();
  return (
    <WellRig
      position={[0, 0.2, 0]}
      pose={overlay.wellPose}
      frame={frame}
      overlay={overlay}
      reducedMotion={reduced}
      open={wellOpen}
      dress={WORLD_DRESS[world]}
    />
  );
}

function IntroDriver() {
  const phase = useInstrument((s) => s.phase);
  const primed = useRef(false);
  useFrame(() => {
    if (phase === "intro") {
      const now = performance.now();
      markIntroFrame(now);
      useInstrument.getState().advanceIntro(now);
      primed.current = true;
      return;
    }
    if (primed.current) {
      resetIntroClock();
      primed.current = false;
    }
  });
  return null;
}

function CycleDriver() {
  const acc = useRef(0);
  useFrame((_, dt) => {
    const s = useInstrument.getState();
    if (!s.cyclePlaying) {
      acc.current = 0;
      return;
    }
    acc.current += dt;
    if (acc.current < (s.reducedMotion ? 0.05 : 1.8)) return;
    acc.current = 0;
    const next = s.cycleHead + 1;
    const map: WorldId[] = ["C9", "W1", "W2", "W3", "W4", "W4", "C9"];
    const w = map[next] ?? "C9";
    s.focusWorld(w);
    useInstrument.setState({ cycleHead: next, cyclePlaying: next < 6, world: w });
  });
  return null;
}

export function InstrumentScene() {
  const phase = useInstrument((s) => s.phase);
  const beat = useInstrument((s) => s.beat);
  const world = useInstrument((s) => s.world);
  const reduced = useInstrument((s) => s.reducedMotion);
  const formStage = useInstrument((s) => s.formStage);
  const intro = phase === "intro";
  const fill = intro && beat === "fibers" ? 1 : intro ? 0.38 : formStage === "idle" ? 0.22 : 0.12;
  const spin = reduced ? 0 : 1.55;

  return (
    <>
      <color attach="background" args={[CLEAR[world]]} />
      <fog attach="fog" args={[FOG[world], world === "W1" ? 24 : 40, world === "W4" ? 110 : 200]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[8, 14, 6]} intensity={1.15} color="#f2efe6" />
      <directionalLight position={[-6, -12, -4]} intensity={0.55} color="#c9d4c8" />
      <pointLight position={[0, 4, 0]} intensity={0.7} color="#c9d4c8" />
      <pointLight position={[0, -4, 0]} intensity={0.55} color="#c9d4c8" />
      <EquatorCut />
      <CameraRig intro={intro} />
      <IntroDriver />
      {!intro && <CycleDriver />}
      <FiberFamily spin={spin} fill={fill} room={!intro} />
      <FiberFamily spin={-spin} fill={fill} room={!intro} size={2} />
      <EquatorialHalf invert={false}>
        <NestedWorlds
          handed={1}
          intro={intro}
          beat={beat}
          world={world}
          reduced={reduced}
        />
      </EquatorialHalf>
      <EquatorialHalf invert>
        <NestedWorlds
          handed={-1}
          intro={intro}
          beat={beat}
          world={world}
          reduced={reduced}
        />
      </EquatorialHalf>
      {!intro && <FormationRig />}
    </>
  );
}

function NestedWorlds({
  handed,
  intro,
  beat,
  world,
  reduced,
}: {
  handed: 1 | -1;
  intro: boolean;
  beat: IntroBeat;
  world: WorldId;
  reduced: boolean;
}) {
  return (
    <group>
      {intro && beat === "fibers" ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.35, 0.045, 12, 64]} />
          <meshBasicMaterial color="#f4f1ea" />
        </mesh>
      ) : null}
      <BloomPresence intro={intro} reduced={reduced} beat={beat} gate="cube" rest={1.05} overshoot={CUBE_OVERSHOOT} world={world}>
        <ImpossibleCube scale={1} opacity={0.95} beads={intro && beat === "cube"} handed={handed} />
      </BloomPresence>
      <BloomPresence intro={intro} reduced={reduced} beat={beat} gate="L4" rest={1} overshoot={SHELL_OVERSHOOT} world={world}>
        <Shell id="W4" active={world === "W4" || beat === "L4"} handed={handed} />
      </BloomPresence>
      <BloomPresence intro={intro} reduced={reduced} beat={beat} gate="L3" rest={1} overshoot={SHELL_OVERSHOOT} world={world}>
        <Shell id="W3" active={world === "W3" || beat === "L3"} handed={handed} />
      </BloomPresence>
      <BloomPresence intro={intro} reduced={reduced} beat={beat} gate="L2" rest={1} overshoot={SHELL_OVERSHOOT} world={world}>
        <Shell id="W2" active={world === "W2" || beat === "L2"} handed={handed} />
      </BloomPresence>
      <BloomPresence intro={intro} reduced={reduced} beat={beat} gate="L1" rest={1} overshoot={SHELL_OVERSHOOT} world={world}>
        <Shell id="W1" active={world === "W1" || beat === "L1"} handed={handed} />
      </BloomPresence>
      <BloomPresence intro={intro} reduced={reduced} beat={beat} gate="C9" rest={1} overshoot={SHELL_OVERSHOOT} world={world}>
        <Shell id="C9" active={world === "C9" || beat === "C9"} handed={handed} />
      </BloomPresence>
      {!intro && <WellnessBeads listen={handed === 1} />}
      {!intro && <TetraEdges handed={handed} />}
      {!intro && <CarryArcs />}
      {!intro && <Rain />}
      {!intro && <ClusterShards />}
      {!intro && <LiveWell />}
    </group>
  );
}
