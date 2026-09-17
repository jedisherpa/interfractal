import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  FACES,
  FIELD_COLORS,
  HOME,
  PEOPLE_SEED,
  SOLID_SCALE,
  TETRA,
  fibreSafe,
  beadWorld,
} from "@/lib/hopf";

function project(
  p: readonly [number, number, number],
  w: number,
  h: number,
  yaw = 0.72,
  pitch = 0.38,
) {
  const scale = Math.min(w, h) * 0.24;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x1 = p[0] * cy - p[2] * sy;
  const z1 = p[0] * sy + p[2] * cy;
  const y1 = p[1] * cp - z1 * sp;
  const z2 = p[1] * sp + z1 * cp;
  const k = scale / Math.max(0.55, 2.6 + z2);
  return { x: w / 2 + x1 * k, y: h / 2 - y1 * k };
}

function strokeLoop(
  ctx: CanvasRenderingContext2D,
  pts: [number, number, number][],
  w: number,
  h: number,
  color: string,
  width: number,
  alpha: number,
) {
  if (pts.length < 4) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const q = project(p, w, h);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawPreview(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, canvas.clientWidth);
  const h = Math.max(1, canvas.clientHeight);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#eef7ff";
  ctx.fillRect(0, 0, w, h);

  const latitudes = [0.55, 0.95, 1.35, 1.75, 2.2];
  latitudes.forEach((theta, ti) => {
    for (let i = 0; i < 6; i += 1) {
      const phi = (i * 2 * Math.PI) / 6 + ti * 0.17;
      const raw = fibreSafe(theta, phi, 48);
      if (!raw) continue;
      strokeLoop(ctx, raw, w, h, FIELD_COLORS[ti % FIELD_COLORS.length], 1.1, 0.45);
    }
  });

  HOME.forEach((home, i) => {
    const raw = fibreSafe(home.theta, home.phi, 80);
    if (raw) strokeLoop(ctx, raw, w, h, PEOPLE_SEED[i].color, 2.2, 0.95);
  });

  const faces = FACES.map((face) => {
    const pts = face.map((vi) => {
      const v = TETRA[vi];
      return project([v[0] * SOLID_SCALE, v[1] * SOLID_SCALE, v[2] * SOLID_SCALE], w, h);
    });
    const z = face.reduce((s, vi) => s + TETRA[vi][2], 0);
    return { pts, z };
  }).sort((a, b) => a.z - b.z);

  faces.forEach((face) => {
    ctx.beginPath();
    ctx.moveTo(face.pts[0].x, face.pts[0].y);
    ctx.lineTo(face.pts[1].x, face.pts[1].y);
    ctx.lineTo(face.pts[2].x, face.pts[2].y);
    ctx.closePath();
    ctx.fillStyle = "rgba(244, 230, 176, 0.28)";
    ctx.strokeStyle = "#C49214";
    ctx.lineWidth = 1.6;
    ctx.fill();
    ctx.stroke();
  });

  PEOPLE_SEED.forEach((p) => {
    const world = beadWorld(HOME[p.seat].theta, HOME[p.seat].phi, p.rest);
    if (!world) return;
    const q = project(world, w, h);
    ctx.beginPath();
    ctx.fillStyle = p.color;
    ctx.arc(q.x, q.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function StageHost() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [Stage, setStage] = useState<ComponentType | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) drawPreview(canvas);
    const onResize = () => {
      if (canvasRef.current && !Stage) drawPreview(canvasRef.current);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [Stage]);

  useEffect(() => {
    let alive = true;
    void import("@/components/abacus-scene")
      .then((m) => {
        if (alive) setStage(() => m.AbacusStage);
      })
      .catch(() => {
        /* keep the 2D instrument */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (Stage) return <Stage />;

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none"
      style={{ display: "block", width: "100%", height: "100%" }}
      aria-label="Intention Abacus, two-dimensional preview of the Hopf instrument"
    />
  );
}
