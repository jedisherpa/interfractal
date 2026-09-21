# Recover and inspect the prepared materials

This component contains synthetic materials and engineering checks. It does not run research models or human participants. Use Node.js 24 for package generation and Python 3.9+ for byte verification. The recorded run used Node 24.17.0.

From the project directory, verify the final preserved files with:

```sh
python3 preparation/materials-v1/verify-frozen.py
```

This checks all 1,947 historical gate entries and the materials final freeze. It checks bytes, not the truth of every research claim or human approval. It fails until the materials `FREEZE_MANIFEST.json` has been created.

Inspect candidate 003 locally with:

```sh
node preparation/materials-v1/tooling/preview.mjs 44009
```

Open `http://127.0.0.1:44009/`. The read-only server serves only its researcher overview, containing the full source union. It is not a participant-isolation mechanism. Keys, withheld tasks and participant bundles have no HTTP routes. Do not give a blind participant the full project, researcher preview or audit files.

To regenerate without touching any preserved candidate, create a new empty working directory. Copy `package-candidate-003/builder-tooling/` to `tooling/` and `package-candidate-003/research-team/design/` to `design/` in that directory. Invoke the copied `build-package.mjs` with **canonical absolute paths**, first with `build`, then with `verify`. Building refuses to overwrite an existing candidate directory. Verification must print its successful 70-file result, and the recreated `MANIFEST.json` must hash to:

```text
7f7ba05a8f5d5fca9298d4e0b81210f049ff3a804fc94ab420d89fa4c5f32ced
```

The host performed this clean reproduction from only those two copied directories. All 70 recreated files matched the original bytes. The [successful canonical-path record](evidence/clean-reproduction-003-canonical.json) preserves actual command output and comparison results.

The [first reproduction attempt](evidence/clean-reproduction-003.json) is also preserved. On macOS, its `/var/...` staging path resolved to `/private/var/...` inside Node. The script's direct-entry guard compared those unequal path strings and returned exit 0 without building. Canonical paths corrected the invocation without changing the frozen code. Therefore **exit 0 alone is insufficient**: require the success message, output inventory and exact manifest. Noncanonical symlink entry paths remain a CLI limitation; harden that entry guard during the next tooling-preparation revision. No claim of unrestricted cross-platform CLI compatibility is made.

The initial source/task freeze, author design freeze, blind-key freeze, failed candidates 001/002 and candidate 003 are immutable evidence. Do not rerun one-shot audit or evidence writers in place. Use a new destination/revision for new checks. The final preparation ZIP, equivalent instrument, transfer/scoring integration and human plans remain separate unfinished deliverables.
