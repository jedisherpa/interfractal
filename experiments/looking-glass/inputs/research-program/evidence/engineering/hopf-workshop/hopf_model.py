"""Hopf Workshop v0.2: exact geometry plus a separate toy agreement protocol.

Standard library only. This is a teaching/research model, not production
authorization software, a psychological measurement, or a safety assessment.
Angles are radians. The complex Hopf map fixes the sign conventions below.
"""

from dataclasses import dataclass, replace
from math import sin, cos, pi, sqrt
import cmath


def state(theta, phi, gamma=0.0):
    """North-chart lift of spherical coordinates to the unit 3-sphere."""
    return (cos(theta / 2) * cmath.exp(1j * gamma),
            sin(theta / 2) * cmath.exp(1j * (gamma - phi)))


def norm_squared(z):
    return sum(abs(v) ** 2 for v in z)


def hopf(z):
    """S^3 -> S^2. Reject non-unit inputs rather than silently rescaling."""
    if len(z) != 2 or abs(norm_squared(z) - 1) > 1e-9:
        raise ValueError("The Hopf input must be a unit vector in C^2")
    w = z[0] * z[1].conjugate()
    return (2 * w.real, 2 * w.imag, abs(z[0]) ** 2 - abs(z[1]) ** 2)


def gauge(z, angle):
    u = cmath.exp(1j * angle)
    return tuple(u * v for v in z)


def stereographic(z):
    """Project from (0,0,0,1); that point is not in this chart."""
    denominator = 1 - z[1].imag
    if abs(denominator) < 1e-12:
        raise ValueError("Stereographic chart excludes the projection pole")
    return (z[0].real / denominator, z[0].imag / denominator,
            z[1].real / denominator)


def north_section(theta, phi):
    return state(theta, phi)


def south_section(theta, phi):
    return (cos(theta / 2) * cmath.exp(1j * phi), complex(sin(theta / 2)))


def horizontal_latitude(theta, progress, phi0=0.0, gamma0=0.0):
    """A-horizontal lift, A=d gamma - sin(theta/2)^2 d phi."""
    phi = phi0 + 2 * pi * progress
    gamma = gamma0 + sin(theta / 2) ** 2 * (phi - phi0)
    return state(theta, phi, gamma)


def holonomy_angle(theta):
    """One positively traversed latitude: half its north-cap solid angle."""
    return pi * (1 - cos(theta))


def suggestion(z):
    """Nonconstant gauge-invariant toy selector; orientations are chosen.

    This is an illustrative embedding of three candidate ideas, not evidence
    for any of them. A suggestion never supplies consent or authorization.
    """
    n = hopf(z)
    labels = ("Bridge route", "Orchard route", "Village-square display")
    scores = [n[0]*cos(j*2*pi/3) + n[1]*sin(j*2*pi/3) for j in range(3)]
    best = max(scores)
    # Explicit deterministic tolerance-band tie rule for floating-point code.
    return labels[next(i for i,s in enumerate(scores) if best-s < 1e-12)]


def curvature_number(steps=4000):
    """Midpoint integral of F/(2pi), F=-sin(theta)/2 dtheta wedge dphi.

    Gives -1 with this real-connection/orientation convention; absolute value
    one is independent of the convention. This is a numerical check, not proof.
    """
    h = pi / steps
    return sum(-0.5 * sin((i + 0.5) * h) * h for i in range(steps))


def fibre(theta, phi, samples=240):
    return [stereographic(state(theta, phi, 2 * pi * i / samples))
            for i in range(samples)]


def subtract(a, b):
    return tuple(x - y for x, y in zip(a, b))


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def linking_number(curve_a, curve_b):
    """Midpoint Gauss quadrature for two disjoint closed sampled curves."""
    def segments(curve):
        result = []
        for i, p in enumerate(curve):
            q = curve[(i + 1) % len(curve)]
            result.append((tuple((x + y) / 2 for x, y in zip(p, q)),
                           subtract(q, p)))
        return result
    result = 0.0
    for midpoint_a, da in segments(curve_a):
        for midpoint_b, db in segments(curve_b):
            r = subtract(midpoint_a, midpoint_b)
            length = sqrt(dot(r, r))
            if length < 1e-10:
                raise ValueError("Curves intersect or quadrature is singular")
            result += dot(r, cross(da, db)) / length ** 3
    return result / (4 * pi)


@dataclass(frozen=True)
class Proposal:
    version: int
    description: str
    participants: tuple = ("Maya", "Finn", "Bea")


@dataclass(frozen=True)
class Agreement:
    proposal: Proposal
    status: str = "active"
    evidence_version: int = None
    authority_version: int = None
    safety_version: int = None


@dataclass(frozen=True)
class Event:
    index: int
    kind: str
    version: int
    detail: str


def snapshot(workshop):
    """Immutable view of protocol fields. Geometry is representation, not permission."""
    return {
        "z": workshop.z,
        "confidence": workshop.confidence,
        "proposal": workshop.proposal,
        "consents": dict(workshop.consents),
        "evidence_version": workshop.evidence_version,
        "authority_version": workshop.authority_version,
        "safety_version": workshop.safety_version,
        "agreement": workshop.agreement,
        "repair_open": workshop.repair_open,
        "history": workshop.history,
        "statements": dict(workshop.statements),
        "objections": tuple(workshop.objections),
    }


def apply(protocol, event):
    """Pure reducer: apply(state, event) -> state. Workshop is a façade.

    explore / reframe / propose / object / correct / holonomy must leave
    agreement and consents unchanged.
    """
    kind = event["kind"]
    out = {
        **protocol,
        "consents": dict(protocol["consents"]),
        "statements": dict(protocol.get("statements") or {}),
        "objections": tuple(protocol.get("objections") or ()),
    }
    history = protocol["history"]
    version = protocol["proposal"].version

    def rec(event_kind, detail, ver=None):
        nonlocal history
        history = history + (Event(len(history), event_kind, version if ver is None else ver, detail),)

    if kind == "explore":
        out["z"] = state(event["theta"], event["phi"], event.get("gamma", 0.0))
        rec("explore", "Changed exploratory coordinates; permissions unchanged")
    elif kind == "reframe":
        out["z"] = gauge(protocol["z"], event["angle"])
        rec("reframe", "Changed common phase; proposal and permission unchanged")
    elif kind == "propose":
        new = Proposal(version + 1, event["description"], protocol["proposal"].participants)
        out["proposal"] = new
        rec("propose", event["description"], new.version)
    elif kind == "object":
        actor, text = event["actor"], str(event["text"])
        oid = len(out["objections"]) + 1
        out["objections"] = out["objections"] + ((oid, actor, text, True),)
        rec("object", f"{actor}: {text}")
    elif kind == "dispose":
        oid = event["id"]
        out["objections"] = tuple(
            (item_id, actor, text, False if item_id == oid else open_flag)
            for item_id, actor, text, open_flag in out["objections"]
        )
        rec("dispose", f"objection {oid}")
    elif kind == "correct":
        actor, text = event["actor"], str(event["text"])
        editor = event.get("editor", actor)
        if editor != actor:
            raise ValueError("A contributor may only correct their own statement")
        out["statements"][(version, actor)] = text
        rec("correct", f"{actor}: {text}")
    elif kind == "holonomy":
        theta = event["theta"]
        out["z"] = horizontal_latitude(theta, 1.0)
        rec("holonomy", f"base returned; lift acquired {holonomy_angle(theta):.6f} rad")
    else:
        raise ValueError(f"apply() does not handle {kind}")

    out["history"] = history
    out["agreement"] = protocol["agreement"]
    out["consents"] = dict(protocol["consents"])
    return out


class Workshop:
    """A bounded protocol model. Methods simulate authenticated inputs.

    Real identity verification, adversarial security, concurrency, signatures,
    and real-world safety inspection are deliberately outside this toy model.
    The geometry supplies a representation; it cannot manufacture permission.
    """

    def __init__(self, participants=("Maya", "Finn", "Bea")):
        self.z = state(pi / 3, 0)
        self.confidence = 0.5
        self.proposal = Proposal(1, "Carry the cardboard dragon over the bridge", tuple(participants))
        self.consents = {}
        self.evidence_version = None
        self.authority_version = None
        self.safety_version = None
        self.agreement = None
        self.repair_open = False
        self.statements = {}
        self.objections = ()
        self._history = ()
        self.record("propose", self.proposal.description)

    @property
    def history(self):
        return self._history

    def record(self, kind, detail, version=None):
        event_version = self.proposal.version if version is None else version
        self._history += (Event(len(self._history), kind, event_version, detail),)

    def _load(self, protocol):
        self.z = protocol["z"]
        self.confidence = protocol["confidence"]
        self.proposal = protocol["proposal"]
        self.consents = protocol["consents"]
        self.evidence_version = protocol["evidence_version"]
        self.authority_version = protocol["authority_version"]
        self.safety_version = protocol["safety_version"]
        self.agreement = protocol["agreement"]
        self.repair_open = protocol["repair_open"]
        self.statements = protocol["statements"]
        self.objections = protocol["objections"]
        self._history = protocol["history"]

    def explore(self, theta, phi, gamma=0.0):
        self._load(apply(snapshot(self), {"kind": "explore", "theta": theta, "phi": phi, "gamma": gamma}))

    def reframe(self, angle):
        self._load(apply(snapshot(self), {"kind": "reframe", "angle": angle}))

    def set_confidence(self, value):
        if not 0 <= value <= 1:
            raise ValueError("Confidence must be between zero and one")
        self.confidence = value
        self.record("belief", str(value))

    def propose(self, description):
        # G+: opening a replacement does not erase an active agreement.
        self._load(apply(snapshot(self), {"kind": "propose", "description": description}))

    def propose_suggestion(self):
        self.propose(suggestion(self.z))

    def object(self, actor, text):
        if actor not in self.proposal.participants:
            raise ValueError("Unknown participant")
        self._load(apply(snapshot(self), {"kind": "object", "actor": actor, "text": text}))

    def dispose(self, oid):
        self._load(apply(snapshot(self), {"kind": "dispose", "id": oid}))

    def correct(self, actor, text, editor=None):
        if actor not in self.proposal.participants:
            raise ValueError("Unknown participant")
        self._load(apply(snapshot(self), {"kind": "correct", "actor": actor, "text": text, "editor": actor if editor is None else editor}))

    def holonomy(self, theta):
        self._load(apply(snapshot(self), {"kind": "holonomy", "theta": theta}))

    def consent(self, actor, answer):
        if actor not in self.proposal.participants:
            raise ValueError("Unknown participant")
        if type(answer) is not bool:
            raise ValueError("Consent must be an explicit Boolean")
        self.consents[(self.proposal.version, actor)] = answer
        self.record("consent", f"{actor}: {answer}")
        if (
            not answer
            and self.agreement
            and self.agreement.status == "active"
            and self.agreement.proposal.version == self.proposal.version
        ):
            self.withdraw(actor)

    def withdraw(self, actor):
        """Stopping participation requires no permission; history remains."""
        if (
            not self.agreement
            or self.agreement.status != "active"
            or actor not in self.agreement.proposal.participants
        ):
            raise ValueError("No applicable agreement")
        version = self.agreement.proposal.version
        self.consents[(version, actor)] = False
        self.agreement = replace(self.agreement, status="paused")
        self.repair_open = True
        self.record(
            "withdraw",
            f"{actor} stopped participation in agreement v{version}; repair discussion needed",
            version,
        )

    def review(self, evidence=False, authorized=False, safe=False):
        # Explicit version-scoped observations, not a calculated safety score.
        v = self.proposal.version
        self.evidence_version = v if evidence else None
        self.authority_version = v if authorized else None
        self.safety_version = v if safe else None
        self.record("review", f"evidence={evidence}, authority={authorized}, safe={safe}")

    def blockers(self):
        v = self.proposal.version
        reasons = []
        if self.evidence_version != v:
            reasons.append("bounded test not passed")
        if self.authority_version != v:
            reasons.append("required authority missing")
        if self.safety_version != v:
            reasons.append("safety check missing or blocked")
        if any(self.consents.get((v, person)) is not True for person in self.proposal.participants):
            reasons.append("explicit current-version consent missing")
        if self.repair_open:
            reasons.append("previous consequences need an agreed response")
        if any(open_flag for _oid, _actor, _text, open_flag in self.objections):
            reasons.append("open objection blocks disposition, not existence")
        if self.agreement and self.agreement.status == "active" and self.agreement.proposal.version != v:
            reasons.append("existing agreement must be resolved, not silently replaced")
        if self.agreement and self.agreement.status == "retired" and self.agreement.proposal.version == v:
            reasons.append("retired agreement cannot be revived in place")
        return reasons

    def commit(self):
        reasons = self.blockers()
        if reasons:
            self.record("blocked", "; ".join(reasons))
            return False
        self.agreement = Agreement(
            self.proposal,
            evidence_version=self.evidence_version,
            authority_version=self.authority_version,
            safety_version=self.safety_version,
        )
        self.record("commit", self.proposal.description)
        return True

    def action_blockers(self):
        if not self.agreement or self.agreement.status != "active":
            return ["No valid, current, active agreement"]
        version = self.agreement.proposal.version
        if any(self.consents.get((version, person)) is not True for person in self.agreement.proposal.participants):
            return ["No valid, current, active agreement"]
        if self.proposal.version == version:
            evidence, authority, safety = self.evidence_version, self.authority_version, self.safety_version
        else:
            evidence, authority, safety = (
                self.agreement.evidence_version,
                self.agreement.authority_version,
                self.agreement.safety_version,
            )
        if evidence != version or authority != version or safety != version:
            return ["Current checks no longer match the live agreement"]
        return []

    def act(self):
        reasons = self.action_blockers()
        if reasons:
            self.record("blocked_action", "; ".join(reasons))
            return False
        version = self.agreement.proposal.version
        self.record("simulated_action", self.agreement.proposal.description, version)
        return True

    def resolve_repair(self, response):
        """Input stands for an agreed response, not enforced continued labor."""
        if not response.strip():
            raise ValueError("Record the agreed response")
        self.repair_open = False
        self.record("repair", response)

    def release(self, reason):
        """G-: retire a form after consequences addressed; never erase record."""
        if not reason.strip() or self.repair_open:
            return False
        if self.agreement:
            self.agreement = replace(self.agreement, status="retired")
        self.record("release", reason)
        return True


if __name__ == "__main__":
    theta = pi / 3
    print("Hopf Workshop v0.2 — numerical geometry, not a proof about people")
    print("Chern integral (chosen sign):", curvature_number())
    print("Latitude holonomy, degrees:", holonomy_angle(theta) * 180 / pi)
    print("Pairwise linking estimate:", linking_number(fibre(theta, 0), fibre(theta, 2*pi/3)))
    w = Workshop()
    w.set_confidence(1.0)
    print("Certain but not authorized — commit:", w.commit())
    w.propose("Carry the dragon through the checked orchard route")
    w.review(evidence=True, authorized=True, safe=True)
    for person in w.proposal.participants:
        w.consent(person, True)
    print("Explicit checked agreement — commit:", w.commit())
    w.withdraw("Bea")
    print("After withdrawal — act:", w.act())
    print("Repair remains recorded:", w.repair_open)
    print("History events retained:", len(w.history))
