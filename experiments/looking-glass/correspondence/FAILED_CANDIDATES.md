# Preserved candidate history

`G2-HOPF-001` / `g2-d8107c62a9ca1f71` was generated before the Gate 2 prespecification freeze and before actual browser trials. Static review identified a camera yaw sign mismatch, missing radius-4 segment-boundary clipping, unclear disabled pole-chart status, and manual restore events marked as programmatic. It is retained unchanged as a failed pre-browser candidate. No browser success, screenshot, or user observation is claimed for it. `G2-HOPF-002` is a new build/run with these corrections and the frozen specification binding.

`G2-HOPF-002` / `g2-e2b00f2824de8711` passed model/fixture checks and preserved the frozen prespecification binding. Root pre-browser review found that the Run Library named the current run but lacked an explicit control to reopen that exact run paused. It was not used for an actual browser trial. `G2-HOPF-003` adds the stable current-run reopen link and a Library replay button; all earlier candidate bytes remain unchanged.
