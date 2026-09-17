import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EVIDENCE_STAMP,
  SEAT_NAMES,
  TABLE_AXES,
  TABLE_LEVELS,
  chamberKind,
  commuteClean,
  confirmedCount,
  copyIsClean,
  fiberOffset,
  findContradictions,
  goldAllowed,
  lodgeEdge,
  makeSeats,
  poseOf,
  preClipMagnitude,
  revealCaption,
  shouldRing,
  stamp,
  starTetraEligible,
  withRecord,
  yesCount,
} from "./table.ts";
import { FORM_STAGES, formCaption } from "./formation.ts";

describe("intention table", () => {
  it("locks the eight approved axis names", () => {
    assert.deepEqual([...TABLE_AXES], [
      "purpose",
      "scope",
      "timing",
      "resources",
      "risk",
      "care",
      "authority",
      "completion",
    ]);
    assert.deepEqual([...TABLE_LEVELS], ["self", "tribe", "world", "transcendent"]);
  });

  it("defaults four seats Maya Finn Bea Sam, none Yes", () => {
    const seats = makeSeats(4);
    assert.deepEqual(
      seats.map((s) => s.name),
      ["Maya", "Finn", "Bea", "Sam"],
    );
    assert.equal(yesCount(seats), 0);
    assert.equal(SEAT_NAMES[3], "Sam");
  });

  it("N is who Yes’d — 3 of 4 draws a gap, not a closed square", () => {
    const yes = [true, true, true, false];
    assert.equal(lodgeEdge(yes, 0), true);
    assert.equal(lodgeEdge(yes, 1), true);
    assert.equal(lodgeEdge(yes, 2), false);
    assert.equal(lodgeEdge(yes, 3), false);
    assert.equal(yes.filter(Boolean).length, 3);
  });

  it("stamps evidence and never treats the picture as a Yes", () => {
    const line = stamp("Roles on the plane.");
    assert.ok(line.includes(EVIDENCE_STAMP));
    assert.match(line, /not a Yes/i);
    assert.equal(stamp(line), line);
  });

  it("Maya’s Self yes fights her Tribe role on authority — split, not an average", () => {
    const seats = makeSeats(4).map((s, i) => (i === 0 ? { ...s, yesOnGoal: true } : s));
    const marks = findContradictions(seats);
    assert.ok(marks.some((m) => m.kind === "cross-level" && m.axis === "authority"));
    assert.match(marks[0]!.caption, /Maya.*authority/);
    assert.equal(commuteClean(seats), false);
    assert.equal(goldAllowed(seats, true), false);
    assert.equal(starTetraEligible(seats), false);
  });

  it("chamber is a calendar: 6 tetra, 8 octa, 12 icosa — icosa never fills gold", () => {
    assert.equal(chamberKind(5), "none");
    assert.equal(chamberKind(6), "tetra");
    assert.equal(chamberKind(8), "octa");
    assert.equal(chamberKind(12), "icosa");
  });

  it("records count only Yes’d seats; Finn vs Bea on purpose is vow-vs-vow", () => {
    let seats = makeSeats(4).map((s, i) => (i < 3 ? { ...s, yesOnGoal: true } : s));
    seats = withRecord(seats, 0);
    assert.equal(confirmedCount(seats), 3);
    const vows = findContradictions(seats).filter((m) => m.kind === "vow-vs-vow");
    assert.ok(vows.some((m) => m.axis === "purpose"));
  });

  it("fiber weather offsets off-plane; the plan heading is independent", () => {
    const off = fiberOffset(1, 0, 0.4);
    assert.ok(Math.abs(off[1]) > 0.05);
    const still = fiberOffset(0, 0, 0.4);
    assert.equal(still[1], 0);
  });

  it("pose flip with a short trail rings; a long smear does not", () => {
    assert.equal(shouldRing("in", "out", 2), true);
    assert.equal(shouldRing("in", "out", 20), false);
    assert.equal(shouldRing("in", "in", 1), false);
    assert.equal(poseOf("roles"), "in");
    assert.equal(poseOf("lenses"), "out");
  });

  it("reveal captions never grant Yes; formation copy is purged", () => {
    const line = revealCaption({
      ringing: true,
      weather: false,
      contradiction: null,
      confirmedCount: 8,
      commute: false,
      committed: false,
    });
    assert.match(line ?? "", /ringing/);
    assert.ok((line ?? "").includes(EVIDENCE_STAMP));
    for (const stage of FORM_STAGES) {
      const cap = formCaption(stage, 4, "Plant");
      assert.equal(copyIsClean(cap), true, cap);
    }
  });

  it("pre-clip magnitude is strength, not heading", () => {
    const seats = makeSeats(4);
    const maya = seats[0]!;
    const mag = preClipMagnitude(maya, "self");
    assert.ok(mag > 0.5);
  });
});
