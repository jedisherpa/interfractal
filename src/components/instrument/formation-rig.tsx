import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  FACE_OPACITY,
  FORM_N_MAX,
  INSIDE_R,
  OUTER_R,
  TORUS_R,
  TORUS_r,
  formPoint,
  lensCorners,
  rainbowAt,
  type FormStage,
} from "@/lib/instrument/formation.ts";
import {
  AXIS_CORNERS,
  CUBE_CORNERS,
  CUBE_HINGES,
  GOLD,
  ICE,
  LEVEL_SCALE,
  SEAT_COLORS,
  TABLE_LEVELS,
  TRAIL_DECAY,
  TRAIL_LEN,
  chamberFills,
  chamberKind,
  clipHeading,
  confirmedCount,
  cornerName,
  fiberOffset,
  findContradictions,
  goldShown,
  lodgeEdge,
  poseOf,
  preClipMagnitude,
  shouldRing,
  starTetraEligible,
} from "@/lib/instrument/table.ts";
import { useInstrument } from "@/lib/instrument/store.ts";

const tmp = new THREE.Vector3();
const upY = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
const faceTint = new THREE.Color();
const FACE_TRIS = FORM_N_MAX * 2;

function usePos() {
  return useMemo(() => Array.from({ length: FORM_N_MAX }, () => new THREE.Vector3()), []);
}

export function FormationRig() {
  const stage = useInstrument((s) => s.formStage);
  const n = useInstrument((s) => s.formN);
  const reduced = useInstrument((s) => s.reducedMotion);
  const committed = useInstrument((s) => s.committed);
  const goldAttested = useInstrument((s) => s.goldAttested);
  const seats = useInstrument((s) => s.seats);
  if (stage === "idle") return null;
  const yes = seats.map((s) => s.yesOnGoal);
  const gold = goldShown(goldAttested, stage === "miss");
  const plane =
    stage === "roles" || stage === "spokes" || stage === "miss"
      ? "inside"
      : stage === "pattern" && committed
        ? "outer"
        : null;
  return (
    <group>
      <GoalTorus highlight={gold && stage === "pattern"} ice={stage === "miss"} />
      <Hourglass dim={stage === "miss"} />
      <AxisShells />
      <Hairlines />
      <ChamberCalendar />
      {plane ? <HorizontalPlane kind={plane === "outer" ? "outer" : "inside"} /> : null}
      {gold && stage === "pattern" ? <OuterEquatorTrack /> : null}
      {committed && stage === "pattern" && !gold ? <OuterEquatorGhost /> : null}
      <People n={n} stage={stage} reduced={reduced} yes={yes} committed={committed} />
    </group>
  );
}

function GoalTorus({ highlight, ice }: { highlight?: boolean; ice?: boolean }) {
  const fill = ice ? ICE : highlight ? GOLD : 0x7d9d94;
  const wire = ice ? ICE : highlight ? GOLD : 0xc9d4c8;
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={2}>
        <torusGeometry args={[TORUS_R, TORUS_r, 24, 80]} />
        <meshBasicMaterial
          color={fill}
          transparent
          opacity={highlight ? 0.32 : ice ? 0.1 : 0.16}
          depthTest={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={2}>
        <torusGeometry args={[TORUS_R, TORUS_r, 18, 80]} />
        <meshBasicMaterial
          color={wire}
          transparent
          opacity={highlight ? 0.55 : 0.32}
          depthTest={false}
          toneMapped={false}
          wireframe
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={3}>
        <torusGeometry args={[TORUS_R, 0.14, 12, 96]} />
        <meshBasicMaterial color={ice ? ICE : highlight ? GOLD : 0xf4f1ea} depthTest={false} toneMapped={false} />
      </mesh>
      {highlight ? (
        <mesh renderOrder={5}>
          <tetrahedronGeometry args={[0.7, 0]} />
          <meshBasicMaterial color={GOLD} depthTest={false} toneMapped={false} />
        </mesh>
      ) : (
        <mesh renderOrder={5}>
          <sphereGeometry args={[0.55, 20, 20]} />
          <meshBasicMaterial color={ice ? ICE : 0xf4f1ea} depthTest={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function Hourglass({ dim }: { dim?: boolean }) {
  const op = dim ? 0.05 : 0.14;
  return (
    <group>
      <mesh position={[0, 1.15, 0]} renderOrder={1}>
        <coneGeometry args={[1.6, 2.2, 16]} />
        <meshBasicMaterial color={ICE} transparent opacity={op} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, -1.15, 0]} rotation={[Math.PI, 0, 0]} renderOrder={1}>
        <coneGeometry args={[1.6, 2.2, 16]} />
        <meshBasicMaterial color={ICE} transparent opacity={op} depthTest={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function AxisShells() {
  const viewLevel = useInstrument((s) => s.viewLevel);
  const seats = useInstrument((s) => s.seats);
  const marks = findContradictions(seats);
  const hinges = CUBE_HINGES[viewLevel];
  const hingeScale = LEVEL_SCALE[viewLevel] + 0.45;
  return (
    <group>
      {TABLE_LEVELS.map((level) => {
        const s = LEVEL_SCALE[level];
        const on = level === viewLevel;
        return (
          <group key={level}>
            <mesh renderOrder={3}>
              <boxGeometry args={[s * 2, s * 2, s * 2]} />
              <meshBasicMaterial
                color={on ? 0xc9d4c8 : 0x6a736e}
                wireframe
                transparent
                opacity={on ? 0.45 : 0.12}
                depthTest={false}
                toneMapped={false}
              />
            </mesh>
            {AXIS_CORNERS.map((c, i) => {
              const split = marks.some((m) => m.octant === i && (m.levelA === level || m.levelB === level));
              return (
                <group key={`${level}-${i}-${CUBE_CORNERS[level][i]}`} position={[c[0] * s, c[1] * s, c[2] * s]}>
                  <mesh renderOrder={6}>
                    <sphereGeometry args={[on ? 0.13 : 0.07, 10, 10]} />
                    <meshBasicMaterial
                      color={split ? GOLD : 0xc9d4c8}
                      transparent
                      opacity={on ? 0.85 : 0.18}
                      depthTest={false}
                      toneMapped={false}
                    />
                  </mesh>
                  {split ? (
                    <>
                      <mesh position={[0.12, 0.08, 0]} renderOrder={7}>
                        <sphereGeometry args={[0.05, 8, 8]} />
                        <meshBasicMaterial color={ICE} depthTest={false} toneMapped={false} />
                      </mesh>
                      <mesh position={[-0.12, -0.08, 0]} renderOrder={7}>
                        <sphereGeometry args={[0.05, 8, 8]} />
                        <meshBasicMaterial color={GOLD} depthTest={false} toneMapped={false} />
                      </mesh>
                    </>
                  ) : null}
                  {on ? (
                    <Billboard follow position={[c[0] * 0.28, c[1] * 0.28, c[2] * 0.28]}>
                      <Text
                        fontSize={0.18}
                        color="#f4f1ea"
                        anchorX="center"
                        anchorY="middle"
                        outlineWidth={0.012}
                        outlineColor="#0a0a0b"
                      >
                        {cornerName(level, i)}
                      </Text>
                    </Billboard>
                  ) : null}
                </group>
              );
            })}
          </group>
        );
      })}
      <group>
        {(
          [
            [[hingeScale, 0, 0], [-hingeScale, 0, 0], hinges[0].plus, hinges[0].minus],
            [[0, hingeScale, 0], [0, -hingeScale, 0], hinges[1].plus, hinges[1].minus],
            [[0, 0, hingeScale], [0, 0, -hingeScale], hinges[2].plus, hinges[2].minus],
          ] as const
        ).map(([p, m, plus, minus]) => (
          <group key={`${viewLevel}-${plus}`}>
            <HingeBar ax={p[0]} ay={p[1]} az={p[2]} bx={m[0]} by={m[1]} bz={m[2]} />
            <Billboard follow position={p}>
              <Text fontSize={0.16} color="#e8d5a3" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#0a0a0b">
                {plus}
              </Text>
            </Billboard>
            <Billboard follow position={m}>
              <Text fontSize={0.16} color="#8aa0ae" anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor="#0a0a0b">
                {minus}
              </Text>
            </Billboard>
          </group>
        ))}
      </group>
    </group>
  );
}

function HingeBar({
  ax,
  ay,
  az,
  bx,
  by,
  bz,
}: {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
}) {
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz)]);
    const obj = new THREE.Line(
      g,
      new THREE.LineBasicMaterial({
        color: 0xe8d5a3,
        transparent: true,
        opacity: 0.4,
        depthTest: false,
        toneMapped: false,
      }),
    );
    obj.renderOrder = 4;
    return obj;
  }, [ax, ay, az, bx, by, bz]);
  return <primitive object={line} />;
}

function Hairlines() {
  const seats = useInstrument((s) => s.seats);
  const marks = findContradictions(seats);
  const key = marks.map((m) => m.caption).join("|");
  const lines = useMemo(() => {
    return marks.slice(0, 6).map((m, i) => {
      const a = AXIS_CORNERS[m.octant] ?? AXIS_CORNERS[0]!;
      const p1 = new THREE.Vector3(a[0], a[1], a[2]).multiplyScalar(LEVEL_SCALE[m.levelA]);
      const p2 = new THREE.Vector3(a[0], a[1], a[2]).multiplyScalar(LEVEL_SCALE[m.levelB]);
      if (m.kind === "vow-vs-vow") p2.add(new THREE.Vector3(0.4, 0.2, -0.3));
      const g = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const line = new THREE.Line(
        g,
        new THREE.LineBasicMaterial({
          color: 0xc9c2b0,
          transparent: true,
          opacity: 0.55,
          depthTest: false,
          toneMapped: false,
        }),
      );
      line.renderOrder = 5;
      return <primitive key={`hair-${i}-${m.octant}-${m.levelA}`} object={line} />;
    });
    // marks captured via key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <group>{lines}</group>;
}

function ChamberCalendar() {
  const seats = useInstrument((s) => s.seats);
  const goldAttested = useInstrument((s) => s.goldAttested);
  const notFit = useInstrument((s) => s.notFit);
  const count = confirmedCount(seats);
  const kind = chamberKind(count);
  const fill = chamberFills(seats, kind);
  const gold = goldShown(goldAttested, notFit);
  const star = starTetraEligible(seats);
  if (kind === "none" && !star) return null;
  return (
    <group>
      {kind === "tetra" || kind === "octa" || kind === "icosa" ? (
        <mesh renderOrder={4}>
          {kind === "tetra" ? <tetrahedronGeometry args={[1.35, 0]} /> : null}
          {kind === "octa" ? <octahedronGeometry args={[1.55, 0]} /> : null}
          {kind === "icosa" ? <icosahedronGeometry args={[1.85, 0]} /> : null}
          <meshBasicMaterial
            color={gold && kind === "tetra" ? GOLD : ICE}
            wireframe={!fill || kind === "icosa"}
            transparent
            opacity={fill && kind !== "icosa" ? 0.22 : 0.35}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      {star ? (
        <group>
          <mesh renderOrder={4} rotation={[0.4, 0.2, 0.1]}>
            <tetrahedronGeometry args={[1.15, 0]} />
            <meshBasicMaterial color={gold ? GOLD : 0xc9d4c8} wireframe={!gold} transparent opacity={0.5} depthTest={false} toneMapped={false} />
          </mesh>
          <mesh renderOrder={4} rotation={[0.4 + Math.PI, 0.2, 0.1]}>
            <tetrahedronGeometry args={[1.15, 0]} />
            <meshBasicMaterial color={gold ? GOLD : 0xc9d4c8} wireframe={!gold} transparent opacity={0.5} depthTest={false} toneMapped={false} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

function OuterEquatorGhost() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={3}>
      <torusGeometry args={[OUTER_R, 0.06, 8, 64]} />
      <meshBasicMaterial color={ICE} wireframe depthTest={false} toneMapped={false} />
    </mesh>
  );
}

function HorizontalPlane({ kind }: { kind: "inside" | "outer" }) {
  const r = kind === "outer" ? OUTER_R : INSIDE_R;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} renderOrder={3}>
      <ringGeometry args={[r - 0.08, r + 0.08, 64]} />
      <meshBasicMaterial color="#c9d4c8" transparent opacity={0.55} side={THREE.DoubleSide} depthTest={false} toneMapped={false} />
    </mesh>
  );
}

function OuterEquatorTrack() {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={3}>
        <torusGeometry args={[OUTER_R, 0.11, 10, 96]} />
        <meshBasicMaterial color={GOLD} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={2}>
        <circleGeometry args={[OUTER_R * 0.98, 64]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.07} side={THREE.DoubleSide} depthTest={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function placeBar(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, radius: number) {
  const d = a.distanceTo(b);
  if (d < 1e-4) {
    mesh.visible = false;
    return;
  }
  mesh.visible = true;
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  dir.copy(b).sub(a).normalize();
  mesh.quaternion.setFromUnitVectors(upY, dir);
  mesh.scale.set(radius, d, radius);
}

function People({
  n,
  stage,
  reduced,
  yes,
  committed,
}: {
  n: number;
  stage: FormStage;
  reduced: boolean;
  yes: boolean[];
  committed: boolean;
}) {
  const pos = usePos();
  const dots = useRef<(THREE.Mesh | null)[]>([]);
  const halos = useRef<(THREE.Mesh | null)[]>([]);
  const edges = useRef<(THREE.Mesh | null)[]>([]);
  const spokes = useRef<(THREE.Mesh | null)[]>([]);
  const pearls = useRef<(THREE.Mesh | null)[]>([]);
  const rays = useRef<(THREE.Mesh | null)[]>([]);
  const lenses = useRef<(THREE.Mesh | null)[]>([]);
  const hoops = useRef<(THREE.Mesh | null)[]>([]);
  const lastPose = useRef("none");
  const faceMesh = useRef<THREE.Mesh>(null);
  const clock = useRef(0);
  const origin = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const trailPos = useMemo(
    () => Array.from({ length: FORM_N_MAX }, () => new Float32Array(TRAIL_LEN * 3)),
    [],
  );
  const trailCol = useMemo(
    () => Array.from({ length: FORM_N_MAX }, () => new Float32Array(TRAIL_LEN * 3)),
    [],
  );
  const trailHead = useRef(Array.from({ length: FORM_N_MAX }, () => 0));
  const trailGeo = useMemo(
    () =>
      Array.from({ length: FORM_N_MAX }, (_, i) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(trailPos[i]!, 3));
        g.setAttribute("color", new THREE.BufferAttribute(trailCol[i]!, 3));
        return g;
      }),
    [trailCol, trailPos],
  );
  const trailLines = useMemo(
    () =>
      trailGeo.map((g) => {
        const mat = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.85,
          depthTest: false,
          toneMapped: false,
        });
        const line = new THREE.Line(g, mat);
        line.renderOrder = 3;
        line.visible = false;
        return line;
      }),
    [trailGeo],
  );
  const lensPts = useMemo(
    () => Array.from({ length: FORM_N_MAX }, () => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]),
    [],
  );
  const faceGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(FACE_TRIS * 9), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(FACE_TRIS * 9), 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    const cap = Math.min(dt, 0.1);
    const st = useInstrument.getState();
    const frozen = !reduced && Date.now() < st.freezeUntil;
    if (!reduced && !frozen) clock.current += cap;
    const t = reduced ? 0 : clock.current;
    const showPeople = stage !== "goal";
    const lerpK = reduced ? 1 : frozen ? 0 : 1 - Math.exp(-cap * 3.2);
    const showPoly = stage === "roles" || stage === "spokes" || stage === "pattern" || stage === "miss";
    const showSpokes = stage === "spokes" || stage === "lenses" || stage === "hold" || stage === "pattern";
    const confirmed = committed && showSpokes;
    const showLenses = stage === "lenses" || stage === "hold";
    const lensT = stage === "hold" && !reduced && !frozen ? t : 0;
    const lift = stage === "lenses" || stage === "hold";
    const fillFaces =
      (stage === "roles" || stage === "spokes" || stage === "lenses" || stage === "hold" || stage === "pattern") &&
      !stage.startsWith("miss");
    const pose = poseOf(stage);
    const marks = Math.max(...trailHead.current);
    if (shouldRing(lastPose.current, pose, marks)) st.noteRing(marks);
    lastPose.current = pose;

    for (let i = 0; i < n; i += 1) {
      const held = Boolean(yes[i]);
      const seat = st.seats[i];
      const [x, y, z] = formPoint(stage, i, n, t);
      pos[i]!.lerp(tmp.set(x, y, z), lerpK);
      const [fx, fy, fz] = fiberOffset(seat?.mood ?? 0.12, i, t);
      const heading = seat ? clipHeading(seat, st.viewLevel) : 0;
      const mag = seat ? preClipMagnitude(seat, st.viewLevel) : 0.55;
      const beadX = pos[i]!.x + (held ? fx : 0);
      const beadY = pos[i]!.y + (held ? fy : 0);
      const beadZ = pos[i]!.z + (held ? fz : 0);
      const mesh = dots.current[i];
      if (mesh) {
        mesh.position.set(beadX, beadY, beadZ);
        mesh.visible = showPeople && held;
        mesh.scale.setScalar(0.85);
      }
      const halo = halos.current[i];
      if (halo) {
        halo.position.set(beadX, beadY, beadZ);
        halo.visible = showPeople && held;
        const hs = 0.7 + mag * 0.45;
        halo.scale.setScalar(hs);
      }
      const hoop = hoops.current[i];
      if (hoop) {
        hoop.visible = showPeople && held;
        hoop.position.set(pos[i]!.x, pos[i]!.y, pos[i]!.z);
        hoop.rotation.set(Math.PI / 2, heading, 0);
        hoop.scale.setScalar(0.55 + (seat?.mood ?? 0) * 0.5);
      }
      if (showPeople && held && !reduced) {
        const head = trailHead.current[i]! % TRAIL_LEN;
        const tp = trailPos[i]!;
        const tc = trailCol[i]!;
        for (let k = TRAIL_LEN - 1; k > 0; k -= 1) {
          const to = k * 3;
          const from = (k - 1) * 3;
          tp[to] = tp[from]!;
          tp[to + 1] = tp[from + 1]!;
          tp[to + 2] = tp[from + 2]!;
          tc[to] = (tc[from] ?? 0) * TRAIL_DECAY;
          tc[to + 1] = (tc[from + 1] ?? 0) * TRAIL_DECAY;
          tc[to + 2] = (tc[from + 2] ?? 0) * TRAIL_DECAY;
        }
        tp[0] = pos[i]!.x;
        tp[1] = 0.04;
        tp[2] = pos[i]!.z;
        faceTint.setHex(SEAT_COLORS[i] ?? 0xc9d4c8);
        tc[0] = faceTint.r;
        tc[1] = faceTint.g;
        tc[2] = faceTint.b;
        trailHead.current[i] = head + 1;
        const geo = trailGeo[i]!;
        geo.attributes.position!.needsUpdate = true;
        geo.attributes.color!.needsUpdate = true;
        const line = trailLines[i]!;
        line.visible = true;
      } else {
        const line = trailLines[i];
        if (line) line.visible = Boolean(showPeople && held && reduced);
      }
    }
    for (let i = n; i < FORM_N_MAX; i += 1) {
      const mesh = dots.current[i];
      if (mesh) mesh.visible = false;
      const halo = halos.current[i];
      if (halo) halo.visible = false;
      const hoop = hoops.current[i];
      if (hoop) hoop.visible = false;
      const line = trailLines[i];
      if (line) line.visible = false;
    }

    let brass = true;
    for (let i = 0; i < FORM_N_MAX; i += 1) {
      const edge = edges.current[i];
      if (edge) {
        const live = showPoly && i < n && lodgeEdge(yes, i);
        if (live) {
          const mat = edge.material as THREE.MeshBasicMaterial;
          if (stage === "miss" && brass) {
            mat.color.setHex(GOLD);
            brass = false;
          } else if (stage === "miss") {
            edge.visible = false;
            continue;
          } else {
            mat.color.setHex(committed && stage === "pattern" ? GOLD : 0xf4f1ea);
          }
          placeBar(edge, pos[i]!, pos[(i + 1) % n]!, stage === "pattern" ? 0.055 : 0.045);
        } else if (edge) edge.visible = false;
      }
      const spoke = spokes.current[i];
      const pearl = pearls.current[i];
      const held = i < n && yes[i];
      if (spoke) {
        if (showSpokes && held) {
          placeBar(spoke, origin, pos[i]!, confirmed ? 0.028 : 0.016);
          (spoke.material as THREE.MeshBasicMaterial).color.setHex(confirmed ? GOLD : 0x9eb8ae);
          (spoke.material as THREE.MeshBasicMaterial).opacity = confirmed ? 0.95 : 0.4;
          (spoke.material as THREE.MeshBasicMaterial).transparent = !confirmed;
        } else spoke.visible = false;
      }
      if (pearl) {
        if (confirmed && held) {
          pearl.visible = true;
          pearl.position.copy(pos[i]!).multiplyScalar(0.45);
        } else pearl.visible = false;
      }
    }

    const posAttr = faceGeo.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = faceGeo.getAttribute("color") as THREE.BufferAttribute;
    const pa = posAttr.array as Float32Array;
    const ca = colAttr.array as Float32Array;
    let tri = 0;
    const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, hex: number) => {
      if (tri >= FACE_TRIS) return;
      const o = tri * 9;
      pa[o] = a.x;
      pa[o + 1] = a.y;
      pa[o + 2] = a.z;
      pa[o + 3] = b.x;
      pa[o + 4] = b.y;
      pa[o + 5] = b.z;
      pa[o + 6] = c.x;
      pa[o + 7] = c.y;
      pa[o + 8] = c.z;
      faceTint.setHex(hex);
      for (let k = 0; k < 3; k += 1) {
        ca[o + k * 3] = faceTint.r;
        ca[o + k * 3 + 1] = faceTint.g;
        ca[o + k * 3 + 2] = faceTint.b;
      }
      tri += 1;
    };
    const yesIdx = yes.map((v, i) => (v && i < n ? i : -1)).filter((i) => i >= 0);
    if (fillFaces && yesIdx.length >= 3 && committed) {
      if (stage === "roles" || lift) {
        for (let i = 1; i < yesIdx.length - 1; i += 1) {
          pushTri(pos[yesIdx[0]!]!, pos[yesIdx[i]!]!, pos[yesIdx[i + 1]!]!, rainbowAt(i));
        }
      }
      if (stage !== "roles") {
        for (let i = 0; i < n; i += 1) {
          if (lodgeEdge(yes, i)) pushTri(pos[i]!, pos[(i + 1) % n]!, origin, rainbowAt(i + 4));
        }
      }
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    faceGeo.setDrawRange(0, tri * 3);
    if (faceMesh.current) faceMesh.current.visible = fillFaces && tri > 0 && committed;

    for (let i = 0; i < FORM_N_MAX; i += 1) {
      const held = i < n && yes[i];
      const lensMesh = lenses.current[i];
      if (lensMesh) lensMesh.visible = showLenses && Boolean(held);
      if (!(showLenses && held)) {
        for (let k = 0; k < 3; k += 1) {
          const ray = rays.current[i * 3 + k];
          if (ray) ray.visible = false;
        }
        continue;
      }
      const corners = lensCorners(i, n, lensT);
      const trip = lensPts[i]!;
      trip[0]!.set(...corners[0]);
      trip[1]!.set(...corners[1]);
      trip[2]!.set(...corners[2]);
      if (lensMesh) {
        const geo = lensMesh.geometry as THREE.BufferGeometry;
        geo.setAttribute(
          "position",
          new THREE.BufferAttribute(
            new Float32Array([
              trip[0]!.x,
              trip[0]!.y,
              trip[0]!.z,
              trip[1]!.x,
              trip[1]!.y,
              trip[1]!.z,
              trip[2]!.x,
              trip[2]!.y,
              trip[2]!.z,
            ]),
            3,
          ),
        );
        geo.computeVertexNormals();
      }
      for (let k = 0; k < 3; k += 1) {
        const ray = rays.current[i * 3 + k];
        if (ray) placeBar(ray, pos[i]!, trip[k]!, 0.025);
      }
    }
  });

  return (
    <group>
      <mesh ref={faceMesh} geometry={faceGeo} visible={false} renderOrder={3}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={FACE_OPACITY}
          side={THREE.DoubleSide}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {trailLines.map((line, i) => (
        <primitive key={`t-${i}`} object={line} />
      ))}
      {Array.from({ length: FORM_N_MAX }, (_, i) => (
        <mesh
          key={`p-${i}`}
          ref={(el) => {
            dots.current[i] = el;
          }}
          visible={false}
          renderOrder={6}
        >
          <sphereGeometry args={[0.42, 16, 16]} />
          <meshBasicMaterial color={SEAT_COLORS[i]} depthTest={false} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: FORM_N_MAX }, (_, i) => (
        <mesh
          key={`h-${i}`}
          ref={(el) => {
            halos.current[i] = el;
          }}
          visible={false}
          renderOrder={5}
        >
          <sphereGeometry args={[0.62, 12, 12]} />
          <meshBasicMaterial color={SEAT_COLORS[i]} transparent opacity={0.22} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: FORM_N_MAX }, (_, i) => (
        <mesh
          key={`hoop-${i}`}
          ref={(el) => {
            hoops.current[i] = el;
          }}
          visible={false}
          renderOrder={5}
        >
          <torusGeometry args={[0.55, 0.03, 8, 24]} />
          <meshBasicMaterial color={SEAT_COLORS[i]} transparent opacity={0.55} depthTest={false} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: FORM_N_MAX }, (_, i) => (
        <mesh
          key={`e-${i}`}
          ref={(el) => {
            edges.current[i] = el;
          }}
          visible={false}
          renderOrder={4}
        >
          <cylinderGeometry args={[1, 1, 1, 8]} />
          <meshBasicMaterial color="#f4f1ea" depthTest={false} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: FORM_N_MAX }, (_, i) => (
        <mesh
          key={`s-${i}`}
          ref={(el) => {
            spokes.current[i] = el;
          }}
          visible={false}
          renderOrder={4}
        >
          <cylinderGeometry args={[1, 1, 1, 8]} />
          <meshBasicMaterial color="#9eb8ae" transparent opacity={0.4} depthTest={false} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: FORM_N_MAX }, (_, i) => (
        <mesh
          key={`pearl-${i}`}
          ref={(el) => {
            pearls.current[i] = el;
          }}
          visible={false}
          renderOrder={6}
        >
          <sphereGeometry args={[0.16, 10, 10]} />
          <meshBasicMaterial color={GOLD} depthTest={false} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: FORM_N_MAX * 3 }, (_, i) => (
        <mesh
          key={`r-${i}`}
          ref={(el) => {
            rays.current[i] = el;
          }}
          visible={false}
          renderOrder={4}
        >
          <cylinderGeometry args={[1, 1, 1, 6]} />
          <meshBasicMaterial color="#d7ddd6" depthTest={false} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: FORM_N_MAX }, (_, i) => (
        <mesh
          key={`l-${i}`}
          ref={(el) => {
            lenses.current[i] = el;
          }}
          visible={false}
          renderOrder={4}
        >
          <bufferGeometry />
          <meshBasicMaterial
            color={rainbowAt(i)}
            transparent
            opacity={FACE_OPACITY}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
