import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CUBOCTA, TETRA, sphericalFromVec } from "@/workshop/geometry.ts";
import { fibreSafe } from "@/workshop/hopf.ts";
import type { DecisionFrame, TetraOverlay, WellPose } from "@/workshop/types.ts";

const SEAT_HOME = ["Maya", "Finn", "Bea"].map((_, i) =>
  sphericalFromVec(Object.values(TETRA)[i] as [number, number, number]),
);

function poseVisible(pose: WellPose, part: WellPose) {
  const order: WellPose[] = ["disc", "torus", "hourglass", "lattice", "cloud-nine"];
  return order.indexOf(pose) >= order.indexOf(part);
}

function FiberLine({
  theta,
  phi,
  color,
  dashed,
}: {
  theta: number;
  phi: number;
  color: string;
  dashed?: boolean;
}) {
  const pts = useMemo(() => {
    const raw = fibreSafe(theta, phi, 96);
    if (!raw) return [new THREE.Vector3(), new THREE.Vector3(0.1, 0, 0)];
    return raw.map((p) => new THREE.Vector3(p[0] * 0.45, p[1] * 0.45 + 0.9, p[2] * 0.45));
  }, [theta, phi]);
  return (
    <Line
      points={pts}
      color={color}
      lineWidth={dashed ? 1.1 : 1.6}
      dashed={dashed}
      transparent
      opacity={dashed ? 0.55 : 0.92}
    />
  );
}

function SeatMark({
  response,
  ready,
  position,
}: {
  response: DecisionFrame["participants"][number]["response"];
  ready: boolean | null;
  position: [number, number, number];
}) {
  const color =
    response === "yes"
      ? "#34d399"
      : response === "no"
        ? "#f97316"
        : response === "withdrawn"
          ? "#e11d48"
          : ready
            ? "#a8b4c0"
            : "#6b7280";
  if (response === "yes") {
    return (
      <mesh position={position}>
        <boxGeometry args={[0.38, 0.38, 0.38]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
      </mesh>
    );
  }
  if (response === "no") {
    return (
      <mesh position={position} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.22, 0.48, 5]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
    );
  }
  if (response === "withdrawn") {
    return (
      <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.045, 8, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} wireframe />
      </mesh>
    );
  }
  if (ready) {
    return (
      <mesh position={position}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
      </mesh>
    );
  }
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.16, 12, 12]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}

function Hourglass({ color }: { color: string }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 28; i += 1) {
      const t = (i / 28) * 2 - 1;
      pts.push(new THREE.Vector2(0.28 + 0.85 * t * t, t * 1.55));
    }
    return new THREE.LatheGeometry(pts, 28);
  }, []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.22}
        wireframe
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

function DiscRings() {
  return (
    <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0.55, 0]}>
      {[1.05, 1.55, 2.05, 2.55].map((r) => (
        <mesh key={r}>
          <torusGeometry args={[r, 0.045, 8, 64]} />
          <meshBasicMaterial color="#c45c4a" />
        </mesh>
      ))}
    </group>
  );
}

export function WellRig({
  position,
  pose,
  frame,
  overlay,
  reducedMotion,
  open,
  dress,
}: {
  position: [number, number, number];
  pose: WellPose;
  frame: DecisionFrame;
  overlay: TetraOverlay;
  reducedMotion: boolean;
  open: boolean;
  dress: "garden" | "forest" | "desert" | "core";
}) {
  const spin = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!spin.current || reducedMotion) return;
    spin.current.rotation.y += dt * 0.18;
  });

  const suggestionTheta = frame.proposal ? 1.05 : Math.PI / 3;
  const suggestionPhi = 0.4;
  void overlay;

  const plinth =
    dress === "garden" ? "#d9d0b8" : dress === "forest" ? "#2a3230" : dress === "desert" ? "#c4a06a" : "#161018";
  const tick = dress === "garden" ? "#c8b48a" : "#7f9b94";

  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[2.6, 2.9, 0.35, 32]} />
        <meshStandardMaterial color={plinth} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 2.4, 8]} />
        <meshStandardMaterial color={tick} emissive={tick} emissiveIntensity={0.55} />
      </mesh>
      <group ref={spin} position={[0, 1.1, 0]}>
        {poseVisible(pose, "disc") && <DiscRings />}
        {poseVisible(pose, "torus") && (
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
            <torusGeometry args={[1.7, 0.18, 12, 64]} />
            <meshStandardMaterial color="#c9d4c8" emissive="#7f9b94" emissiveIntensity={0.25} wireframe />
          </mesh>
        )}
        {poseVisible(pose, "hourglass") && <Hourglass color="#9eb0a8" />}
        {poseVisible(pose, "lattice") &&
          CUBOCTA.map((v, i) => (
            <mesh key={i} position={[v[0] * 0.55, v[1] * 0.55 + 0.4, v[2] * 0.55]}>
              <octahedronGeometry args={[0.08, 0]} />
              <meshBasicMaterial color="#d7ddd6" />
            </mesh>
          ))}
        {open && (
          <>
            <FiberLine theta={suggestionTheta} phi={suggestionPhi} color="#c9d4c8" />
            {frame.participants.map((p, i) => {
              const home = SEAT_HOME[i] ?? { theta: 1, phi: i };
              return (
                <group key={p.id}>
                  <FiberLine
                    theta={home.theta}
                    phi={home.phi}
                    color={p.response === "yes" ? "#34d399" : "#6b7280"}
                    dashed={p.response !== "yes"}
                  />
                  <SeatMark
                    response={p.response}
                    ready={p.ready}
                    position={[
                      Math.cos(i * ((Math.PI * 2) / 3)) * 1.7,
                      0.55,
                      Math.sin(i * ((Math.PI * 2) / 3)) * 1.7,
                    ]}
                  />
                </group>
              );
            })}
          </>
        )}
      </group>
    </group>
  );
}
