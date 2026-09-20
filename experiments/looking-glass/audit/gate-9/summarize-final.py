#!/usr/bin/env python3
"""Collect the independent Gate 9 checks into a bounded final verdict."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
A = ROOT / "audit/gate-9"
def read(name):
    return json.loads((A / name).read_text())


prespec = read("prespec-review.json")
prepackage = read("prepackage-final-audit.json")
build = read("build-audit.json")
routes = read("route-audit.json")
history = read("history-integrity.json")
core = read("core-audit.json")
browser = read("browser-audit.json")
events = read("event-audit.json")
fingerprints = read("live-fingerprint-review.json")
expected_statuses = {
    "prespec": prespec["status"],
    "prepackageFinal": prepackage["status"],
    "immutableBuild": build["status"],
    "readOnlyRoutes": routes["status"],
    "historicalFreeze": history["status"],
    "closedCore": core["status"],
    "browserEvidence": browser["status"],
    "semanticEvents": events["status"],
}
errors = []
for label, status in expected_statuses.items():
    accepted = {"PASS_WITH_QUALIFICATION"} if label == "browserEvidence" else {"PASS"}
    if status not in accepted:
        errors.append(f"{label} status {status}")
if fingerprints["mismatchCount"] != 3 or [x["observation"] for x in fingerprints["mismatches"]] != [219, 236, 283]:
    errors.append("unexpected live fingerprint mismatch set")
if fingerprints["exactCount"] != browser["exactSemanticFingerprints"]:
    errors.append("Python/JavaScript fingerprint audit disagreement")
if core["manifestSha256"] != "2bc665deb66351e70ccd13fc57056365cecb75a2f2e892205fc56f79544dd6d0":
    errors.append("core manifest identity")
if hashlib.sha256((ROOT / "evidence/gate-9/CORE_TRIAL_CLOSED.json").read_bytes()).hexdigest() != core["manifestSha256"]:
    errors.append("core manifest changed after closure")
if (build["sourceSha256"], build["buildId"]) != ("15c3bf973fe0c6cde206e17f133b0ab7e868cf7026e7d4c9a0f7930e93c6f910", "g9-15c3bf973fe0c6cd"):
    errors.append("immutable build identity")
if history["totalEntries"] != 1081 or history["totalWorktreeMatches"] != 1081 or history["totalGitBlobMatches"] != 1081:
    errors.append("history preservation")
if (core["observationCount"], core["actionCalls"], core["successfulActions"], core["failedActions"], core["originalCaptureCount"]) != (307, 135, 134, 1, 13):
    errors.append("closed browser collection counts")
if (browser["actualRouteExports"], browser["primaryRecipeModeEndpoints"], browser["designatedCheckpointObservations"]) != (16, 12, 24):
    errors.append("browser export/checkpoint counts")
if (events["semanticEventCount"], events["sessionEventCounts"], events["continuousTourScheduledEvents"]) != (151, [132, 18, 1], 12):
    errors.append("event session/tour counts")

result = {
    "schema": "gate9-final-independent-checks-v1",
    "status": "PASS_WITH_QUALIFICATION" if not errors else "FAIL",
    "scope": "software instrument, immutable build, closed actual browser core, and historical freeze; zero human participants",
    "runId": build["runId"],
    "buildId": build["buildId"],
    "sourceSha256": build["sourceSha256"],
    "closedCoreManifestSha256": core["manifestSha256"],
    "componentStatuses": expected_statuses,
    "counts": {
        "closedFiles": core["pinnedFileCount"],
        "browserObservations": core["observationCount"],
        "actualRecordedMainActionCalls": core["actionCalls"],
        "successfulMainActionCalls": core["successfulActions"],
        "disabledMainActionCalls": core["failedActions"],
        "originalJpegs": core["originalCaptureCount"],
        "primaryMatchedEndpoints": browser["primaryRecipeModeEndpoints"],
        "additionalRegressionExports": browser["actualRouteExports"] - browser["primaryRecipeModeEndpoints"],
        "designatedCheckpointComparisons": browser["designatedCheckpointObservations"],
        "exactCapturedSemanticFingerprints": browser["exactSemanticFingerprints"],
        "liveClockFingerprintMismatches": len(browser["liveClockFingerprintMismatches"]),
        "actualBrowserSemanticEvents": events["semanticEventCount"],
        "actualBrowserSessions": len(events["sessionEventCounts"]),
        "historicalFrozenEntries": history["totalEntries"],
    },
    "qualification": {
        "kind": "non_atomic_live_inspector_fingerprint",
        "observationIndices": browser["liveClockFingerprintMismatches"],
        "impact": "Three active-clock snapshots cannot be claimed as self-consistent state/fingerprint pairs. All 24 designated paused checkpoints and 16 completed-route exports verified; no endpoint parity result depends on these three snapshots.",
    },
    "humanOutcome": "untested",
    "errors": errors,
}
(A / "final-checks.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
