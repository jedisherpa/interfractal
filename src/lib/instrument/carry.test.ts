import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WorkshopDirector } from "../../workshop/director.ts";
import { isSettled, pickEnding, wellnessHeld } from "./carry.ts";
import { endingCaption, PULSE_MS, WELLNESS_IDS, type WellnessId } from "./cosmology.ts";

function emptyAligned(): Record<WellnessId, boolean> {
  return Object.fromEntries(WELLNESS_IDS.map((id) => [id, false])) as Record<WellnessId, boolean>;
}

function seal(dir: WorkshopDirector, vertex: "V0" | "V1" | "V2" | "V3") {
  dir.explore(vertex);
  dir.review(vertex);
  for (const name of ["Maya", "Finn", "Bea"]) dir.consent(vertex, name, true);
  assert.equal(dir.commit(vertex), true);
}

describe("carry math", () => {
  it("does not treat Ready as settled", () => {
    const dir = new WorkshopDirector();
    dir.setReady("V1", "Maya", true);
    assert.equal(isSettled(dir, "V1"), false);
  });

  it("copy-preview does not settle the destination", () => {
    const dir = new WorkshopDirector();
    seal(dir, "V0");
    dir.copyPreview("V0", "V1");
    assert.equal(isSettled(dir, "V1"), false);
    const frame = dir.frame("V1");
    assert.ok(frame.participants.every((p) => p.response === "unset"));
  });

  it("unheld eight dimensions is clusterfuck, not P0", () => {
    const dir = new WorkshopDirector();
    assert.equal(pickEnding(dir, emptyAligned(), 0), "clusterfuck");
  });

  it("thin explored Self without seats is P0 vapor, not clusterfuck", () => {
    const dir = new WorkshopDirector();
    dir.explore("V0");
    assert.equal(pickEnding(dir, emptyAligned(), 0), "P0");
  });

  it("held eight plus time is P1 when lower worlds are empty", () => {
    const dir = new WorkshopDirector();
    const all = Object.fromEntries(WELLNESS_IDS.map((id) => [id, true])) as Record<WellnessId, boolean>;
    assert.equal(wellnessHeld(all, 8000), true);
    assert.equal(pickEnding(dir, all, 8000), "P1");
  });

  it("settled Tribe dominates Self beliefs", () => {
    const dir = new WorkshopDirector();
    seal(dir, "V1");
    const all = Object.fromEntries(WELLNESS_IDS.map((id) => [id, true])) as Record<WellnessId, boolean>;
    assert.equal(pickEnding(dir, all, 8000), "P2");
  });

  it("unearned Cloud Nine is not labeled Clusterfuck", () => {
    assert.equal(endingCaption("clusterfuck", "C9"), "Unearned sky · no fiber yet");
    assert.match(endingCaption("clusterfuck", "W1"), /Clusterfuck/);
    assert.match(endingCaption("P1", "W1"), /Self/);
  });

  it("hole/light pulse stays at or under 0.75 Hz", () => {
    assert.ok(PULSE_MS >= 1334);
  });
});
