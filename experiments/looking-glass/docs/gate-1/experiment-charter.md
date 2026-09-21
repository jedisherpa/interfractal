# Gate 1 — familiar cube calibration

Version: `gate-1-charter-v1`. Scope: approved Gate 1 only. This prespecification is frozen before browser trials; it states predictions, not observed results.

Paul approved Gate 1 in the actual message recorded in `approvals/GATE_1_APPROVAL.json`: “I approve Gate 1. Save this replay and commit it then move on to the next.” The reviewed Gate 0 replay was saved in commit `6fb4ecbd516aa9a9dc23710c7ffcda4e8c65b819`. Gate 0 documents/evidence/build remain historical. Gate 2 is not approved.

## Question and alternatives

Does the instrument faithfully distinguish a known ordinary 3D source object, its 2D orthographic shadow, and the observer's display camera, with reproducible controls? The candidate interpretation is that a declared source rotation reveals a specific distinction hidden by one projection. Alternatives that count against it include camera motion being mistaken for source motion, projection depending on the display camera, changed source identities/distances, decorative separation of coincident points, or changed software substituting for historical replay.

This is an instrument correctness and bounded observability experiment. The ordinary 3D wireframe has eight source vertices spanning three coordinates and twelve edges. Playback time is separate. No Hopf, 4D/5D, semantic attention mapping, shared-meaning study, or human comprehension trial runs in this gate.

## Exact model and independent predictions

Source vertex `vabc` has coordinates `(2a−1, 2b−1, 2c−1)`, with each bit in `{0,1}`. An edge joins exactly two IDs differing in one bit; its stable ID is the lexicographically ordered endpoint IDs joined by `-`. Keep original coordinates unchanged.

For column vectors, a source turn in the x–z plane is

```text
R(theta) = [[cos(theta), 0, -sin(theta)],
            [0,          1,  0         ],
            [sin(theta), 0,  cos(theta)]]
q′ = R(theta) q
shadow = P q′ = (x′, y′); P = [[1,0,0], [0,1,0]]
```

The primary camera is fixed at yaw `pi/6` (30°), pitch `pi/9` (20°). It observes the rotated 3D source, independently of `P`:

```text
xcam = cos(yaw) x′ + sin(yaw) z′
z1   = -sin(yaw) x′ + cos(yaw) z′
ycam = cos(pitch) y′ - sin(pitch) z1
zcam = sin(pitch) y′ + cos(pitch) z1
source-view screen-model coordinate = (xcam, -ycam)
shadow-view screen-model coordinate = (x′, -y′)
```

Each pane has a declared fixed viewBox, scale, and center. No fit-to-object rescaling, perspective, jitter, trail, or camera animation occurs in the primary sequence. Responsive CSS may resize the pane while preserving its viewBox mapping; record the actual viewport. The renderer is SVG from the same computed 3D state; depth cues may style source-view edges without moving them.

The immutable canonical sequence lasts 40,000 ms, evaluated directly from simulation time, with 1,000 ms manual steps:

```text
theta(t) = pi*t/40000               for 0 <= t <= 20000 ms
theta(t) = pi*(40000-t)/40000       for 20000 <= t <= 40000 ms
```

Track `v110=(1,1,-1)` and `v111=(1,1,1)`. Their rotated coordinates are `(c+s,1,s-c)` and `(c-s,1,s+c)`. Their 3D distance remains 2. Their shadow separation is `2|sin(theta)|`; the omitted z coordinate is the hidden distinction at zero. Independently derived complete checkpoints and overlap memberships are in `independent-predictions.json`; they do not import implementation functions.

| Checkpoint ms | Angle | v110 rotated xyz | v111 rotated xyz | Shadow separation | Distinct shadow sites | Collapsed source edges |
|---|---|---|---|---|---|---|
| 0 | 0° | (1,1,-1) | (1,1,1) | 0 | 4 | 4 |
| 10000 | 45° | (sqrt(2),1,0) | (0,1,sqrt(2)) | sqrt(2) | 6 | 0 |
| 20000 | 90° | (1,1,1) | (-1,1,1) | 2 | 4 | 4 |
| 30000 | 45° | (sqrt(2),1,0) | (0,1,sqrt(2)) | sqrt(2) | 6 | 0 |
| 40000 | 0° | (1,1,-1) | (1,1,1) | 0 | 4 | 4 |

At every checkpoint, the source retains eight vertices, twelve edges, each edge length 2, each source norm `sqrt(3)`, and all 28 pairwise distances (12 at 2, 12 at `sqrt(8)`, 4 at `sqrt(12)`). A drawing intersection is not a new source vertex. Coincident shadow sites must list all their source IDs without offsetting the geometry. The inspector preserves all twelve edge IDs, identifies collapsed edges, and records the multiplicity of coincident nonzero shadow segments. A collapsed edge remains a source edge even though its projected length is zero.

## Prespecified trials

All numeric checks use absolute tolerance `1e-10` in model units. The same frozen build/serializer must reproduce exact hashes at the same checkpoint. Numerical closeness is distinct from screenshot equivalence.

| ID / question | Intervention and controls | Expected / evidence against | Evidence and claim class |
|---|---|---|---|
| G1-T01 / Is the declared model retained? | Inspect IDs, original/rotated coordinates and edges at all five fixed-camera checkpoints | Exact 8/12 identities; norms, all 28 distances and edge lengths preserved; a changed ID/distance fails | Independent numeric assertions; model correctness |
| G1-T02 / Does source rotation produce the predicted shadow? | Play 40s source sequence with camera fixed; restore each checkpoint | All projected coordinates match independent predictions; marked-pair separation 0/sqrt(2)/2/sqrt(2)/0; site counts 4/6/4/6/4; wrong sign, hidden jitter or camera drift fails | Actual UI playback/checkpoints plus numeric records and captures; model correctness and specified observability |
| G1-T03 / Does an algebraic inverse recover the source? | Independently apply R(-theta) to R(theta)q for all vertices at 0°,15°,45°,90° | All original coordinates recovered within tolerance; separately, t=40000 geometry equals t=0 geometry | Algebraic inverse assertions plus final UI state. A prescribed trajectory returning to theta=0 alone does not prove algebraic inversion |
| G1-T04 / Is camera motion an insufficient intervention for changing the shadow? | Restore t=10000; change only Look around yaw from 30° to 120°, retain pitch20° and source theta45°; restore t=10000 | Source-view camera/screen changes; all original/rotated source and shadow coordinates unchanged; exact checkpoint restored. Any shadow change fails | Actual control trace, before/after geometry hashes and visible comparison; camera-isolation negative case |
| G1-T05 / Is manual source control separate? | Restore t=10000; change only Source turn from 45° to30°; restore t=10000 | Camera remains30°/20°; pair shadow distance becomes1; exploration labeled, no canonical file changes; checkpoint exact | Actual control trace and recorded coordinate assertions; interaction/model check |
| G1-T06 / Do controls reproduce historical states? | Open paused, Replay from start, Pause and observe ≥2s wall-time stability; Step+1s, Scrub, restore checkpoints; Run Library reopen and page reload; replay midpoint | Paused state stable; step exactly1000ms clamped to40000; named checkpoints match; open/reload paused at0; same midpoint coordinates and state hash | Actual UI traces, browser snapshots, replay capture; replay/interaction correctness |
| G1-T07 / Is history preserved and watchable? | Hash canonical source/build/run before/after all controls; inspect captures, inspector and Run Library including G0 entry | Canonical bytes unchanged; G0 entry resolves to its preserved build; visible two labeled panes, source angle/camera, pair identities, overlap explanation, controls and run/build identity; clipping/illegibility reported | Integrity records and limited investigator visual inspection, not human comprehension |

Source or camera overrides create a separately labeled exploration. Reset/checkpoint restore discards only the exploration cursor, never saved evidence. Browser operations are performed by root with actual supported computer use; the verifier checks evidence independently and does not audit their own implementation.

## Captures and replay checkpoints

Capture actual untouched browser images at the initial hidden pair (0s), separating midpoint (10s), maximum separation (20s), inverse-sequence return (40s), camera-only comparison at10s, and reopened10s. The final packet selects two to four inspected images and links the remaining evidence. Record run/build, simulation time, camera, source angle, viewport and capture context. Note crossings, label occlusion, clipping, hidden controls, and discrepancies; never substitute generated imagery.

## Decision and bounded stopping

Pass a trial only with its specified evidence. Any invariant/projection/control/history mismatch fails that trial. If a missing capability or inaccessible UI prevents observation, report inconclusive/blocked and preserve the last successful replay. A numerically correct but hard-to-read rendering is a mixed result, not evidence of understanding. Human usability and unfamiliar-case comprehension remain untested unless Paul actually participates in a separately documented task.

Preserve every candidate; repairs receive a new run/build. Normally permit one initial browser variant plus at most two justified revisions, then return evidence or a blocker. Do not rewrite these predictions after viewing results. Material changes require a new version and explicit deviation record. Stop all stage workers and freeze a Gate1 packet containing actual question/expected/observed/interpretation/unresolved, changes/failures, and the exact replay. Request Paul's Gate2 decision and end the turn. Merely opening a replay never approves a stage.
