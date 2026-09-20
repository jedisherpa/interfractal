"""WeOpoly sequencing rehearsal over the Hopf permission kernel.

PLAY → COORDINATE → ACT, with RETURN as a command. This is simulated practice,
not group rooms, not TAWar production, and not constitutional adoption.
Geometry may suggest a route; it cannot sign a name. Readiness is not consent.
"""

from hopf_model import Workshop, suggestion

PLAYERS = ("Maya", "Finn", "Bea", "Sam")


class Rehearsal:
    """Four-seat practice table. Permission is Workshop; sequencing is WeOpoly-like."""

    def __init__(self):
        self.workshop = Workshop(participants=PLAYERS)
        self.phase = "PLAY"
        self.round = 1
        self.ready_ids = ()
        self.simulated = True
        self.pending_outcomes = ()
        self.last_return = None
        self.acting_version = None
        self._active = {person: True for person in PLAYERS}

    def _live_acting_agreement(self):
        agreement = self.workshop.agreement
        return (
            self.phase == "ACT"
            and agreement is not None
            and agreement.status == "active"
            and self.acting_version == agreement.proposal.version
        )

    def _known(self, actor):
        if actor not in PLAYERS:
            raise ValueError("Unknown participant")
        return actor

    def _clear_ready_if_play(self):
        if self.phase == "PLAY":
            self.ready_ids = ()

    def ready(self, actor, flag):
        self._known(actor)
        if self.phase != "PLAY":
            self.workshop.record("blocked", "Readiness is recorded during PLAY")
            return False
        if not isinstance(flag, bool):
            raise ValueError("Readiness must be an explicit Boolean")
        ids = [person for person in self.ready_ids if person != actor]
        if flag:
            ids.append(actor)
        self.ready_ids = tuple(ids)
        self.workshop.record("ready", f"{actor}: {flag}")
        return True

    def close_round(self):
        if self.phase != "PLAY":
            self.workshop.record("blocked", "Closing the round is a PLAY action")
            return False
        active = [person for person, flag in self._active.items() if flag]
        if any(person not in self.ready_ids for person in active):
            self.workshop.record("blocked", "Each active participant must record their own readiness. Absence is not consent.")
            return False
        self.phase = "COORDINATE"
        self.workshop.record("close_round", f"round {self.round} entered COORDINATE")
        return True

    def begin_act(self):
        if self.phase != "COORDINATE":
            self.workshop.record("blocked", "BEGIN_ACT is available during COORDINATE")
            return False
        if not self.workshop.agreement or self.workshop.agreement.status != "active":
            self.workshop.record("blocked", "Hopf commit is required before ACT; readiness is not authorization")
            return False
        self.acting_version = self.workshop.agreement.proposal.version
        self.phase = "ACT"
        self.workshop.record("begin_act", self.workshop.agreement.proposal.description)
        return True

    def propose(self, description):
        if self.phase == "ACT":
            self.workshop.record("blocked", "A replacement in ACT cannot retag the live round")
            return False
        self._clear_ready_if_play()
        self.workshop.propose(description)
        return True

    def propose_suggestion(self):
        if self.phase == "ACT":
            self.workshop.record("blocked", "A replacement in ACT cannot retag the live round")
            return False
        self._clear_ready_if_play()
        self.workshop.propose_suggestion()
        return True

    def explore(self, theta, phi):
        self._clear_ready_if_play()
        self.workshop.explore(theta, phi)

    def reframe(self, angle):
        self.workshop.reframe(angle)

    def set_confidence(self, value):
        self.workshop.set_confidence(value)

    def review(self, evidence=False, authorized=False, safe=False):
        self.workshop.review(evidence=evidence, authorized=authorized, safe=safe)

    def consent(self, actor, answer):
        self._known(actor)
        self.workshop.consent(actor, answer)

    def commit(self):
        return self.workshop.commit()

    def act(self):
        if not self._live_acting_agreement():
            self.workshop.record("blocked_action", "Simulated action requires the ACT phase on the agreement that entered it")
            return False
        return self.workshop.act()

    def record_outcome(self, actor, result, evidence):
        self._known(actor)
        if not self._live_acting_agreement():
            self.workshop.record("blocked", "Outcomes are recorded during ACT on the agreement that entered it")
            return False
        if result not in ("completed", "failed"):
            raise ValueError("Outcome must be completed or failed")
        if not str(evidence).strip():
            raise ValueError("Record the evidence")
        self.pending_outcomes += ((actor, result, evidence.strip()),)
        self.workshop.record("outcome", f"{actor}: {result} - {evidence.strip()}")
        return True

    def return_round(self):
        if not self._live_acting_agreement():
            self.workshop.record("blocked", "RETURN does not revive a paused or retired agreement or skip BEGIN_ACT")
            return False
        applied = len(self.pending_outcomes)
        changes = [f"{actor}: {result}" for actor, result, _evidence in self.pending_outcomes]
        if not changes:
            changes = ["No new outcomes were applied. Unfinished work remains visible."]
        self.last_return = {
            "round": self.round,
            "applied": applied,
            "changes": tuple(changes),
        }
        self.pending_outcomes = ()
        self.round += 1
        self.phase = "PLAY"
        self.ready_ids = ()
        self.acting_version = None
        self.workshop.record("return", f"round {self.last_return['round']} applied {applied} outcome(s)")
        return True

    def withdraw(self, actor):
        self._known(actor)
        self.workshop.withdraw(actor)

    def resolve_repair(self, response):
        self.workshop.resolve_repair(response)

    def release(self, reason):
        return self.workshop.release(reason)
