# Gate 8 evidence, replay and audit contract

Version `gate8-record-v1`. Required checks below are pending until actually run. Preserve failures and unavailable evidence rather than filling in expected results.

## Artifacts and identities

Use `ambiguity/`; candidate runs `G8-AMBIGUITY-001` through at most003; content-addressed runnable builds `g8-<source-hash-prefix>`. Bind only loopback, provisionally port44001 after checking availability. Each run records build/source digest, exact served file manifest, actual Node version/executable, base Git revision, frozen prespec hashes, creation time and renderer. Keep immutable candidate source bytes and `run.json`, `initial-state.json`, `events.jsonl`, `checkpoints.json`, and computational results. Build construction must verify rather than overwrite an existing content-addressed directory.

The canonical run is a software demonstration, 32 seconds with nine checkpoints; it contains no participant responses or revealed certificates. Computational benchmark results may include full certificates. `humanParticipantCount:0` is provenance metadata, not a response dataset. Only the host freezes the final evidence after the independent audit; status files and replay controls are not approval.

## State and event meanings

Browser-observable state contains run/build/fixture identity; mode; paused; cursorSeconds; caseId; referenceWorldId; ordered selected additional-query IDs; camera yaw; certificate visibility; exact ordered observed bundle; compatible-world IDs; local property-determined flag; exact family-certificate summary when intentionally expanded; diagnostic pair comparisons; semantic and information fingerprints; fresh viewport and scene metadata. State serialization returns complete JSON, not truncated object previews. Public candidate source coordinates are permitted because the model is transparent.

Every semantic event has sequence, UTC timestamp, session/run/build identity, current simulation cursor, origin, actor/provenance, type, intended payload and before/after semantic fingerprints. `origin` is `user-control`, `replay` or `automatic`; a UI-origin event does not imply a human actor. Host browser actions are explicitly `software_validation` in the evidence; default local actor is `unattributed_local`. There is no gate-approval event.

Types cover case/reference selection, add-query, reset-observations, camera selection, certificate reveal/hide, tour play/pause/replay, previous/next/checkpoint restore, reopen saved start and natural stop. Repeated add-query records a no-op or an explicit `already-selected` result rather than a fictitious new observation. Invalid/off-menu query IDs are rejected without changing state. Natural stop is `origin:automatic`, type `tour-stop`, reason exactly `end-of-sequence`, cursor32, paused true. Replay transitions are distinguishable from manual controls and automatic stop. Inspector/scroll/resize can live in host observations without polluting model events.

Canonical tour event granularity is explicit:

- At cursor0, save the paused C01/W01 baseline in `initial-state.json`. Initialization is an `initial-state` record, not a semantic interaction or a fabricated user-control event. An actual later play, replay, checkpoint restore or reopen action retains its own event and actual origin.
- At cursor24, emit two consecutive `origin:replay`, type `add-query` events: first `sliceMinus2`, then `slicePlus2`, following fixture query order. Each event adds only its named query and records its own before/after semantic fingerprints; do not replace these with a batch event. The cursor24 checkpoint contains both queries.
- At cursor32, first emit `origin:replay`, type `add-query` for `xw90` in C04/W01; then emit `origin:automatic`, type `tour-stop`, reason `end-of-sequence`. Both events have cursor32, distinct increasing sequence numbers and individually recorded before/after fingerprints. The stop's before fingerprint matches the add-query's after fingerprint. The cursor32 checkpoint is the resulting paused state with `xw90` selected.

For multiple events at one boundary, event sequence order determines their order; timestamps need not differ. Consecutive same-boundary events form a before/after fingerprint chain. Checkpoint snapshots represent the state after all events at that boundary, not intermediate states.

## Independent model and build audit

Before browser trials, an auditor recomputes all outputs from the prespecified rational equations without importing implementation calculations as the oracle. Check all nine pairs, exact and diagnostic distinctions, all twelve additional-query subsets, every minimal-subset result, C03's surviving witness and explicitly outside-menu alternative, and C04's zero exact additional-query minimum. Check labels with negative-zero normalization and kind-sensitive point/empty/ball distinctions. Floating drawing checks use absolute tolerance1e−10, separately from exact comparisons. Confirm the fixture is unchanged, query order is deterministic and all observations derive from original sources.

Test camera-only invariance for every case at every allowed yaw: raw bundles, compatible IDs and information hashes must be unchanged. Check information hashes also agree across reference worlds that produce identical selected observations. Check reference selection resets baseline as contracted, repeated queries add no evidence, forbidden queries are rejected, certificate toggles leave information hashes unchanged, and saved replay excludes exploration/reveal changes.

Check the exact immutable build, manifest, source and fixture hashes, supported routes and loopback binding. Serve no arbitrary directory tree or traversal path. The public fixture intentionally discloses worlds/properties; there is no secret-answer service or key-isolation efficacy claim. The independently prepared prediction file need not be served. Validate all saved checkpoint states against the separate predictions.

## Actual browser protocol

1. Open the exact candidate at its actual local port. Record paused0, case/reference/build/run identities and pristine state. Inspect the public-model disclosure, raw-data access and core controls at1280×720 and960×720; record scrolling, clipping and overflow honestly. Current viewport/scene metadata must match after resize and scroll.
2. In C01, observe the two baseline-compatible worlds. Change camera through all three yaws and confirm unchanged raw observation/information hash. Choose the quarter-turn and inspect the separation; then show/hide its finite certificate. Capture the actual revealing state with readable IDs and coordinates.
3. In C02, exercise xw90 first and then yv90; separately reset and reverse the query order. Verify the same final bundle/fingerprint and two-query family minimum. A repeat query adds no evidence. Change reference world and verify reset plus newly derived compatible IDs.
4. In C03, inspect the projection and w=0 slice, add both allowed outer slices, then reveal the all-menu collision certificate. Inspect the outside-menu explanation and confirm it is not an allowed observation button. Capture the surviving pair and explicit empty slices. This is the gate's decisive negative case.
5. In C04, inspect exact baseline inequality beside equal rounded labels and within-tolerance diagnostic. Confirm zero exact additional-query minimum in its certificate, then choose the quarter-turn and inspect the robust distinction. Capture the warning/raw records without claiming pixel identity or exact collision.
6. Collect nine paused baseline checkpoints, repeat all nine after exploration, then after Reopen saved start, and after reload. All36 equivalent checkpoint semantic hashes must agree. Play the actual32-second tour through natural stop; record an active bracketing state/image and final cursor32, paused true, automatic reason. Exercise pause and previous/next separately. Jumping checkpoints alone does not demonstrate playback.
7. Open at least one historical replay (Gate7 recommended) through a visible link; inspect its paused run/build identity. The host separately verifies all979 frozen entries through Gate7 and records any unavailable historical server. Do not modify historical files or replace their screenshots.

The host stores actual browser observations, action trace, semantic events, capture index, unmodified original screenshots, computational/audit results and a core-evidence closure marker in `evidence/gate-8/`. Captures are indexed to bracketing observations, viewport and actual image dimensions. Recommend four final images: C01 revealed separation; C02 complementary queries; C03 finite no-separator case; C04 exact-versus-rounded distinction. Preserve failed-candidate images too. A publication crop/annotation, if ever made, is additional and never replaces an original.

The final audit reports model, certificate enumeration, UI, event semantics, checkpoint recovery, route/build and history checks separately. A claim of OS reduced-motion behavior requires actual preference testing; manual paused controls can be verified independently. Reject unsupported human efficacy, universal non-identifiability, arbitrary-image reconstruction or global optimal-query language. The packet preserves actual limitations, identifies any justified revisions, and ends at Gate8 for human review.
