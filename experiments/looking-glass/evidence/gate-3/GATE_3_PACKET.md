# Looking Glass — Gate 3 review

**Gate 3 is a qualified instrument result: the declared 4D model, bounded coordinate recovery and saved replay checks passed after two preserved corrections.** One shadow and ordinary camera views leave the marked hidden-coordinate difference unresolved; a known additional source turn reveals it. Recovery uses raw 3D coordinates, known matrices and supplied point correspondences. Human understanding was not tested.

Open the **[paused Gate 3 replay](http://127.0.0.1:43996/)** or the **[visual results](http://127.0.0.1:43996/evidence/gate-3/results.html)** in the visible Codex browser on this Mac. This is a local preview, not permanent hosting.

| Replay identity | Value |
|---|---|
| Run / build | `G3-TESSERACT-003` / `g3-6c31bc16aeca4460` |
| Full source SHA-256 | `6c31bc16aeca4460aa8518c392e26a28bca40524d4679acbc63bd4cd8fdcb68d` |
| Base revision | Gate 2 commit `bf2be1afe85874edbaf4e59cbbc48a37991553fc` |
| Runtime | Node `v24.10.0`; built-ins and SVG, no packages, lockfile or external assets |
| Fixed model | 16 source vertices in `{-1,+1}⁴`, 32 edges, column-vector x–w rotation, `P(x,y,z,w)=(x,y,z)` |
| Fixed view | Ordinary camera yaw 30° / pitch 20°, scale 80 SVG units per projected unit; viewBox 640×420 |
| Saved sequence | 32 seconds, source 0°→90°→0°; exact 0/8/16/24/32 s checkpoints; opens paused |

## Watch this

1. At **0 s**, inspect marked **A=v1110=(1,1,1,−1)** and **B=v1111=(1,1,1,+1)**. Both identities are present at one projected site. The marked source edge still has length 2 while its projected length is 0.
2. Click **Replay from start**. At **8 s** the projected pair distance is √2; at **16 s** it is 2. The source distance stays 2 and the camera stays fixed. During the second half they return to coincidence. Exact checkpoint buttons restore the saved states.
3. At 8 s change **Ordinary camera yaw**: the screen changes while the raw 3D projection stays fixed. **x–w rotation** changes the source projection independently. A checkpoint restores the canonical camera and source angle.
4. Scroll to **What the projected coordinates determine**. Compare fixed 0°, camera 30°/120°, and source 0°/90°. The first two conditions leave w unknown. The last recovers all four coordinates using supplied raw 3D observations, known matrices and matching IDs. The Run Library reopens the exact saved build paused.

## What the evidence establishes

The [four-file prespecification](/Users/paul/BTC-Learning/experiments/looking-glass/docs/gate-3/PRESPEC_FREEZE.json) was frozen at `2026-09-20T02:38:53.042662Z`, before browser trials. The [charter](http://127.0.0.1:43996/evidence/gate-3/review/EXPERIMENT_CHARTER.md) and [independent audit](http://127.0.0.1:43996/evidence/gate-3/review/AUDIT.md) separate predictions from actual observations.

| Question | Expected | Observed | Interpretation / unresolved |
|---|---|---|---|
| T01–02: Is the source and motion faithful? | 16 vertices / 32 edges, affine span 4, norm² 4, preserved 120 pair distances, orthogonal/inverse rotations; five projected distances 0/√2/2/√2/0 | Independent oracle 12/12 and final exact-build audit 14/14 passed. All 80 saved vertex checkpoint rows agree within 1e−10. Candidate 003's 67 actual states match independent source, shadow and screen equations | Supports the declared model. The solid is 4D, its boundary 3D and the drawn skeleton 1D; this screen is 2D |
| T03/T08: Are coincident identities and collapsed edges retained? | A/B overlap at 0; zero-length projected edges keep their source identity | Actual ambiguous SVG hit disclosed both IDs; list selection reached B and collapsed edges; a separated A marker was actually selected at 45° | No jitter supplies the distinction. Overlap can make a hit ambiguous; explicit IDs resolve selection |
| T04: Are source/camera/time separate? | Camera changes screen only; source 30° at 8 s changes projected pair distance to 1 without moving camera/time | Both actual interventions agreed; restoring 8 s recovered the same browser checkpoint hash | Bounded control isolation passed. Exact equality is compared within the same browser/build, not against Node hashes |
| T05: What stays hidden? | Fixed 0 projection rank 3, kernel w; ordinary camera views cannot recover w | Fixed and camera-only cards/solver remained rank 3 and underdetermined; camera 120° at source 0° left the pair coincident | For q∈R⁴ an entire w-line fits; within this fixture there are two w candidates. Camera-space 3D and final screen 2D are different observations; neither adds w sensitivity |
| T06: What do known source views recover? | Stacked 0°+90° raw 3D matrices rank 4; `AᵀA=diag(1,2,2,1)`; error/residual≤1e−10 | All 16 correspondences recovered; final-browser maximum coordinate error 1.11×10⁻¹⁶, maximum absolute forward residual 0. Independent nonfixture opaque-ID and mismatched-ID checks passed | Conditional numerical recovery from raw 3D coordinates, known transforms and supplied correspondences. No source lookup/ID decoding supplies the solve; hidden truth is compared afterward |
| T07: Can the actual run be replayed? | Stable pause, step/scrub/clamp, active reverse segment, automatic end, exact reopen/reload recovery, explicit origins | Final candidate 003 passed: stable pause, step, scrub, clamped end, active return, exact reopen/reload recovery. Automatic end event 38 is `automatic-playback` with reason `end-of-sequence` at 32000 ms | Final browser audit 12/12 passed. Candidate 002's earlier literal reason-label failure remains preserved |
| T09: Are metadata and history faithful? | Fresh viewport/DPR/scene rectangle, bounded page width, preserved previous gates | Final candidate: 67/67 fresh measurements, no page-width overflow at 1239×720, 1280×720, 1280×900 and 960×720. All 276 historical frozen entries unchanged | Inspector still needs substantial vertical scrolling. Historical Gate 2 identity was inspected via DOM/accessibility; two new-tab screenshot attempts failed and are retained |

**Mathematical fidelity and bounded information recovery are separate from human understanding.** No participant comprehension, unknown-transform or unknown-correspondence recovery, arbitrary image reconstruction, physical fourth dimension, slice, 5D result or video is claimed. The operating-system reduced-motion setting was not emulated; paused loading, checkpoint use and manual stepping were exercised.

## Four original captures

These are unmodified originals with run/build and capture metadata in the [capture index](http://127.0.0.1:43996/evidence/gate-3/capture-index.json). The collection contains 23 originals across all three candidates, including six from the final build. It also includes the [final coordinate comparison](http://127.0.0.1:43996/evidence/gate-3/screenshots/003-C3-observability-comparison.jpg), corrected inspector, earlier checkpoint captures and resize views. Final candidate C0/C1/C2 use the same actual 1239×720 viewport and scene framing, a recorded display condition distinct from the earlier 1280×720 captures; 1280×720 was also checked separately.

**0 s, final candidate 003:** both source IDs occupy one projected site; source distance 2 and projected distance 0.

![Final candidate 003 paused at 0 s with A and B coincident](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-3/screenshots/003-C0-paused-0s.jpg)

**16 s, final candidate 003:** a known 90° source turn gives projected distance 2. Camera, scale, 1239×720 viewport and scene framing match the 0 s capture.

![Final candidate 003 paused at 16 s with A and B separated](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-3/screenshots/003-C1-paused-16s.jpg)

**Active return, final candidate 003:** the image reads PLAYING, 26.7 s, 29.7°. Surrounding actual observations bracket it at 26656–26823 ms; it has an interval, not a falsely exact capture timestamp.

![Final candidate 003 during active reverse playback](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-3/screenshots/003-C2-active-reverse.jpg)

**Preserved failure, candidate 001:** opening the inspector after scrolling left its scene-rectangle metadata stale. The companion measurements record actual scene y=−1067.25 while the inspector still said 291.25; the image supplies the original UI context, not a visual proof of that numeric mismatch.

![Candidate 001 inspector context at the recorded metadata failure](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-3/screenshots/001-inspector-scroll.jpg)

## Changes and retained failures

Three candidates used the prespecified allowance of one initial build plus two corrections:

- **001 / `g3-2137b012118cbd13`:** failed fresh environment metadata: its scene rectangle stayed stale after scrolling/inspector opening, and an initial inspector DPR of 2 disagreed with the separate actual reading of 1. Its [failure record](http://127.0.0.1:43996/evidence/gate-3/G3-TESSERACT-001-browser-failure.json), original image, source and replay remain preserved.
- **002 / `g3-d82f221e5cda2757`:** repaired scroll/toggle/resize metadata refresh. Full browser audit passed 11/12; the remaining failure was the literal automatic-end reason. Its 93 observations, 16 originals and 46 actual events remain in the [bounded candidate snapshot](http://127.0.0.1:43996/evidence/gate-3/candidates/G3-TESSERACT-002/BOUNDED_SNAPSHOT.json).
- **003 / `g3-6c31bc16aeca4460`:** changed that reason to the frozen `end-of-sequence` and assigned the new run identity. The model equations, projection, camera, rendering geometry and fingerprints are unchanged from 002. Its final browser audit passed 12/12 over 67 actual observations, six originals and 46 actual events; live asset/run routes passed 14/14. This is a new audited run, not a relabeling of the earlier images.

Across the three candidates, 164 actual DOM observations and 23 original images are preserved; generated fixtures are not included in those counts. The independent report also retains corrected auditor-tool mistakes, separately from implementation failures.

The full [host observations](http://127.0.0.1:43996/evidence/gate-3/HOST_OBSERVATIONS.md), [tool anomalies](http://127.0.0.1:43996/evidence/gate-3/browser-tool-anomalies.json), [actual browser states](http://127.0.0.1:43996/evidence/gate-3/browser-observations.json) and [actual event snapshot](http://127.0.0.1:43996/evidence/gate-3/activity-snapshot.jsonl) are distinct from generated planned replay fixtures. Original images were inspected and were not cropped, edited or synthesized. Console review returned no warning/error entries for the Gate 3 tab; this was not a network or performance audit.

Gate 0/1/2 canonical artifacts and prior qualifications remain unchanged. From candidate 002, the actual Gate 2 library link opened `G2-HOPF-003` / `g2-ccabad12693f86a8` paused at 0, verified through DOM/accessibility; no new historical screenshot was produced because the supported tool failed twice on that target-blank tab. Candidate 003 retains the same link; that historical click was not repeated on 003. The [historical identity record](http://127.0.0.1:43996/evidence/gate-3/historical-gate2-review.json) and [276-entry integrity check](http://127.0.0.1:43996/evidence/gate-3/post-browser-prior-integrity.json) retain the evidence.

## Recovery and next decision

Restart the exact final snapshot if the local preview stops:

```sh
node /Users/paul/BTC-Learning/experiments/looking-glass/hypercube/builds/g3-6c31bc16aeca4460/server.mjs
```

Then open [the local replay](http://127.0.0.1:43996/). The immutable build and canonical run are preserved in [hypercube/](/Users/paul/BTC-Learning/experiments/looking-glass/hypercube/README.md). No public deployment or external messages occurred. Agent roles and actual model settings are in [execution provenance](http://127.0.0.1:43996/evidence/gate-3/execution-provenance.json); the independent verifier was a separate worker, not a participant.

The proposed next stage is **Gate 4: slices, projections and ambiguity**: an analytic 4D-ball slice with center/interior/boundary/empty cases, an explicit comparison with projection, and a bounded ambiguity example. None of that work has begun or been approved. **Do you approve Gate 4: slices, projections and ambiguity, want revisions to Gate 3, or want to pause?** This packet records readiness for that decision, not approval.
