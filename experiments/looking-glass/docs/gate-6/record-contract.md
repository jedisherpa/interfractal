# Gate 6 state, event and preservation contract

Version `gate-6-record-v1`. Astra owns `docs/gate-6/` and later requested synthesis; Sol builds `local-models/`; a separate Sol worker audits; root operates the real browser, records evidence, approvals/status and preservation; Luna supplies bounded source review. No agent's result advances the gate.

Base revision is the saved Gate 5 commit `56a8e69` (record the actual full revision in each build). Port43999 is local only. Use content-derived `g6-<prefix>` build IDs, complete SHA-256 source manifests, runtime/dependency identities (or explicit absence), frozen prespec hashes, Gate 2 source pins and deterministic run data. Run IDs begin `G6-LOCAL-001`; initial candidate plus two justified revisions is the experiment budget. Preserve prior builds, failures and all 668 prior frozen entries. No Gate 0–5 file is an edit target.

## Observable state

Equivalent implementation names are allowed only with exact mapping in `local-models/README.md` before browser collection. The required concepts are:

| Boundary | Inspectable content |
|---|---|
| Identity | Gate, run/build/full source hash, schema/model/rule versions, runtime/backend, seed null. |
| Source | Complete four-record payload/history/provenance and immutable hashes; both original reference definitions and four-row mapping tables. |
| Local models | Two manifests, retained local reference IDs/versions, selected record references, alternatives, typed dependencies/evidence and complete local history. |
| Larger view | Active larger reference, selected local or null, expanded local IDs, representation, arbitrary layout and declared coordinate slots. |
| Projection | Exact visible/serialized outward payloads, active summary revisions, full immutable revision history, omitted-field status and source pointers. |
| Receiver | Active derivative requirement/version, outward-only evaluator inputs/result/missing fields, narrow-scope explanation and availability caveat. Full-source oracle if exposed is separately labeled and cannot leak into v1. |
| Trace | Trigger requirement revision, affected record fields/local IDs, before/after evaluations, attributed outward revisions and prior revisions. |
| Relations | Supported typed edges and evidence; separate unsupported claim with empty evidence; inspected relation ID, inclusion/exclusion status. |
| Alternatives | Both complete original references and mappings, synthetic proposal authors, local choices; no agreement inference. |
| Clock | Quantized0..30000ms,100ms quantum,1000ms step, seven checkpoints, paused/playing, canonical/exploration and overrides. |
| Environment | Actual viewport/DPR, relevant scene/table/inspector rectangles/visibility, scroll position and display options. |

Refresh environment measurements on each observation and on resize, scroll, DPR/resolution change and paint; do not retain stale startup values. It is excluded from deterministic hashes but retained with evidence. Scene visibility must be truthful after mode changes. At tested viewport widths, documentWidth≤clientWidth+1CSSpx; wrap long hashes/labels in details. Lower details may require vertical scrolling. Do not claim OS reduced-motion testing unless actually emulated.

Checkpoint state includes time, mode/overrides, larger reference, active receiver, summary revisions and payloads, local expansion/selection, visibility toggles, inspected item, representation and layout. Exclude wall time, playing flag, environment/scroll, focus/hover, session IDs, event history/counts and diagnostics. Start and every canonical checkpoint use graph representation and the declared baseline selected state. Fingerprint boundaries otherwise follow the model contract. Canonical0/10/30 semantic state is identical apart from time; canonical restore clears every exploration field without clearing event history.

Establish all seven hash baselines in the real browser before comparing repeat restore/reopen/reload in that same browser/build. Cross-runtime generated hashes are diagnostics, not a substitute for actual restore checks. Include complete raw state with hashes so failures can be diagnosed. Historical Gate 2 and Gate 5 library links preserve their exact run/build and paused state; disclose supported-tool failures instead of inventing captures.

## Append-only actual activity

Every meaningful event contains seq, sessionId, runId, buildId, type, intended payload, wallTimeUtc, simTimeBeforeMs/AfterMs, observed state/fingerprints, mode, actor and origin. Actor is `unspecified-ui` unless authenticated; root's separate trace names automated browser input. Synthetic fixture revision authors are a different field. Origins are `manual-control`, `automatic-playback`, `programmatic-restore`. Failed/rejected actions stay recorded distinctly.

| Event | Required intention and observed result |
|---|---|
| replay.open | Requested and actual identity, paused0, programmatic-restore. |
| playback.play / pause | Real manual start/resume/replay click; endpoint pause automatic-playback with reason exactly `end-of-sequence` at30000ms. |
| playback.step / seek | Requested delta/time, clamped quantized actual time, paused result. |
| checkpoint.restore / experiment.reset | Manual restore intent, full canonical state; history retained. |
| reference.set | Requested exact larger reference identity, changed assignments/summary criterion, unchanged local/source records. |
| local.select / local.expand / local.collapse | Target from graph object or plain row; resulting selection/expansion; recoverable full local payload. |
| trace.inspect | Selected local/type, actual dependency or budget evidence; counts as navigation, not repair. |
| summary.repair | Requested v2, actual derived payload and outward-only receiver result; explicit correction category. |
| requirement.set | Requested receiver version, affected field trace, actual v3 or preserved prior summary state. |
| references.compare | Both alternatives/proposals retained, actual visibility; no commitment. |
| claims.show / relation.inspect | Actual claim visibility and selected relation, evidence/status/exclusion. |
| representation.set / layout.set | Actual mode/layout, fresh environment, semantic invariants unchanged. |

A single control may map to another event name if intent and category are explicit. Actual summary correction and requirement controls pause and mark exploration. Replay's predetermined revisions are automatic sequence states, not invented manual actions. Reopening/reloading creates a separate session and an observed external trace as appropriate. The browser log must be exportable/persistable without writing canonical run files.

## Route measurement and evidence freeze

Use the charter's N1/N2 routes and exact matched baselines. Preserve actual successful semantic counts, setup, correction, scrolls, failed attempts and physical tool calls separately, with start/end observation IDs and run/build. Different rendering modes alone do not count as task navigation. A route's endpoint requires the declared factual evidence to be displayed/inspectable; a click count without endpoint evidence is not success. No human-effort or performance inference follows.

Freeze the five prespec files with actual UTC after builder agreement and before any Gate 6 browser trial. No expected data may be mislabeled observed. Material changes to hypotheses or scoring require an explicitly versioned prespecification, not a quiet rewrite. Ordinary code repairs retain the frozen contract and failed candidate.

Root retains raw observations, semantic events, action trace, console scope, unmodified images with capture index, and all anomalies. Every capture links to run/build and bracketing states, simulation time, active reference/requirement, summary revision, mode, selection, viewport/DPR and actual original dimensions. During playback do not invent an atomic time; use bracketing observations. Inspect images for legibility, misleading links, disclosure of omissions, dense details and parity.

The final packet has paused replay/build identity, short watch guide, approximately two–four selected original images, all five cases, route measurements, expected/observed/interpretation/unresolved table, failed candidates, audit and recovery instructions. Root verifies all earlier frozen entries and freezes new evidence. Stop after presenting Gate 6; Gate 7 remains unapproved.
