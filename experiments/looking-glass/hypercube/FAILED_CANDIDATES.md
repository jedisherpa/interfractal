# Gate 3 candidate history

The working-source review before the first frozen candidate found schema and presentation mismatches. They were repaired before a build, run or browser trial existed, so they are not labeled failed browser candidates. The first frozen candidate and any justified corrections will be appended here with exact build/run identity and observed reason. The limit is one initial candidate plus at most two preserved revisions.

## Candidate 001 — browser failure retained

`G3-TESSERACT-001` / `g3-2137b012118cbd13` was the first immutable build. In the actual 1280×720 browser trial, the inspector initially reported the scene rectangle correctly. Clicking its native details summary scrolled the document; observations 2–4 then showed a stale `sceneRect` in the visible inspector while geometry and checkpoint fingerprints stayed stable. Root preserved the original image at `evidence/gate-3/screenshots/001-inspector-scroll.jpg` and its state observations in `evidence/gate-3/browser-observations.json`. This fails the Gate 3 fresh-environment requirement, not the mathematical projection result. Candidate 001 source, build, run and evidence remain unchanged. The independent audit also identified an initial inspector DPR value of 2 while the separately observed DPR was 1; that metadata mismatch remains in the raw record.

## Candidate 002 — event-label mismatch retained

`G3-TESSERACT-002` / `g3-d82f221e5cda2757` refreshed visible viewport/scene metadata after scroll, details toggle and resize. Environment values remained outside source, projection, checkpoint and display fingerprints. Root preserved 93 candidate002 observations and 46 UI events, within the 97-observation bundle that also retained four candidate001 observations. The independent audit found the automatic `playback.pause` event at 32000 ms had the correct `automatic-playback` origin but `payload.reason="canonical end"`; the frozen Gate 3 record contract specifies `"end-of-sequence"`. Candidate 002 source, build, run and observations remain unchanged.

## Candidate 003 — final bounded correction passed

`G3-TESSERACT-003` changes only the automatic endpoint reason to `end-of-sequence`, with a new run/source identity and this candidate history. The mathematical model, display, fingerprints and scroll-metadata correction are unchanged. This is the second and final allowed revision. The host completed a fresh 67-observation browser regression with 6 original captures and 46 actual UI events. The separate independent audit passed 14/14 build, 14/14 route and 12/12 browser assertions for `G3-TESSERACT-003` / `g3-6c31bc16aeca4460`. Its automatic end records `automatic-playback` and `end-of-sequence` at 32000 ms. See `audit/gate-3/AUDIT.md` and `evidence/gate-3/GATE_3_PACKET.md` for the bounded result and coverage limits. This outcome note was added after the immutable executable snapshots were created; those snapshot bytes remain unchanged.
