/**
 * Intention Abacus mathematical model, ported from jedisherpa/intention-abacus
 * (math.ts, cdiss.ts, levels.ts, solids.ts, store.ts).
 * Topology does not authorize. Conversation continuity cannot grant.
 */
"use strict";

const Abacus = (() => {
  const HopfLib = typeof Hopf !== "undefined" ? Hopf : require("./hopf.js");
  const PI = Math.PI;
  const VECTOR_DIM = 8;
  const BASE_SHIFT_THRESHOLD = 0.12;
  const CALL_TOOL_THRESHOLD = 0.2;
  const APPROVAL_RISK_THRESHOLD = 0.55;
  const BLOCK_RISK_THRESHOLD = 0.9;
  const OSCILLATION_EPSILON = 0.06;
  const CONVERGENCE_WINDOW = 4;
  const CONTINUITY_MEMORY_WEIGHT = 0.45;
  const CDISS_AUTHORITY_INVARIANT =
    "Conversation continuity cannot grant approval; explicit user approval is required before material work runs.";

  function sph(x, y, z) {
    return {
      theta: Math.acos(Math.max(-1, Math.min(1, z))),
      phi: Math.atan2(y, x),
    };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpAngle(a, b, t) {
    let d = ((b - a + PI) % (PI * 2)) - PI;
    if (d < -PI) d += PI * 2;
    return a + d * t;
  }

  function stereographicOrNull(z) {
    const denominator = 1 - z[1].im;
    if (Math.abs(denominator) < 1e-12) return null;
    return [z[0].re / denominator, z[0].im / denominator, z[1].re / denominator];
  }

  function fibreSafe(theta, phi, samples) {
    const n = samples == null ? 160 : samples;
    const points = [];
    let skipped = 0;
    for (let i = 0; i <= n; i += 1) {
      const p = stereographicOrNull(HopfLib.state(theta, phi, (2 * PI * i) / n));
      if (p) points.push(p);
      else skipped += 1;
    }
    return { points, skipped };
  }

  const SCALE = 0.92;
  const INV_SQRT3 = 1 / Math.sqrt(3);
  const TETRA_UNIT = [
    [INV_SQRT3, INV_SQRT3, INV_SQRT3],
    [INV_SQRT3, -INV_SQRT3, -INV_SQRT3],
    [-INV_SQRT3, INV_SQRT3, -INV_SQRT3],
    [-INV_SQRT3, -INV_SQRT3, INV_SQRT3],
  ];

  function zeros() {
    return [0, 0, 0, 0, 0, 0, 0, 0];
  }

  function emptyState() {
    return {
      intent: zeros(),
      topic: zeros(),
      emotional_state: zeros(),
      agreement_state: zeros(),
      temporal_scope: zeros(),
      relational_posture: zeros(),
      authority_level: 0,
      clarity: 0,
      urgency: 0,
      memory_relevance: 0,
      task_readiness: 0,
      governance_risk: 0,
      completion_state: 0,
    };
  }

  function hashedProjection(text) {
    const out = zeros();
    if (!String(text).trim()) return out;
    const bytes = [...String(text)].map((ch) => ch.charCodeAt(0) & 255);
    for (let i = 0; i < bytes.length; i += 1) {
      const signed = i % 2 === 0 ? 1 : -1;
      out[i % VECTOR_DIM] += signed * (bytes[i] / 255);
    }
    normalizeSubspace(out);
    return out;
  }

  function normalizeSubspace(v) {
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    if (norm > 1) {
      for (let i = 0; i < VECTOR_DIM; i += 1) v[i] /= norm;
    }
    return v;
  }

  function scaleSubspace(v, scalar) {
    return v.map((x) => x * scalar);
  }

  function addWeighted(target, source, weight) {
    for (let i = 0; i < VECTOR_DIM; i += 1) target[i] += source[i] * weight;
  }

  function distanceSubspace(a, b) {
    let sum = 0;
    for (let i = 0; i < VECTOR_DIM; i += 1) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
  }

  function clamp01(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.min(1, Math.max(0, n));
  }

  function cloneState(s) {
    return {
      intent: s.intent.slice(),
      topic: s.topic.slice(),
      emotional_state: s.emotional_state.slice(),
      agreement_state: s.agreement_state.slice(),
      temporal_scope: s.temporal_scope.slice(),
      relational_posture: s.relational_posture.slice(),
      authority_level: s.authority_level,
      clarity: s.clarity,
      urgency: s.urgency,
      memory_relevance: s.memory_relevance,
      task_readiness: s.task_readiness,
      governance_risk: s.governance_risk,
      completion_state: s.completion_state,
    };
  }

  function scaled(s, scalar) {
    const out = cloneState(s);
    out.intent = scaleSubspace(out.intent, scalar);
    out.topic = scaleSubspace(out.topic, scalar);
    out.emotional_state = scaleSubspace(out.emotional_state, scalar);
    out.agreement_state = scaleSubspace(out.agreement_state, scalar);
    out.temporal_scope = scaleSubspace(out.temporal_scope, scalar);
    out.relational_posture = scaleSubspace(out.relational_posture, scalar);
    out.authority_level *= scalar;
    out.clarity *= scalar;
    out.urgency *= scalar;
    out.memory_relevance *= scalar;
    out.task_readiness *= scalar;
    out.governance_risk *= scalar;
    out.completion_state *= scalar;
    return out;
  }

  function addWeightedState(target, other, weight) {
    addWeighted(target.intent, other.intent, weight);
    addWeighted(target.topic, other.topic, weight);
    addWeighted(target.emotional_state, other.emotional_state, weight);
    addWeighted(target.agreement_state, other.agreement_state, weight);
    addWeighted(target.temporal_scope, other.temporal_scope, weight);
    addWeighted(target.relational_posture, other.relational_posture, weight);
    target.authority_level += other.authority_level * weight;
    target.clarity += other.clarity * weight;
    target.urgency += other.urgency * weight;
    target.memory_relevance += other.memory_relevance * weight;
    target.task_readiness += other.task_readiness * weight;
    target.governance_risk += other.governance_risk * weight;
    target.completion_state += other.completion_state * weight;
  }

  function normalizeState(s) {
    normalizeSubspace(s.intent);
    normalizeSubspace(s.topic);
    normalizeSubspace(s.emotional_state);
    normalizeSubspace(s.agreement_state);
    normalizeSubspace(s.temporal_scope);
    normalizeSubspace(s.relational_posture);
    s.authority_level = clamp01(s.authority_level);
    s.clarity = clamp01(s.clarity);
    s.urgency = clamp01(s.urgency);
    s.memory_relevance = clamp01(s.memory_relevance);
    s.task_readiness = clamp01(s.task_readiness);
    s.governance_risk = clamp01(s.governance_risk);
    s.completion_state = clamp01(s.completion_state);
  }

  function hasActionIntent(signal) {
    if (signal.requiredAction === "store" || signal.requiredAction === "escalate") return true;
    if (signal.requiredAction === "clarify") return false;
    const text = `${signal.label} ${signal.evidence}`.toLowerCase();
    if (text.includes("clarif") || text.includes("route_hint")) return false;
    return ["search", "run", "write", "send", "delete", "create", "generate", "build", "act", "carry"].some(
      (n) => text.includes(n)
    );
  }

  function parserContribution(signals) {
    const out = emptyState();
    if (!signals.length) {
      out.clarity = 0.25;
      return out;
    }
    let confidenceSum = 0;
    let requiredClarify = 0;
    for (const signal of signals) {
      const strength = clamp01(signal.strength);
      const confidence = clamp01(signal.confidence);
      confidenceSum += confidence;
      addWeighted(out.intent, hashedProjection(signal.label), strength);
      addWeighted(out.topic, hashedProjection(signal.evidence), confidence);
      if (hasActionIntent(signal)) {
        out.task_readiness += strength * confidence;
        out.task_readiness = Math.max(out.task_readiness, 0.9 * confidence);
      }
      out.urgency += strength * clamp01(signal.volatility);
      if (signal.requiredAction === "clarify") requiredClarify += 1;
    }
    const n = signals.length;
    out.clarity = clamp01(confidenceSum / n);
    out.governance_risk = clamp01(requiredClarify / n) * 0.25;
    out.task_readiness = clamp01(out.task_readiness / n);
    normalizeState(out);
    return out;
  }

  function memoryContribution(signals) {
    const out = emptyState();
    if (!signals.length) return out;
    let relevance = 0;
    for (const signal of signals) {
      const score = clamp01(signal.relevance);
      const effective = signal.continuityOnly ? score * CONTINUITY_MEMORY_WEIGHT : score;
      relevance += effective;
      const proj = hashedProjection(signal.text);
      addWeighted(out.topic, proj, effective);
      addWeighted(out.temporal_scope, proj, effective * 0.5);
      addWeighted(out.relational_posture, proj, signal.continuityOnly ? effective * 1.25 : effective * 0.35);
      addWeighted(out.emotional_state, proj, effective * 0.4);
    }
    out.memory_relevance = clamp01(relevance / signals.length);
    out.task_readiness = 0;
    out.clarity = out.memory_relevance * 0.6;
    normalizeState(out);
    return out;
  }

  function agreementContribution(signals) {
    const out = emptyState();
    const live = signals.filter((s) => s.active);
    if (!live.length) return out;
    let authority = 0;
    let confidence = 0;
    for (const signal of live) {
      const c = clamp01(signal.confidence);
      authority += clamp01(signal.authorityGranted);
      confidence += c;
      const proj = hashedProjection(signal.claim);
      addWeighted(out.agreement_state, proj, c);
      addWeighted(out.intent, proj, c * 0.35);
    }
    out.authority_level = clamp01(authority / live.length);
    out.clarity = clamp01(confidence / live.length);
    normalizeState(out);
    return out;
  }

  function toBase(s) {
    return {
      intent: s.intent.slice(),
      topic: s.topic.slice(),
      authority_level: s.authority_level,
      clarity: s.clarity,
      memory_relevance: s.memory_relevance,
      task_readiness: s.task_readiness,
      governance_risk: s.governance_risk,
      completion_state: s.completion_state,
    };
  }

  function toFiber(s) {
    return {
      emotional_state: s.emotional_state.slice(),
      relational_posture: s.relational_posture.slice(),
      temporal_scope: s.temporal_scope.slice(),
      urgency: s.urgency,
    };
  }

  function baseDistance(a, b) {
    let sum = distanceSubspace(a.intent, b.intent) ** 2;
    sum += distanceSubspace(a.topic, b.topic) ** 2;
    sum += (a.authority_level - b.authority_level) ** 2;
    sum += (a.clarity - b.clarity) ** 2;
    sum += (a.memory_relevance - b.memory_relevance) ** 2;
    sum += (a.task_readiness - b.task_readiness) ** 2;
    sum += (a.governance_risk - b.governance_risk) ** 2;
    sum += (a.completion_state - b.completion_state) ** 2;
    return Math.sqrt(sum);
  }

  function fiberDistance(a, b) {
    let sum = distanceSubspace(a.emotional_state, b.emotional_state) ** 2;
    sum += distanceSubspace(a.relational_posture, b.relational_posture) ** 2;
    sum += distanceSubspace(a.temporal_scope, b.temporal_scope) ** 2;
    sum += (a.urgency - b.urgency) ** 2;
    return Math.sqrt(sum);
  }

  function stateDistance(a, b) {
    return Math.sqrt(baseDistance(toBase(a), toBase(b)) ** 2 + fiberDistance(toFiber(a), toFiber(b)) ** 2);
  }

  function actionSignature(a) {
    return `r${+a.respond}:q${+a.askClarification}:t${+a.callTool}:h${+a.executeHighRisk}:a${+a.materialRequireApproval}:f${+a.forceClarification}:b${+a.blocked}`;
  }

  function projectActions(state, ctx) {
    const allowed = {
      respond: true,
      askClarification: state.clarity < 0.45,
      callTool: state.task_readiness >= CALL_TOOL_THRESHOLD,
      executeHighRisk: false,
      materialRequireApproval: false,
      forceClarification: false,
      blocked: false,
      reasons: [],
    };
    if (!ctx.validatedIdentity) {
      allowed.blocked = true;
      allowed.callTool = false;
      allowed.reasons.push("validated identity context missing");
    }
    if (ctx.pendingApprovals > 0 && allowed.callTool) {
      allowed.callTool = false;
      allowed.materialRequireApproval = true;
      allowed.reasons.push("pending approvals constrain new action routing");
    }
    if (ctx.highRiskAvailable && state.authority_level > 0.85 && state.governance_risk < 0.35) {
      allowed.executeHighRisk = true;
      allowed.materialRequireApproval = true;
    }
    if (state.governance_risk >= BLOCK_RISK_THRESHOLD) {
      allowed.blocked = true;
      allowed.callTool = false;
      allowed.executeHighRisk = false;
      allowed.reasons.push("governance risk exceeded CDISS block threshold");
    } else if (state.governance_risk >= APPROVAL_RISK_THRESHOLD) {
      allowed.materialRequireApproval = true;
      allowed.callTool = false;
      allowed.reasons.push("governance risk requires human approval");
    }
    if (state.clarity < 0.25) {
      allowed.askClarification = true;
      allowed.callTool = false;
      allowed.reasons.push("low clarity requires clarification before action");
    }
    return allowed;
  }

  function detectOscillation(stateDelta, history, previousSig, nextSig) {
    const smallMoveFlip = previousSig !== null && stateDelta < OSCILLATION_EPSILON && previousSig !== nextSig;
    const window = Math.max(CONVERGENCE_WINDOW, 2);
    let revisit = false;
    if (history.length >= window) {
      for (let i = 0; i < history.length; i += 1) {
        for (let k = i + 2; k < history.length; k += 1) {
          if (history[i] === history[k] && history.slice(i + 1, k).some((s) => s !== history[i])) {
            revisit = true;
          }
        }
      }
    }
    return smallMoveFlip || (revisit && nextSig !== previousSig);
  }

  const DEFAULT_CONFIG = {
    alpha: 0.82,
    parserWeight: 0.28,
    memoryWeight: 0.32,
    agreementWeight: 0.4,
    ambiguityPenalty: 0.22,
    routeConflictPenalty: 0.25,
    governanceRiskPenalty: 0.35,
    invariantPenalty: 0.5,
  };

  function transition(input, config) {
    const cfg = config || DEFAULT_CONFIG;
    const previousState = (input.previous && input.previous.state) || emptyState();
    const raw = scaled(previousState, cfg.alpha);
    addWeightedState(raw, parserContribution(input.parser), cfg.parserWeight);
    addWeightedState(raw, memoryContribution(input.memory), cfg.memoryWeight);
    addWeightedState(raw, agreementContribution(input.agreements), cfg.agreementWeight);

    let ambiguity = 0;
    if (input.parser.length > 1) {
      const avg = input.parser.reduce((s, p) => s + clamp01(p.confidence), 0) / input.parser.length;
      ambiguity = clamp01(1 - avg);
    }
    let routeConflict = 0;
    if (input.pendingApprovals > 0) routeConflict = 0.35;
    let invariantPressure = input.validatedIdentity ? 0 : 1;
    let gov = input.highRiskAvailable ? 0.25 : 0;
    raw.clarity -= ambiguity * cfg.ambiguityPenalty;
    raw.task_readiness -= routeConflict * cfg.routeConflictPenalty;
    raw.governance_risk += gov * cfg.governanceRiskPenalty;
    raw.governance_risk += invariantPressure * cfg.invariantPenalty;
    normalizeState(raw);

    const base = toBase(raw);
    const fiber = toFiber(raw);
    const baseDelta = input.previous ? baseDistance(base, input.previous.base) : 1;
    const fiberDelta = input.previous ? fiberDistance(fiber, input.previous.fiber) : 0;
    const stateDelta = input.previous ? stateDistance(raw, input.previous.state) : 1;

    let allowed = projectActions(raw, input);
    const previousSig = input.previous ? input.previous.actionSignature : null;
    let fiberStabilityHeld = false;
    if (
      previousSig &&
      actionSignature(allowed) !== previousSig &&
      baseDelta < BASE_SHIFT_THRESHOLD &&
      fiberDelta > 0
    ) {
      allowed = Object.assign({}, input.previous.allowed, { reasons: input.previous.allowed.reasons.slice() });
      allowed.reasons = [
        ...allowed.reasons.filter((r) => r !== "continuity-only drift cannot change the selected task"),
        "continuity-only drift cannot change the selected task",
      ];
      fiberStabilityHeld = true;
    }

    const invariantViolations = [];
    if (!input.validatedIdentity) invariantViolations.push("validated identity context missing");
    if (input.agreements.some((s) => s.authorityGranted > 0 && !s.active)) {
      invariantViolations.push("non-confirmed agreement attempted to grant authority");
    }
    if (invariantViolations.length) {
      allowed.blocked = true;
      allowed.callTool = false;
      allowed.reasons.push(...invariantViolations);
    }

    let history = input.previous ? input.previous.history.slice() : [];
    const sig = actionSignature(allowed);
    history.push(sig);
    if (history.length > Math.max(CONVERGENCE_WINDOW, 2)) {
      history = history.slice(-Math.max(CONVERGENCE_WINDOW, 2));
    }
    const oscillation = detectOscillation(stateDelta, history, previousSig, sig);
    if (oscillation) {
      allowed.forceClarification = true;
      allowed.askClarification = true;
      allowed.callTool = false;
      allowed.reasons.push("CDISS detected action-space oscillation");
    }
    const finalSig = actionSignature(allowed);
    if (history.length) history[history.length - 1] = finalSig;

    return {
      state: raw,
      base,
      fiber,
      allowed,
      baseDelta,
      fiberDelta,
      stateDelta,
      fiberStabilityHeld,
      oscillation,
      invariantViolations,
      actionSignature: finalSig,
      history,
    };
  }

  function emptySnapshot() {
    return {
      state: emptyState(),
      base: toBase(emptyState()),
      fiber: toFiber(emptyState()),
      allowed: {
        respond: true,
        askClarification: true,
        callTool: false,
        executeHighRisk: false,
        materialRequireApproval: false,
        forceClarification: false,
        blocked: false,
        reasons: [],
      },
      baseDelta: 1,
      fiberDelta: 0,
      stateDelta: 1,
      fiberStabilityHeld: false,
      oscillation: false,
      invariantViolations: [],
      actionSignature: "r1:q1:t0:h0:a0:f0:b0",
      history: [],
    };
  }

  const SOLIDS = [
    { id: "tetrahedron", label: "tetrahedron", hint: "four seats around one goal" },
    { id: "octahedron", label: "octahedron", hint: "eight corners pointing out" },
    { id: "cube", label: "cube", hint: "chart of eight named corners" },
    { id: "dodecahedron", label: "dodecahedron", hint: "twelve faces, still one table" },
    { id: "starTetrahedron", label: "star tetrahedron", hint: "two tetras, one center — four points seen two ways" },
    { id: "cuboctahedron", label: "cuboctahedron", hint: "twelve around one, still one table" },
    { id: "icosahedron", label: "icosahedron", hint: "twenty faces, same hole" },
  ];

  const VECTOR_AXES = [
    { id: "intent", label: "what we mean", layer: "base" },
    { id: "topic", label: "about what", layer: "base" },
    { id: "emotional", label: "feeling", layer: "fiber" },
    { id: "agreement", label: "yes or no", layer: "base" },
    { id: "temporal", label: "when", layer: "fiber" },
    { id: "relational", label: "with whom", layer: "fiber" },
    { id: "memory", label: "we remember", layer: "base" },
    { id: "readiness", label: "ready yet", layer: "base" },
  ];

  function chamberGhost(confirmedCount, fourSeated) {
    if (confirmedCount >= 12) return "icosahedron";
    if (confirmedCount >= 8) return fourSeated ? "starTetrahedron" : "cube";
    if (confirmedCount >= 6) return "octahedron";
    return null;
  }

  const PERSON_IDS = ["Maya", "Finn", "Bea", "Sam"];
  const LEVELS = [
    { id: "self", label: "Me", hex: 0x1ad4ea, hint: "You can Yes this goal without becoming the other three." },
    { id: "tribe", label: "Us", hex: 0xff7a1a, hint: "Once some of you Yes, those marks walk until jobs sit as a shape." },
    { id: "world", label: "How", hex: 0x1d6b4a, hint: "How we do it draws a line from each seat to the middle." },
    { id: "transcendent", label: "Over time", hex: 0xc49214, hint: "A pattern over time walks the outside of the doughnut. Walking is not Yes." },
  ];
  const THRESHOLDS = [
    ["self", "tribe"],
    ["tribe", "world"],
    ["world", "transcendent"],
    ["transcendent", "self"],
  ];
  const CUBE_VERTS = [
    [1, 1, 1],
    [1, 1, -1],
    [1, -1, 1],
    [1, -1, -1],
    [-1, 1, 1],
    [-1, 1, -1],
    [-1, -1, 1],
    [-1, -1, -1],
  ];
  const TETRA_A = [0, 3, 5, 6];
  const TETRA_B = [1, 2, 4, 7];
  const OPPOSITE_FACE = [
    [1, 2, 3],
    [0, 2, 3],
    [0, 1, 3],
    [0, 1, 2],
  ];
  const INNER_RADIUS = 0.68;
  const TORUS_MAJOR = 1.08;
  const TORUS_TUBE = 0.36;
  const ORBIT_RADIUS = TORUS_MAJOR;
  const OUTER_RADIUS = TORUS_MAJOR + TORUS_TUBE;
  const HOLE_RADIUS = TORUS_MAJOR - TORUS_TUBE;
  const TORUS_HEIGHT = 2 * TORUS_TUBE;
  const CONE_HEIGHT = 2 * TORUS_HEIGHT;
  const GROUP_CONFLICT = 0.48;
  const PERSON_ALIGN = 0.38;
  const AXIS_SPLIT = 0.28;

  function polygonName(n) {
    if (n <= 0) return "no seats";
    if (n === 1) return "a single seat";
    if (n === 2) return "a line";
    if (n === 3) return "a triangle";
    if (n === 4) return "a square";
    if (n === 5) return "a pentagon";
    if (n === 6) return "a hexagon";
    return `a ${n}-gon`;
  }

  function regularPolygon(n, radius, spin, y) {
    if (n <= 0) return [];
    const spin0 = spin || 0;
    const y0 = y || 0;
    return Array.from({ length: n }, (_, i) => {
      const a = spin0 - PI / 2 + (i * 2 * PI) / n;
      return { x: Math.cos(a) * radius, y: y0, z: Math.sin(a) * radius };
    });
  }

  function rosterSlots(rosterN, radius, spin) {
    return regularPolygon(rosterN, radius, spin || 0, 0);
  }

  function yesPeople(people, version) {
    return people.filter((p) => p.status === "yes" && p.version === version);
  }

  function reviewsHeld(s) {
    return s.evidenceVersion === s.version && s.authorityVersion === s.version && s.safetyVersion === s.version;
  }

  function distance8(a, b) {
    let sum = 0;
    for (let i = 0; i < VECTOR_DIM; i += 1) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
  }

  function addInto(target, source, weight) {
    for (let i = 0; i < VECTOR_DIM; i += 1) target[i] += source[i] * weight;
  }

  function magnitude8(v) {
    return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  }

  function normalize(v) {
    const n = magnitude8(v);
    if (n > 1) {
      for (let i = 0; i < VECTOR_DIM; i += 1) v[i] /= n;
    }
    return v;
  }

  function fourPoint(marks) {
    const m = [Boolean(marks[0]), Boolean(marks[1]), Boolean(marks[2]), Boolean(marks[3])];
    const count = m.filter(Boolean).length;
    return { marks: m, count, held: count === 4 };
  }

  function axisDeltas(a, b) {
    const named = [];
    for (let i = 0; i < VECTOR_DIM; i += 1) {
      if (Math.abs(a[i] - b[i]) > AXIS_SPLIT) named.push((VECTOR_AXES[i] && VECTOR_AXES[i].label) || `axis ${i}`);
    }
    return named.slice(0, 3);
  }

  function projectPersonLevel(person, level, ctx) {
    const out = zeros();
    addInto(out, hashedProjection(`${person.id}:${level}:${ctx.proposal}`), 0.55);
    const yes = person.status === "yes" && person.version === ctx.version;
    const ready = person.status === "ready" && person.version === ctx.version;
    const nYes = yesPeople(ctx.people, ctx.version).length;
    const heat = Math.min(1, Math.max(0, person.heat || 0));

    if (level === "self") {
      out[0] += yes ? 0.7 : ready ? 0.28 : 0.08;
      out[7] += yes ? 0.45 : ready ? 0.55 : 0.1;
      out[2] += person.rest * 0.08;
    }
    if (level === "tribe") {
      out[5] += nYes * 0.16;
      out[3] +=
        ctx.formation === "roles" || ctx.formation === "how" || ctx.formation === "polyhedron" || ctx.formation === "unfit"
          ? yes
            ? 0.7
            : 0.1
          : 0.12;
      out[1] += yes ? 0.35 : 0.05;
      if (ctx.formation === "orbit") out[4] += 0.4;
    }
    if (level === "world") {
      addInto(out, hashedProjection(`world:${ctx.proposal}`), 0.7);
      out[1] += 0.45;
      out[6] += reviewsHeld(ctx) ? 0.7 : 0.12;
      out[7] += reviewsHeld(ctx) && yes ? 0.4 : 0.08;
      out[0] += ctx.formation === "how" || ctx.formation === "polyhedron" ? 0.35 : 0.08;
    }
    if (level === "transcendent") {
      out[2] += 0.2 + ctx.holonomyTurns * 0.18 + (ctx.gauge % (PI * 2)) * 0.04;
      out[4] += 0.25 + ctx.holonomyTurns * 0.12;
      out[5] += ctx.formation === "polyhedron" ? 0.55 : 0.12;
      out[3] += ctx.agreement === "active" && yes ? 0.5 : 0.05;
      addInto(out, hashedProjection(`wrap:${ctx.holonomyTurns}:${person.id}`), 0.35);
    }
    out[2] += heat * 0.5;
    out[4] += heat * 0.28;
    out[5] += heat * 0.28;
    const mag = magnitude8(out);
    return { vec: normalize(out), magnitude: mag };
  }

  function sharedLevel(people, level, ctx) {
    const out = zeros();
    for (const person of people) addInto(out, projectPersonLevel(person, level, ctx).vec, 0.25);
    return normalize(out);
  }

  function markAt(level, person, ctx) {
    const yes = person.status === "yes" && person.version === ctx.version;
    if (!yes) return false;
    if (level === "self") return true;
    if (level === "tribe") {
      return (
        ctx.formation === "roles" ||
        ctx.formation === "how" ||
        ctx.formation === "polyhedron" ||
        ctx.formation === "unfit"
      );
    }
    if (level === "world") return reviewsHeld(ctx);
    return ctx.formation === "polyhedron" && ctx.agreement === "active";
  }

  function occupancyFor(level, peopleVec, people) {
    return VECTOR_AXES.map((axis, i) => {
      const seats = [];
      const signs = [];
      for (const person of people) {
        const v = (peopleVec[person.id] && peopleVec[person.id][level] && peopleVec[person.id][level][i]) || 0;
        if (Math.abs(v) >= AXIS_SPLIT) {
          seats.push(person.id);
          signs.push(Math.sign(v) || 1);
        }
      }
      const split = signs.some((s) => s > 0) && signs.some((s) => s < 0);
      return { id: axis.id, label: axis.label, layer: axis.layer, seats, split };
    });
  }

  function computeHolarchy(ctx) {
    const yes = yesPeople(ctx.people, ctx.version);
    const peopleVec = {};
    const strength = {};
    const shared = {};
    const four = {};

    for (const level of LEVELS) {
      shared[level.id] = sharedLevel(ctx.people, level.id, ctx);
      four[level.id] = fourPoint(ctx.people.map((p) => markAt(level.id, p, ctx)));
    }
    for (const person of ctx.people) {
      const self = projectPersonLevel(person, "self", ctx);
      const tribe = projectPersonLevel(person, "tribe", ctx);
      const world = projectPersonLevel(person, "world", ctx);
      const transcendent = projectPersonLevel(person, "transcendent", ctx);
      peopleVec[person.id] = { self: self.vec, tribe: tribe.vec, world: world.vec, transcendent: transcendent.vec };
      strength[person.id] = {
        self: self.magnitude,
        tribe: tribe.magnitude,
        world: world.magnitude,
        transcendent: transcendent.magnitude,
      };
    }

    const axes = occupancyFor("self", peopleVec, ctx.people);
    const thresholds = THRESHOLDS.map(([from, to]) => {
      const groupDistance = distance8(shared[from], shared[to]);
      const personAligned = ctx.people.every(
        (p) => distance8(peopleVec[p.id][from], peopleVec[p.id][to]) < PERSON_ALIGN + 0.35
      );
      const fourPointHeld = four[from].held && four[to].held && personAligned;
      const conflict = groupDistance >= GROUP_CONFLICT || four[from].count !== four[to].count;
      const vowConflict = conflict && four[from].count > 0 && four[to].count > 0;
      const named = axisDeltas(shared[from], shared[to]);
      const fromL = (LEVELS.find((l) => l.id === from) || {}).label || from;
      const toL = (LEVELS.find((l) => l.id === to) || {}).label || to;
      let note = `${fromL} and ${toL} sit together.`;
      if (conflict) {
        note = named.length
          ? `${fromL} fights ${toL} on ${named.join(", ")}.`
          : `${fromL} and ${toL} do not sit on the same 8-corner cube.`;
      }
      return { from, to, fourPointHeld, groupDistance, conflict, vowConflict, axes: named, note };
    });

    const fights = thresholds.filter((t) => t.conflict);
    const vows = thresholds.filter((t) => t.vowConflict);
    const commute = vows.length === 0;
    const chamberCount = ctx.confirmedCount || 0;
    const ghost = chamberGhost(chamberCount, four.tribe.held);

    let reveal = "All four seats match here. That is still not a Yes.";
    if (ctx.formation === "unfit") {
      reveal = "The table named a miss, not a failure. That is an answer.";
    } else if (fights.length) {
      reveal = `${fights[0].note} A fight on the table is a picture. It cannot grant, and it cannot lock.`;
    } else if (!four.self.held) {
      reveal = "Me is not four-point yet. A friend can Yes a goal without the others.";
    }
    if (!commute && ghost) {
      reveal = `${reveal} The count went up. The promises still don’t fit together.`;
    }

    return {
      formation: ctx.formation,
      yesIds: yes.map((p) => p.id),
      n: yes.length,
      polygon: polygonName(yes.length),
      fourPoint: four,
      shared,
      people: peopleVec,
      strength,
      thresholds,
      axes,
      commute,
      chamberCount,
      chamberGhost: ghost,
      reveal,
      grantsNothing: true,
    };
  }

  function emptyHolarchy() {
    return computeHolarchy({
      version: 1,
      proposal: "",
      agreement: null,
      evidenceVersion: null,
      authorityVersion: null,
      safetyVersion: null,
      formation: "self",
      holonomyTurns: 0,
      gauge: 0,
      people: PERSON_IDS.map((id, seat) => ({
        id,
        status: "unset",
        version: null,
        rest: [0.35, 1.2, 2.1, 4.0][seat] || 0,
        heat: 0,
      })),
      confirmedCount: 0,
    });
  }

  function tetraCornersNormalized() {
    return TETRA_A.map((i) => {
      const v = CUBE_VERTS[i];
      return [v[0] * INV_SQRT3, v[1] * INV_SQRT3, v[2] * INV_SQRT3];
    });
  }

  const PEOPLE = [
    { id: "Maya", color: "#1AD4EA", seat: 0, rest: 0.35 },
    { id: "Finn", color: "#FF7A1A", seat: 1, rest: 1.2 },
    { id: "Bea", color: "#C49214", seat: 2, rest: 2.1 },
    { id: "Sam", color: "#3D7A4A", seat: 3, rest: 4.0 },
  ];
  const PROPOSALS = [
    "Carry the cardboard dragon over the bridge",
    "Carry the dragon through the checked orchard route",
  ];
  const DEFAULT_EIGHT = ["purpose", "scope", "timing", "resources", "risk", "care", "authority", "completion"];
  const COMMIT_YES_MIN = 3;
  const OPENING =
    "No agreement yet. Four friends can share a goal without becoming the same person. The doughnut is the table. Walking is not Yes.";

  function seedPeople() {
    return PEOPLE.map((p) => Object.assign({}, p, { status: "unset", version: null, heat: 0.18 }));
  }

  function reviewsRecorded(s) {
    return s.evidenceVersion === s.version && s.authorityVersion === s.version && s.safetyVersion === s.version;
  }

  function kidReason(reason) {
    if (reason.includes("bounded test")) return "the check isn’t written down yet";
    if (reason.includes("authority missing")) return "who may say yes isn’t named yet";
    if (reason.includes("safety")) return "the safety check isn’t written down yet";
    if (reason.includes("consent missing")) return "need three Yes on these words";
    if (reason.includes("No is live")) return "someone said No. That is a full answer.";
    if (reason.includes("consequences")) return "something happened. It still needs an answer.";
    if (reason.includes("silently replaced")) return "this promise is already sealed. Don’t swap it in secret.";
    if (reason.includes("No valid")) return "there is no live promise yet";
    return reason;
  }

  function liveYes(people, version) {
    return people.filter((p) => p.status === "yes" && p.version === version);
  }

  function liveNo(people, version) {
    return people.filter((p) => p.status === "no" && p.version === version);
  }

  function consentHoles(s) {
    const reasons = [];
    if (liveNo(s.people, s.version).length > 0) reasons.push("a No is live on this wording");
    if (liveYes(s.people, s.version).length < COMMIT_YES_MIN) {
      reasons.push("explicit current-version consent missing");
    }
    return reasons;
  }

  function blockers(s) {
    const reasons = [];
    if (s.evidenceVersion !== s.version) reasons.push("bounded test not passed");
    if (s.authorityVersion !== s.version) reasons.push("required authority missing");
    if (s.safetyVersion !== s.version) reasons.push("safety check missing or blocked");
    reasons.push(...consentHoles(s));
    if (s.repairOpen) reasons.push("previous consequences need an agreed response");
    if (s.agreement === "active") reasons.push("existing agreement must be resolved, not silently replaced");
    return reasons;
  }

  function actionBlockers(s) {
    if (s.agreement !== "active") return ["No valid, current, active agreement"];
    const holes = consentHoles(s);
    if (holes.length) return ["No valid, current, active agreement"];
    return [];
  }

  function tableRecords(s) {
    const recs = [];
    const yes = yesPeople(s.people, s.version);
    const reviewed = reviewsRecorded(s);
    const seated =
      s.formation === "roles" || s.formation === "how" || s.formation === "polyhedron" || s.formation === "unfit";
    for (const p of yes) {
      recs.push({
        id: `yes-${p.id}`,
        kind: "proposed",
        claim: `${p.id} Yes on v${s.version}`,
        confirmed: reviewed || s.agreement === "active",
        permissionKind: false,
      });
    }
    if (seated) {
      recs.push({
        id: "roles",
        kind: "roles",
        claim: `roles as ${polygonName(yes.length)}`,
        confirmed: reviewed || s.formation === "how" || s.formation === "polyhedron",
        permissionKind: false,
      });
    }
    if (reviewed) {
      recs.push(
        { id: "evidence", kind: "evidence", claim: "bounded test", confirmed: true, permissionKind: true },
        { id: "authority", kind: "authority", claim: "named authority", confirmed: true, permissionKind: true },
        { id: "safety", kind: "safety", claim: "safety check", confirmed: true, permissionKind: true }
      );
    }
    if (s.agreement === "active") {
      recs.push({
        id: `commit-v${s.version}`,
        kind: "commit",
        claim: s.proposal,
        confirmed: true,
        permissionKind: true,
      });
    }
    if (s.formation === "unfit") {
      recs.push({
        id: `notfit-v${s.version}`,
        kind: "notFit",
        claim: "the table named a miss",
        confirmed: true,
        permissionKind: false,
      });
    }
    return recs;
  }

  function confirmedCount(records) {
    return records.filter((r) => r.confirmed && r.kind !== "notFit").length;
  }

  function holarchyOf(s) {
    const records = s.records || tableRecords(s);
    return computeHolarchy({
      version: s.version,
      proposal: s.proposal,
      agreement: s.agreement,
      evidenceVersion: s.evidenceVersion,
      authorityVersion: s.authorityVersion,
      safetyVersion: s.safetyVersion,
      formation: s.formation,
      holonomyTurns: s.holonomyTurns,
      gauge: s.gauge,
      people: s.people,
      confirmedCount: confirmedCount(records),
    });
  }

  function peopleSignals(people, version) {
    const yeses = people.filter((p) => p.status === "yes" && p.version === version).length;
    const readies = people.filter((p) => p.status === "ready" && p.version === version).length;
    return [
      {
        label: `seats yes=${yeses} ready=${readies}`,
        confidence: 0.35 + yeses * 0.15 + readies * 0.05,
        strength: 0.4 + readies * 0.08,
        evidence: "named seats around the table",
        volatility: 0.12,
        requiredAction: "none",
      },
    ];
  }

  function proposalParser(proposal, kind) {
    return {
      label: proposal,
      confidence: kind === "act" ? 0.92 : 0.7,
      strength: kind === "act" ? 0.9 : 0.55,
      evidence: kind === "act" ? "act on the live plan" : "new draft of the shared goal",
      volatility: 0.18,
      requiredAction: kind === "act" ? "store" : "none",
    };
  }

  function agreementSignals(proposal, agreement, version) {
    if (agreement === "active") {
      return [{ id: `v${version}`, claim: proposal, confidence: 1, active: true, authorityGranted: 0 }];
    }
    if (agreement === "paused") {
      return [{ id: `v${version}`, claim: proposal, confidence: 0.4, active: false, authorityGranted: 0 }];
    }
    return [];
  }

  function stepCdiss(prev, args) {
    return transition({
      previous: prev,
      parser: args.parser,
      memory: args.memory,
      agreements: args.agreements,
      pendingApprovals: args.pendingApprovals,
      validatedIdentity: true,
      highRiskAvailable: false,
    });
  }

  function withRing(text, cdiss) {
    if (cdiss.oscillation) return `The pointer is ringing — ask, don’t act. ${text}`;
    return text;
  }

  function createWorkshop() {
    let state = null;
    const api = {};

    function get() {
      return state;
    }

    function set(patch) {
      state = Object.assign({}, state, patch);
    }

    function initial() {
      const people = seedPeople();
      return {
        version: 1,
        proposal: PROPOSALS[0],
        agreement: null,
        evidenceVersion: null,
        authorityVersion: null,
        safetyVersion: null,
        repairOpen: false,
        spinning: true,
        solid: "tetrahedron",
        selectedFacet: 0,
        formation: "self",
        caption: OPENING,
        people,
        holonomyTurns: 0,
        gauge: 0,
        cdiss: emptySnapshot(),
        holarchy: emptyHolarchy(),
        records: [],
        mathLens: false,
        eight: DEFAULT_EIGHT.slice(),
      };
    }

    api.getState = get;

    api.newDraft = function newDraft() {
      const s = get();
      const version = s.version + 1;
      const proposal = PROPOSALS[(version - 1) % PROPOSALS.length];
      const people = s.people.map((p) => Object.assign({}, p, { status: "unset", version: null }));
      const cdiss = stepCdiss(s.cdiss, {
        parser: [proposalParser(proposal, "draft"), ...peopleSignals(people, version)],
        memory: [],
        agreements: [],
        pendingApprovals: 0,
      });
      const patch = {
        version,
        proposal,
        agreement: s.agreement === "active" ? s.agreement : null,
        evidenceVersion: null,
        authorityVersion: null,
        safetyVersion: null,
        people,
        selectedFacet: 0,
        formation: "self",
        records: [],
        cdiss,
      };
      set(
        Object.assign({}, patch, {
          holarchy: holarchyOf(Object.assign({}, s, patch)),
          caption: withRing(`New draft v${version}. Old Yes stay with the old words. This is a new shape to sit.`, cdiss),
        })
      );
    };

    api.remember = function remember() {
      const s = get();
      const cdiss = stepCdiss(s.cdiss, {
        parser: [],
        memory: [
          {
            label: "continuity",
            relevance: 0.88,
            continuityOnly: true,
            text: `we still remember sitting with ${s.proposal}`,
          },
        ],
        agreements: agreementSignals(s.proposal, s.agreement, s.version),
        pendingApprovals: 0,
      });
      const patch = { cdiss, selectedFacet: 1 };
      set(
        Object.assign({}, patch, {
          holarchy: holarchyOf(Object.assign({}, s, patch)),
          caption: withRing("We remembered something. Remembering is not a Yes.", cdiss),
        })
      );
    };

    api.reframe = function reframe() {
      const s = get();
      const gauge = s.gauge + PI / 5;
      const cdiss = stepCdiss(s.cdiss, {
        parser: [],
        memory: [
          {
            label: "reframe",
            relevance: 0.7,
            continuityOnly: true,
            text: `same plan said another way, gauge ${gauge.toFixed(2)}`,
          },
        ],
        agreements: agreementSignals(s.proposal, s.agreement, s.version),
        pendingApprovals: 0,
      });
      const patch = { gauge, cdiss, selectedFacet: 1 };
      set(
        Object.assign({}, patch, {
          holarchy: holarchyOf(Object.assign({}, s, patch)),
          caption: withRing("Same plan, said another way. That did not write a new Yes.", cdiss),
        })
      );
    };

    api.walkAround = function walkAround() {
      const s = get();
      const holonomyTurns = s.holonomyTurns + 1;
      const acquired = ((HopfLib.holonomyAngle(PI / 3) * 180) / PI).toFixed(0);
      const cdiss = stepCdiss(s.cdiss, {
        parser: [],
        memory: [
          {
            label: "walk",
            relevance: 0.55,
            continuityOnly: true,
            text: `walked the 60° latitude, lift acquired ${acquired} degrees`,
          },
        ],
        agreements: agreementSignals(s.proposal, s.agreement, s.version),
        pendingApprovals: 0,
      });
      const patch = { holonomyTurns, cdiss, selectedFacet: 3 };
      set(
        Object.assign({}, patch, {
          holarchy: holarchyOf(Object.assign({}, s, patch)),
          caption: withRing("You walked around the doughnut and came back. Walking is not Yes.", cdiss),
        })
      );
    };

    api.ready = function ready(id) {
      const s = get();
      if (s.agreement === "active") return;
      const people = s.people.map((p) =>
        p.id === id ? Object.assign({}, p, { status: p.status === "yes" ? "yes" : "ready", version: s.version }) : p
      );
      const cdiss = stepCdiss(s.cdiss, {
        parser: peopleSignals(people, s.version),
        memory: [],
        agreements: [],
        pendingApprovals: 0,
      });
      const patch = { people, cdiss, selectedFacet: 0 };
      set(
        Object.assign({}, patch, {
          holarchy: holarchyOf(Object.assign({}, s, patch)),
          caption: withRing(`${id} put toes in the pool. That is not a jump, and it is not a Yes.`, cdiss),
        })
      );
    };

    api.answer = function answer(id, kind) {
      const s = get();
      const people = s.people.map((p) =>
        p.id === id ? Object.assign({}, p, { status: kind, version: s.version }) : p
      );
      const n = yesPeople(people, s.version).length;
      let formation = s.formation === "unfit" ? "self" : s.formation;
      if (kind === "yes" && n >= 2 && (formation === "self" || formation === "orbit")) formation = "orbit";
      if (kind === "no" && n < 2 && formation !== "polyhedron") formation = "self";
      const cdiss = stepCdiss(s.cdiss, {
        parser: [
          ...peopleSignals(people, s.version),
          {
            label: `${id} ${kind}`,
            confidence: 1,
            strength: 0.8,
            evidence: kind === "yes" ? "explicit yes on this version" : "explicit no on this version",
            volatility: 0.05,
            requiredAction: "none",
          },
        ],
        memory: [],
        agreements: [],
        pendingApprovals: 0,
      });
      const records = tableRecords(Object.assign({}, s, { people, formation }));
      const patch = { people, cdiss, selectedFacet: kind === "yes" ? 0 : 3, formation, records };
      const holarchy = holarchyOf(Object.assign({}, s, patch));
      let caption =
        kind === "yes"
          ? `${id} put a Yes on v${s.version}. The bead may come close. That is not yet a promise.`
          : `${id} said No on v${s.version}. A No is a full answer, not a defect.`;
      if (kind === "yes" && formation === "orbit") {
        caption = `${id} Yes’d the goal. ${n} mark${n === 1 ? "" : "s"} walk the doughnut while jobs are talked. Marks, not people. Walking is not sitting, and sitting is not Yes.`;
      }
      set(Object.assign({}, patch, { holarchy, caption: withRing(caption, cdiss) }));
    };

    api.withdraw = function withdraw(id) {
      const s = get();
      if (s.agreement !== "active") return;
      const people = s.people.map((p) =>
        p.id === id ? Object.assign({}, p, { status: "withdrawn", version: s.version }) : p
      );
      const cdiss = stepCdiss(s.cdiss, {
        parser: peopleSignals(people, s.version),
        memory: [],
        agreements: agreementSignals(s.proposal, "paused", s.version),
        pendingApprovals: 0,
      });
      const formation = "how";
      const records = tableRecords(Object.assign({}, s, { people, agreement: "paused", formation }));
      const patch = {
        people,
        agreement: "paused",
        repairOpen: true,
        cdiss,
        selectedFacet: 2,
        formation,
        records,
      };
      set(
        Object.assign({}, patch, {
          holarchy: holarchyOf(Object.assign({}, s, patch)),
          caption: withRing(
            `${id} stopped on v${s.version}. The hoop is still there. What happened still gets written down. We do not guess a Yes backwards.`,
            cdiss
          ),
        })
      );
    };

    api.agreeRoles = function agreeRoles() {
      const s = get();
      if (s.agreement === "active") return;
      const n = yesPeople(s.people, s.version).length;
      if (n < 2) {
        set({ caption: "Jobs need at least two Yes on this goal. One person is not a shape." });
        return;
      }
      const cdiss = stepCdiss(s.cdiss, {
        parser: [
          {
            label: "roles",
            confidence: 0.8,
            strength: 0.55,
            evidence: `${n} seats agreed to sit as ${polygonName(n)}`,
            volatility: 0.08,
            requiredAction: "none",
          },
          ...peopleSignals(s.people, s.version),
        ],
        memory: [],
        agreements: [],
        pendingApprovals: 0,
      });
      const formation = "roles";
      const records = tableRecords(Object.assign({}, s, { formation }));
      const patch = { formation, cdiss, selectedFacet: 1, records };
      set(
        Object.assign({}, patch, {
          holarchy: holarchyOf(Object.assign({}, s, patch)),
          caption: withRing(
            `Jobs sat as ${polygonName(n)} on the table. Missing Yes leaves a gap. A ${polygonName(n).replace(/^a /, "")} is not the how, and it is not gold.`,
            cdiss
          ),
        })
      );
    };

    api.recordReviews = function recordReviews() {
      const s = get();
      const formation =
        s.formation === "roles" || s.formation === "orbit" || s.formation === "how" || s.formation === "polyhedron"
          ? s.formation === "orbit" || s.formation === "roles"
            ? "how"
            : s.formation
          : s.formation;
      const cdiss = stepCdiss(s.cdiss, {
        parser: [
          {
            label: "reviews",
            confidence: 0.85,
            strength: 0.5,
            evidence: "evidence, authority, safety recorded for this version",
            volatility: 0.05,
            requiredAction: "none",
          },
        ],
        memory: [],
        agreements: [],
        pendingApprovals: 0,
      });
      const patch = {
        evidenceVersion: s.version,
        authorityVersion: s.version,
        safetyVersion: s.version,
        cdiss,
        formation,
        selectedFacet: 2,
      };
      const records = tableRecords(Object.assign({}, s, patch));
      const holarchy = holarchyOf(Object.assign({}, s, patch, { records }));
      const spoke =
        formation === "how"
          ? " Lines grow from each seat to the middle. Those triangles are how we look at the work. Checks are not a Yes."
          : " Checks are not a Yes.";
      set(Object.assign({}, patch, { records, holarchy, caption: withRing(`Checks written down for v${s.version}.${spoke}`, cdiss) }));
    };

    api.commit = function commit() {
      const s = get();
      const reasons = blockers(s);
      if (reasons.length) {
        set({ caption: `Can’t Commit yet: ${kidReason(reasons[0])}` });
        return;
      }
      const cdiss = stepCdiss(s.cdiss, {
        parser: [proposalParser(s.proposal, "act"), ...peopleSignals(s.people, s.version)],
        memory: [],
        agreements: agreementSignals(s.proposal, "active", s.version),
        pendingApprovals: 0,
      });
      const patch = { agreement: "active", cdiss, selectedFacet: 3, formation: "polyhedron" };
      const records = tableRecords(Object.assign({}, s, patch));
      const n = liveYes(s.people, s.version).length;
      const gaps = s.people.filter((p) => !(p.status === "yes" && p.version === s.version)).map((p) => p.id);
      const gapLine = gaps.length > 0 ? `A ${polygonName(n)} can walk. ${gaps.join(", ")} left a gap. ` : "";
      set(
        Object.assign({}, patch, {
          records,
          holarchy: holarchyOf(Object.assign({}, s, patch, { records })),
          caption: withRing(
            `${gapLine}The shape held. Seats walk the outside of the doughnut. Gold is spoken Yes plus checks plus Commit, not the walk.`,
            cdiss
          ),
        })
      );
    };

    api.act = function act() {
      const s = get();
      const reasons = actionBlockers(s);
      if (reasons.length) {
        set({ caption: `Can’t Act yet: ${kidReason(reasons[0])}` });
        return;
      }
      const cdiss = stepCdiss(s.cdiss, {
        parser: [proposalParser(s.proposal, "act")],
        memory: [],
        agreements: agreementSignals(s.proposal, "active", s.version),
        pendingApprovals: 0,
      });
      const next = Object.assign({}, cdiss, {
        state: Object.assign({}, cdiss.state, { completion_state: 1 }),
        base: Object.assign({}, cdiss.base, { completion_state: 1 }),
      });
      set({
        cdiss: next,
        holarchy: holarchyOf(s),
        caption: withRing(
          `Tried the plan on v${s.version}: ${s.proposal}. The list would remember. The doughnut did not decide.`,
          next
        ),
      });
    };

    api.notAFit = function notAFit() {
      const s = get();
      if (s.agreement === "active") {
        set({ caption: "This promise is already sealed. Stop, or start over first." });
        return;
      }
      const n = yesPeople(s.people, s.version).length;
      if (n < 1) {
        set({ caption: "Name a miss after someone has held a goal. Empty feeling is not a miss." });
        return;
      }
      const cdiss = stepCdiss(s.cdiss, {
        parser: [
          {
            label: "not a fit",
            confidence: 1,
            strength: 0.7,
            evidence: "human named a miss on this version",
            volatility: 0.04,
            requiredAction: "none",
          },
          ...peopleSignals(s.people, s.version),
        ],
        memory: [],
        agreements: [],
        pendingApprovals: 0,
      });
      const formation = "unfit";
      const records = tableRecords(Object.assign({}, s, { formation }));
      const patch = { formation, cdiss, selectedFacet: 2, records };
      set(
        Object.assign({}, patch, {
          holarchy: holarchyOf(Object.assign({}, s, patch)),
          caption: withRing("The table named a miss, not a failure. That is an answer.", cdiss),
        })
      );
    };

    api.setHeat = function setHeat(id, heat) {
      const s = get();
      const next = Math.min(1, Math.max(0, heat));
      const people = s.people.map((p) => (p.id === id ? Object.assign({}, p, { heat: next }) : p));
      const patch = { people };
      set(
        Object.assign({}, patch, {
          holarchy: holarchyOf(Object.assign({}, s, patch)),
          caption:
            next > 0.55
              ? `${id}'s feeling is loud. The plan has not moved. Feeling can walk; it cannot vote.`
              : s.caption,
        })
      );
    };

    api.reset = function reset() {
      state = initial();
      set({
        caption:
          "Start over. Nested rings are just nested rings. The floor is a place we chose to sit. Beads are marks. People sit.",
      });
    };

    state = initial();
    return api;
  }

  const SCALAR_HOOPS = [
    { id: "emotion", color: "#FFE14D", theta: PI / 2, phi: 0.2 },
    { id: "relation", color: "#FF7A1A", theta: PI / 2, phi: PI / 2 + 0.2 },
    { id: "time", color: "#7EC8F8", theta: PI / 2, phi: PI + 0.2 },
    { id: "urgency", color: "#1AD4EA", theta: PI / 2, phi: (3 * PI) / 2 + 0.2 },
  ];

  const HOME = TETRA_UNIT.map((v) => sph(v[0], v[1], v[2]));
  const GOAL = (() => {
    const c = [
      TETRA_UNIT[0][0] + TETRA_UNIT[2][0] + TETRA_UNIT[3][0],
      TETRA_UNIT[0][1] + TETRA_UNIT[2][1] + TETRA_UNIT[3][1],
      TETRA_UNIT[0][2] + TETRA_UNIT[2][2] + TETRA_UNIT[3][2],
    ];
    const n = Math.hypot(c[0], c[1], c[2]) || 1;
    return sph(c[0] / n, c[1] / n, c[2] / n);
  })();

  return {
    sph,
    lerp,
    lerpAngle,
    stereographicOrNull,
    fibreSafe,
    SCALE,
    TETRA_UNIT,
    HOME,
    GOAL,
    SCALAR_HOOPS,
    hashedProjection,
    parserContribution,
    memoryContribution,
    agreementContribution,
    transition,
    emptySnapshot,
    CDISS_AUTHORITY_INVARIANT,
    SOLIDS,
    VECTOR_AXES,
    chamberGhost,
    PERSON_IDS,
    LEVELS,
    CUBE_VERTS,
    TETRA_A,
    TETRA_B,
    OPPOSITE_FACE,
    INNER_RADIUS,
    TORUS_MAJOR,
    TORUS_TUBE,
    ORBIT_RADIUS,
    OUTER_RADIUS,
    HOLE_RADIUS,
    TORUS_HEIGHT,
    CONE_HEIGHT,
    polygonName,
    regularPolygon,
    rosterSlots,
    yesPeople,
    computeHolarchy,
    emptyHolarchy,
    tetraCornersNormalized,
    COMMIT_YES_MIN,
    blockers,
    actionBlockers,
    tableRecords,
    confirmedCount,
    reviewsRecorded,
    createWorkshop,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = Abacus;
}
if (typeof window !== "undefined") window.Abacus = Abacus;
