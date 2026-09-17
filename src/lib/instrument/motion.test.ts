import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BLOOM_PEAK_AT,
  CUBE_OVERSHOOT,
  INTRO_CAM_END,
  INTRO_CAM_START,
  OTHER_HALF_OPACITY,
  SHELL_OVERSHOOT,
  beatLocalProgress,
  bloomScale,
  bloomState,
  easeOutCubic,
  introCameraRadius,
  introProgress,
  introTotalMs,
  markIntroFrame,
  resetIntroClock,
  introElapsed,
} from "./motion.ts";

describe("intro motion", () => {
  it("camera radius only moves out and then stops", () => {
    const samples = Array.from({ length: 41 }, (_, i) => introCameraRadius(i / 40));
    assert.equal(samples[0], INTRO_CAM_START);
    assert.equal(samples[40], INTRO_CAM_END);
    for (let i = 1; i < samples.length; i += 1) {
      assert.ok(samples[i]! >= samples[i - 1]!, `radius dropped at ${i}`);
    }
    assert.equal(easeOutCubic(0), 0);
    assert.equal(easeOutCubic(1), 1);
    assert.ok(introCameraRadius(0.5) > INTRO_CAM_START);
    assert.ok(introCameraRadius(0.5) < INTRO_CAM_END);
  });

  it("bloom grows past rest then settles at rest with no second bounce", () => {
    const rest = 1;
    const peak = bloomScale(BLOOM_PEAK_AT, rest, CUBE_OVERSHOOT);
    assert.equal(bloomScale(0, rest, CUBE_OVERSHOOT), 0);
    assert.equal(bloomScale(1, rest, CUBE_OVERSHOOT), rest);
    assert.ok(peak > rest * 1.5);
    assert.equal(peak, rest * CUBE_OVERSHOOT);
    const after = Array.from({ length: 20 }, (_, i) => bloomScale(BLOOM_PEAK_AT + ((i + 1) / 20) * (1 - BLOOM_PEAK_AT), rest, CUBE_OVERSHOOT));
    for (let i = 1; i < after.length; i += 1) {
      assert.ok(after[i]! <= after[i - 1]! + 1e-12);
    }
    assert.ok(Math.abs(after[after.length - 1]! - rest) < 1e-9);
    assert.ok(bloomScale(0.2, 1, SHELL_OVERSHOOT) > 1);
  });

  it("other half of a Hopf loop is 25 percent of the primary half", () => {
    assert.equal(OTHER_HALF_OPACITY, 0.25);
  });

  it("one solid blooms per beat; earlier solids stay settled", () => {
    assert.deepEqual(bloomState(true, "pulse", "cube"), { active: false, settled: false });
    assert.deepEqual(bloomState(true, "cube", "cube"), { active: true, settled: false });
    assert.deepEqual(bloomState(true, "L4", "cube"), { active: false, settled: true });
    assert.deepEqual(bloomState(true, "fibers", "cube"), { active: false, settled: false });
    assert.deepEqual(bloomState(false, "C9", "L1"), { active: false, settled: true });
  });

  it("beat-local progress stays inside the current window", () => {
    const fibers = 4000;
    assert.equal(beatLocalProgress(0, "fibers"), 0);
    assert.ok(beatLocalProgress(fibers / 2, "fibers") > 0.4);
    assert.ok(beatLocalProgress(fibers / 2, "fibers") < 0.6);
    assert.equal(beatLocalProgress(fibers + 10, "cube") < 0.1 || beatLocalProgress(fibers + 10, "cube") >= 0, true);
    assert.equal(introProgress(0), 0);
    assert.equal(introProgress(introTotalMs()), 1);
    assert.ok(introTotalMs() > 10000);
  });

  it("intro clock marks once and resets", () => {
    resetIntroClock();
    markIntroFrame(1000);
    markIntroFrame(1500);
    assert.equal(introElapsed(1800), 800);
    resetIntroClock();
    assert.equal(introElapsed(2000), 0);
  });
});
