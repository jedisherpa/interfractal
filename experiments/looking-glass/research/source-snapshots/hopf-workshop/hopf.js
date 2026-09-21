/**
 * Hopf Workshop v0.2 — JavaScript port of hopf_model.py.
 * Standard-library-equivalent browser/Node math only. Teaching model, not
 * production authorization software.
 */
"use strict";

const Hopf = (() => {
  const PI = Math.PI;

  function c(re, im = 0) {
    return { re, im };
  }

  function cexp(angle) {
    return c(Math.cos(angle), Math.sin(angle));
  }

  function cmul(a, b) {
    if (typeof a === "number") return c(a * b.re, a * b.im);
    if (typeof b === "number") return c(a.re * b, a.im * b);
    return c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  }

  function conjugate(z) {
    return c(z.re, -z.im);
  }

  function abs2(z) {
    return z.re * z.re + z.im * z.im;
  }

  function state(theta, phi, gamma = 0) {
    return [
      cmul(Math.cos(theta / 2), cexp(gamma)),
      cmul(Math.sin(theta / 2), cexp(gamma - phi)),
    ];
  }

  function normSquared(z) {
    return abs2(z[0]) + abs2(z[1]);
  }

  function hopf(z) {
    if (z.length !== 2 || Math.abs(normSquared(z) - 1) > 1e-9) {
      throw new Error("The Hopf input must be a unit vector in C^2");
    }
    const w = cmul(z[0], conjugate(z[1]));
    return [2 * w.re, 2 * w.im, abs2(z[0]) - abs2(z[1])];
  }

  function gauge(z, angle) {
    const u = cexp(angle);
    return z.map((v) => cmul(u, v));
  }

  function stereographic(z) {
    const denominator = 1 - z[1].im;
    if (Math.abs(denominator) < 1e-12) {
      throw new Error("Stereographic chart excludes the projection pole");
    }
    return [z[0].re / denominator, z[0].im / denominator, z[1].re / denominator];
  }

  function northSection(theta, phi) {
    return state(theta, phi);
  }

  function southSection(theta, phi) {
    return [cmul(Math.cos(theta / 2), cexp(phi)), c(Math.sin(theta / 2))];
  }

  function horizontalLatitude(theta, progress, phi0 = 0, gamma0 = 0) {
    const phi = phi0 + 2 * PI * progress;
    const gamma = gamma0 + Math.sin(theta / 2) ** 2 * (phi - phi0);
    return state(theta, phi, gamma);
  }

  function holonomyAngle(theta) {
    return PI * (1 - Math.cos(theta));
  }

  function suggestion(z) {
    const n = hopf(z);
    const labels = ["Bridge route", "Orchard route", "Village-square display"];
    const scores = [0, 1, 2].map(
      (j) => n[0] * Math.cos((j * 2 * PI) / 3) + n[1] * Math.sin((j * 2 * PI) / 3)
    );
    const best = Math.max(...scores);
    return labels[scores.findIndex((s) => best - s < 1e-12)];
  }

  function curvatureNumber(steps = 4000) {
    const h = PI / steps;
    let total = 0;
    for (let i = 0; i < steps; i += 1) {
      total += -0.5 * Math.sin((i + 0.5) * h) * h;
    }
    return total;
  }

  function fibre(theta, phi, samples = 240) {
    const points = [];
    for (let i = 0; i < samples; i += 1) {
      points.push(stereographic(state(theta, phi, (2 * PI * i) / samples)));
    }
    return points;
  }

  function subtract(a, b) {
    return a.map((x, i) => x - b[i]);
  }

  function dot(a, b) {
    return a.reduce((sum, x, i) => sum + x * b[i], 0);
  }

  function cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  function linkingNumber(curveA, curveB) {
    function segments(curve) {
      return curve.map((p, i) => {
        const q = curve[(i + 1) % curve.length];
        return [p.map((x, k) => (x + q[k]) / 2), subtract(q, p)];
      });
    }
    let result = 0;
    for (const [midA, da] of segments(curveA)) {
      for (const [midB, db] of segments(curveB)) {
        const r = subtract(midA, midB);
        const length = Math.sqrt(dot(r, r));
        if (length < 1e-10) {
          throw new Error("Curves intersect or quadrature is singular");
        }
        result += dot(r, cross(da, db)) / length ** 3;
      }
    }
    return result / (4 * PI);
  }

  function freezeProposal(version, description, participants = ["Maya", "Finn", "Bea"]) {
    return Object.freeze({ version, description, participants: Object.freeze([...participants]) });
  }

  function freezeAgreement(proposal, status = "active", stamps = {}) {
    return Object.freeze({
      proposal,
      status,
      evidenceVersion: stamps.evidenceVersion ?? null,
      authorityVersion: stamps.authorityVersion ?? null,
      safetyVersion: stamps.safetyVersion ?? null,
    });
  }

  function freezeEvent(index, kind, version, detail) {
    return Object.freeze({ index, kind, version, detail });
  }

  function applyEvent(protocol, event) {
    const out = {
      ...protocol,
      consents: { ...protocol.consents },
      statements: { ...(protocol.statements || {}) },
      objections: [...(protocol.objections || [])],
    };
    const history = [...protocol.history];
    const version = protocol.proposal.version;
    const rec = (kind, detail, ver = version) => {
      history.push(freezeEvent(history.length, kind, ver, detail));
    };
    if (event.kind === "explore") {
      out.z = state(event.theta, event.phi, event.gamma || 0);
      rec("explore", "Changed exploratory coordinates; permissions unchanged");
    } else if (event.kind === "reframe") {
      out.z = gauge(protocol.z, event.angle);
      rec("reframe", "Changed common phase; proposal and permission unchanged");
    } else if (event.kind === "propose") {
      const next = freezeProposal(version + 1, event.description, [...protocol.proposal.participants]);
      out.proposal = next;
      rec("propose", event.description, next.version);
    } else if (event.kind === "object") {
      const id = out.objections.length + 1;
      out.objections.push(Object.freeze({
        id, actor: event.actor, text: String(event.text), open: true,
      }));
      rec("object", `${event.actor}: ${event.text}`);
    } else if (event.kind === "dispose") {
      out.objections = out.objections.map((item) => (
        item.id === event.id ? Object.freeze({ ...item, open: false }) : item
      ));
      rec("dispose", `objection ${event.id}`);
    } else if (event.kind === "correct") {
      const editor = event.editor || event.actor;
      if (editor !== event.actor) throw new Error("A contributor may only correct their own statement");
      out.statements[`${version}:${event.actor}`] = String(event.text);
      rec("correct", `${event.actor}: ${event.text}`);
    } else if (event.kind === "holonomy") {
      out.z = horizontalLatitude(event.theta, 1);
      rec("holonomy", `base returned; lift acquired ${holonomyAngle(event.theta).toFixed(6)} rad`);
    } else {
      throw new Error(`apply() does not handle ${event.kind}`);
    }
    out.history = history;
    out.agreement = protocol.agreement;
    out.consents = { ...protocol.consents };
    return out;
  }

  class Workshop {
    constructor(participants = ["Maya", "Finn", "Bea"]) {
      this.z = state(PI / 3, 0);
      this.confidence = 0.5;
      this.proposal = freezeProposal(1, "Carry the cardboard dragon over the bridge", participants);
      this.consents = {};
      this.evidenceVersion = null;
      this.authorityVersion = null;
      this.safetyVersion = null;
      this.agreement = null;
      this.repairOpen = false;
      this.statements = {};
      this.objections = [];
      this._history = [];
      this.record("propose", this.proposal.description);
    }

    get history() {
      return this._history.slice();
    }

    record(kind, detail, version = this.proposal.version) {
      this._history.push(freezeEvent(this._history.length, kind, version, detail));
    }

    explore(theta, phi, gamma = 0) {
      this.z = state(theta, phi, gamma);
      this.record("explore", "Changed exploratory coordinates; permissions unchanged");
    }

    reframe(angle) {
      this.z = gauge(this.z, angle);
      this.record("reframe", "Changed common phase; proposal and permission unchanged");
    }

    object(actor, text) {
      if (!this.proposal.participants.includes(actor)) throw new Error("Unknown participant");
      const id = this.objections.length + 1;
      this.objections = [...this.objections, Object.freeze({ id, actor, text: String(text), open: true })];
      this.record("object", `${actor}: ${text}`);
    }

    dispose(id) {
      this.objections = this.objections.map((item) => (
        item.id === id ? Object.freeze({ ...item, open: false }) : item
      ));
      this.record("dispose", `objection ${id}`);
    }

    correct(actor, text, editor = actor) {
      if (!this.proposal.participants.includes(actor)) throw new Error("Unknown participant");
      if (editor !== actor) throw new Error("A contributor may only correct their own statement");
      this.statements[`${this.proposal.version}:${actor}`] = String(text);
      this.record("correct", `${actor}: ${text}`);
    }

    holonomy(theta) {
      this.z = horizontalLatitude(theta, 1);
      this.record("holonomy", `base returned; lift acquired ${holonomyAngle(theta).toFixed(6)} rad`);
    }

    setConfidence(value) {
      if (!(value >= 0 && value <= 1)) {
        throw new Error("Confidence must be between zero and one");
      }
      this.confidence = value;
      this.record("belief", String(value));
    }

    propose(description) {
      this.proposal = freezeProposal(this.proposal.version + 1, description, [...this.proposal.participants]);
      this.record("propose", description);
    }

    proposeSuggestion() {
      this.propose(suggestion(this.z));
    }

    consent(actor, answer) {
      if (!this.proposal.participants.includes(actor)) {
        throw new Error("Unknown participant");
      }
      if (typeof answer !== "boolean") {
        throw new Error("Consent must be an explicit Boolean");
      }
      this.consents[`${this.proposal.version}:${actor}`] = answer;
      this.record("consent", `${actor}: ${answer ? "True" : "False"}`);
      if (
        !answer &&
        this.agreement &&
        this.agreement.status === "active" &&
        this.agreement.proposal.version === this.proposal.version
      ) {
        this.withdraw(actor);
      }
    }

    withdraw(actor) {
      if (
        !this.agreement ||
        this.agreement.status !== "active" ||
        !this.agreement.proposal.participants.includes(actor)
      ) {
        throw new Error("No applicable agreement");
      }
      const version = this.agreement.proposal.version;
      this.consents[`${version}:${actor}`] = false;
      this.agreement = freezeAgreement(this.agreement.proposal, "paused", this.agreement);
      this.repairOpen = true;
      this.record(
        "withdraw",
        `${actor} stopped participation in agreement v${version}; repair discussion needed`,
        version
      );
    }

    review({ evidence = false, authorized = false, safe = false } = {}) {
      const v = this.proposal.version;
      this.evidenceVersion = evidence ? v : null;
      this.authorityVersion = authorized ? v : null;
      this.safetyVersion = safe ? v : null;
      this.record("review", `evidence=${evidence}, authority=${authorized}, safe=${safe}`);
    }

    blockers() {
      const v = this.proposal.version;
      const reasons = [];
      if (this.evidenceVersion !== v) reasons.push("bounded test not passed");
      if (this.authorityVersion !== v) reasons.push("required authority missing");
      if (this.safetyVersion !== v) reasons.push("safety check missing or blocked");
      if (this.proposal.participants.some((person) => this.consents[`${v}:${person}`] !== true)) {
        reasons.push("explicit current-version consent missing");
      }
      if (this.repairOpen) reasons.push("previous consequences need an agreed response");
      if (this.objections.some((item) => item.open)) reasons.push("open objection blocks disposition, not existence");
      if (
        this.agreement &&
        this.agreement.status === "active" &&
        this.agreement.proposal.version !== v
      ) {
        reasons.push("existing agreement must be resolved, not silently replaced");
      }
      if (
        this.agreement &&
        this.agreement.status === "retired" &&
        this.agreement.proposal.version === v
      ) {
        reasons.push("retired agreement cannot be revived in place");
      }
      return reasons;
    }

    commit() {
      const reasons = this.blockers();
      if (reasons.length) {
        this.record("blocked", reasons.join("; "));
        return false;
      }
      this.agreement = freezeAgreement(this.proposal, "active", {
        evidenceVersion: this.evidenceVersion,
        authorityVersion: this.authorityVersion,
        safetyVersion: this.safetyVersion,
      });
      this.record("commit", this.proposal.description);
      return true;
    }

    actionBlockers() {
      if (!this.agreement || this.agreement.status !== "active") {
        return ["No valid, current, active agreement"];
      }
      const version = this.agreement.proposal.version;
      if (this.agreement.proposal.participants.some((person) => this.consents[`${version}:${person}`] !== true)) {
        return ["No valid, current, active agreement"];
      }
      let evidence;
      let authority;
      let safety;
      if (this.proposal.version === version) {
        evidence = this.evidenceVersion;
        authority = this.authorityVersion;
        safety = this.safetyVersion;
      } else {
        evidence = this.agreement.evidenceVersion;
        authority = this.agreement.authorityVersion;
        safety = this.agreement.safetyVersion;
      }
      if (evidence !== version || authority !== version || safety !== version) {
        return ["Current checks no longer match the live agreement"];
      }
      return [];
    }

    act() {
      const reasons = this.actionBlockers();
      if (reasons.length) {
        this.record("blocked_action", reasons.join("; "));
        return false;
      }
      const version = this.agreement.proposal.version;
      this.record("simulated_action", this.agreement.proposal.description, version);
      return true;
    }

    resolveRepair(response) {
      if (!String(response).trim()) {
        throw new Error("Record the agreed response");
      }
      this.repairOpen = false;
      this.record("repair", response);
    }

    release(reason) {
      if (!String(reason).trim() || this.repairOpen) return false;
      if (this.agreement) {
        this.agreement = freezeAgreement(this.agreement.proposal, "retired", this.agreement);
      }
      this.record("release", reason);
      return true;
    }
  }

  return {
    PI,
    state,
    normSquared,
    hopf,
    gauge,
    stereographic,
    northSection,
    southSection,
    horizontalLatitude,
    holonomyAngle,
    suggestion,
    curvatureNumber,
    fibre,
    subtract,
    dot,
    cross,
    linkingNumber,
    Workshop,
    apply: applyEvent,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = Hopf;
}
if (typeof window !== "undefined") window.Hopf = Hopf;
