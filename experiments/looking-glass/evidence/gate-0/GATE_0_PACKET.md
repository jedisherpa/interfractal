# Looking Glass — Gate 0 review packet

**Ready for Paul's review; Gate 1 is not approved.** The final probe displayed a marked ordinary 3D cube, reproduced its saved camera states after reopening/reloading, and preserved its canonical source/run bytes. One browser-discovered exploration defect was repaired and retested. No later gate or shared-meaning language study ran.

**Open the [paused probe replay](http://127.0.0.1:43991/) or [browser results page](http://127.0.0.1:43991/evidence/gate-0/results.html).** The viewing surface is the supported visible Codex in-app browser on Paul's same Mac, using a local-only server. This is not a public deployment or a promise of indefinite server availability.

| Reviewed identity | Value |
|---|---|
| Final run | `G0-CUBE-005` |
| Tested build | `g0-d85237ad31362768` |
| Aggregate source SHA-256 | `d85237ad313627683bce5fed50977060b2c61c9e8626a5056bff74b0efcce567` |
| Repository base | `3f1b1d028947fcc2fb207e41780f1a2b714705b0` |
| Runtime/dependencies | Node `v24.10.0`; built-ins only; no lockfile or external assets |
| Renderer and capability | Actual renderer: SVG from computed 3D points. Browser capability probe: WebGL2 available; WebGL did not render this cube. |
| Comparison viewport | 998 × 904 CSS pixels, device-pixel ratio 2; fixed SVG viewBox 700 × 560, 138 SVG units per source unit |

## Watch this

1. The run opens **paused at 0 seconds**, camera yaw 30°. Follow the marked vertex `v111`; its source coordinate stays `(1,1,1)`.
2. Press **Replay from start**. Over 20 seconds, only the ordinary display camera turns to 60°, with fixed 20° pitch and orthographic display. Playback stops at the end. This does not add a spatial dimension.
3. Use the **10s checkpoint** to see yaw 45°, or Step +1s and the time slider. Open **Exact state & diagnostics** to inspect coordinates and run identity.
4. Scroll to **Look around** for separately labeled exploration. **Reset** returns to the saved start. **Open paused** in the single-entry Run Library reopens the final run at zero. These controls do not approve or start Gate 1.

The Run Library presents one final saved run. Older candidates remain on disk; this gate does not deliver a multi-run historical browser catalog.

## Question, prediction, and result

The [charter](/Users/paul/BTC-Learning/experiments/looking-glass/docs/experiment-charter.md) and three companion contracts were frozen before browser testing at `2026-09-20T00:38:14.748006Z`. All four hashes remain unchanged. The run manifest spelling `G0-charter-v1` is an explicit alias of frozen `gate-0-charter-v1`, not a second protocol. Neither frozen record was rewritten to resolve that spelling.

| Question | Expected | Observed | Interpretation | Unresolved |
|---|---|---|---|---|
| G0-P01: Is the scene watchable through the supported surface? | Paused saved cube, visible identities and controls | Codex IAB loaded SVG; all eight labels and selected `v111` visible; no material cube clipping in inspected frames | Viewing path works in this local setup | Paul's own viewing/interpretation; other devices |
| G0-P02: Does camera movement preserve cube identity? | Eight vertices/twelve edges fixed; independently predicted coordinates within `1e−10` | Independent audit verified all eight points and edges at 0/10/20s; `v111` agrees with the frozen table | Bounded model/camera correctness passed | Source rotation and separate shadow calibration await Gate 1 |
| G0-P03: Do playback controls select stable states? | Pause stable; Step exactly 1,000ms; scrub/checkpoint exact | Active pause held at 524ms for 7.814s wall time; keyboard Step reached 1,000ms; slider selected 10,000ms; natural tour ended paused at 20,000ms | Exercised controls passed | Broad accessibility and alternate browsers untested |
| G0-P04: Does reopened replay recover the original? | Open/reload paused at zero; equal checkpoint states | Run Library and reload opened paused at zero; 0/10/20s restored; original and reopened 10s states/hashes match exactly | State replay passed; inspected images show the same arrangement | Exact cross-device pixel equivalence not claimed |
| G0-P05: Are history and gate boundary preserved? | Canonical bytes and Gate 0 state unchanged; exploration separate | All 12 source/build/run files match before/after; all four prespec files match; gate unchanged. 120° exploration succeeded, reset restored 30° | Tested integrity and separation passed | A review activity log remains append-only and separate from canonical inputs |
| G0-P06: Is the result inspectable? | Readable identity, pause/step, no essential visual obstruction | Root and independent auditor inspected originals; synthesizer inspected four packet images. Inspector opens/closes; manual operation and keyboard Step exercised | Limited investigator visual/control check passed | Screen readers, mobile layouts, a changed OS reduced-motion preference, and human comprehension not established |

No console errors were captured in the final probe's [console record](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-0/browser-console.json). The [independent Sol audit](/Users/paul/BTC-Learning/experiments/looking-glass/audit/report.md) reports numeric, source/hash, local-route, frozen-self-test, recorded browser-state, and visual checks. The auditor did not drive the browser; root performed actual computer use, and the auditor checked those records separately.

The [browser observation file](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-0/G0-CUBE-005-browser-observations.json) preserves both G004 and G005 entries. Final-result checks select `state.runId === "G0-CUBE-005"` (16 entries); the [derived final-run subset](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-0/G0-CUBE-005-observations-only.json) makes those entries easier to inspect while preserving the original. The app's actor category is `unspecified-ui`, as permitted by the record contract; root's associated external trace identifies its own actions as `browser-automation`. No action is labeled a human approval.

## Inspected original captures

**Final S0 — 0 seconds, yaw 30°, paused.** All eight vertex labels are visible; the selected marker provides size/shape as well as color identification. Some lower controls require ordinary page scrolling.

![G0-CUBE-005 initial paused cube at 0 seconds](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-0/G0-CUBE-005-S0-initial.png)

**Final S2 — 20 seconds, yaw 60°, paused.** The projected arrangement has changed while source identities remain fixed. Depth-dependent line emphasis does not change coordinates; projected crossings do not establish source intersections.

![G0-CUBE-005 final paused cube at 20 seconds](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-0/G0-CUBE-005-S2-final.png)

**Final S3 — reopened midpoint, 10 seconds, yaw 45°.** Compare with the preserved [original S1 midpoint](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-0/G0-CUBE-005-S1-midpoint.png). State hashes match exactly; visible UI/focus differences mean screenshot files are not claimed pixel-identical.

![G0-CUBE-005 replayed midpoint at 10 seconds](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-0/G0-CUBE-005-S3-replay-midpoint.png)

**Preserved G004 failure — Look around requested 120° but remained 60°.** The screenshot shows the unchanged angle; the requested 120° is evidenced by the [control observations](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-0/G0-CUBE-004-browser-observations.json). This capture is scrolled to the controls, so the upper scene is outside the viewport rather than geometrically clipped.

![G0-CUBE-004 failed Look around control remained at 60 degrees](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-0/G0-CUBE-004-failed-look-around.png)

No supported video-recording capability was advertised by the browser tool used; no video is claimed. Replay and untouched stills are the delivered visual evidence.

## Changes and preserved failures

| Candidate | What happened | Preservation |
|---|---|---|
| G0-CUBE-001 | Automated source-manifest check exposed a manifest defect before browser use | [Run manifest](/Users/paul/BTC-Learning/experiments/looking-glass/probe/runs/G0-CUBE-001/run.json) and its named build |
| G0-CUBE-002 | Independent review found cache, activity logging/identity, and malformed-path issues before browser use | [Run manifest](/Users/paul/BTC-Learning/experiments/looking-glass/probe/runs/G0-CUBE-002/run.json) and its named build |
| G0-CUBE-003 | Frozen self-test could not locate run data; fixed before browser use | [Run manifest](/Users/paul/BTC-Learning/experiments/looking-glass/probe/runs/G0-CUBE-003/run.json) and its named build |
| G0-CUBE-004 | Actual browser test exposed Look around reading its requested slider value after pause/redraw had reset it | [Run manifest](/Users/paul/BTC-Learning/experiments/looking-glass/probe/runs/G0-CUBE-004/run.json), captures, activity, and observations |
| G0-CUBE-005 | Read the requested yaw before pause/redraw; repeated relevant controls, replay, and integrity checks. Actual 120° exploration passed | [Final run](/Users/paul/BTC-Learning/experiments/looking-glass/probe/runs/G0-CUBE-005/run.json), [120° capture](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-0/G0-CUBE-005-look-around-120.png), [integrity comparison](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-0/G0-CUBE-005-after-browser-integrity.json) |

The three pre-browser candidates were implementation repairs, not positive experimental variants. There were two browser-tested variants. The final repair preserved the frozen object, equations, predictions, and scope.

## Implementation, sources, and recovery

The work is isolated under `/Users/paul/BTC-Learning/experiments/looking-glass/`. A small companion avoids coupling the first test to Interfractal's narrative timing, object spins, shells, lighting, and camera motion. Root's separate live reference visit rendered dense geometry after Skip intro; the earlier WebGL failure did not recur as a create-context error in this environment. That visit does not establish the deployment's source revision or mathematical correctness.

Luna inspected pinned sources: [Interfractal at `1326cc6…`](https://github.com/jedisherpa/interfractal/tree/1326cc64223fc167610c2157f2c24fa33a87c93b) and [Hopf Workshop at `2967f71…`](https://github.com/jedisherpa/hopf-workshop/tree/2967f71aa19117925f55b9349a7bfc0ec8fc8dea). See the [source review](/Users/paul/BTC-Learning/experiments/looking-glass/research/source-review.md) and [source/access register](/Users/paul/BTC-Learning/experiments/looking-glass/research/sources.json). Historical and current source pins are not inferred deployment identity.

The [preserved build manifest](/Users/paul/BTC-Learning/experiments/looking-glass/probe/builds/g0-d85237ad31362768/build.json) identifies every tested source file. If the preview expires, restart that same snapshot:

```sh
cd /Users/paul/BTC-Learning
node experiments/looking-glass/probe/builds/g0-d85237ad31362768/server.mjs
```

Then open [the local replay](http://127.0.0.1:43991/). The fixed port must be free; an already-running server need not be restarted. [Recovery and data details](/Users/paul/BTC-Learning/experiments/looking-glass/probe/README.md) describe the saved files and controls. Canonical run data is read-only through the server; separate review activity is appended without changing the saved run. Do not substitute the mutable working source for this snapshot when reviewing this result.

Actual routing: GPT-6 Astra with extra-high reasoning handled delegated orchestration, specification, and this synthesis; GPT-5.6 Luna gathered primary sources; GPT-5.6 Sol implemented the probe and a separate Sol worker audited it. Root coordinated workspace/browser operations and preservation without claiming to change its own host model. These are AI workers, not human reviewers or study participants.

## Proposed Gate 1 and decision

Gate 1 would add a controlled ordinary 3D-cube-to-2D-shadow view beside the ordinary 3D view; separate source rotation from camera motion; check vertex/edge identity, distances, inverse rotation, and independent projected coordinates; show a distinction hidden by projection; and preserve a canonical calibration replay with reload/checkpoint checks. Hopf begins only at a later separately approved Gate 2, and genuine 4D begins at Gate 3.

The recommendation is to review this Gate 0 packet and decide whether to authorize Gate 1. The current evidence establishes neither higher-dimensional recovery nor human comprehension or shared-meaning benefits. The stop is required by Paul's supplied orchestrator prompt §§9 and 17, which say to deliver Gate 0 and await his next-stage approval. No agent can provide that approval.

**Please watch the probe replay. Do you approve Gate 1: the 3D-to-2D calibration and model/replay checks?**
