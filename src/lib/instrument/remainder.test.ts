import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { nextFormStage, formPoint, formCaption } from "./formation.ts";
import { OTHER_HALF_OPACITY } from "./motion.ts";
import { remainderOf, remainderOpen, type RemainderInput } from "./remainder.ts";

const room = readFileSync(new URL("../../components/instrument/room-scene.tsx", import.meta.url), "utf8");

function base(over: Partial<RemainderInput> = {}): RemainderInput {
  return {
    phase: "room",
    formStage: "idle",
    wellOpen: false,
    cyclePlaying: false,
    reducedMotion: false,
    ...over,
  };
}

describe("remainder", () => {
  it("intro+idle stays open because skip and reduce-motion are live", () => {
    const input = base({ phase: "intro", formStage: "idle" });
    const acts = remainderOf(input);
    assert.ok(acts.includes("skip"));
    assert.ok(acts.includes("reduce-motion"));
    assert.equal(remainderOpen(input), true);
  });

  it("hold includes stay, commit, and miss", () => {
    const acts = remainderOf(base({ formStage: "hold" }));
    assert.ok(acts.includes("stay"));
    assert.ok(acts.includes("commit"));
    assert.ok(acts.includes("miss"));
    assert.equal(remainderOpen(base({ formStage: "hold" })), true);
  });

  it("idle excludes commit and miss", () => {
    const acts = remainderOf(base({ formStage: "idle" }));
    assert.equal(acts.includes("commit"), false);
    assert.equal(acts.includes("miss"), false);
  });

  it("cycle playing at hold does not remove stay, commit, miss", () => {
    const acts = remainderOf(base({ formStage: "hold", cyclePlaying: true }));
    assert.ok(acts.includes("stay"));
    assert.ok(acts.includes("commit"));
    assert.ok(acts.includes("miss"));
  });

  it("a sitting table cannot empty the remainder", () => {
    for (const stage of ["goal", "orbit", "roles", "spokes", "lenses", "hold", "pattern", "miss"] as const) {
      assert.equal(remainderOpen(base({ formStage: stage })), true);
    }
  });

  it("keeps the walk lock and dim-half constant", () => {
    assert.equal(nextFormStage("hold"), "hold");
    assert.equal(OTHER_HALF_OPACITY, 0.25);
  });

  it("people are points: formPoint returns a triple, not a tube", () => {
    const p = formPoint("hold", 0, 4, 1);
    assert.equal(p.length, 3);
    assert.equal(typeof p[0], "number");
    assert.equal(typeof p[1], "number");
    assert.equal(typeof p[2], "number");
  });

  it("miss caption is a miss, not a failure", () => {
    assert.match(formCaption("miss", 4, "Plant"), /miss, not a failure/);
  });

  it("CycleDriver tours worlds and does not mint pattern or miss", () => {
    assert.match(room, /function CycleDriver/);
    assert.equal(room.includes("tableCommit"), false);
    assert.equal(room.includes("nameNotFit"), false);
    assert.equal(room.includes("advanceForm"), false);
  });
});
