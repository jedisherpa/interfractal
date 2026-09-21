/**
 * Decision-stage painter. Reads a VisualizerView only.
 * Selection is not a command. Topology does not authorize.
 */
"use strict";

const VisualizerUI = (() => {
  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function setPressed(id, on) {
    const node = $(id);
    if (node) node.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function responseLabel(person) {
    if (person.response === "yes") return `Said yes to v${person.responseVersion}`;
    if (person.response === "no") return `Said no to v${person.responseVersion}`;
    if (person.response === "withdrawn") return `Stopped · v${person.responseVersion || "?"}`;
    if (person.earlier && person.earlier.length) {
      const last = person.earlier[0];
      const prior = last.answer === "withdrawn" ? "stopped" : last.answer;
      return `Has not answered this draft (earlier ${prior} on v${last.version})`;
    }
    return "Has not answered";
  }

  function paintPeople(view, selection) {
    const host = $("vz-people-list");
    if (!host) return;
    const key = view.participants.map((person) => person.name).join(",");
    if (host.dataset.key !== key) {
      const focused = document.activeElement && host.contains(document.activeElement)
        ? document.activeElement.id
        : null;
      host.dataset.key = key;
      host.innerHTML = view.participants.map((person) => `
        <button type="button" class="vz-person" id="vz-${escapeHtml(person.id.replace(":", "-"))}" data-select="person" data-id="${escapeHtml(person.id)}">
          <strong>${escapeHtml(person.name)}</strong>
          <span class="vz-response" id="vz-response-${escapeHtml(person.name)}"></span>
          <span class="vz-ready" id="vz-ready-${escapeHtml(person.name)}"></span>
        </button>`).join("");
      if (focused && $(focused)) $(focused).focus();
    }
    view.participants.forEach((person) => {
      const button = host.querySelector(`[data-id="${person.id}"]`);
      const response = $(`vz-response-${person.name}`);
      const ready = $(`vz-ready-${person.name}`);
      if (response) response.textContent = responseLabel(person);
      if (ready) {
        if (person.ready == null) ready.textContent = "";
        else ready.textContent = person.ready ? "Ready for the round — not a yes" : "Not ready";
      }
      if (button) {
        button.dataset.response = person.response;
        button.setAttribute("aria-pressed", selection && selection.id === person.id ? "true" : "false");
      }
    });
  }

  function replaceList(host, html) {
    const focused = document.activeElement && host.contains(document.activeElement)
      ? document.activeElement.getAttribute("data-id")
      : null;
    if (host.dataset.html === html) return focused;
    host.dataset.html = html;
    host.innerHTML = html;
    if (focused) {
      const node = host.querySelector(`[data-id="${focused}"]`);
      if (node) node.focus();
    }
    return focused;
  }

  function paintReviews(view, selection) {
    const host = $("vz-reviews");
    if (!host) return;
    const html = view.recordedReviews.map((review) => {
      const selected = selection && selection.id === review.id;
      const state = review.recorded ? `Recorded · v${review.version}` : "Not recorded for this version";
      return `<button type="button" class="vz-review${review.recorded ? " recorded" : ""}" data-select="review" data-id="${escapeHtml(review.id)}" aria-pressed="${selected ? "true" : "false"}">
        <strong>${escapeHtml(review.label)}</strong>
        <span>${escapeHtml(state)}</span>
      </button>`;
    }).join("");
    replaceList(host, html);
  }

  function paintEvents(view, selection, cursor) {
    const host = $("vz-events");
    if (!host) return;
    const html = view.events.map((event) => {
      const selected = (selection && selection.id === event.id) || (cursor != null && cursor === event.index);
      return `<button type="button" class="vz-event" data-select="event" data-id="${escapeHtml(event.id)}" data-index="${event.index}" aria-pressed="${selected ? "true" : "false"}">
        <span class="vz-event-index">${String(event.index).padStart(2, "0")}</span>
        <span>${escapeHtml(event.kind)}</span>
        <span>v${event.agreementVersion != null ? event.agreementVersion : event.proposalVersion}</span>
      </button>`;
    }).join("");
    replaceList(host, html);
    if (cursor != null) {
      const current = host.querySelector(`[data-index="${cursor}"]`);
      if (current) current.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  function paintNavigator(view, selection) {
    const select = $("vz-navigator");
    if (!select) return;
    const items = Visualizer.entities(view);
    const current = selection && selection.id ? selection.id : "overview";
    const keepFocus = document.activeElement === select;
    select.innerHTML = items.map((item) =>
      `<option value="${escapeHtml(item.id)}" data-type="${escapeHtml(item.type)}"${item.id === current ? " selected" : ""}>${escapeHtml(item.label)}</option>`
    ).join("");
    select.value = items.some((item) => item.id === current) ? current : "overview";
    if (keepFocus) select.focus();
  }

  function paint(view, ui) {
    const root = $("visualizer");
    if (!root) return;
    root.dataset.lens = ui.lens || "decision";
    document.body.dataset.lens = ui.lens || "decision";
    root.dataset.scope = view.scopeId;
    root.dataset.health = view.dataHealth;
    root.dataset.time = view.timeContext.kind;
    const practice = view.scopeId === "rehearsal"
      ? `Maya, Finn, Bea, and Sam · round ${view.round ? view.round.round : "?"} · ${view.round ? view.round.phase : "PLAY"}`
      : "Maya, Finn, and Bea · now";
    $("vz-practice").textContent = practice;
    setPressed("lens-decision", ui.lens !== "geometry");
    setPressed("lens-geometry", ui.lens === "geometry");
    setPressed("vz-pause-motion", Boolean(ui.motionPaused));

    const exploration = view.exploration
      ? `The drawing is still exploring “${view.exploration.description}”. That is not this plan.`
      : "No drawing exploration is attached.";
    $("vz-possibility-type").textContent = view.proposal ? "This version of the plan" : (view.exploration ? "A drawing idea, not a plan" : "The idea");
    $("vz-possibility-copy").textContent = view.proposal
      ? `Plan v${view.proposal.version}: ${view.proposal.description}`
      : "No plan is on the table.";
    $("vz-possibility-extra").textContent = exploration;

    const agreement = $("vz-agreement");
    agreement.dataset.status = view.agreement ? view.agreement.status : "empty";
    $("vz-agreement-status").textContent = view.agreement ? view.agreement.status : "none yet";
    $("vz-agreement-copy").textContent = view.agreement
      ? `Promise v${view.agreement.version}: ${view.agreement.description}`
      : "No one has promised this yet. Checks and yeses are not a promise until Make this agreement.";

    paintPeople(view, ui.selection);
    paintReviews(view, ui.selection);

    const consequences = $("vz-consequences-list");
    if (!view.consequences.length && !view.actions.length && !(view.outcomes || []).length) {
      consequences.textContent = "Nothing has been tried on a promise yet.";
    } else {
      const actionBits = view.actions.map((item) =>
        `Tried the promise v${item.agreementVersion}: ${item.wording}`
      );
      const repairBits = view.consequences.map((item) => item.label);
      const outcomeBits = (view.outcomes || []).map((item) =>
        `Pending outcome ${item.actor}: ${item.result}`
      );
      consequences.textContent = [...actionBits, ...repairBits, ...outcomeBits].join(" · ") || "None.";
    }

    paintEvents(view, ui.selection, ui.cursor);
    const replay = $("vz-replay-label");
    if (view.timeContext.kind === "history") {
      const index = ui.cursor == null ? 0 : ui.cursor;
      const total = Math.max(view.events.length, 1);
      replay.textContent = `Looking at a past step (${index + 1} of ${total}) — not live`;
    } else {
      replay.textContent = "Now";
    }
    $("vz-current-flag").hidden = !ui.staleCurrent;
    $("vz-return-current").disabled = view.timeContext.kind !== "history";

    const overview = Visualizer.inspect(view, { type: "overview", id: "overview" });
    const detail = Visualizer.inspect(view, ui.selection);
    $("vz-deciding").textContent = view.proposal
      ? `What is the idea? Plan v${view.proposal.version}: ${view.proposal.description}`
      : "What is the idea? Nothing is on the table.";
    $("vz-agreed").textContent = view.agreement
      ? `What did they promise? ${view.agreement.status} plan v${view.agreement.version}: ${view.agreement.description}`
      : "What did they promise? Nothing yet. An idea is not a promise.";
    $("vz-needed").textContent = view.agreement && view.agreement.status === "active"
      ? "What is needed? The promise is in force. Try the agreed action uses this version, not a later draft."
      : view.needed.length
        ? `What is needed? ${view.needed.join("; ")}`
        : "What is needed? The listed checks are recorded. Make this agreement is still a separate step.";
    $("vz-next").textContent = `What can happen next? ${view.nextStep}`;
    $("vz-detail").textContent = `${detail.title}: ${detail.body}`;

    const commit = view.actionAvailability.find((item) => item.id === "commit");
    const act = view.actionAvailability.find((item) => item.id === "act");
    const reasons = [
      ...(commit && !commit.available ? commit.reasons : []),
      ...(act && !act.available ? act.reasons : []),
    ];
    if (view.dataHealth && view.dataHealth !== "ok") {
      $("vz-why-blocked").textContent = `History data: ${view.dataHealth}. Replay will not invent missing facts.`;
    } else if (view.agreement && view.agreement.status === "active") {
      $("vz-why-blocked").textContent = act && !act.available
        ? `Blocked: ${act.reasons.join("; ")}`
        : "Try the agreed action uses the live promise.";
    } else {
      $("vz-why-blocked").textContent = reasons.length
        ? `Blocked: ${reasons.join("; ")}`
        : (commit && commit.available ? "Make this agreement is available. It still needs the explicit command." : "");
    }

    const compare = $("vz-compare");
    if (view.agreement && view.proposal && view.agreement.version !== view.proposal.version) {
      compare.hidden = false;
      compare.textContent = `The new plan is v${view.proposal.version}. The live promise is still v${view.agreement.version}. Yes marks from v${view.agreement.version} do not apply to v${view.proposal.version}.`;
    } else {
      compare.hidden = true;
      compare.textContent = "";
    }

    const beforeAfter = $("vz-before-after");
    if (ui.beforeAfter) {
      beforeAfter.hidden = false;
      beforeAfter.textContent = ui.beforeAfter;
    } else {
      beforeAfter.hidden = true;
    }

    const geo = $("vz-geo-inspect");
    if (ui.lens === "geometry" && ui.geometry) {
      geo.hidden = false;
      geo.textContent = ui.geometry;
    } else {
      geo.hidden = true;
    }

    paintNavigator(view, ui.selection);
    $("vz-stage").setAttribute(
      "aria-label",
      `Decision stage for ${practice}. ${view.proposal ? `Proposal v${view.proposal.version}` : "No proposal"}. ${view.agreement ? `Agreement ${view.agreement.status} v${view.agreement.version}` : "No agreement"}.`
    );
  }

  return { paint, responseLabel };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = VisualizerUI;
}
