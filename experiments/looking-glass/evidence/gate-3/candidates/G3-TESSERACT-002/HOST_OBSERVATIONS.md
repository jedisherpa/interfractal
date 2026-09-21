# Gate 3 host observations

Recorded 2026-09-20T02:52:46.298582+00:00. Host coordinator operated the frozen local replay through the supported Codex browser API. No browser handlers were injected; model state was read from the displayed DOM inspector. The independent Sol audit determines assertions; this file records actions, image inspection and coverage limits.

## Observed artifact

Accepted candidate for audit: `G3-TESSERACT-002`, build `g3-d82f221e5cda2757`, source SHA-256 `d82f221e5cda2757fb426fb25784d79fd78ffcbc9c10f7dc63e51d65c2c15552`. Exact snapshot server runs on loopback port43996. The earlier `G3-TESSERACT-001`/`g3-2137b012118cbd13` files and actual failure remain preserved.

There are 97 DOM-backed observations, 93 from candidate002, and 17 original unmodified JPEGs. Forty-six actual candidate002 UI events are bounded in `activity-snapshot.jsonl`; live append-only activity may later grow during review. Planned canonical fixtures are separate. `browser-tool-trace.json` records intended actions; observations and actual app events establish the results.

## Actual trial observations

- Initial paused view shows A and B at one marked site, with both source IDs and coordinates readable. The actual ambiguous SVG hit discloses both IDs. Exact list selection reaches B and collapsed edge records. At90° an x-edge remains inspectable with zero projected length. A unique A marker at45° was actually clicked and selected after B was selected through the list.
- Actual0/8/16/24/32s buttons produced the expected0/45/90/45/0° source angles. C0 and C1 originals use the same1280×720 viewport, camera, fixed SVG scale and scene framing. At0s the pair distance reads0; at16s it reads2 while source distance stays2. The45° views show √2 numerically.
- Camera yaw120° at8s changed the display while retaining projected coordinates, projection fingerprint and time. Source30° at8s changed the projection distance to1 with the canonical camera unchanged. Each subsequent8s restoration returned the same browser checkpoint hash `122758a8952fa8d8bd17934fa3750ce9a93031412fc6c47928d90b1b206c90bc`. At source0 the actual camera120° intervention left the pair coincident.
- Actual fixed, camera-only and known-source comparison controls were exercised. Their visible cards report rank3/underdetermined, rank3/underdetermined and rank4/reconstructed respectively. The known-source card reports all16 maximum post-solve coordinate error and forward residual as0 to its displayed precision; exact numerical values are in the inspector and independent audit.
- Manual Play advanced from8s; Pause held16346ms unchanged across an explicit1300ms wait plus tool overhead. Step produced17346ms; actual scrub produced12500ms; Step at32000ms remained clamped. Selected vertex B and selected edge persisted through the play/pause interval. Reset restored canonical state.
- An uninterrupted Replay started at0 and remained running into its prescribed return segment. The original `C2-active-reverse.jpg` visibly says PLAYING,25.6s and35.9°. Surrounding DOM observations bracket it at25541–25741ms, both playing, with angle decreasing. The image has an interval, not a falsely atomic timestamp. The run ended paused at32000ms without a manual intervening pause. Library Replay was separately started and paused.
- Run Library reopening and intentional browser reload both start paused at0; restoring8s returned the same checkpoint hash. The final trial leaves the accepted replay paused at0.
- Actual accepted observations have matching viewport/DPR and scene rectangle metadata in 93/93 cases; 0 show document-width overflow. Measured sizes were1280×720,1280×900 and960×720. All saved JPEG dimensions agree with their recorded viewport dimensions. The narrow layout has no measured panel outside the viewport. Inspector JSON is wrapped inside a358px-high local scroller, so reading the complete records still takes substantial vertical scrolling.
- The historical Gate2 link was actually clicked from Gate3. Its new tab's DOM and accessibility tree identify `G2-HOPF-003`/`g2-ccabad12693f86a8`, paused at0. Two supported screenshot calls failed for that new target-blank tab; neither produced a claimed image. The limitation is retained in `browser-tool-anomalies.json`; identity is saved in `historical-gate2-review.json`. The temporary review tab was closed. All276 prior frozen entries pass the post-browser hash check.
- The supported console reader returned zero warning/error entries for the current Gate3 tab. This is not a network/performance audit.

## Original-image review and limits

The host inspected all17 emitted originals. The source cards, marked pair and fixed framing are readable at1280×720; the lower explanatory caption and controls require page scrolling. The960px scene is smaller but labels and source coordinates remain readable. The comparison capture shows all three conditions and the stated assumptions. The failed001 inspector image and corrected002 inspector image are preserved with their surrounding measurements. No image was cropped, edited, synthesized or overwritten.

This browser surface did not advertise reduced-motion emulation. Paused initial loading, explicit manual controls, stepping, checkpoint use and absence of unsolicited autoplay were exercised; an operating-system reduced-motion preference was not changed or claimed tested. No participant comprehension, physical fourth dimension, arbitrary screenshot reconstruction, unknown transform/correspondence recovery, video recording or Gate4 result is asserted.
