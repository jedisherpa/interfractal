import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHILD_SCALE,
  CUBOCTA,
  GATES,
  INV_SQRT3,
  PHI,
  TETRA,
  WELLS,
  wellClearsGates,
} from "./geometry.ts";
import { VERTEX_IDS } from "./types.ts";

describe("DEC-VP-01 tetra and well offsets", () => {
  it("tetra coords match ( ±1, ±1, ±1 ) / √3", () => {
    assert.deepEqual([...TETRA.V0], [INV_SQRT3, INV_SQRT3, INV_SQRT3]);
    assert.deepEqual([...TETRA.V1], [INV_SQRT3, -INV_SQRT3, -INV_SQRT3]);
    assert.deepEqual([...TETRA.V2], [-INV_SQRT3, INV_SQRT3, -INV_SQRT3]);
    assert.deepEqual([...TETRA.V3], [-INV_SQRT3, -INV_SQRT3, INV_SQRT3]);
    for (const id of VERTEX_IDS) {
      const v = TETRA[id];
      assert.ok(Math.abs(Math.hypot(v[0], v[1], v[2]) - 1) < 1e-12);
    }
  });

  it("φ child scale is 1/φ", () => {
    assert.ok(Math.abs(CHILD_SCALE - 1 / PHI) < 1e-15);
    assert.ok(Math.abs(PHI - (1 + Math.sqrt(5)) / 2) < 1e-15);
  });

  it("exactly four wells, each outside existing gate radii", () => {
    assert.equal(WELLS.length, 4);
    for (const well of WELLS) {
      assert.ok(wellClearsGates(well), `${well.id} sits inside a gate`);
    }
    const cube = GATES.find((g) => g.id === "garden_to_forest")!;
    const garden = WELLS.find((w) => w.id === "decision_well_V0")!;
    assert.ok(
      Math.hypot(
        garden.position.x - cube.position.x,
        garden.position.y - cube.position.y,
        garden.position.z - cube.position.z,
      ) > cube.radius,
    );
  });

  it("VE is 12-around-1", () => {
    assert.equal(CUBOCTA.length, 12);
  });
});
