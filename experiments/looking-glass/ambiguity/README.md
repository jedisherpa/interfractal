# Gate 8 finite ambiguity instrument

This is a transparent four-case software benchmark. The public `fixture.json` lists every candidate source and property. Exact source observations use normalized BigInt rational strings; the camera and two-decimal labels affect presentation only. The reference world is selected openly. No participant answers, hidden key, scoring or human study exist.

The saved demonstration opens paused at 0 seconds, lasts 32 seconds, and has nine four-second checkpoints. Query additions at 24 seconds occur separately in fixture order. At 32 seconds the replay adds `xw90`, then an automatic `tour-stop` records `end-of-sequence`. Manual controls enter exploration; a checkpoint or replay restores the saved state. Raw exact records and a complete JSON state inspector are in the page.

SVG uses a fixed 43-pixel-per-unit scale around the panel center, yaw about display y at −45°, 0° or +45°, then fixed 20° pitch about display x. Ball radius uses floating `sqrt(radiusSquared)` only for drawing. There is no per-query or per-world autoscale. Compatibility and certificates use exact normalized rational values, with a separately labeled pairwise 10⁻¹⁰ tolerance and fixed two-decimal label diagnostic.

Build candidate 001 only after checking the frozen prespec:

```sh
/opt/homebrew/Cellar/node@24/24.17.0/bin/node ambiguity/build.mjs
```

The builder runs model checks, copies a content-addressed immutable source snapshot, and writes run records without replacing an earlier candidate. Start the exact snapshot using the `launch` command printed by the builder. Default port is 44001 and the server binds only to 127.0.0.1. It serves the seven named public assets, `/api/run`, `/api/build`, `/api/checkpoints`, `/api/events`, `/api/activity` (POST), five named `/review/` files and original screenshot names. Missing review files return 404 until the host finishes the packet. There is no generic filesystem route. Actual UI events append to `activity.jsonl`; canonical run files are never rewritten by opening the page.
