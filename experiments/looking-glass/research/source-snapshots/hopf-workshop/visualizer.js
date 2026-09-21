/**
 * Pure view-model for the Hopf Workshop Visualizer.
 * Commands stay outside this file. Topology does not authorize.
 */
"use strict";

const Visualizer = (() => {
  function consentValue(workshop, person, version) {
    if (workshop.consents[`${version}:${person}`] !== undefined) {
      return workshop.consents[`${version}:${person}`];
    }
    return workshop.consents[[version, person]];
  }

  function withdrawAgreementVersion(event) {
    const match = String(event.detail || "").match(/agreement v(\d+)/);
    if (match) return Number(match[1]);
    return event.version;
  }

  function withdrawnActors(workshop, agreementVersion) {
    const names = new Set();
    (workshop.history || []).forEach((event) => {
      if (event.kind !== "withdraw") return;
      const eventAgreement = withdrawAgreementVersion(event);
      if (agreementVersion != null && eventAgreement !== agreementVersion && eventAgreement !== undefined) return;
      const name = String(event.detail || "").split(" ")[0];
      if (name) names.add(name);
    });
    return names;
  }

  function withdrawnVersions(workshop, person) {
    const versions = new Set();
    (workshop.history || []).forEach((event) => {
      if (event.kind !== "withdraw") return;
      const name = String(event.detail || "").split(" ")[0];
      if (name !== person) return;
      const version = withdrawAgreementVersion(event);
      if (version != null) versions.add(version);
    });
    return versions;
  }

  function earlierResponses(workshop, person, currentVersion) {
    const withdrawn = withdrawnVersions(workshop, person);
    const found = [];
    Object.keys(workshop.consents || {}).forEach((key) => {
      const parts = String(key).split(":");
      if (parts.length !== 2) return;
      const version = Number(parts[0]);
      const name = parts[1];
      if (name !== person || version === currentVersion || Number.isNaN(version)) return;
      const answer = workshop.consents[key];
      let label = "unknown";
      if (withdrawn.has(version)) label = "withdrawn";
      else if (answer === true) label = "yes";
      else if (answer === false) label = "no";
      found.push({ version, answer: label });
    });
    withdrawn.forEach((version) => {
      if (version === currentVersion) return;
      if (found.some((item) => item.version === version)) return;
      found.push({ version, answer: "withdrawn" });
    });
    return found.sort((left, right) => right.version - left.version);
  }

  function reviewsFor(workshop, version) {
    const evidence = workshop.evidenceVersion ?? workshop.evidence_version;
    const authority = workshop.authorityVersion ?? workshop.authority_version;
    const safety = workshop.safetyVersion ?? workshop.safety_version;
    return [
      { id: "review:evidence", kind: "evidence", label: "Bounded test", recorded: evidence === version, version: evidence ?? null },
      { id: "review:authority", kind: "authority", label: "Authority", recorded: authority === version, version: authority ?? null },
      { id: "review:safety", kind: "safety", label: "Safety", recorded: safety === version, version: safety ?? null },
    ];
  }

  function recordedActions(workshop) {
    return (workshop.history || [])
      .filter((event) => event.kind === "simulated_action")
      .map((event) => ({
        id: `action:${event.index}`,
        agreementVersion: event.version,
        wording: event.detail,
        outcome: "recorded",
      }));
  }

  function actionAvailability(workshop) {
    const reasons = typeof workshop.blockers === "function" ? workshop.blockers() : [];
    const live = workshop.agreement;
    const actReasons = typeof workshop.actionBlockers === "function"
      ? workshop.actionBlockers()
      : (!live || live.status !== "active" ? ["No valid, current, active agreement"] : []);
    const alreadySealed = Boolean(
      live && live.status === "active" && live.proposal.version === workshop.proposal.version
    );
    return [
      {
        id: "commit",
        label: "Make this agreement",
        available: reasons.length === 0 && !alreadySealed,
        reasons: alreadySealed ? ["This version is already the live promise"] : reasons,
      },
      {
        id: "act",
        label: "Try the agreed action",
        available: actReasons.length === 0,
        reasons: actReasons,
        agreementVersion: live ? live.proposal.version : null,
        wording: live ? live.proposal.description : null,
      },
      {
        id: "repair",
        label: "Record the response to earlier consequences",
        available: Boolean(workshop.repairOpen),
        reasons: workshop.repairOpen ? [] : ["No open repair"],
      },
      {
        id: "release",
        label: "Release / retire",
        available: Boolean(live) && !workshop.repairOpen,
        reasons: workshop.repairOpen
          ? ["previous consequences need an agreed response"]
          : live
            ? []
            : ["No agreement to retire"],
      },
    ];
  }

  function nextStep(view) {
    if (view.timeContext && view.timeContext.kind === "history") {
      return "This is a recorded moment. Return to current to issue a command.";
    }
    if (view.agreement && view.agreement.status === "paused") {
      return view.consequences.some((item) => item.state === "needed")
        ? "Record a response to earlier consequences. That does not restore consent."
        : "Action is paused. Repair does not restore a withdrawn yes.";
    }
    if (view.agreement && view.agreement.status === "active") {
      const act = (view.actionAvailability || []).find((item) => item.id === "act");
      if (act && !act.available) {
        return `Needed: ${act.reasons.join("; ")}`;
      }
      return "Try the agreed action. It uses the active agreement, not a later draft.";
    }
    if (view.agreement && view.agreement.status === "retired") {
      return "This agreement is retired. History remains. Replay cannot revive it.";
    }
    if (view.needed && view.needed.length) {
      return `Needed: ${view.needed.join("; ")}`;
    }
    return "Make this agreement is still a separate command.";
  }

  function projectParade(workshop, extras = {}) {
    const proposal = workshop.proposal;
    const version = proposal.version;
    const agreement = workshop.agreement;
    const agreementVersion = agreement ? agreement.proposal.version : null;
    const withdrawn = withdrawnActors(workshop, agreementVersion);
    const participants = proposal.participants.map((name) => {
      const answer = consentValue(workshop, name, version);
      let response = "unset";
      if (withdrawn.has(name) && agreementVersion === version) response = "withdrawn";
      else if (answer === true) response = "yes";
      else if (answer === false) response = "no";
      return {
        id: `person:${name}`,
        name,
        response,
        responseVersion: answer === true || answer === false ? version : null,
        earlier: earlierResponses(workshop, name, version),
        ready: null,
      };
    });
    const events = (workshop.history || []).map((event, index) => ({
      id: `event:${event.index ?? index}`,
      index: event.index ?? index,
      kind: event.kind,
      proposalVersion: event.version,
      agreementVersion: event.kind === "withdraw"
        ? withdrawAgreementVersion(event)
        : event.kind === "simulated_action" || event.kind === "commit" || event.kind === "release"
          ? event.version
          : null,
      detail: event.detail,
    }));
    const repairNeeded = Boolean(workshop.repairOpen);
    const repairRecorded = (workshop.history || []).some((event) => event.kind === "repair");
    const lastAction = recordedActions(workshop).slice(-1)[0] || null;
    const view = {
      scopeId: extras.scopeId || "parade",
      sourceRevision: (workshop.history || []).length,
      snapshotId: extras.snapshotId || `parade:${(workshop.history || []).length}`,
      timeContext: extras.timeContext || { kind: "current" },
      proposal: proposal
        ? { id: `proposal:${version}`, version, description: proposal.description }
        : null,
      exploration: extras.exploration || null,
      agreement: agreement
        ? {
            id: `agreement:${agreement.proposal.version}`,
            status: agreement.status,
            version: agreement.proposal.version,
            description: agreement.proposal.description,
          }
        : null,
      participants,
      recordedReviews: reviewsFor(workshop, version),
      actionAvailability: actionAvailability(workshop),
      needed: typeof workshop.blockers === "function" ? workshop.blockers() : [],
      round: null,
      actions: recordedActions(workshop),
      lastAction,
      outcomes: extras.outcomes || [],
      consequences: repairNeeded
        ? [{
            id: "consequence:repair",
            state: "needed",
            label: "Response needed",
            sourceAction: lastAction ? lastAction.id : null,
          }]
        : repairRecorded
          ? [{
              id: "consequence:repair",
              state: "recorded",
              label: "Response recorded",
              sourceAction: lastAction ? lastAction.id : null,
            }]
          : [],
      events,
      dataHealth: "ok",
    };
    view.nextStep = nextStep(view);
    return view;
  }

  function projectRehearsal(rehearsal, extras = {}) {
    const workshop = rehearsal.workshop;
    const readyIds = rehearsal.readyIds || [];
    const outcomes = (rehearsal.pendingOutcomes || []).map((item, index) => {
      const [actor, result, evidence] = Array.isArray(item) ? item : [item.actor, item.result, item.evidence];
      return {
        id: `outcome:${index}:${actor}`,
        actor,
        result,
        evidence,
        applied: false,
      };
    });
    const base = projectParade(workshop, {
      ...extras,
      scopeId: "rehearsal",
      snapshotId: extras.snapshotId || `rehearsal:${(workshop.history || []).length}:${rehearsal.phase}:${rehearsal.round}`,
      outcomes,
    });
    base.round = {
      phase: rehearsal.phase,
      round: rehearsal.round,
      lastReturn: rehearsal.lastReturn
        ? { round: rehearsal.lastReturn.round, applied: rehearsal.lastReturn.applied }
        : null,
    };
    const seats = workshop.proposal.participants.slice();
    base.participants = seats.map((name) => {
      const existing = base.participants.find((person) => person.name === name);
      const answer = consentValue(workshop, name, workshop.proposal.version);
      return {
        id: `person:${name}`,
        name,
        response: existing ? existing.response : answer === true ? "yes" : answer === false ? "no" : "unset",
        responseVersion: existing ? existing.responseVersion : (answer === true || answer === false ? workshop.proposal.version : null),
        earlier: existing ? existing.earlier : earlierResponses(workshop, name, workshop.proposal.version),
        ready: readyIds.includes(name),
      };
    });
    if (!workshop.agreement && rehearsal.phase === "PLAY") {
      base.nextStep = "Readiness is not consent. Close round is not a Hopf agreement.";
    }
    return base;
  }

  function entities(view) {
    const items = [{ id: "overview", type: "overview", label: "Current decision", version: null }];
    if (view.exploration) {
      items.push({
        id: view.exploration.id || "exploration",
        type: "exploration",
        label: "Exploration",
        version: null,
      });
    }
    if (view.proposal) {
      items.push({
        id: view.proposal.id,
        type: "proposal",
        label: `Proposal v${view.proposal.version}`,
        version: view.proposal.version,
      });
    }
    if (view.agreement) {
      items.push({
        id: view.agreement.id,
        type: "agreement",
        label: `Agreement v${view.agreement.version} · ${view.agreement.status}`,
        version: view.agreement.version,
      });
    }
    (view.participants || []).forEach((person) => {
      items.push({
        id: person.id,
        type: "person",
        label: person.name,
        version: person.responseVersion,
      });
    });
    (view.recordedReviews || []).forEach((review) => {
      items.push({
        id: review.id,
        type: "review",
        label: review.label,
        version: review.version,
      });
    });
    (view.consequences || []).forEach((item) => {
      items.push({ id: item.id, type: "consequence", label: item.label, version: null });
    });
    (view.events || []).forEach((event) => {
      items.push({
        id: event.id,
        type: "event",
        label: `${event.kind} v${event.proposalVersion}`,
        version: event.proposalVersion,
      });
    });
    return items;
  }

  function inspect(view, selection) {
    const selected = selection || { type: "overview", id: "overview" };
    if (selected.type === "proposal" && view.proposal) {
      return {
        title: `Proposal v${view.proposal.version}`,
        body: view.proposal.description,
        version: view.proposal.version,
      };
    }
    if (selected.type === "agreement") {
      if (!view.agreement) {
        return { title: "No agreement", body: "The agreement slot is empty. A valid explicit command creates one.", version: null };
      }
      return {
        title: `Agreement v${view.agreement.version} · ${view.agreement.status}`,
        body: view.agreement.description,
        version: view.agreement.version,
      };
    }
    if (selected.type === "person") {
      const person = (view.participants || []).find((item) => item.id === selected.id || item.name === selected.name);
      if (!person) return { title: "Unknown person", body: "This seat is not in the current practice.", version: null };
      const earlier = (person.earlier || [])
        .map((item) => `${item.answer} · v${item.version}`)
        .join("; ");
      const ready = person.ready == null ? "not a rehearsal seat fact" : person.ready ? "ready" : "not ready";
      return {
        title: person.name,
        body: `Response on this proposal: ${person.response}${person.responseVersion != null ? ` · v${person.responseVersion}` : ""}. Readiness: ${ready}. Earlier evidence: ${earlier || "none"}. Selecting a person does not sign in as that person.`,
        version: person.responseVersion,
      };
    }
    if (selected.type === "review") {
      const review = (view.recordedReviews || []).find((item) => item.id === selected.id);
      if (!review) return { title: "Review", body: "Unknown requirement.", version: null };
      return {
        title: review.label,
        body: review.recorded
          ? `Recorded for v${review.version}.`
          : "Not recorded for this proposal version. A draft tick is not a recorded review.",
        version: review.version,
      };
    }
    if (selected.type === "event") {
      const event = (view.events || []).find((item) => item.id === selected.id);
      if (!event) return { title: "Event", body: "Unknown record.", version: null };
      return {
        title: `${event.kind} · event ${event.index}`,
        body: event.detail,
        version: event.agreementVersion || event.proposalVersion,
      };
    }
    if (selected.type === "exploration") {
      return {
        title: "Exploration",
        body: view.exploration
          ? `${view.exploration.description}. This is a candidate, not a proposal, until an explicit propose command.`
          : "No exploratory candidate is attached.",
        version: null,
      };
    }
    if (selected.type === "consequence") {
      const item = (view.consequences || []).find((entry) => entry.id === selected.id);
      return {
        title: item ? item.label : "Consequences",
        body: item && item.state === "needed"
          ? "A response is needed. Recording it does not restore a withdrawn yes."
          : "Repair updates this item only. Consent stays as recorded.",
        version: null,
      };
    }
    return {
      title: "Current decision",
      body: [
        view.proposal ? `Considering proposal v${view.proposal.version}: ${view.proposal.description}` : "No proposal.",
        view.agreement
          ? `Currently agreed: v${view.agreement.version} (${view.agreement.status}) ${view.agreement.description}`
          : "Currently agreed: none.",
        view.needed && view.needed.length ? `Needed: ${view.needed.join("; ")}` : "Needed: none listed.",
        `Next: ${view.nextStep}`,
      ].join(" "),
      version: view.proposal ? view.proposal.version : null,
    };
  }

  function sameFacts(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  return {
    projectParade,
    projectRehearsal,
    reviewsFor,
    entities,
    inspect,
    sameFacts,
    actionAvailability,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = Visualizer;
}
