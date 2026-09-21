# Gate 0 browser observations

The host coordinator used the supported Codex in-app browser on the user's Mac. All captures are genuine browser output, with no generated or edited scene images. The browser API returned JPEG bytes even where the initial filenames use `.png`; same-byte `.jpg` copies of several initial captures were retained while diagnosing file preview behavior. The original files remain intact.

## Preserved failed variant G0-CUBE-004

The cube rendered with all eight stable vertex labels visible, an enlarged amber v111 marker, restrained lines, and no visible geometry clipping at the fixed checkpoints. The three source axes are ordinary xyz. The displayed change followed the ordinary camera yaw; source coordinates stayed fixed. This does not demonstrate an additional spatial dimension.

Initial setup used a 1280×720 page viewport. The visible browser pane then measured 998×904. The fixed comparison captures S0-comparison-start, S1-midpoint and S2-final were repeated at 998×904 with scrollTop=0. The initial diagnostic reports its load-time viewport; per-capture DOM dimensions in the observation file identify the actual capture condition. No pixel-equivalence comparison is claimed across those two sizes.

Pause was stable at 13,425 ms across two separated readings. Keyboard Enter on Step produced exactly 1,000 ms from zero. The time slider selected 10,000 ms. Checkpoint buttons restored 0/10/20 seconds. A full replay completed at 20,000 ms and paused.

The Look around control failed: keyboard End and then an explicit request for 120 degrees switched the label to exploration but left the camera at 60 degrees. The app's pause/redraw happened before reading the requested slider value. The screenshot `G0-CUBE-004-failed-look-around.png`, actual activity log, and `G0-CUBE-004-browser-observations.json` preserve this failure. Twelve canonical files and the gate state remained unchanged. G004 is not the accepted gate run.

The full-page capture mechanism produced an oversized image with surplus blank space. Normal viewport captures were used for fixed visual comparisons. No video-recording capability was advertised by the supported browser API, so no video is claimed.

## Replacement G0-CUBE-005

The replacement retains the same object, camera equations, and fixed predictions. Its single behavioral repair reads the requested yaw before pause/redraw. Actual observations are preserved in `G0-CUBE-005-browser-observations.json`. At 998×904, all four fixed captures show the same eight labeled vertices and selected v111 without material geometry clipping. S1 and S3 reproduce the same midpoint geometry; slider focus styling differs, so exact whole-image pixel equality is not claimed.

The corrected manual camera request reached 120 degrees and was labeled exploration. Reset returned to the saved 30-degree starting camera and unchanged cube. A natural replay reached 20 seconds and paused. During a second replay, Pause stopped at 524 ms and stayed there across observations separated by more than a second. Keyboard Step from zero reached 1,000 ms; the time slider reached 10,000 ms. Run Library Open paused and a fresh page reload both opened at zero without autoplay. The replay then restored all three exact checkpoints. The exact-state inspector was opened and closed successfully.

The independent Sol audit compared actual browser states with canonical state hashes and confirmed identical S1/S3 state and viewport. All twelve frozen canonical files and the four prespecification files remained unchanged, as did the Gate 0/no-approval status. Browser warning/error capture was empty. These observations establish the tested path in this browser; broad accessibility and participant understanding remain untested.

The scene's background lighting and selected-point ring are static display cues. Edge opacity and width vary with depth without changing coordinates. Thin rear lines and projected crossings do not imply that source edges intersect. All eight IDs remain available in the exact-state inspector. Broad screen-reader accessibility, mobile layouts, and human comprehension have not been established.
