import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FORM_STAGES,
  FORM_WALK,
  INSIDE_R,
  ORBIT_OMEGA,
  OUTER_R,
  OUTSIDE_R,
  TORUS_R,
  TORUS_r,
  formActionLabel,
  formCaption,
  formPoint,
  nextFormStage,
  radiusXZ,
  shapeOf,
  torusPoint,
  FACE_OPACITY,
  RAINBOW,
  rainbowAt,
  EVIDENCE_STAMP,
  type FormStage,
} from "./formation.ts";

describe("formation progression", () => {
  it("names polygons from seat count, not from worlds", () => {
    assert.equal(shapeOf(3).polygon, "Triangle");
    assert.equal(shapeOf(4).polygon, "Square");
    assert.equal(shapeOf(5).polygon, "Pentagon");
    assert.equal(shapeOf(6).polygon, "Hexagon");
  });

  it("walks idle → hold; pattern and miss are human terminals", () => {
    const seen: FormStage[] = [];
    let s: FormStage = "idle";
    for (let i = 0; i < 12; i += 1) {
      seen.push(s);
      if (s === "hold") break;
      s = nextFormStage(s);
    }
    assert.deepEqual(seen, FORM_WALK);
    assert.equal(nextFormStage("hold"), "hold");
    assert.equal(nextFormStage("pattern"), "pattern");
    assert.equal(nextFormStage("miss"), "miss");
    assert.ok(FORM_STAGES.includes("miss"));
    assert.equal(formActionLabel("spokes"), "Step outside");
    assert.equal(formActionLabel("hold"), "Hold the outside");
  });

  it("roles sit on the horizontal plane inside the torus", () => {
    for (let i = 0; i < 4; i += 1) {
      const p = formPoint("roles", i, 4, 0);
      assert.equal(p[1], 0);
      assert.ok(Math.abs(radiusXZ(p) - INSIDE_R) < 1e-9);
      assert.ok(radiusXZ(p) < TORUS_R);
    }
  });

  it("lenses place people outside the torus as a polyhedron, not a flat polygon", () => {
    const ys = [0, 1, 2].map((i) => formPoint("lenses", i, 3, 0)[1]);
    assert.ok(ys.some((y) => Math.abs(y) > 0.2));
    for (let i = 0; i < 3; i += 1) {
      assert.ok(radiusXZ(formPoint("lenses", i, 3, 0)) > TORUS_R + TORUS_r * 0.5);
      assert.ok(Math.abs(radiusXZ(formPoint("lenses", i, 3, 0)) - OUTSIDE_R) < 1e-9);
    }
  });

  it("orbit stays on the torus tube and spins below 0.75 Hz", () => {
    const p = formPoint("orbit", 0, 3, 0);
    const ring = Math.hypot(p[0], p[2]);
    const v = Math.atan2(p[1], ring - TORUS_R);
    const dist = Math.hypot(ring - TORUS_R, p[1]);
    assert.ok(Math.abs(dist - TORUS_r) < 1e-6);
    assert.ok(Math.abs(v - 0.55) < 1e-6);
    assert.ok(ORBIT_OMEGA / (2 * Math.PI) < 0.75);
  });

  it("pattern rides the outer equator: on the plane, on the surface, orbiting the center", () => {
    const a = formPoint("pattern", 0, 4, 0);
    const b = formPoint("pattern", 1, 4, 0);
    const later = formPoint("pattern", 0, 4, 2.5);
    assert.equal(a[1], 0);
    assert.equal(b[1], 0);
    assert.equal(later[1], 0);
    assert.ok(Math.abs(radiusXZ(a) - OUTER_R) < 1e-9);
    assert.ok(Math.abs(radiusXZ(b) - OUTER_R) < 1e-9);
    const surface = torusPoint(0, 0);
    assert.ok(Math.abs(radiusXZ(surface) - OUTER_R) < 1e-9);
    assert.equal(surface[1], 0);
    assert.ok(Math.abs(radiusXZ(later) - OUTER_R) < 1e-9);
    assert.ok(Math.hypot(later[0] - a[0], later[2] - a[2]) > 0.4);
    assert.ok(radiusXZ(a) > TORUS_R);
    assert.ok(radiusXZ(a) < OUTSIDE_R);
  });

  it("miss stays on the table plane and drifts off the lodge", () => {
    const a = formPoint("miss", 0, 4, 0);
    const b = formPoint("miss", 0, 4, 4);
    assert.equal(a[1], 0);
    assert.equal(b[1], 0);
    assert.ok(radiusXZ(b) > radiusXZ(a));
  });

  it("one point per person — count of people is count of points", () => {
    for (let n = 3; n <= 8; n += 1) {
      const pts = Array.from({ length: n }, (_, i) => formPoint("pattern", i, n, 1));
      assert.equal(pts.length, n);
      const keys = new Set(pts.map((p) => p.map((v) => v.toFixed(4)).join(",")));
      assert.equal(keys.size, n);
    }
  });

  it("captions refuse to treat geometry as a Yes and stamp evidence", () => {
    assert.match(formCaption("roles", 3, "Plant"), /Ready is not Yes/);
    assert.match(formCaption("lenses", 3, "Plant"), /did not sign/);
    assert.match(formCaption("orbit", 3, "Plant"), /not fibers/);
    assert.match(formCaption("pattern", 3, "Plant"), /pattern is not a Yes/);
    assert.match(formCaption("pattern", 3, "Plant"), /horizontal plane/i);
    assert.match(formCaption("pattern", 3, "Plant"), /outside surface/);
    assert.match(formCaption("miss", 3, "Plant"), /miss, not a failure/);
    for (const stage of FORM_STAGES) {
      assert.ok(formCaption(stage, 4, "Plant").includes(EVIDENCE_STAMP));
    }
  });

  it("fills facets from seven rainbow colors at 25%", () => {
    assert.equal(RAINBOW.length, 7);
    assert.equal(FACE_OPACITY, 0.25);
    const seen = new Set(Array.from({ length: 7 }, (_, i) => rainbowAt(i)));
    assert.equal(seen.size, 7);
  });
});
