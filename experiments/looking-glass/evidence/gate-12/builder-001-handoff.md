# Gate 12 candidate 001 builder handoff

- Candidate: `G12-COORD-001`; build `g12-0d66d254f275f3663dee`.
- Full source SHA-256: `0d66d254f275f3663dee1b9e75062a046106dddc3f4ce9419eaa519688cd5e74`.
- Frozen prespec SHA-256: `0aafcfe9b62f5ba1c2b5934ae7624b4e05248d7ed36ccfa266a4bc55cd4458b1`.
- Exact Node: `/opt/homebrew/Cellar/node@24/24.17.0/bin/node` (`v24.17.0`).
- Start: `/opt/homebrew/Cellar/node@24/24.17.0/bin/node /Users/paul/BTC-Learning/experiments/looking-glass/coordination/builds/g12-0d66d254f275f3663dee/server.mjs --run /Users/paul/BTC-Learning/experiments/looking-glass/coordination/runs/G12-COORD-001 --port 44005`.
- Builder verification: source and packaged tests each `283 PASS`; isolated ephemeral HTTP allowlist `7 PASS`. No actual browser acquisition or independent audit claimed.
- Visible controls: `#new-branch`, `#record-archive`, `#record-dispatch`, `#evaluate`, `#scenario`, `#next-assignment`, `#branch`, `#representation`, `#export`, `#reopen`, `#play`, `#pause`, `#checkpoint`. Published JSON in `#inspector`; full event/branch export in `#export-output`. Export is enabled in saved tour and local mode.
- First-use path: New local branch → Record Archive proposal → Evaluate joint procedure (blocked) → Record Dispatch proposal → Evaluate joint procedure (P2) → Plain table → Export local record.
- Local software demonstration only; no participant/session service. Review routes return 404 until host installs hash-approved assets under `coordination/review/`.
