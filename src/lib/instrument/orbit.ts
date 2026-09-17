/** Teaching-room camera. A turns the view left. W dollies in. */

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export const orbit = {
  yaw: 0.35,
  pitch: 0.2,
  radius: 34,
  keys: new Set<string>(),
  lookDX: 0,
  lookDY: 0,
  setKeys(codes: string[]) {
    this.keys = new Set(codes);
  },
  add(code: string) {
    this.keys.add(code);
  },
  delete(code: string) {
    this.keys.delete(code);
  },
  clear() {
    this.keys.clear();
  },
  step(dt: number) {
    const t = Math.min(dt, 0.1);
    let steer = 0;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) steer += 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) steer -= 1;
    this.yaw += steer * 1.35 * t;
    this.yaw -= this.lookDX * 0.004;
    this.pitch -= this.lookDY * 0.003;
    this.lookDX = 0;
    this.lookDY = 0;
    let dolly = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dolly -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dolly += 1;
    this.radius = clamp(this.radius + dolly * 10 * t, 8, 64);
    let lift = 0;
    if (this.keys.has("Space")) lift += 1;
    if (this.keys.has("ShiftLeft") || this.keys.has("KeyQ")) lift -= 1;
    this.pitch = clamp(this.pitch + lift * 0.7 * t, 0.02, 1.25);
  },
  speed() {
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) return 1;
    return 0;
  },
  position(): [number, number, number] {
    const cp = Math.cos(this.pitch);
    return [
      Math.sin(this.yaw) * this.radius * cp,
      Math.sin(this.pitch) * this.radius,
      Math.cos(this.yaw) * this.radius * cp,
    ];
  },
};

export function resetOrbit(radius = 34) {
  orbit.yaw = 0.35;
  orbit.pitch = 0.2;
  orbit.radius = radius;
  orbit.clear();
}
