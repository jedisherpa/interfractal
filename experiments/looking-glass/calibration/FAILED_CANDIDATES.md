# Preserved Gate 1 candidates

`G1-CUBE-001` / `g1-37916c6f617be6d5` is a pre-browser failed candidate. The first independent numerical check failed because `displayProjection` called `Math.sin(camera.y)` instead of `Math.sin(camera.yaw)`. The undefined `camera.y` yielded `NaN` camera/screen coordinates (serialized as `null` in the saved fixture). The source snapshot and run fixture remain in `builds/` and `runs/` unchanged. It was never presented as a working replay or browser-tested.

`G1-CUBE-002` / `g1-8f5c2683517b3f88` corrected the camera calculation and passed both working-source and frozen-snapshot numeric tests. Before any browser test, review of the Run Library found that its Gate 0 row had the historical run ID and link but did not show the required historical build ID. The 002 source snapshot and run remain unchanged.

`G1-CUBE-003` adds the explicit Gate 0 build identity to the library row. It also uses local port 43994 because the prespecified 43993 was occupied by an unrelated Python HTTP server. It is the first browser candidate if its independent and snapshot checks pass.
