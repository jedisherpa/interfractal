# Looking Glass — Gate 5 review

**Gate 5 passes as a qualified instrument result: the two source controls are independent, known coordinate observations reach rank five, and the saved replay reproduces its checkpoints.** The selected quartet separates after two controls while other projected points still coincide. Human understanding and relative usability were not tested.

Open the **[paused Gate 5 replay](http://127.0.0.1:43998/)** or **[visual results](http://127.0.0.1:43998/evidence/gate-5/results.html)** in the visible Codex browser on this Mac. The preview is local, not permanent hosting.

| Replay identity | Value |
|---|---|
| Run / build | `G5-PENTERACT-001` / `g5-0bdee39bcd7dd541` |
| Full source SHA-256 | `0bdee39bcd7dd541f65044b55195c077948e377758d654fa91cea5a2e5798da9` |
| Base revision | `231780872da982cb87b54f004c287a078d26839b` |
| Runtime / renderer | Node `v24.17.0`, built-ins and browser SVG; no packages, lockfile or external assets |
| Model | `q=(x,y,z,w,v)`, 32 vertices / 80 edges, affine span five; `Ryv(β)Rxw(α)` followed by `Pxyz` |
| Fixed comparison | Yaw 30° / pitch 20°, scale 80, viewBox 640×420; computed 4D comparator uses α only |
| Saved sequence | 40s: α0→90°, β0→90°, α90→0°, β90→0° in four 10s legs; nine checkpoints every 5s; opens paused |

## Watch this

1. Open the paused replay and click Replay from start. During 0–10s only x–w changes; during 10–20s only y–v changes. The two return legs end at 40s. Use the 5s and 15s checkpoints to inspect each effect without motion.
2. Use Task T2 · start, then T2 · x–w 45°, followed by T2 · y–v 45°. Inspect 4D site and Inspect 5D site after each turn. The selected pair separates after the first control and the selected quartet after the second; other source IDs still overlap.
3. Scroll to Track correspondence. Rank 4 · v hidden leaves a genuine missing coordinate. Rank 5 · reveal v adds the known third view and shows the numerical solve. The ordinary camera is a separate control.
4. In Slice a solid 5D ball, compare Equal A · 0.5, 0 with Equal B · 0, 0.5, then Point · 1, 0 and Empty · 1.25, 0. The first two have identical slice geometry; the last two distinguish one location from no points.

## Expected and observed

The [four-file prespecification](http://127.0.0.1:43998/evidence/gate-5/review/docs/gate-5/PRESPEC_FREEZE.json) was frozen at `2026-09-20T03:59:55.539897Z`, before browser collection. The separate [independent audit](http://127.0.0.1:43998/evidence/gate-5/review/audit/gate-5/AUDIT.md) passes the mathematical, exact-build, route, actual browser/activity, image and historical-integrity checks.

| Question | Expected | Observed | Interpretation | Unresolved / limits |
|---|---|---|---|---|
| T01–02 · Are the two source controls faithful and independent? | 32 vertices, 80 edges, span five; orthogonal rotations and independent x–w / y–v effects. Camera changes display only. | 25 angle pairs and 12,400 squared-distance checks pass; maximum discrepancy 7.11×10⁻¹⁵. Actual α then β controls affect their declared planes; camera leaves raw state unchanged. | Supports the declared 5D source, projection and control isolation. The disjoint rotations commute. | A wireframe or its apparent complexity does not demonstrate a physical fifth dimension or human understanding. |
| T03–04 · Which observations recover the coordinates? | Base rank 3; base+x–w rank 4 with v hidden; adding known y–v view gives rank 5. | Actual UI displays the rank-3/rank-4 failures and rank-5 solve. Independent audit recovers all 32 vertices plus one opaque noncube probe: maximum coordinate error 1.11×10⁻¹⁶, forward residual 0. | Conditional reconstruction from three known raw 3D views and supplied point correspondences; the solver receives observations and matrices, then a separate evaluator checks truth. | No recovery from arbitrary screenshots, unknown transforms/correspondences, or proof of a uniquely 5D cause. |
| T05 · What do two slice coordinates determine? | ρ²=1−w²−v²: positive solid, exact zero point, negative empty. Different pairs can give equal slices. | 19 frozen analytic cases agree. Actual w=.5 then v=.5 gives radii √.75 then √.5; (.5,0) and (0,.5) give the same √.75 slice. Both exact point presets and the empty preset work. | Two independent known constraints select a 3D slice of the separate unit 5D ball. Full xyz projection stays a unit ball. | Radius identifies w²+v², not the signed ordered pair. Known coordinate labels distinguish the requested conditions; geometry alone does not. |
| T06 · What does the controlled 4D comparison show? | At 0/0→45/0→45/45, raw sites 4D/5D:8/8→12/12→12/18. The marked 4D pair separates after one source action; the 5D quartet after two. | Counts and screen proxies match predictions. T1 uses two actual inspect actions; T2 records two successive source turns and four inspections. The computed α-only 4D comparator matches the pinned historical model. | A prescribed route exposes the chosen extra-coordinate distinctions while retaining global coincidences. Structural and screen-space counts are instrumental measures. | Targets have different cardinalities. Action counts are neither a fair human difficulty comparison nor optimal navigation. At45/45 A still overlaps three unmarked 5D vertices. |
| T07–09 · Can the actual run be watched and recovered? | Visible independent legs and return; natural 40s end; stable pause/step/seek; exact nine checkpoints; fresh metadata and preserved history. | Uninterrupted active capture brackets:0.7–0.8s,17.8–18.0s,28.2–28.3s. Natural end records automatic-playback/end-of-sequence. All nine hashes repeat after exploration, reopening and reload; 556 historical entries unchanged. | The saved local replay and actual tested controls are reproducible within this browser/build. All 131 recorded metadata/state observations and 17 original-image integrity checks pass. | Dense roster text; playback touches the 1280×720 fold and lower controls need scrolling. Two historical screenshot calls failed. No OS reduced-motion emulation or human study. |

## The prescribed comparison

Each cell below is **4D / 5D**, observed under the same fixed camera and scene framing. Source counts remain 16/32 vertices and 32/80 edges. T1 found two IDs at the marked 4D site and four at the marked 5D site. T2 used one x–w action, then one y–v action; its target is a pair in 4D and a quartet in 5D.

| Source angles α,β | Raw unique sites | Collapsed edges | Nonzero edge records | Radius-4 marker-overlap pairs |
|---|---:|---:|---:|---:|
| 0°,0° | 8 / 8 | 8 / 32 | 24 / 48 | 8 / 48 |
| 45°,0° | 12 / 12 | 0 / 16 | 32 / 64 | 4 / 32 |
| 45°,45° | 12 / 18 | 0 / 0 | 32 / 80 | 4 / 20 |

The chosen IDs become mutually distinct; **they do not become globally unique sites**. The final A site still contains three unmarked 5D vertices. These are actual recorded control/inspection counts and defined geometric proxies, not estimates of human effort. A separate finite mathematical check at 30°/30° gives32 distinct5D sites; it does not replace the declared browser task.

## Four inspected originals

These untouched native JPEGs link to bracketing states in the [capture index](http://127.0.0.1:43998/evidence/gate-5/capture-index.json). The point/empty pair has matching actual 1280×720 framing. All 17 originals are preserved. Some images retain the provisional library status visible while evidence was being collected; the final report is separate.

### The selected quartet separates; the full projection remains ambiguous.

![The selected quartet separates; the full projection remains ambiguous.](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-5/screenshots/001-T2-second-turn-45-45.jpg)

At α=β=45°, A/B/C/D have different raw 3D coordinates, but the whole 5D hypercube occupies only 18 sites. A still shares its site with three unmarked vertices. The 4D comparator remains at α=45°. Observations 18–19, run `G5-PENTERACT-001`.

### Two known views still leave v hidden.

![Two known views still leave v hidden.](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-5/screenshots/001-rank4-v-hidden.jpg)

The base and x–w views give rank 4/5 and an explicit “no unique 5D solution” result. This negative case uses raw coordinate observations, not inference from the image. Observations 43–44, run `G5-PENTERACT-001`.

### A boundary slice is one location.

![A boundary slice is one location.](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-5/screenshots/001-slice-point.jpg)

At known (w,v)=(1,0), the radicand is exactly zero. The locator marks a singleton and its radius is zero; it is not a positive-radius sphere. Observations 58–59, run `G5-PENTERACT-001`.

### Outside the boundary, the slice is empty.

![Outside the boundary, the slice is empty.](/Users/paul/BTC-Learning/experiments/looking-glass/evidence/gate-5/screenshots/001-slice-empty.jpg)

At (w,v)=(1.25,0), the radicand is −0.5625. There is no slice object or point locator; axes and the explicit EMPTY · NO POINTS label remain. Observations 62–63, run `G5-PENTERACT-001`.

All originals: [initial-comparison](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-initial-comparison.jpg) · [T1-overlap-0-0](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-T1-overlap-0-0.jpg) · [T2-first-turn-45-0](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-T2-first-turn-45-0.jpg) · [T2-second-turn-45-45](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-T2-second-turn-45-45.jpg) · [active-first-leg](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-active-first-leg.jpg) · [active-second-leg](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-active-second-leg.jpg) · [active-return-leg](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-active-return-leg.jpg) · [rank4-v-hidden](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-rank4-v-hidden.jpg) · [slice-half-half](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-slice-half-half.jpg) · [slice-equal-A](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-slice-equal-A.jpg) · [slice-equal-B](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-slice-equal-B.jpg) · [slice-point](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-slice-point.jpg) · [slice-empty](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-slice-empty.jpg) · [inspector-fresh-environment](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-inspector-fresh-environment.jpg) · [viewport-960x720](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-viewport-960x720.jpg) · [narrow-inspector](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-narrow-inspector.jpg) · [restored-paused-start](http://127.0.0.1:43998/evidence/gate-5/screenshots/001-restored-paused-start.jpg).

## Evidence, changes and qualifications

The [closed core](http://127.0.0.1:43998/evidence/gate-5/CORE_EVIDENCE_CLOSED.json) contains **131 observations, 93 successful root action calls, 85 semantic UI events across three sessions, and 17 original JPEGs**. These describe different records and are not added together. All 23 core files passed integrity checks. The console record is empty. The nine checkpoint hashes agree after repeated restoration, Run Library reopening and page reload; live action history remains separate from deterministic hashes.

**One candidate was required; there was no failed implementation candidate or correction.** Gate 5 adds the full 5D model, independent controls, conditional solver, analytic two-plane slices, computed 4D comparator and preserved replay. Both historical screenshot-tool failures remain in the [history review](http://127.0.0.1:43998/evidence/gate-5/historical-ui-review.json). All 556 frozen entries from Gates 0–4 remain unchanged.

- At 45°/45°, all four marked 5D IDs are mutually separated, but the global projection has 18 sites for 32 vertices. A shares a site with three other, unmarked vertices. The corresponding 4D marked pair is also a restricted target, not a claim that every vertex becomes unique.
- The comparison uses the same camera, scale, glyph radius and actual scene framing. The 4D panel is a separately labeled computed comparator validated against the untouched Gate 3 source. It ignores β. This does not alter the historical 4D replay.
- Marker-overlap counts use center distance <8 SVG units for radius-4 glyphs. Exact screen coincidence and raw 3D coincidence are recorded separately. These are geometric proxies, not measured perception, pixel occlusion or line-crossing scores.
- At 1280×720, source/task controls are visible, but playback touches the bottom and seek/checkpoints require scrolling. ID/status text is small and dense. The 960×720 layout has no horizontal overflow; lower details still need scrolling. The inspector and selected-ID controls preserve access to the records.
- Actual Gate 3 and Gate 4 library links opened their correct paused run/build, verified through DOM/accessibility. A native new-tab screenshot attempt failed once for each. Both failures remain recorded; no historical screenshot is claimed.
- Original JPEGs decode to 1280×720 or 960×720 pixels. These dimensions are recorded independently from the browser’s reported DPR, which was sometimes 2. Active images are bracketed by observations rather than assigned an invented exact frame time.
- No human responses, learning, relative usability, optimal navigation, OS reduced-motion emulation, video or public deployment are claimed. Raw 3D coordinate reconstruction assumes known transforms and stable correspondences; equal-radius slices do not identify their ordered hidden plane coordinates.

Actual routing is recorded in [execution provenance](http://127.0.0.1:43998/evidence/gate-5/execution-provenance.json): Astra xhigh for specification/synthesis, Luna high for primary-source gathering, Sol high for implementation, and a separate Sol high worker for independent audit. Root operated the supported browser and preserved evidence. These are software-agent roles, not human expert or participant reviews.

The [source review](http://127.0.0.1:43998/evidence/gate-5/review/research/gate-5/source-review.md) uses [Arora’s Princeton geometry notes](https://www.cs.princeton.edu/courses/archive/fall13/cos521/lecnotes/lec11.pdf) for cube/ball definitions and slices, and [Hiptmair’s ETH numerical-methods notes](https://people.math.ethz.ch/~grsam/NumMeth/Parts/NCSEFL_handout_chapter_3.pdf) for orthogonality and full-rank recovery. The specific 32/80 counts, matrices and two-constraint formula are direct derivations. Sources do not validate this UI or human comprehension.

Inspect the [raw observations](http://127.0.0.1:43998/evidence/gate-5/browser-observations.json), [root actions](http://127.0.0.1:43998/evidence/gate-5/action-trace.json), [observed semantic events](http://127.0.0.1:43998/evidence/gate-5/observed-activity.jsonl), [saved canonical checkpoints](http://127.0.0.1:43998/runs/G5-PENTERACT-001/checkpoints.json) and [solver cases](http://127.0.0.1:43998/runs/G5-PENTERACT-001/observation-cases.json). Planned run records are labeled fixtures and are distinct from actual controls.

If the preview stops, restart the exact tested snapshot:

```sh
node /Users/paul/BTC-Learning/experiments/looking-glass/five-dimensional/builds/g5-0bdee39bcd7dd541/server.mjs
```

Core evidence is closed and independently audited. Host presentation observations are stored separately from the browser trial. The final gate manifest is `GATE_5_FREEZE.json`; the local commit identity is reported in the task handoff.

## Decision

The next named stage is **Gate 6: Connected local models and changes of scale**: two fictional local contexts with declared shared references, typed dependencies, expandable summaries and a plain table/graph comparison that retains source details. This is proposed scope only; no Gate 6 work has started.

**Do you approve Gate 6: Connected local models and changes of scale, want revisions to Gate 5, or want to pause?**
