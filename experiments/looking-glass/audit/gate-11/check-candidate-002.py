#!/usr/bin/env python3
"""Independent immutable-byte and finite-result checks for Gate 11 candidate 001."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "receiver-summary/builds/g11-7ced826c903d40c5a0dd"
RUN = ROOT / "receiver-summary/runs/G11-RECEIVER-002"
AUDIT = ROOT / "audit/gate-11"


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha_payload(value):
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


checks = []


def check(name, value):
    checks.append({"name": name, "pass": bool(value)})


manifest = read(BUILD / "source-manifest.json")
build = read(BUILD / "build.json")
run_manifest = read(RUN / "run-manifest.json")
prespec = read(AUDIT / "prespec-review.json")
derivation = read(AUDIT / "prespec-derivation.json")
expected_source = "7ced826c903d40c5a0dd6398477debdf65e1ccbd4a9260d4d0fe9556aad1fc70"
expected_build = "g11-7ced826c903d40c5a0dd"
expected_run = "G11-RECEIVER-002"

check("three identities", build["runId"] == manifest["runId"] == run_manifest["runId"] == expected_run and build["buildId"] == manifest["buildId"] == run_manifest["buildId"] == expected_build and build["sourceHash"] == manifest["sourceHash"] == expected_source)
check("source content hashes", all(sha(ROOT / item["path"]) == item["sha256"] for item in manifest["content"]))
check("packaged file hashes", all(sha(BUILD / item["path"]) == item["sha256"] for item in manifest["built"]))
check("copied source files exact", all(sha(ROOT / item["path"]) == sha(BUILD / Path(item["path"]).name) for item in manifest["content"] if item["path"].startswith("receiver-summary/")))
check("run file hashes", all(sha(RUN / item["path"]) == item["sha256"] for item in run_manifest["files"]))
check("five prespec hashes match prior independent review", all(next(item for item in manifest["content"] if item["path"] == spec["path"])["sha256"] == spec["sha256"] == sha(ROOT / spec["path"]) for spec in prespec["inputFiles"]))
check("built fixture matches frozen fixture", sha(BUILD / "fixture.json") == sha(ROOT / "docs/gate-11/fixture.json"))
check("public route allowlist omits audit and computational results", set(build["publicRoutes"]) == {"/", "/index.html", "/app.mjs", "/model.mjs", "/receiver.mjs", "/style.css", "/fixture.json", "/build.json", "/run/run.json", "/run/initial-state.json", "/run/events.jsonl", "/run/checkpoints.json"})
check("independent prespec still passes", derivation["status"] == "PASS" and derivation["checkCount"] == derivation["passCount"] == 205)
results = read(RUN / "computational-results.json")
check("full source answers", all(results["fullSourceAnswers"][world][receiver] == derivation["fullTruth"][receiver][i] for i, world in enumerate(derivation["worldOrder"]) for receiver in ("R_COUNT", "R_RELEASE")))
check("full source SHA-256", results["sourceHashes"]["family"] == derivation["familyHash"] and results["sourceHashes"]["worlds"] == derivation["worldSourceHashes"])
check("shortcut counterexamples", results["shortcutDisagreementWorlds"] == derivation["wrongShortcutFalsePositiveWorlds"])
for cert in results["certificates"]:
    oracle = derivation["subsetCertificates"][cert["subsetMask"]]
    answer_key = "countAnswers" if cert["receiverId"] == "R_COUNT" else "releaseAnswers"
    expected_blocks = [{"worldIds": b["worldIds"], "answers": b[answer_key]} for b in oracle["blocks"]]
    observed_blocks = [{"worldIds": b["worldIds"], "answers": b["answers"]} for b in cert["blocks"]]
    sufficient_key = "countGloballySufficient" if cert["receiverId"] == "R_COUNT" else "releaseGloballySufficient"
    expected_conflicts = [] if cert["receiverId"] == "R_COUNT" else oracle["conflictingReleasePairs"]
    check(f"certificate {cert['receiverId']} mask {cert['subsetMask']}", cert["fields"] == oracle["fields"] and observed_blocks == expected_blocks and cert["globallySufficient"] == oracle[sufficient_key] and cert["conflictingPairs"] == expected_conflicts and cert["partitionHash"] == derivation["partitionHashes"][str(cert["subsetMask"])] )
check("exact sixteen certificates", len(results["certificates"]) == 16 and {(c["receiverId"], c["subsetMask"]) for c in results["certificates"]} == {(r, m) for r in ("R_COUNT", "R_RELEASE") for m in range(8)})
for revision_id, mask in (("S0", 0), ("S1", 1), ("S2", 3)):
    revision = results["canonicalRevisions"][revision_id]
    check(f"canonical {revision_id} payload hashes", revision["payloadHashes"] == derivation["projectionPayloadHashes"][str(mask)] and all(revision["envelopes"][world]["fullSourceHash"] == derivation["worldSourceHashes"][world] for world in derivation["worldOrder"]))
check("canonical lineage", [(key, value["parentId"], value["fieldsAfter"], value["provenance"]) for key, value in results["canonicalRevisions"].items()] == [("S0", None, [], "scripted_demonstration"), ("S1", "S0", ["calibration"], "scripted_demonstration"), ("S2", "S1", ["calibration", "authorization"], "scripted_demonstration")])
checkpoints = read(RUN / "checkpoints.json")
predictions = read(ROOT / "docs/gate-11/independent-predictions.json")
for row, expected in zip(checkpoints, predictions["checkpointExpectations"]):
    semantic = row["payload"]
    check(f"paused checkpoint {row['seconds']}", row["seconds"] == expected["seconds"] and semantic["cursorSeconds"] == expected["seconds"] and semantic["worldId"] == expected["worldId"] and semantic["receiverId"] == expected["receiverId"] and semantic["revisionId"] == expected["revisionId"] and semantic["representation"] == expected["representation"] and semantic["receiverResult"]["answer"] == expected["localAnswer"] and semantic["globalCertificate"]["globallySufficient"] == expected["globalSufficient"] and semantic["sourceFamilyHash"] == derivation["familyHash"] and row["referenceOnly"] is True and sha_payload(semantic) == row["semanticFingerprint"])
check("exact seven paused checkpoints", len(checkpoints) == 7 and [x["seconds"] for x in checkpoints] == [0, 4, 8, 12, 16, 20, 24])

result = {"schema": "gate11-candidate002-independent-bytecheck-v1", "status": "PASS" if all(item["pass"] for item in checks) else "FAIL", "checkCount": len(checks), "passCount": sum(item["pass"] for item in checks), "checks": checks, "buildId": expected_build, "sourceHash": expected_source}
(AUDIT / "candidate-002-bytecheck.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({key: value for key, value in result.items() if key != "checks"}, indent=2))
if result["status"] != "PASS":
    raise SystemExit(1)
