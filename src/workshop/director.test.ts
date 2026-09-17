import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hopf, state } from "./hopf.ts";
import { WorkshopDirector } from "./director.ts";
import { VERTEX_IDS } from "./types.ts";

function seal(dir: WorkshopDirector, vertex: "V0" | "V1" | "V2" | "V3") {
  dir.explore(vertex);
  dir.review(vertex);
  for (const name of ["Maya", "Finn", "Bea"]) dir.consent(vertex, name, true);
  assert.equal(dir.commit(vertex), true);
}

describe("director contracts", () => {
  it("display z ≠ protocol z until Explore copies it", () => {
    const dir = new WorkshopDirector();
    const before = hopf(dir.workshop("V0").z);
    const disp = hopf(state(dir.at("V0").display.theta, dir.at("V0").display.phi, dir.at("V0").display.gamma));
    assert.ok(Math.hypot(before[0] - disp[0], before[1] - disp[1], before[2] - disp[2]) > 1e-4);
    assert.equal(dir.at("V0").explored, false);
    dir.explore("V0");
    assert.equal(dir.at("V0").explored, true);
    const after = hopf(dir.workshop("V0").z);
    assert.ok(Math.hypot(after[0] - disp[0], after[1] - disp[1], after[2] - disp[2]) < 1e-9);
    assert.deepEqual(dir.workshop("V0").consents, {});
  });

  it("Ready is not Yes", () => {
    const dir = new WorkshopDirector();
    dir.setReady("V0", "Maya", true);
    const frame = dir.frame("V0");
    const maya = frame.participants.find((p) => p.name === "Maya")!;
    assert.equal(maya.ready, true);
    assert.equal(maya.response, "unset");
    assert.equal(dir.commit("V0"), false);
  });

  it("copy-preview does not transfer Yes", () => {
    const dir = new WorkshopDirector();
    seal(dir, "V0");
    dir.copyPreview("V0", "V1");
    const dest = dir.frame("V1");
    assert.ok(dest.proposal?.description.includes("copy-preview from V0"));
    for (const p of dest.participants) {
      assert.equal(p.response, "unset");
    }
    assert.equal(dir.commit("V1"), false);
  });

  it("four-vertex Cloud Nine predicate", () => {
    const dir = new WorkshopDirector();
    assert.equal(dir.cloudNine(true), false);
    for (const id of VERTEX_IDS) seal(dir, id);
    assert.equal(dir.tetraAlignment(), true);
    assert.equal(dir.cloudNine(false), false);
    assert.equal(dir.cloudNine(true), true);
    dir.withdraw("V2", "Finn");
    assert.equal(dir.tetraAlignment(), false);
    assert.equal(dir.cloudNine(true), false);
    const overlay = dir.overlay("V2", true, true);
    assert.ok(overlay.edges.some((e) => e.kind === "dashed-withdrawn"));
  });

  it("morph completing is not a Yes — pose is a view of facts", () => {
    const dir = new WorkshopDirector();
    const pose = dir.wellPose("V0", true, false, false);
    assert.equal(pose, "disc");
    dir.explore("V0");
    assert.equal(dir.wellPose("V0", true, false, false), "torus");
    dir.review("V0");
    assert.equal(dir.wellPose("V0", true, false, false), "hourglass");
    for (const name of ["Maya", "Finn", "Bea"]) dir.consent("V0", name, true);
    assert.equal(dir.commit("V0"), true);
    assert.equal(dir.wellPose("V0", true, true, false), "lattice");
    const maya = dir.frame("V0").participants.find((p) => p.name === "Maya")!;
    assert.equal(maya.response, "yes");
    assert.notEqual(maya.ready, true);
  });
});
