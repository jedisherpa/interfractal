/**
 * First-person flight runtime. Mutated every frame; React reads snapshots.
 * A = yaw left, D = yaw right (chase/FP heading), W = forward along heading.
 */

import { SPAWNS, dist, gatesForLayer, wellForLayer } from "@/workshop/geometry.ts";
import type { ScaleLayerId } from "@/workshop/types.ts";

export type Nearby =
  | { kind: "decision_well"; id: string; label: string }
  | { kind: "scale_gate"; id: string; label: string; dir: "shrink" | "grow"; to: ScaleLayerId }
  | null;

export type FlightSnap = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  speed: number;
  nearby: Nearby;
  layer: ScaleLayerId;
};

const FORWARD_SPEED = 22;
const LIFT_SPEED = 12;
const TURN_RATE = 1.9;
const LOOK_SENS = 0.0022;
const DRAG = 6;

export class FlightRuntime {
  x = 0;
  y = 8;
  z = 28;
  yaw = 0;
  pitch = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  layer: ScaleLayerId = 0;
  keys = new Set<string>();
  injected: string[] | null = null;
  lookDX = 0;
  lookDY = 0;
  damped = false;
  nearby: Nearby = null;
  unlocked: ScaleLayerId[] = [0];

  spawn(layer: ScaleLayerId) {
    const s = SPAWNS[layer];
    this.layer = layer;
    this.x = s.x;
    this.y = s.y;
    this.z = s.z;
    this.yaw = s.yaw;
    this.pitch = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.nearby = this.probeNearby();
    if (!this.unlocked.includes(layer)) this.unlocked = [...this.unlocked, layer];
  }

  held() {
    return this.injected ?? [...this.keys];
  }

  has(code: string) {
    return this.held().includes(code);
  }

  setKeys(codes: string[]) {
    this.injected = codes;
  }

  clearInjected() {
    this.injected = null;
  }

  forward() {
    const cp = Math.cos(this.pitch);
    return {
      x: -Math.sin(this.yaw) * cp,
      y: Math.sin(this.pitch),
      z: -Math.cos(this.yaw) * cp,
    };
  }

  right() {
    return { x: Math.cos(this.yaw), y: 0, z: -Math.sin(this.yaw) };
  }

  step(dt: number) {
    const t = Math.min(dt, 0.1);
    this.yaw += this.lookDX * LOOK_SENS;
    this.pitch += this.lookDY * LOOK_SENS;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
    this.lookDX = 0;
    this.lookDY = 0;

    let steer = 0;
    if (this.has("KeyA") || this.has("ArrowLeft")) steer += 1;
    if (this.has("KeyD") || this.has("ArrowRight")) steer -= 1;
    if (!this.damped) this.yaw += steer * TURN_RATE * t;

    const f = this.forward();
    const r = this.right();
    let wishX = 0;
    let wishY = 0;
    let wishZ = 0;
    const scale = this.damped ? 0.08 : 1;
    if (this.has("KeyW") || this.has("ArrowUp")) {
      wishX += f.x;
      wishY += f.y;
      wishZ += f.z;
    }
    if (this.has("KeyS") || this.has("ArrowDown")) {
      wishX -= f.x;
      wishY -= f.y;
      wishZ -= f.z;
    }
    if (this.has("KeyQ")) {
      wishX -= r.x;
      wishZ -= r.z;
    }
    if (this.has("KeyE")) {
      wishX += r.x;
      wishZ += r.z;
    }
    if (this.has("Space")) wishY += 1;
    if (this.has("ShiftLeft") || this.has("ControlLeft") || this.has("KeyC")) wishY -= 1;

    const len = Math.hypot(wishX, wishY, wishZ);
    if (len > 0) {
      wishX /= len;
      wishY /= len;
      wishZ /= len;
      this.vx += wishX * FORWARD_SPEED * scale * t * 8;
      this.vy += wishY * LIFT_SPEED * scale * t * 8;
      this.vz += wishZ * FORWARD_SPEED * scale * t * 8;
    }

    const damp = Math.exp(-DRAG * t);
    this.vx *= damp;
    this.vy *= damp;
    this.vz *= damp;

    const max = this.damped ? 2 : FORWARD_SPEED;
    const sp = Math.hypot(this.vx, this.vy, this.vz);
    if (sp > max) {
      const k = max / sp;
      this.vx *= k;
      this.vy *= k;
      this.vz *= k;
    }

    this.x += this.vx * t;
    this.y += this.vy * t;
    this.z += this.vz * t;
    this.y = Math.max(1.4, Math.min(48, this.y));
    this.x = Math.max(-80, Math.min(80, this.x));
    this.z = Math.max(-80, Math.min(90, this.z));

    this.nearby = this.probeNearby();
  }

  probeNearby(): Nearby {
    const well = wellForLayer(this.layer);
    const p = { x: this.x, y: this.y, z: this.z };
    if (dist(p, well.position) <= well.radius + 1.2) {
      return { kind: "decision_well", id: well.id, label: "Decision Well" };
    }
    for (const g of gatesForLayer(this.layer)) {
      if (dist(p, g.position) <= g.radius + 0.6) {
        return {
          kind: "scale_gate",
          id: g.id,
          label: g.label,
          dir: g.dir,
          to: g.to,
        };
      }
    }
    return null;
  }

  speed() {
    return Math.hypot(this.vx, this.vy, this.vz);
  }

  snap(): FlightSnap {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
      yaw: this.yaw,
      pitch: this.pitch,
      speed: this.speed(),
      nearby: this.nearby,
      layer: this.layer,
    };
  }

  recover() {
    this.spawn(this.layer);
  }

  teleportToWell() {
    const w = wellForLayer(this.layer);
    this.x = w.position.x;
    this.y = w.position.y + 5.2;
    this.z = w.position.z + 14;
    this.pitch = -0.38;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.nearby = this.probeNearby();
  }

  teleportToGate() {
    const g = gatesForLayer(this.layer)[0];
    if (!g) return;
    this.x = g.position.x;
    this.y = g.position.y + 1.2;
    this.z = g.position.z + 6;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.nearby = this.probeNearby();
  }
}

export const flight = new FlightRuntime();


