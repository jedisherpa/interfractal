/**
 * Intention Abacus sitting-lock 3D picture.
 * Port of jedisherpa/intention-abacus engine.ts + geometry3d.ts (three@0.186).
 * Real ConeGeometry hourglass, TorusGeometry table, OrbitControls rotate.
 * Topology does not authorize.
 */
import * as THREE from "three";
import { OrbitControls } from "./vendor/three/OrbitControls.js";

const PI = Math.PI;
const GOLD = 0xf0c93a;
const TABLE = 0x7aa8bd;
const FIELD_LAT = [0.55, 0.95, 1.35, 1.75, 2.2];
const FIELD_COLORS = [0xffe14d, 0xff7a1a, 0x7ec8f8];
const instances = new Map();

function hopfLib() {
  if (typeof window !== "undefined" && window.Hopf) return window.Hopf;
  if (typeof Hopf !== "undefined") return Hopf;
  return null;
}
function model() {
  if (typeof window !== "undefined" && window.Abacus) return window.Abacus;
  if (typeof Abacus !== "undefined") return Abacus;
  return null;
}

function fibre(theta, phi, samples = 160) {
  const HopfLib = hopfLib();
  const Model = model();
  const pts = [];
  if (!HopfLib || !Model) return pts;
  const scale = Model.SCALE || 0.92;
  for (let i = 0; i <= samples; i += 1) {
    const p = Model.stereographicOrNull(HopfLib.state(theta, phi, (2 * PI * i) / samples));
    if (p) pts.push(new THREE.Vector3(p[0] * scale, p[1] * scale, p[2] * scale));
  }
  return pts;
}

function hoop(points, color, opacity, dashed = false) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = dashed
    ? new THREE.LineDashedMaterial({
        color,
        transparent: true,
        opacity,
        dashSize: 0.08,
        gapSize: 0.06,
        depthWrite: false,
      })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const line = new THREE.Line(geo, mat);
  if (dashed) line.computeLineDistances();
  return line;
}

function seatGeometry(kind) {
  switch (kind) {
    case "ready": {
      const g = new THREE.OctahedronGeometry(0.07);
      g.scale(1, 1.35, 0.45);
      return g;
    }
    case "yes":
      return new THREE.SphereGeometry(0.08, 20, 14);
    case "no":
      return new THREE.CylinderGeometry(0.07, 0.07, 0.02, 20);
    case "withdrawn":
      return new THREE.TorusGeometry(0.055, 0.012, 8, 18, Math.PI * 1.7);
    default:
      return new THREE.TorusGeometry(0.055, 0.012, 8, 20);
  }
}

function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    const mat = child.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) mat.dispose();
  });
}

function hourglassCone(up, hole, height) {
  const geo = new THREE.ConeGeometry(hole, height, 48, 1, true);
  geo.translate(0, -height / 2, 0);
  if (up) geo.scale(1, -1, 1);
  const fillMesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0xd6cbb3,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 0.62,
      metalness: 0.02,
    })
  );
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 22),
    new THREE.LineBasicMaterial({ color: 0xb7a57a, transparent: true, opacity: 0.18, depthWrite: false })
  );
  const group = new THREE.Group();
  group.add(fillMesh, wire);
  group.userData.kind = "cone";
  return group;
}

function placeBead(person, workshop, mesh) {
  const Model = model();
  const HopfLib = hopfLib();
  if (!Model || !HopfLib) return;
  const home = Model.HOME[person.seat] || Model.HOME[0];
  const lift = (workshop.holonomyTurns || 0) * HopfLib.holonomyAngle(PI / 3);
  const g = workshop.gauge || 0;
  const agreement = workshop.agreement;
  let theta = home.theta;
  let phi = home.phi;
  let gamma = (person.rest || 0) + g + lift;
  if (person.status === "withdrawn" || agreement === "paused") gamma = PI + g + lift;
  else if (person.status === "yes" && person.version != null) {
    theta = Model.GOAL.theta;
    phi = Model.GOAL.phi;
    gamma = g + lift;
  } else if (person.status === "no") gamma = PI / 2 + g + lift;
  else if (person.status === "ready") gamma = (person.rest || 0) + PI / 4 + g + lift;
  const p = Model.stereographicOrNull(HopfLib.state(theta, phi, gamma));
  if (!p) return;
  const scale = Model.SCALE || 0.92;
  mesh.position.set(p[0] * scale, p[1] * scale, p[2] * scale);
}

function drawOverlay(ctx, w, h, frame) {
  ctx.clearRect(0, 0, w, h);
  if (frame.processLabels) {
    const cx = w / 2;
    const midY = h * 0.55;
    const topY = 52;
    const botY = h - 42;
    const half = w * 0.26;
    ctx.fillStyle = "#1E3A5F";
    ctx.font = '700 15px "IBM Plex Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText("PLAY", cx, topY + 28);
    ctx.fillText("TALK", cx + half + 48, midY + 5);
    ctx.fillText("DO", cx, botY - 18);
    ctx.fillText("COME BACK", cx - half - 62, midY + 5);
    ctx.font = '13px "Source Serif 4", Georgia, serif';
    ctx.fillStyle = "#4A6A8A";
    ctx.fillText("put helpers on jobs", cx, topY + 48);
    ctx.fillText("ask before you change a plan", cx + half + 48, midY + 24);
    ctx.fillText("do the job, tell the truth", cx, botY - 2);
    ctx.fillText("the board can change", cx - half - 62, midY + 24);
  }
  if (frame.captions && frame.captions.length) {
    ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillStyle = frame.mode === "intro" ? "#eef7ff" : "#1E3A5F";
    ctx.textAlign = "left";
    frame.captions.forEach((line, i) => ctx.fillText(line, 22, 28 + i * 18));
  }
  if (frame.overlay && frame.overlay.length) {
    ctx.fillStyle = frame.mode === "intro" ? "#eef7ff" : "#1e3a5f";
    ctx.font = frame.overlayFont || "16px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    frame.overlay.forEach((line, i) => ctx.fillText(line, w / 2, 28 + i * 20));
  }
  if (frame.mode === "intro" && !(frame.overlay && frame.overlay.length)) {
    ctx.fillStyle = "#eef7ff";
    ctx.font = "14px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("loops", w / 2, 28);
  }
}

function samplePainted(canvas) {
  const inst = instances.get(canvas);
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  if (!gl) return 0;
  if (inst && inst.renderer) inst.renderer.render(inst.scene, inst.camera);
  const w = canvas.width;
  const h = canvas.height;
  if (w < 2 || h < 2) return 0;
  const data = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
  let colored = 0;
  for (let i = 0; i < data.length; i += 16) {
    if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) colored += 1;
  }
  return colored;
}

function cameraSnapshot(canvas) {
  const inst = instances.get(canvas);
  if (!inst) return null;
  const p = inst.camera.position;
  return { x: p.x, y: p.y, z: p.z };
}

export function mount(canvas, getFrame) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error("AbacusEngine.mount needs a canvas");
  const prev = instances.get(canvas);
  if (prev) prev.dispose();

  const Model = model();
  const major = (Model && Model.TORUS_MAJOR) || 1.08;
  const tube = (Model && Model.TORUS_TUBE) || 0.36;
  const hole = (Model && Model.HOLE_RADIUS) || major - tube;
  const coneH = (Model && Model.CONE_HEIGHT) || 4 * tube;

  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0xffffff, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  camera.position.set(0.12, 2.08, 3.42);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 2.2;
  controls.maxDistance = 11;
  controls.target.set(0, -0.08, 0);
  controls.autoRotateSpeed = 0.9;

  scene.add(new THREE.AmbientLight(0xffffff, 0.95));
  const key = new THREE.DirectionalLight(0xfff3c4, 0.7);
  key.position.set(2, 3, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb9e7ff, 0.35);
  fill.position.set(-3, 1, -2);
  scene.add(fill);

  const tableRig = new THREE.Group();
  const table = new THREE.Mesh(
    new THREE.TorusGeometry(major, tube, 48, 160),
    new THREE.MeshStandardMaterial({
      color: TABLE,
      transparent: true,
      opacity: 0.32,
      wireframe: true,
      metalness: 0.05,
      roughness: 0.4,
    })
  );
  table.rotation.x = PI / 2;
  table.userData.kind = "torus";
  tableRig.add(table);

  const coneDown = hourglassCone(false, hole, coneH);
  const coneUp = hourglassCone(true, hole, coneH);
  tableRig.add(coneDown, coneUp);

  const fieldGroup = new THREE.Group();
  const seatGroup = new THREE.Group();
  const pickGroup = new THREE.Group();
  tableRig.add(fieldGroup, seatGroup, pickGroup);
  scene.add(tableRig);

  function buildField() {
    while (fieldGroup.children.length) {
      const child = fieldGroup.children[0];
      fieldGroup.remove(child);
      disposeObject(child);
    }
    FIELD_LAT.forEach((theta, ti) => {
      for (let i = 0; i < 8; i += 1) {
        const phi = (i * 2 * PI) / 8 + ti * 0.17;
        fieldGroup.add(hoop(fibre(theta, phi, 128), FIELD_COLORS[ti % 3], 0.34));
      }
    });
    for (let i = 0; i < 16; i += 1) {
      fieldGroup.add(hoop(fibre(PI / 2, (i * 2 * PI) / 16, 180), 0x1ad4ea, 0.55));
    }
    const Model = model();
    if (Model && Model.SCALAR_HOOPS) {
      Model.SCALAR_HOOPS.forEach((row) => {
        const color = typeof row.color === "string" ? new THREE.Color(row.color).getHex() : row.color;
        fieldGroup.add(hoop(fibre(row.theta, row.phi, 160), color, 0.85));
      });
    }
    if (Model && Model.GOAL) {
      fieldGroup.add(hoop(fibre(Model.GOAL.theta, Model.GOAL.phi, 200), 0xc49214, 1));
    }
  }
  buildField();

  const overlay = document.createElement("canvas");
  overlay.dataset.abacusOverlay = "1";
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;background:transparent;";
  const parent = canvas.parentElement;
  if (parent) {
    const pos = window.getComputedStyle(parent).position;
    if (pos === "static") parent.style.position = "relative";
    canvas.after(overlay);
  }
  canvas.abacusOverlay = overlay;

  const box = parent instanceof HTMLElement ? parent : canvas;
  function resize() {
    const host = canvas.parentElement instanceof HTMLElement ? canvas.parentElement : box;
    const w = Math.max(1, canvas.clientWidth || host.clientWidth || 900);
    const h = Math.max(1, canvas.clientHeight || host.clientHeight || 520);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    overlay.width = Math.max(1, Math.round(w * dpr));
    overlay.height = Math.max(1, Math.round(h * dpr));
    const octx = overlay.getContext("2d");
    if (octx) octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const seats = [];
  function syncSeats(people, workshop) {
    while (seats.length < people.length) {
      const person = people[seats.length];
      const mesh = new THREE.Mesh(
        seatGeometry(person.status),
        new THREE.MeshStandardMaterial({
          color: person.color || 0x1ad4ea,
          emissive: person.color || 0x1ad4ea,
          emissiveIntensity: 0.18,
          roughness: 0.3,
        })
      );
      mesh.userData.kind = "bead";
      mesh.userData.status = person.status;
      seatGroup.add(mesh);
      seats.push(mesh);
    }
    while (seats.length > people.length) {
      const mesh = seats.pop();
      seatGroup.remove(mesh);
      disposeObject(mesh);
    }
    people.forEach((person, i) => {
      const mesh = seats[i];
      if (mesh.userData.status !== person.status) {
        mesh.geometry.dispose();
        mesh.geometry = seatGeometry(person.status);
        mesh.userData.status = person.status;
      }
      const mat = mesh.material;
      const color = person.color || "#1AD4EA";
      mat.color.set(color);
      mat.emissive.set(workshop.agreement === "active" && person.status === "yes" ? GOLD : color);
      mat.emissiveIntensity = person.status === "yes" && workshop.agreement === "active" ? 0.45 : 0.18;
      placeBead(person, workshop, mesh);
    });
  }

  function syncPicks(frame) {
    while (pickGroup.children.length) {
      const child = pickGroup.children[0];
      pickGroup.remove(child);
      disposeObject(child);
    }
    const theta = frame.theta == null ? PI / 3 : frame.theta;
    const phi = frame.phi == null ? 0 : frame.phi;
    const picks = frame.picks || [];
    if (picks.length) {
      picks.forEach((dot) => {
        pickGroup.add(hoop(fibre(dot.theta, dot.phi, 160), new THREE.Color(dot.color).getHex(), 1));
      });
    } else if (frame.mode !== "intro" && frame.mode !== "shapes") {
      pickGroup.add(hoop(fibre(theta, phi, 160), 0x1ad4ea, 1));
      pickGroup.add(hoop(fibre(theta, phi + (2 * PI) / 3, 160), 0xff7a1a, 1));
    }
    const HopfLib = hopfLib();
    const Model = model();
    if (HopfLib && Model && frame.mode !== "intro") {
      const p = Model.stereographicOrNull(HopfLib.state(theta, phi, frame.gamma || 0));
      if (p) {
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.045, 12, 10),
          new THREE.MeshStandardMaterial({
            color: frame.workshop && frame.workshop.agreement === "active" ? GOLD : 0xd4b06a,
            emissive: frame.workshop && frame.workshop.agreement === "active" ? GOLD : 0xd4b06a,
            emissiveIntensity: 0.2,
          })
        );
        const scale = Model.SCALE || 0.92;
        marker.position.set(p[0] * scale, p[1] * scale, p[2] * scale);
        pickGroup.add(marker);
      }
    }
  }

  let lastPickKey = "";
  let lastPeopleKey = "";
  let dragging = false;
  canvas.addEventListener("pointerdown", () => {
    dragging = true;
    canvas.style.cursor = "grabbing";
    kick();
  });
  window.addEventListener("pointerup", () => {
    dragging = false;
    canvas.style.cursor = "grab";
  });

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  if (box !== canvas) ro.observe(box);
  resize();

  let raf = 0;
  let last = performance.now();
  const frames = { count: 0 };

  function apply(frame, dt) {
    const workshop = frame.workshop || { people: [], agreement: null };
    const gold = workshop.agreement === "active";
    const unfit = workshop.formation === "unfit";
    table.material.color.setHex(gold ? GOLD : unfit ? 0x4a6a88 : TABLE);
    table.material.opacity = unfit ? 0.12 : gold ? 0.5 : 0.32;
    table.material.emissive.setHex(gold ? GOLD : 0x000000);
    table.material.emissiveIntensity = gold ? 0.35 : 0;
    [coneDown, coneUp].forEach((g) => {
      g.traverse((child) => {
        if (child.material && "opacity" in child.material) {
          child.material.opacity = unfit ? 0.08 : child instanceof THREE.LineSegments ? 0.18 : 0.36;
        }
      });
    });
    const bg = frame.background != null ? frame.background : frame.mode === "intro" ? 0x0b1220 : 0xffffff;
    renderer.setClearColor(bg, 1);
    const people = workshop.people || [];
    const peopleKey = people.map((p) => `${p.id}:${p.status}:${p.version}`).join("|") + String(workshop.agreement);
    if (peopleKey !== lastPeopleKey) {
      lastPeopleKey = peopleKey;
      syncSeats(people, workshop);
    } else {
      people.forEach((person, i) => {
        if (seats[i]) placeBead(person, workshop, seats[i]);
      });
    }
    const pickKey = `${frame.mode}|${frame.theta}|${frame.phi}|${(frame.picks || []).map((d) => d.id).join(",")}`;
    if (pickKey !== lastPickKey) {
      lastPickKey = pickKey;
      syncPicks(frame);
    }
    const reduce = Boolean(frame.reduceMotion);
    const paused = Boolean(frame.motionPaused);
    const spinning = frame.spinning !== false && !reduce && !paused && !dragging;
    controls.autoRotate = false;
    if (spinning) tableRig.rotation.y += 0.28 * dt;
    const octx = overlay.getContext("2d");
    if (octx) drawOverlay(octx, canvas.clientWidth || 900, canvas.clientHeight || 520, frame);
  }

  function tick(now) {
    raf = 0;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const frame = typeof getFrame === "function" ? getFrame() : getFrame || {};
    apply(frame, dt);
    controls.update();
    renderer.render(scene, camera);
    frames.count += 1;
    const reduce = Boolean(frame.reduceMotion);
    const paused = Boolean(frame.motionPaused);
    const spinning = frame.spinning !== false && !reduce && !paused;
    if (spinning || dragging || document.visibilityState !== "hidden") {
      if (!reduce || dragging) raf = requestAnimationFrame(tick);
    }
  }

  function kick() {
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }
  kick();

  const inst = {
    renderer,
    scene,
    camera,
    controls,
    table,
    cones: [coneDown, coneUp],
    frames,
    kick,
    resize,
    setFrame() {
      resize();
      kick();
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      overlay.remove();
      instances.delete(canvas);
    },
  };
  instances.set(canvas, inst);
  return inst;
}

const AbacusEngine = { mount, samplePainted, cameraSnapshot, instances };
if (typeof window !== "undefined") window.AbacusEngine = AbacusEngine;
export default AbacusEngine;
