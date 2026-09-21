# Gate 4 state, events and preservation

Version `gate-4-record-v1`. Historical Gates 0–3, their source snapshots, failures, evidence and freezes remain read-only. Current authority comes from Paul's actual “Proceed with the next gate.” response to the final Gate 3 review; root records it separately. This contract cannot authorize Gate 5.

## Ownership, identity and durable replay

Astra xhigh owns new `docs/gate-4/` specifications and later assigned synthesis. Sol builder owns `slices/`; a different Sol worker independently audits `audit/gate-4/`. Root owns actual browser interaction/evidence, host preservation and approval/status records. Luna owns bounded primary-source gathering under `research/gate-4/`. No worker may start Gate 5.

Candidate IDs begin `G4-SLICES-001` and increase for every preserved revision. Build ID is `g4-<content-derived-prefix>` backed by the full SHA-256 source manifest. Port 43997 was confirmed free by root. Preserve each candidate's source/build, real base revision (Gate 3 commit `144abb15c3252f0ef6a2dbd2d3c45333ecf6aaef`) or actual patch identity, runtime, dependency/lockfile identity or explicit absence, renderer, schema/model/generator versions, seed null, all four prespecification hashes, standalone 3D trace hash, initial state, planned canonical events, seven checkpoint states and hashes. Generated records are expected/canonical data, never actual browser observations.

Each tested build remains runnable. Editing code requires a separate candidate/build, not substituting new code under an old replay. Run Library entries show run/build and open paused; expose Replay from start, Pause, Step, Scrub, Reset/checkpoints and available evidence/results. Retain the historical Gate 3 entry at its verified local URL/build. Exploration events are an append-only session record and cannot mutate canonical replay/trace files or approve another gate.

## Required recorded boundaries

Equivalent field/event names are permitted if their exact mapping is documented in `slices/README.md` before browser collection.

| Boundary | Required data |
|---|---|
| Identity | Gate 4; experiment/model/schema/generator versions; run/build/full source SHA-256; trace SHA-256; runtime/dependencies; renderer; seed null |
| Raw source | Three stable source IDs, full 4D centers/radius/equations; source dimensions; primary unrotated source distinct from rotated movie source |
| Raw slice | Primary c/s/d/u, strict branch kind, radius or null, raw center for nonempty slice, mathematical/visual point-vs-empty meaning; primary source unchanged |
| Raw projection reference | P and unit 3D ball center/radius; independent of primary slice parameter |
| Ambiguity | Ordered candidate descriptors, known observation plane, initial/intervened raw slice/projection predictions, equality/distinguishability result, exact candidate-class limitation |
| Model movie | Theta/path/override, R and P or documented derivable state, rotated 4D center, raw 3D projected center/radius |
| Stored 3D movie | Trace file/hash/schema/count/spacing, exact current frame index/time/center/radius; comparison error/result; no source calculation in reader |
| Display | Yaw/pitch; camera/screen formula; all scene viewBoxes/scales/centers; geometry sampling rule; selected example screen coordinates; labels/depth/inspector/reduced-motion options |
| Environment | Fresh actual viewport width/height, DPR, bounding rectangles for visible/hidden scenes and visibility state; fresh on scroll/resize/inspector or card toggles |
| Clock | Quantized integer time 0..40000,100 ms frame spacing,1000 ms step,play/pause/checkpoint; separate wall timestamp |
| Exploration | Session, canonical/exploration, separate primary slice/movie-angle/camera overrides, ambiguity plane and comparison state; restore clears overrides and resets defaults |

Raw numerical 3D sets/frames and final screen pixels are distinct data. Do not label an image or center drawn on screen as the raw coordinate observation. Empty slices retain source/plane/reason but have no slice point geometry. Hidden scenes must have truthful visibility/rectangle information, not an invented visible rectangle.

Inspector metadata must reflect current browser measurements, including after scrolling when a scene's viewport-relative y changes. Refresh on viewport resize, scroll and visibility/toggle changes, and measure anew for every observed snapshot. This metadata is excluded from deterministic hashes but remains in each observation. Preserve actual original-image dimensions separately in the capture index; a mismatch must remain visible as a limitation. Panels wrap or scroll within bounds, with document scrollWidth≤clientWidth+1 CSSpx.

## Fingerprints and restoration

Document the precise serializer and named hash/checksum algorithms. File identity uses SHA-256. Live deterministic hashes can use a disclosed checksum, with a separately reported collision limitation if not cryptographic.

- Source fingerprint binds immutable ordered source descriptors and model version; unchanged by all controls.
- Slice fingerprint binds primary source ID,c,s,d,u,kind,radius/nonempty center; independent of camera or movie angle.
- Projection-reference fingerprint binds P and the primary raw 3D projected ball; unchanged by slice/camera/movie-angle controls.
- Movie fingerprint binds model source ID/theta/raw projected center/radius, stored frame index/time/center/radius and comparison result; ordinary camera does not change it.
- Checkpoint fingerprint binds quantized time, all raw source/slice/projection/movie states, canonical/exploration and overrides, ambiguity plane/results, camera and declared display options. Exclude viewport/DPR/rectangles, wall time, current playing flag, activity length/sequence numbers, session ID, focus, hover and recovery diagnostics. Controls must restore the full included state.

Establish each canonical checkpoint's baseline in the actual browser. Compare repeated restores, Run Library reopen and reload against that same-browser/build baseline exactly. Node hashes are diagnostics, not exact browser-hash oracles. Preserve raw numerical values and use absolute 1e−10 for independently derived cross-runtime values. Checkpoints at different times may have identical geometry but different checkpoint hashes because clock is included.

## Semantic events

Each consequential event has monotonic `seq`, `sessionId`, `runId`, `buildId`, `type`, intended `payload`, `wallTimeUtc`, `simTimeBeforeMs`, `simTimeAfterMs`, mode, observed state/fingerprints, actor and origin. Actor remains `unspecified-ui` unless authenticated; root's independent action trace may identify its own computer-use input. An automated click is not attributed to Paul.

Origins are `manual-control`, `automatic-playback` and `programmatic-restore`. A clicked checkpoint/reset records manual-control with restoration payload. Initial paused opening is programmatic-restore. A clicked replay start is manual-control. Automatic end pause is **automatic-playback with exact reason `end-of-sequence`** at 40000 ms; it is distinguishable from manual Pause. Frame-by-frame events are optional, but consequential events and observed state/clock are not.

| Semantic event | Required intent and result |
|---|---|
| replay.open | Requested/actual run/build, paused canonical zero, programmatic-restore |
| playback.play | Resume or replay from start; manual-control; canonical trajectory/overrides behavior explicit |
| playback.pause | Stable cursor; manual or automatic origin, exact end reason when applicable |
| playback.step | +1000 ms/clamped 40000, paused |
| playback.seek | Requested/clamped/nearest 100 ms actual cursor and result |
| checkpoint.restore / experiment.reset | Exact checkpoint/zero; clear overrides, reset ambiguity plane/camera/options |
| slice.set | Requested/actual primary plane s, paused exploration, unchanged source/projection/time |
| camera.set | Requested/actual yaw/pitch; unchanged raw numerical sets/movie/source/time |
| ambiguity.compare | Requested known plane (0 or+.5), candidate inputs and actual equality/distinction results |
| source.rotation.set | Movie source angle override only; fixed clock/primary slice/reference/camera; stored trace remains at clock frame |
| movie.compare | Selected same-clock analytic/stored 3D inputs/errors/results and stated limited scope |
| display.options.set | Inspector/labels/depth/reduced-motion/toggles with observed options and refreshed scene metadata |

Reload is additionally recorded in the external browser trace. Missed/failed/unavailable UI attempts are retained and not counted as exercised controls. Every observed canonical/override switch records intended versus actual values. Replay from start explicitly restores canonical state before starting; paused checkpoint/manual stepping remains available with reduced motion. An OS reduced-motion setting is claimed tested only if actually exercised.

## Evidence and freezes

`docs/gate-4/PRESPEC_FREEZE.json` binds `model-contract.md`, `record-contract.md`, `experiment-charter.md` and `independent-predictions.json` with real UTC time, SHA-256 and byte counts before browser trials. Frozen files are not revised to fit observations. Any changed question or mathematical observation class needs an additional version and deviation record.

Root stores actual images, state/event extracts, control trace, visual notes, console scope, capture index and final results separately under `evidence/gate-4/`. Each image binds run/build, actual time/planes/angle/camera/options, fingerprint, fresh viewport/DPR/scene rectangles/visibility, capture timestamp and original-image dimensions. Screenshots are original supported browser captures; no generated or edited image can substitute. Keep every failed candidate and original anomaly.

The final gate freeze binds source/build/canonical replay/trace, independent audit, actual browser evidence, preserved revisions and packet. Root compares historical Gates 0–3 frozen hashes before/after and opens Gate 3 from the visible Run Library to inspect identity if the supported browser permits. All stage workers complete before the packet asks Paul about **Gate 5: two additional coordinates in 5D**. End the turn at that review; no next-stage preparation runs in the background.
