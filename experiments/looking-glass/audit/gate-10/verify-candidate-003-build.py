#!/usr/bin/env python3
"""Independent immutable Gate 10 003 source, build, model and replay audit."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "prediction-transfer"
BUILD = BASE / "builds/g10-9e34f791d83c1cd7a495"
RUN = BASE / "runs/G10-PREDICT-003"
DOCS = ROOT / "docs/gate-10"
AUDIT = ROOT / "audit/gate-10"
errors = []
checks = 0


def check(label, condition):
    global checks
    checks += 1
    if not condition:
        errors.append(label)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def hash_object(value):
    return sha(canonical(value).encode())


def read(path):
    return json.loads(path.read_text())


fixture = read(DOCS / "fixture.json")
key = read(DOCS / "private-answer-key.json")
pred = read(DOCS / "independent-predictions.json")
freeze = read(DOCS / "PRESPEC_FREEZE.json")
build = read(BUILD / "build.json")
private_manifest = read(BUILD / "private/build-manifest.json")
run = read(RUN / "run.json")
run_manifest = read(RUN / "run-manifest.json")
prespec_review = read(AUDIT / "prespec-review.json")
source_hash = "9e34f791d83c1cd7a495bec3371470fddebd6ad96205e957dc635d9404dc22f4"
build_id = "g10-9e34f791d83c1cd7a495"
run_id = "G10-PREDICT-003"
freeze_sha = sha((DOCS / "PRESPEC_FREEZE.json").read_bytes())

check("prespec freeze identity", freeze_sha == "3dba94a05674bf8760ea036a4115010ae524e2211d7aa7ecf404139dba3f9d56")
check("six frozen input files", len(freeze["files"]) == 6)
for pin in freeze["files"]:
    data = (ROOT / pin["path"]).read_bytes()
    check(f"frozen {pin['path']}", len(data) == pin["bytes"] and sha(data) == pin["sha256"])
check("prespec reviewer pins", prespec_review["status"] == "PASS" and {x["path"]: x["sha256"] for x in prespec_review["inputFiles"]} == {x["path"]: x["sha256"] for x in freeze["files"]})
check("build/run identity", all(x["runId"] == run_id and x["buildId"] == build_id for x in (build, private_manifest, run, run_manifest)))
check("full source hash", all(x["sourceHash"] == source_hash for x in (build, private_manifest, run)) and build_id == "g10-" + source_hash[:20])
check("base commit and runtime", all(x["baseCommit"] == "9e39c0332d7b34f60a9e779cdbff7fd93e6acee1" for x in (build, private_manifest, run)) and run["nodeExecutable"] == "/opt/homebrew/Cellar/node@24/24.17.0/bin/node" and run["nodeVersion"] == "v24.17.0")
check("public build is sanitized", set(build) == {"schema", "runId", "buildId", "fixtureId", "sourceHash", "baseCommit", "nodeVersion", "publicRoutes", "apiRoutes", "localSoftwareOnly", "humanParticipants"} and "private" not in canonical(build).lower() and all(pin["sha256"] not in canonical(build) for pin in freeze["files"] if "private" in pin["path"] or "predictions" in pin["path"]))
check("build route allowlist", build["publicRoutes"] == ["/", "/index.html", "/app.mjs", "/model.mjs", "/style.css", "/fixture.json", "/build.json", "/run/run.json", "/run/initial-state.json", "/run/events.jsonl", "/run/checkpoints.json"] and build["apiRoutes"] == ["/api/session", "/api/start", "/api/commit", "/api/reveal", "/api/close", "/api/export"])
check("public fixture and private copies exact", (BUILD / "fixture.json").read_bytes() == (DOCS / "fixture.json").read_bytes() and (BUILD / "private/private-answer-key.json").read_bytes() == (DOCS / "private-answer-key.json").read_bytes() and (BUILD / "private/independent-predictions.json").read_bytes() == (DOCS / "independent-predictions.json").read_bytes() and (BUILD / "private/PRESPEC_FREEZE.json").read_bytes() == (DOCS / "PRESPEC_FREEZE.json").read_bytes())
check("private manifest source content count", len(private_manifest["sourceContent"]) == 17)
for entry in private_manifest["sourceContent"]:
    path = ROOT / entry["path"]
    check(f"source manifest {entry['path']}", path.is_file() and sha(path.read_bytes()) == entry["sha256"])
check("source composite hash independently reproduced", hash_object(private_manifest["sourceContent"]) == source_hash)
check("private manifest build content count", len(private_manifest["buildFiles"]) == 15)
for entry in private_manifest["buildFiles"]:
    path = BUILD / entry["path"]
    check(f"build manifest {entry['path']}", path.is_file() and sha(path.read_bytes()) == entry["sha256"])
for name in ["README.md", "app.mjs", "build.mjs", "index.html", "math.mjs", "model.mjs", "server.mjs", "service.mjs", "style.css", "test.mjs"]:
    check(f"immutable copied source {name}", (BUILD / name).read_bytes() == (BASE / name).read_bytes())
check("run fixture and freeze hashes", run["fixtureSha256"] == sha((DOCS / "fixture.json").read_bytes()) and run["prespecFreezeSha256"] == freeze_sha)
check("five run pins", len(run_manifest["files"]) == 5)
for pin in run_manifest["files"]:
    check(f"run manifest {pin['path']}", sha((RUN / pin["path"]).read_bytes()) == pin["sha256"])


def expected_state(seconds):
    return {"mode": "saved-tour", "cursorSeconds": seconds, "paused": True, "caseId": fixture["savedTour"]["caseOrder"][seconds // 4], "practiceOpen": False, "draftOption": None, "responsePhase": "none", "response": None, "revealedResult": None, "attachedAttempt": None, "pendingAction": None, "reviewStatus": "end-of-sequence" if seconds == 20 else "standard-playback"}


def expected_payload(state):
    task = next(t for t in fixture["tasks"] if t["id"] == state["caseId"])
    return {"schema": "gate10-semantic-v1", "mode": state["mode"], "cursorSeconds": state["cursorSeconds"], "paused": state["paused"], "caseId": state["caseId"], "practiceOpen": state["practiceOpen"], "practice": fixture["practice"] if state["practiceOpen"] else None, "task": task, "formulas": fixture["formulas"], "pointQueries": fixture["pointQueries"], "rendering": fixture["rendering"], "draftOption": state["draftOption"], "responsePhase": state["responsePhase"], "response": state["response"], "revealedResult": state["revealedResult"], "attachedAttempt": state["attachedAttempt"], "pendingAction": state["pendingAction"], "reviewStatus": state["reviewStatus"]}


initial = read(RUN / "initial-state.json")
check("initial canonical state/payload/hash", initial == {"state": expected_state(0), "payload": expected_payload(expected_state(0)), "semanticFingerprint": hash_object(expected_payload(expected_state(0)))})
checkpoints = read(RUN / "checkpoints.json")
check("six canonical checkpoints", len(checkpoints) == 6 and [row["seconds"] for row in checkpoints] == [0, 4, 8, 12, 16, 20])
for row in checkpoints:
    seconds = row["seconds"]
    state = expected_state(seconds)
    payload = expected_payload(state)
    check(f"checkpoint {seconds} exact", row == {"seconds": seconds, "state": state, "payload": payload, "semanticFingerprint": hash_object(payload), "referenceOnly": True})
    check(f"checkpoint {seconds} answer-free", payload["responsePhase"] == "none" and payload["response"] is None and payload["revealedResult"] is None and payload["attachedAttempt"] is None)
events = [json.loads(line) for line in (RUN / "events.jsonl").read_text().splitlines() if line]
check("six canonical events", len(events) == 6)
for i, event in enumerate(events):
    seconds = [4, 8, 12, 16, 20, 20][i]
    check(f"event {i+1} identity", (event["sequence"], event["eventId"], event["runId"], event["buildId"], event["cursorSeconds"], event["result"]) == (i + 1, f"{run_id}-script:{i+1}", run_id, build_id, seconds, "accepted"))
    if i < 5:
        before = expected_state(seconds - 4)
        before["cursorSeconds"] = seconds
        before["paused"] = False
        after = dict(before)
        after["caseId"] = fixture["savedTour"]["caseOrder"][seconds // 4]
        check(f"event {i+1} case selection", event["type"] == "case-select" and event["origin"] == "replay" and event["provenance"] == "scripted_demonstration" and event["intended"] == {"caseId": after["caseId"], "boundarySeconds": seconds})
    else:
        before = expected_state(20)
        before["paused"] = False
        before["reviewStatus"] = "standard-playback"
        after = expected_state(20)
        check("event 6 natural stop", event["type"] == "tour-stop" and event["origin"] == "automatic" and event["provenance"] == "scripted_demonstration" and event["intended"] == {"reason": "end-of-sequence"})
    check(f"event {i+1} fingerprints", event["beforeSemanticFingerprint"] == hash_object(expected_payload(before)) and event["afterSemanticFingerprint"] == hash_object(expected_payload(after)))
check("same-boundary final chain", events[4]["afterSemanticFingerprint"] == events[5]["beforeSemanticFingerprint"])
check("canonical event types answer-free", all(event["type"] not in ("commit", "reveal", "answer", "practice-open") for event in events))
computation = read(RUN / "computational-results.json")
check("computation not a human result", computation["responseCount"] == computation["revealCount"] == computation["humanParticipants"] == 0)

result = {"schema": "gate10-candidate-003-immutable-build-audit-v1", "status": "PASS" if not errors else "FAIL", "runId": run_id, "buildId": build_id, "sourceSha256": source_hash, "prespecFreezeSha256": freeze_sha, "checkCount": checks, "canonicalCheckpointCount": len(checkpoints), "canonicalEventCount": len(events), "errors": errors, "browserClaims": False}
(AUDIT / "candidate-003-build-audit.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
