import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GATE_STAGES, WORLDS } from "./cosmology.ts";

describe("Whole gate", () => {
  it("names four stages around Whole", () => {
    const labels = GATE_STAGES.map((s) => s.label).sort();
    assert.deepEqual(labels, ["South", "Transcendent", "Tribe", "World"].sort());
    assert.equal(GATE_STAGES.length, 4);
  });

  it("maps South to Self, Tribe, World, Transcendent to Earth", () => {
    const byLabel = Object.fromEntries(GATE_STAGES.map((s) => [s.label, s.world]));
    assert.equal(byLabel.South, "W1");
    assert.equal(WORLDS.W1.label, "Self");
    assert.equal(byLabel.Tribe, "W2");
    assert.equal(byLabel.World, "W3");
    assert.equal(byLabel.Transcendent, "W4");
    assert.equal(WORLDS.W4.altitude, "Transcendent");
  });

  it("sits South at the bottom of the diamond", () => {
    const south = GATE_STAGES.find((s) => s.label === "South");
    const trans = GATE_STAGES.find((s) => s.label === "Transcendent");
    assert.equal(south?.angle, 90);
    assert.equal(trans?.angle, -90);
  });

  it("does not put Whole on a point — Whole is the center", () => {
    assert.ok(GATE_STAGES.every((s) => s.label !== "Whole"));
    assert.ok(GATE_STAGES.every((s) => s.world !== "C9"));
  });
});
