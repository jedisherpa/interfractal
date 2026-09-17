import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PI,
  Workshop,
  apply,
  cross,
  curvatureNumber,
  dot,
  fibre,
  gauge,
  holonomyAngle,
  hopf,
  horizontalLatitude,
  linkingNumber,
  northSection,
  southSection,
  state,
  stereographic,
  subtract,
  suggestion,
} from "./hopf.ts";

function close(a: number | number[], b: number | number[], tolerance = 1e-10) {
  const pairs = Array.isArray(a)
    ? (a as number[]).map((x, i) => [x, (b as number[])[i]!])
    : [[a as number, b as number]];
  const delta = Math.max(...pairs.map(([x, y]) => Math.abs(x - y)));
  assert.ok(delta < tolerance, `expected ${a} ≈ ${b}, delta=${delta}`);
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function ready() {
  const w = new Workshop();
  w.review({ evidence: true, authorized: true, safe: true });
  for (const p of w.proposal.participants) w.consent(p, true);
  return w;
}

describe("hopf kernel parity", () => {
  it("hopf(gauge(z,γ)) == hopf(z)", () => {
    const rng = seeded(20260913);
    for (let i = 0; i < 200; i += 1) {
      const z = state(rng() * PI, rng() * 2 * PI, rng() * 2 * PI);
      const n = hopf(z);
      close(dot(n, n), 1, 1e-10);
      close(n, hopf(gauge(z, rng() * 2 * PI)), 1e-9);
    }
  });

  it("holonomyAngle(π/3) == π/2 and return is not a reset", () => {
    const theta = PI / 3;
    close(holonomyAngle(theta), PI / 2, 1e-12);
    const start = horizontalLatitude(theta, 0);
    const finish = horizontalLatitude(theta, 1);
    close(hopf(start), hopf(finish), 1e-10);
    const gauged = gauge(start, PI / 2);
    close(
      [finish[0].re, finish[0].im, finish[1].re, finish[1].im],
      [gauged[0].re, gauged[0].im, gauged[1].re, gauged[1].im],
      1e-9,
    );
    assert.ok(Math.abs(start[0].re - finish[0].re) > 0.5);
  });

  it("curvature numerical check ≈ −1", () => {
    close(curvatureNumber(), -1, 1e-6);
  });

  it("clutching transition sS = e^{iφ} sN", () => {
    for (let j = 0; j <= 40; j += 1) {
      const phi = (2 * PI * j) / 40;
      const south = southSection(PI / 2, phi);
      const northGauged = gauge(northSection(PI / 2, phi), phi);
      close(
        [south[0].re, south[0].im, south[1].re, south[1].im],
        [northGauged[0].re, northGauged[0].im, northGauged[1].re, northGauged[1].im],
      );
    }
  });

  it("suggestion is gauge-invariant and not a grant", () => {
    const rng = seeded(77);
    const labels = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const z = state(0.2 + rng() * 2.7, rng() * 2 * PI, rng() * 2 * PI);
      labels.add(suggestion(z));
      assert.equal(suggestion(z), suggestion(gauge(z, rng() * 2 * PI)));
    }
    assert.equal(labels.size, 3);
    const w = new Workshop();
    w.explore(PI / 2, (2 * PI) / 3);
    w.proposeSuggestion();
    assert.equal(w.proposal.description, "Orchard route");
    assert.equal(w.commit(), false);
  });

  it("confidence is not a grant", () => {
    const w = new Workshop();
    w.setConfidence(1);
    assert.equal(w.commit(), false);
  });

  it("apply(explore) leaves agreement and consents unchanged", () => {
    const w = ready();
    w.commit();
    const snapshot = {
      z: w.z,
      confidence: w.confidence,
      proposal: w.proposal,
      consents: { ...w.consents },
      statements: { ...w.statements },
      objections: [...w.objections],
      history: w.history,
      agreement: w.agreement,
      evidenceVersion: w.evidenceVersion,
      authorityVersion: w.authorityVersion,
      safetyVersion: w.safetyVersion,
      repairOpen: w.repairOpen,
    };
    const out = apply(snapshot, { kind: "explore", theta: 1.1, phi: 0.4 });
    assert.equal(out.agreement, snapshot.agreement);
    assert.deepEqual(out.consents, snapshot.consents);
  });

  it("blockers prevent commit; withdraw pauses; v2 does not inherit v1 Yes", () => {
    const w = ready();
    assert.equal(w.commit(), true);
    w.withdraw("Bea");
    assert.equal(w.act(), false);
    assert.equal(w.agreement?.status, "paused");
    assert.equal(w.repairOpen, true);

    const w2 = ready();
    w2.commit();
    w2.propose("A later orchard draft");
    assert.equal(w2.commit(), false);
    assert.ok(w2.blockers().includes("explicit current-version consent missing"));
    assert.equal(w2.act(), true);
  });

  it("stereographic pole excluded", () => {
    assert.throws(() => stereographic([{ re: 0, im: 0 }, { re: 0, im: 1 }]));
  });

  it("vector helpers", () => {
    assert.deepEqual(subtract([1, 2, 3], [1, 0, 1]), [0, 2, 2]);
    assert.equal(dot([1, 0, 0], [0, 1, 0]), 0);
    assert.deepEqual(cross([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
    assert.equal(fibre(PI / 3, 0, 12).length, 12);
  });

  it("two disjoint fibres link once", () => {
    const estimate = linkingNumber(fibre(PI / 3, 0, 48), fibre(PI / 3, (2 * PI) / 3, 48));
    assert.ok(Math.abs(Math.abs(estimate) - 1) < 0.05, String(estimate));
  });
});
