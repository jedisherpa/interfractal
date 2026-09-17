import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { WellRig } from "@/components/game/well-rig";
import { flight } from "@/lib/game/runtime.ts";
import { currentFrame, currentOverlay, director, useGame } from "@/lib/game/store.ts";
import { CUBOCTA, GATES, LAYER_PALETTES, TETRA, TETRA_EDGES, WELLS } from "@/workshop/geometry.ts";
import type { ScaleLayerId } from "@/workshop/types.ts";

function Ground({ color, size = 120 }: { color: string; size?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size, 1, 1]} />
      <meshStandardMaterial color={color} roughness={0.92} />
    </mesh>
  );
}

function CubeGate() {
  return (
    <group position={[0, 9, 0]}>
      <mesh>
        <boxGeometry args={[6.2, 6.2, 6.2]} />
        <meshStandardMaterial
          color="#c8b48a"
          emissive="#c8b48a"
          emissiveIntensity={0.12}
          wireframe
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5, 0.12, 8, 48]} />
        <meshStandardMaterial color="#c8b48a" emissive="#c8b48a" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function GardenDress() {
  const cols = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (const x of [-20, 20]) for (const z of [-15, 15]) pts.push([x, 4, z]);
    return pts;
  }, []);
  return (
    <group>
      <Ground color="#cfc6b0" />
      <CubeGate />
      {cols.map((p, i) => (
        <mesh key={i} position={p}>
          <cylinderGeometry args={[0.55, 0.7, 8, 10]} />
          <meshStandardMaterial color="#e8dfc8" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[-15, 18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[6, 0.18, 8, 32, Math.PI]} />
        <meshStandardMaterial color="#d7c9a4" />
      </mesh>
    </group>
  );
}

function ForestDress() {
  const trees = useMemo(() => {
    const out: [number, number, number, number][] = [];
    for (let i = 0; i < 28; i += 1) {
      const a = (i / 28) * Math.PI * 2;
      const r = 12 + (i % 5) * 4.5;
      out.push([Math.cos(a) * r, 0, Math.sin(a) * r, 4 + (i % 4)]);
    }
    return out;
  }, []);
  return (
    <group>
      <Ground color="#14101c" />
      <mesh position={[0, 6, -20]}>
        <icosahedronGeometry args={[2.4, 0]} />
        <meshStandardMaterial color="#2ee6d6" emissive="#2ee6d6" emissiveIntensity={0.4} wireframe />
      </mesh>
      {trees.map((t, i) => (
        <group key={i} position={[t[0], t[3] / 2, t[2]]}>
          <mesh>
            <cylinderGeometry args={[0.18, 0.28, t[3], 6]} />
            <meshStandardMaterial color="#2a2233" />
          </mesh>
          <mesh position={[0, t[3] * 0.35, 0]}>
            <octahedronGeometry args={[1.1, 0]} />
            <meshStandardMaterial color="#3a2048" emissive="#c45aa0" emissiveIntensity={0.08} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DesertDress() {
  return (
    <group>
      <Ground color="#c4a06a" />
      {[1, 2, 3].map((s) => (
        <mesh key={s} position={[0, s * 1.1, 0]}>
          <boxGeometry args={[16 - s * 4, 1.1, 16 - s * 4]} />
          <meshStandardMaterial color="#b48a4c" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 18, 0]}>
        <torusGeometry args={[3.2, 0.12, 8, 40]} />
        <meshStandardMaterial color="#f5c542" emissive="#f5c542" emissiveIntensity={0.3} />
      </mesh>
      {[
        [-10, 2, 22],
        [-6, 2, 26],
        [-2, 2, 22],
        [2, 2, 26],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <cylinderGeometry args={[0.6, 0.6, 0.2, 3 + i]} />
          <meshStandardMaterial color="#8a4a20" />
        </mesh>
      ))}
    </group>
  );
}

function CoreDress() {
  return (
    <group>
      <Ground color="#0c0a12" />
      <mesh position={[0, 12, 0]}>
        <sphereGeometry args={[2.1, 24, 24]} />
        <meshStandardMaterial
          color="#3c9cff"
          emissive="#3c9cff"
          emissiveIntensity={0.45}
          wireframe
        />
      </mesh>
      {[6, 9, 12].map((r) => (
        <mesh key={r} position={[0, 8, 0]} rotation={[Math.PI / 2.6, 0, 0]}>
          <torusGeometry args={[r, 0.08, 8, 48]} />
          <meshBasicMaterial color="#e11d48" />
        </mesh>
      ))}
    </group>
  );
}

function CloudNineRig({ show }: { show: boolean }) {
  if (!show) return null;
  const scale = 10;
  const verts = (Object.values(TETRA) as [number, number, number][]).map(
    (v) => new THREE.Vector3(v[0] * scale, 18 + v[1] * scale, v[2] * scale),
  );
  const ids: Array<keyof typeof TETRA> = ["V0", "V1", "V2", "V3"];
  return (
    <group>
      {TETRA_EDGES.map(([a, b], i) => {
        const ia = ids.indexOf(a);
        const ib = ids.indexOf(b);
        return (
          <Line
            key={i}
            points={[verts[ia]!, verts[ib]!]}
            color="#2ee6d6"
            lineWidth={1.4}
          />
        );
      })}
      <mesh position={[0, 18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[7.2, 1.6, 12, 64]} />
        <meshStandardMaterial
          color="#2ee6d6"
          emissive="#2ee6d6"
          emissiveIntensity={0.2}
          wireframe
          transparent
          opacity={0.7}
        />
      </mesh>
      {CUBOCTA.slice(0, 12).map((v, i) => (
        <mesh key={i} position={[v[0] * 4.2, 18 + v[1] * 4.2, v[2] * 4.2]}>
          <sphereGeometry args={[0.14, 8, 8]} />
          <meshBasicMaterial color="#f5c542" />
        </mesh>
      ))}
    </group>
  );
}

function GateMarker({
  position,
  radius,
  grow,
}: {
  position: [number, number, number];
  radius: number;
  grow: boolean;
}) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.08, 8, 40]} />
      <meshBasicMaterial color={grow ? "#8ab4c8" : "#c8b48a"} />
    </mesh>
  );
}

function LayerWorld({ layer }: { layer: ScaleLayerId }) {
  const well = WELLS.find((w) => w.layer === layer)!;
  const tick = useGame((s) => s.tick);
  const wellOpen = useGame((s) => s.wellOpen);
  const reduced = useGame((s) => s.reducedMotion);
  const unlocked = useGame((s) => s.unlocked);
  void tick;
  const frame = currentFrame();
  const overlay = currentOverlay();
  const dress = (["garden", "forest", "desert", "core"] as const)[layer];
  const pal = LAYER_PALETTES[layer];
  return (
    <group>
      {layer === 0 && <GardenDress />}
      {layer === 1 && <ForestDress />}
      {layer === 2 && <DesertDress />}
      {layer === 3 && <CoreDress />}
      {GATES.filter((g) => g.from === layer).map((g) => (
        <GateMarker
          key={g.id}
          position={[g.position.x, g.position.y, g.position.z]}
          radius={g.radius}
          grow={g.dir === "grow"}
        />
      ))}
      <WellRig
        position={[well.position.x, well.position.y, well.position.z]}
        pose={overlay.wellPose}
        frame={frame}
        overlay={overlay}
        reducedMotion={reduced}
        open={wellOpen}
        dress={dress}
      />
      {layer === 0 && <CloudNineRig show={director.cloudNine(unlocked.includes(3))} />}
      <ambientLight intensity={layer === 0 || layer === 2 ? 0.85 : 0.35} />
      <directionalLight
        position={[20, 30, 12]}
        intensity={layer === 3 ? 0.6 : 1.15}
        color={pal.emissive}
      />
      <hemisphereLight args={[pal.sky, pal.ground, 0.55]} />
    </group>
  );
}

function FlightCamera() {
  const { camera } = useThree();
  const lastNear = { id: "" };
  useFrame((_, dt) => {
    if (useGame.getState().phase !== "playing") return;
    flight.step(dt);
    const f = flight.forward();
    camera.position.set(flight.x, flight.y, flight.z);
    camera.lookAt(flight.x + f.x, flight.y + f.y, flight.z + f.z);
    const id = flight.nearby?.id ?? "";
    if (id !== lastNear.id) {
      lastNear.id = id;
      useGame.getState().bump();
    }
  });
  return null;
}

export function WorldScene() {
  const layer = useGame((s) => s.layer);
  const pal = LAYER_PALETTES[layer];
  const { scene } = useThree();
  useLayoutEffect(() => {
    scene.background = new THREE.Color(pal.sky);
    scene.fog = new THREE.Fog(pal.fog, 48, 150);
    return () => {
      scene.fog = null;
    };
  }, [pal, scene]);
  return (
    <>
      <FlightCamera />
      <LayerWorld layer={layer} />
    </>
  );
}
