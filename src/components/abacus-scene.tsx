import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import {
  FACES,
  FACE_META,
  FIELD_COLORS,
  HOME,
  PEOPLE_SEED,
  SOLID_SCALE,
  TETRA,
  beadWorld,
  fibreSafe,
  intentionTarget,
  lerp,
  lerpAngle,
  type SolidKind,
} from "@/lib/hopf";
import { useProtocol } from "@/lib/store";

let orbitReset: (() => void) | null = null;

export function resetAbacusCamera() {
  orbitReset?.();
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function pointer(on: boolean) {
  document.body.style.cursor = on ? "pointer" : "auto";
}

function FiberTube({
  points,
  color,
  radius,
}: {
  points: THREE.Vector3[];
  color: string;
  radius: number;
}) {
  const geometry = useMemo(() => {
    if (points.length < 8) return null;
    try {
      const curve = new THREE.CatmullRomCurve3(points, true);
      if (curve.getLength() < 0.35) return null;
      return new THREE.TubeGeometry(curve, 128, radius, 8, true);
    } catch {
      return null;
    }
  }, [points, radius]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.32}
        roughness={0.42}
        metalness={0.18}
      />
    </mesh>
  );
}

function FiberField() {
  const goal = useProtocol((s) => s.goal);
  const field = useMemo(() => {
    const rows: { pts: [number, number, number][]; color: string; width: number }[] = [];
    const latitudes = [0.55, 0.95, 1.35, 1.75, 2.2];
    const spins = 6;
    latitudes.forEach((theta, ti) => {
      for (let i = 0; i < spins; i += 1) {
        const phi = (i * 2 * Math.PI) / spins + ti * 0.17;
        const raw = fibreSafe(theta, phi, 72);
        if (!raw) continue;
        rows.push({
          pts: [...raw, raw[0]],
          color: FIELD_COLORS[ti % FIELD_COLORS.length],
          width: ti % 2 === 0 ? 1.4 : 1.1,
        });
      }
    });
    return rows;
  }, []);

  const featured = useMemo(() => {
    return HOME.flatMap((h, i) => {
      const raw = fibreSafe(h.theta, h.phi, 140);
      if (!raw) return [];
      return [
        {
          pts: raw.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
          color: PEOPLE_SEED[i].color,
          radius: 0.016,
        },
      ];
    });
  }, []);

  const goalTube = useMemo(() => {
    const raw = fibreSafe(goal.theta, goal.phi, 140);
    if (!raw) return null;
    return {
      pts: raw.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
      color: "#E8B84A",
      radius: 0.024,
    };
  }, [goal.phi, goal.theta]);

  return (
    <group>
      {field.map((row, i) => (
        <Line
          key={`field-${i}`}
          points={row.pts}
          color={row.color}
          lineWidth={row.width}
          transparent
          opacity={0.58}
          depthWrite={false}
        />
      ))}
      {featured.map((row, i) => (
        <FiberTube key={`home-${i}`} points={row.pts} color={row.color} radius={row.radius} />
      ))}
      {goalTube ? (
        <FiberTube points={goalTube.pts} color={goalTube.color} radius={goalTube.radius} />
      ) : null}
    </group>
  );
}

function Beads() {
  const people = useProtocol((s) => s.people);
  const version = useProtocol((s) => s.version);
  const goal = useProtocol((s) => s.goal);
  const selected = useProtocol((s) => s.selectedPerson);
  const selectPerson = useProtocol((s) => s.selectPerson);
  const reduced = usePrefersReducedMotion();
  const visual = useRef(
    people.map((p) => ({
      theta: HOME[p.seat].theta,
      phi: HOME[p.seat].phi,
      gamma: p.rest,
    })),
  );
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, delta) => {
    const t = reduced ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 5.2);
    people.forEach((p, i) => {
      const target = intentionTarget(p, version, goal);
      const v = visual.current[i];
      if (!v) return;
      v.theta = lerp(v.theta, target.theta, t);
      v.phi = lerpAngle(v.phi, target.phi, t);
      v.gamma = lerpAngle(v.gamma, target.gamma, t);
      const world = beadWorld(v.theta, v.phi, v.gamma);
      if (!world) return;
      const mesh = meshRefs.current[i];
      if (mesh) {
        mesh.position.set(world[0], world[1], world[2]);
        const locked = p.response === "yes" && p.responseVersion === version;
        const pulse = locked && !reduced ? 1.12 + Math.sin(performance.now() * 0.003) * 0.05 : 1;
        mesh.scale.setScalar(pulse);
      }
    });
  });

  return (
    <group>
      {people.map((p, i) => {
        const home = beadWorld(HOME[p.seat].theta, HOME[p.seat].phi, p.rest) ?? [0, 0, 0];
        const locked = p.response === "yes" && p.responseVersion === version;
        return (
          <mesh
            key={p.id}
            ref={(el) => {
              meshRefs.current[i] = el;
            }}
            position={home}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              selectPerson(p.id);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              pointer(true);
            }}
            onPointerOut={() => pointer(false)}
          >
            <sphereGeometry args={[locked ? 0.09 : 0.072, 28, 20]} />
            <meshStandardMaterial
              color={p.color}
              emissive={p.color}
              emissiveIntensity={selected === p.id ? 0.7 : 0.38}
              roughness={0.28}
              metalness={0.12}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Facet({
  face,
  index,
}: {
  face: readonly [number, number, number];
  index: number;
}) {
  const selectedFacet = useProtocol((s) => s.selectedFacet);
  const agreement = useProtocol((s) => s.agreement);
  const selectFacet = useProtocol((s) => s.selectFacet);
  const geom = useMemo(() => {
    const vs = face.map((i) => new THREE.Vector3(TETRA[i][0], TETRA[i][1], TETRA[i][2]).multiplyScalar(SOLID_SCALE));
    const ab = vs[1].clone().sub(vs[0]);
    const ac = vs[2].clone().sub(vs[0]);
    const n = new THREE.Vector3().crossVectors(ab, ac).normalize();
    const centroid = vs[0].clone().add(vs[1]).add(vs[2]).multiplyScalar(1 / 3);
    if (n.dot(centroid) < 0) {
      const tmp = vs[1];
      vs[1] = vs[2];
      vs[2] = tmp;
    }
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(9);
    vs.forEach((v, i) => {
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
    });
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setIndex([0, 1, 2]);
    g.computeVertexNormals();
    return g;
  }, [face]);
  useEffect(() => () => geom.dispose(), [geom]);
  const lit = selectedFacet === index;
  const fill = agreement === "active" ? 0.62 : agreement === "paused" ? 0.34 : 0.22;
  return (
    <mesh
      geometry={geom}
      onClick={(e) => {
        e.stopPropagation();
        selectFacet(index);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        pointer(true);
      }}
      onPointerOut={() => pointer(false)}
    >
      <meshStandardMaterial
        color={lit ? "#7EC8F8" : agreement === "active" ? "#F0C93A" : "#f4e6b0"}
        emissive={lit ? "#7EC8F8" : agreement === "active" ? "#C49214" : "#000000"}
        emissiveIntensity={lit ? 0.28 : agreement === "active" ? 0.18 : 0}
        transparent
        opacity={lit ? 0.55 : fill}
        roughness={0.34}
        metalness={0.16}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SeatVertices() {
  return (
    <group>
      {TETRA.map((v, i) => (
        <mesh key={PEOPLE_SEED[i].id} position={[v[0] * SOLID_SCALE, v[1] * SOLID_SCALE, v[2] * SOLID_SCALE]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial
            color={PEOPLE_SEED[i].color}
            emissive={PEOPLE_SEED[i].color}
            emissiveIntensity={0.45}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

function TetraConstitution() {
  const agreement = useProtocol((s) => s.agreement);
  const edges = useMemo(() => {
    const tet = new THREE.TetrahedronGeometry(SOLID_SCALE);
    const e = new THREE.EdgesGeometry(tet);
    tet.dispose();
    return e;
  }, []);
  useEffect(() => () => edges.dispose(), [edges]);
  const edge = agreement === "paused" ? "#8a5a1f" : "#C49214";
  return (
    <group>
      {FACES.map((face, fi) => (
        <Facet key={FACE_META[fi].title} face={face} index={fi} />
      ))}
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={edge} />
      </lineSegments>
      <SeatVertices />
    </group>
  );
}

function PrimitiveSolid({ kind }: { kind: Exclude<SolidKind, "tetrahedron"> }) {
  const agreement = useProtocol((s) => s.agreement);
  const fill = agreement === "active" ? 0.55 : 0.22;
  const { mesh, edges } = useMemo(() => {
    const meshGeo =
      kind === "octahedron"
        ? new THREE.OctahedronGeometry(0.68)
        : kind === "cube"
          ? new THREE.BoxGeometry(0.92, 0.92, 0.92)
          : kind === "icosahedron"
            ? new THREE.IcosahedronGeometry(0.72, 0)
            : new THREE.DodecahedronGeometry(0.72, 0);
    const edgeGeo = new THREE.EdgesGeometry(meshGeo);
    return { mesh: meshGeo, edges: edgeGeo };
  }, [kind]);
  useEffect(
    () => () => {
      mesh.dispose();
      edges.dispose();
    },
    [mesh, edges],
  );
  return (
    <group>
      <mesh geometry={mesh}>
        <meshStandardMaterial
          color={agreement === "active" ? "#F0C93A" : "#f4e6b0"}
          transparent
          opacity={fill}
          roughness={0.35}
          metalness={0.14}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#C49214" />
      </lineSegments>
    </group>
  );
}

function ConstitutionSolid() {
  const solid = useProtocol((s) => s.solid);
  const spinning = useProtocol((s) => s.spinning);
  const reduced = usePrefersReducedMotion();
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current && spinning && !reduced) {
      group.current.rotation.y += Math.min(delta, 0.1) * 0.22;
    }
  });
  return (
    <group ref={group}>
      {solid === "tetrahedron" ? <TetraConstitution /> : <PrimitiveSolid kind={solid} />}
    </group>
  );
}

function SceneContents() {
  const selectPerson = useProtocol((s) => s.selectPerson);
  const controls = useRef<OrbitControlsImpl | null>(null);
  useEffect(() => {
    orbitReset = () => controls.current?.reset();
    return () => {
      orbitReset = null;
    };
  }, []);
  return (
    <>
      <color attach="background" args={["#eef7ff"]} />
      <fog attach="fog" args={["#eef7ff", 10, 22]} />
      <hemisphereLight args={["#f7fbff", "#c9d7e4", 0.95]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[2.4, 3.4, 4.2]} intensity={0.85} color="#fff6dc" />
      <directionalLight position={[-3, -1.2, -2]} intensity={0.25} color="#7ec8f8" />
      <FiberField />
      <ConstitutionSolid />
      <Beads />
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={2.6}
        maxDistance={10}
        onStart={() => selectPerson(null)}
      />
    </>
  );
}

export function AbacusStage() {
  return (
    <Canvas
      className="h-full w-full touch-none"
      style={{ width: "100%", height: "100%", display: "block" }}
      camera={{ position: [4.1, 1.9, 5.1], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      fallback={
        <div className="flex h-full items-center justify-center bg-wash p-6 text-sm text-muted">
          This instrument needs WebGL. The protocol still works in the inspector.
        </div>
      }
    >
      <SceneContents />
    </Canvas>
  );
}
