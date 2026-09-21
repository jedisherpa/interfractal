# Looking Glass — Gate 1 review

**The cube calibration passed its mathematical, camera-isolation and functional replay checks. One event-provenance limitation remains. Gate 2 awaits Paul's approval.** The marked corners are two source units apart, share one shadow initially, and separate when the source turns with the camera fixed. Moving only the display camera leaves the mathematical shadow unchanged. This establishes the specified instrument behavior, not human understanding or higher-dimensional recovery.

Open the **[paused calibration replay](http://127.0.0.1:43994/)** or its **[visual results page](http://127.0.0.1:43994/evidence/gate-1/results.html)**. The supported viewing surface is the visible Codex in-app browser on Paul's same Mac. This local preview is not a permanent hosted service.

| Reviewed identity | Value |
|---|---|
| Run / build | `G1-CUBE-003` / `g1-9dce1c2b9c2b3be4` |
| Full source SHA-256 | `9dce1c2b9c2b3be42e5597e0c666e499d7e0cd8d8ec05d9dac7ad66f72fb7c61` |
| Preserved Gate 0 commit | `6fb4ecbd516aa9a9dc23710c7ffcda4e8c65b819` |
| Runtime / dependencies | Node `v24.10.0`; built-ins only, no lockfile or external assets |
| Actual renderer | SVG from computed 3D coordinates; WebGL2 was available but did not render this calibration |
| Comparison display | 1280 × 720 CSS pixels, DPR 2; each pane uses viewBox 500 × 360, fixed 95 SVG units per source unit |

## Watch this

1. The replay opens **paused at 0 s**. In the left pane, follow diamond `v110` and circle `v111`. They are distinct 3D corners; on the right their IDs share one shadow site.
2. Click **Replay** for the 40-second source turn 0°→90°→0°. The camera stays at yaw 30°, pitch 20°. At **10 s**, the pair's shadow distance is about 1.414; at **20 s**, it is 2; at **40 s**, the initial overlap returns. Exact checkpoint buttons and Step+1 s are available below the panes.
3. Restore **10 s**, scroll to **Look around**, and move the camera. The left view changes while the right shadow stays fixed. This is labeled **Exploration**; click 10 s again to restore the recorded state. **Source turn** is a separate control.
4. The lower **Run Library** opens this run paused and links the preserved [Gate 0 replay](http://127.0.0.1:43991/). **Exact state & diagnostics** exposes original/rotated/shadow coordinates and all source edges. Exploring or reopening a replay never approves a stage.

## Prediction and observed result

The [charter](/Users/paul/BTC-Learning/experiments/looking-glass/docs/gate-1/experiment-charter.md), [record contract](/Users/paul/BTC-Learning/experiments/looking-glass/docs/gate-1/record-contract.md), and [independent analytic predictions](/Users/paul/BTC-Learning/experiments/looking-glass/docs/gate-1/independent-predictions.json) were frozen before browser trials at `2026-09-20T01:07:42.504847Z`; their hashes remain unchanged. Source rotation is `x′=cosθx−sinθz, y′=y, z′=sinθx+cosθz`. The shadow selects `(x′,y′)` independently of the display camera.

| Question | Expected | Observed | Interpretation | Unresolved |
|---|---|---|---|---|
| **T01 — Does the source retain its identity and distances?** | 8 vertices, 12 edges, fixed IDs; all 28 pairwise distances and norms preserved | Independent oracle and preserved-build checks passed at all five checkpoints; all 12 source edges retained, including collapsed projected edges | Model invariants passed | Other objects/rotations untested |
| **T02 — Does the controlled shadow match predictions?** | At 0/10/20/30/40 s: pair separation 0/√2/2/√2/0; distinct sites 4/6/4/6/4; collapsed edges 4/0/4/0/4 | Actual browser states agree; maximum coordinate discrepancy across checkpoint source/rotated/shadow/camera/screen values `2.22×10⁻¹⁶`, below `1×10⁻¹⁰` tolerance | Known rotation reveals this distinction; one initial shadow cannot distinguish the two z values | No reconstruction from arbitrary screenshots or proof of a higher-dimensional cause |
| **T03 — Does inverse rotation restore the source?** | `R(−θ)R(θ)q=q` at 0°, 15°, 45°, 90°; separately, 40 s geometry equals 0 s | Independent inverse checks passed; browser 0 s/40 s geometry hashes match exactly | Algebraic inverse and trajectory return both verified | A returning animation alone would not establish algebraic inversion |
| **T04 — Does camera motion leave the shadow alone?** | At 10 s, yaw 30°→120° changes only the ordinary display view | Source/rotated/shadow coordinates and geometry hash unchanged; display state changed; restoring 10 s recovered exact state hash | Camera-isolation negative case passed | Cube symmetry can preserve a similar silhouette; track labels and coordinates |
| **T05 — Is manual source turn separate?** | At 10 s, source 45°→30° leaves camera 30°/20° and gives pair shadow distance 1 | Observed distance 1 with unchanged camera; Exploration label shown; restoring 10 s recovered exact state | Independent control passed | General vertex/edge picking and broader interaction usability were not demonstrated |
| **T06 — Do controls and historical replay reproduce states?** | Stable pause, exact 1 s step/clamp, scrub/checkpoints, paused reopen/reload, exact replay midpoint | Paused 6177 ms held for 19.247 s wall time; Step reached 7177 ms; end step stayed 40000 ms; scrub selected 15000 ms; all checkpoints and reopened/reloaded 10 s matched; full Replay ended paused at 40000 ms | **Mixed:** functional controls/replay passed | Raw `playback.pause` lacks automatic/manual origin; automatic-stop evidence requires the external browser trace |
| **T07 — Is the result preserved and inspectable?** | Canonical bytes unchanged; G0 accessible; two legible panes, IDs, controls and inspector | 16 Gate 1 build/run/prespec artifacts unchanged; all 61 frozen Gate 0 files preserved; actual G0 library click opened its original build; inspected geometry stays inside panes | Preservation and limited investigator visual check passed | Lower controls require scrolling; small labels, other devices/accessibility and human comprehension remain untested |

The [independent Sol report](/Users/paul/BTC-Learning/experiments/looking-glass/audit/gate-1/REPORT.md) records 17/17 oracle checks, 7/7 exact-build checks, 11/11 local-route checks, 9/9 browser-record checks and 16/16 post-browser integrity checks. These check counts do not override the recording-contract deviation above. The verifier did not drive the browser: root performed actual controls, and the verifier independently checked the supplied state/capture evidence and computed expectations.

The [26 browser observations](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/browser-observations.json) and [23 saved UI events](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/G1-CUBE-003-ui-session-log-trials.jsonl) are actual execution evidence, separate from the planned fixture. The app correctly uses actor `unspecified-ui`; root's external trace attributes its own actions to browser automation. No human response or approval is inferred.

Uninterrupted Replay was observed starting, running at 15.710 s, then completed at 40 s. The raw observation named `full-replay-returning` already shows **40 s, paused**; it is not a captured moving reverse-phase frame. A separate 30 s checkpoint verifies the return-trajectory state. No continuous visual recording is claimed. The [console record](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/browser-console.json) contains no warnings/errors within the recorded trial scope.

## Four inspected original captures

**0 s — a hidden distinction.** `v110` and `v111` are separate on the source cube and share the upper-right shadow site. Four projected source edges collapse; the source still has twelve edges. This is the decisive insufficient-view example.

![G1-CUBE-003 at 0 s, distinct source corners sharing one shadow site](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/G1-CUBE-003-S0-initial.jpg)

**10 s — source 45°, camera 30°/20°.** The marked shadow sites separate by √2. Other source IDs still coincide; grouped labels retain their identities without jitter.

![G1-CUBE-003 at 10 s with marked shadow points separated](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/G1-CUBE-003-S1-midpoint.jpg)

**10 s — camera-only exploration at yaw 120°.** Compare with the preceding image: left source labels move while the right shadow is unchanged. Cube symmetry makes the outline alone a weak indicator of camera movement.

![G1-CUBE-003 camera-only exploration leaves the shadow unchanged](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/G1-CUBE-003-S2-camera-only.jpg)

**20 s — source 90°, original fixed camera.** The marked shadow corners are two units apart on the upper left/right sites. Each coincident site still lists both IDs.

![G1-CUBE-003 at 20 s with maximum marked-pair shadow separation](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/G1-CUBE-003-S3-maximum.jpg)

Root, the independent auditor and the synthesizer inspected these originals. Geometry is not materially clipped; crossings/coincident edges remain present rather than being artificially spread. Labels are small, and lower controls require page scrolling. Additional originals show the [40 s return](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/G1-CUBE-003-S4-return.jpg), [reloaded 10 s](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/G1-CUBE-003-S5-reloaded-midpoint.jpg), and [inspector](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/G1-CUBE-003-S6-inspector.jpg). The [capture index](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/capture-index.json) binds each untouched file to its exact state. Original/reloaded 10 s image bytes happen to match; this does not establish cross-device pixel equivalence. No supported video capture was advertised.

## Changes, failures and deviations

| Preserved candidate | Outcome |
|---|---|
| [G1-CUBE-001](/Users/paul/BTC-Learning/experiments/looking-glass/calibration/runs/G1-CUBE-001/run.json), build `g1-37916c6f617be6d5` | Failed before browser use: camera code read undefined `camera.y` instead of `camera.yaw`, producing NaN/null camera/screen coordinates. Source/run retained; no browser screenshot exists for this failed candidate. |
| [G1-CUBE-002](/Users/paul/BTC-Learning/experiments/looking-glass/calibration/runs/G1-CUBE-002/run.json), build `g1-8f5c2683517b3f88` | Corrected camera calculation passed numeric checks. Pre-browser review then found the G0 library row omitted its historical build ID. Snapshot/run retained. |
| [G1-CUBE-003](/Users/paul/BTC-Learning/experiments/looking-glass/calibration/runs/G1-CUBE-003/run.json), build `g1-9dce1c2b9c2b3be4` | Added visible G0 build identity and used free local port 43994. First and only browser-tested Gate 1 candidate; passed bounded mathematical/control/replay checks with event-origin limitation retained. |

The [port deviation](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/deviations.json) records that prespecified 43993 was occupied by an unrelated pre-existing service, which was left untouched. Only local transport changed. The separate logging deviation is that manual and automatic pauses share an event type without an origin field; this falls short of the frozen recording contract. The tested build remains unchanged so this limitation is inspectable. Two initial audit-checker failures also remain preserved: the route checker queried Gate 0 through the wrong endpoint, and the browser checker looked for all seven images inside observation entries while the seventh inspector image was correctly indexed separately. Correcting those evidence lookups did not change the application or captures. The independent report links both initial records.

The [Gate 0 commit-recovery record](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/commit-recovery.json) verified all 61 frozen files after extraction from the exact committed tree and ran the preserved snapshot test successfully. Gate 1 did not replace Gate 0. [Post-browser integrity](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-1/post-browser-integrity.json) confirms the Gate 1 canonical build, run fixture and prespecification remained unchanged through trials. Append-only review activity is separate from those canonical inputs.

## Recovery and decision

To restart the exact tested calibration, with its preserved run directories still alongside it:

```sh
node /Users/paul/BTC-Learning/experiments/looking-glass/calibration/builds/g1-9dce1c2b9c2b3be4/server.mjs
```

Open [the same paused replay](http://127.0.0.1:43994/). If its server is already running, no restart is needed. Port 43994 must be available. The [calibration README](/Users/paul/BTC-Learning/experiments/looking-glass/calibration/README.md) describes the fixture, hashes and separate activity log. Gate 0's exact recovery command remains `node /Users/paul/BTC-Learning/experiments/looking-glass/probe/builds/g0-d85237ad31362768/server.mjs` on port 43991.

Actual roles: GPT-6 Astra with xhigh reasoning specified and synthesized Gate 1; GPT-5.6 Sol implemented it and a separate Sol worker audited it. A Luna worker verified recovery of the committed Gate 0 evidence. Root coordinated the host, actual browser controls, captures and preservation. These are AI workers, not human participants.

**Proposed Gate 2: Hopf correspondence and the shared reference.** Build linked ideal S² base points and sampled S³ fibers; verify normalization, map-to-base/shared-phase invariance, local-chart and infinity cases. Separately build a clearly labeled candidate attention view over fictional records under two transparent reference questions, retaining record identity, ambiguity/unmapped cases, reversible reference changes and a plain listing. Camera motion must not change relevance. This would test a declared mapping, not establish a theory of human attention. Genuine 4D projection remains a later gate.

Gate 2 has not begun. This pause follows Paul's supplied [orchestrator prompt §17](/Users/paul/BTC-Learning/experiments/looking-glass/inputs/LOOKING_GLASS_CODEX_ORCHESTRATOR_PROMPT.md), which requires: “After presenting the packet, **end your turn and await Paul**.”

**Please watch the calibration replay. Do you approve Gate 2: Hopf correspondence and the shared reference, want revisions to Gate 1, or want to pause?**
