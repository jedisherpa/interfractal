#!/usr/bin/env python3
"""Independent Gate 9 immutable package and exact-model verification."""

import hashlib
import itertools
import json
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILD_ID = "g9-15c3bf973fe0c6cd"
RUN_ID = "G9-MATCHED-003"
FULL_SOURCE_HASH = "15c3bf973fe0c6cde206e17f133b0ab7e868cf7026e7d4c9a0f7930e93c6f910"
BUILD = ROOT / "matched-observation/builds" / BUILD_ID
RUN = ROOT / "matched-observation/runs" / RUN_ID
SNAPSHOT = json.loads((ROOT / "evidence/gate-9/prepackage-drafts/review-3/SNAPSHOT.json").read_text())
FREEZE_PATH = ROOT / "docs/gate-9/PRESPEC_FREEZE.json"
FREEZE = json.loads(FREEZE_PATH.read_text())
MANIFEST = json.loads((BUILD / "build.json").read_text())
RUN_META = json.loads((RUN / "run.json").read_text())
FIXTURE = json.loads((BUILD / "fixture.json").read_text())
PRED = json.loads((BUILD / "independent-predictions.json").read_text())
errors = []
checks = 0


def check(label, actual, expected):
    global checks
    checks += 1
    if actual != expected:
        errors.append({"check": label, "actual": actual, "expected": expected})


def sha(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def hash_json(value):
    return sha(canonical(value).encode("utf-8"))


def rat(value):
    f = Fraction(value)
    return str(f.numerator) if f.denominator == 1 else f"{f.numerator}/{f.denominator}"


def observe(source, query):
    x, y, z, w, v = map(Fraction, source)
    values = {"project": (x, y, z), "xw90": (-w, y, z), "yv90": (x, -v, z)}[query]
    return {"kind": "point", "pointId": "P", "xyz": [rat(value) for value in values]}


def unique(items, queries):
    return [{"queryId": q, "observation": next(o["observation"] for o in items if o["queryId"] == q)} for q in queries if any(o["queryId"] == q for o in items)]


def info_hash(items, queries, context_hash):
    return hash_json({"contextHash": context_hash, "observations": unique(items, queries)})


check("build id", MANIFEST["buildId"], BUILD_ID)
check("run id", MANIFEST["runId"], RUN_ID)
check("run/build identity", [RUN_META["runId"], RUN_META["buildId"]], [RUN_ID, BUILD_ID])
check("source id", [MANIFEST["sourceSha256"], RUN_META["sourceSha256"]], [FULL_SOURCE_HASH] * 2)
check("base revision", [MANIFEST["baseRevision"], RUN_META["baseRevision"]], [FREEZE["baseRevision"]] * 2)
check("freeze digest", sha(FREEZE_PATH.read_bytes()), "f91788e4ae31949bec265582afe4e879f9fafb4e05eb8cdb3c9c2c9cacc881cd")
check("embedded freeze", (BUILD / "PRESPEC_FREEZE.json").read_bytes(), FREEZE_PATH.read_bytes())
for entry in FREEZE["files"]:
    data = (ROOT / entry["path"]).read_bytes()
    check(f"frozen {entry['path']}", [sha(data), len(data)], [entry["sha256"], entry["bytes"]])
for entry in SNAPSHOT["files"]:
    built = (BUILD / Path(entry["original_path"]).name).read_bytes()
    check(f"reviewed source {entry['original_path']}", [sha(built), built], [entry["sha256"], (ROOT / entry["snapshot_path"]).read_bytes()])

entries = MANIFEST["publicFiles"] + MANIFEST["internalFiles"]
check("manifest entry count", len(entries), 12)
digest = hashlib.sha256()
for entry in entries:
    data = (BUILD / entry["path"]).read_bytes()
    check(f"manifest {entry['path']}", [sha(data), len(data)], [entry["sha256"], entry["bytes"]])
    digest.update(entry["path"].encode()); digest.update(b"\0"); digest.update(data); digest.update(b"\0")
check("composite source SHA-256", digest.hexdigest(), FULL_SOURCE_HASH)
check("build directory members", sorted(p.name for p in BUILD.iterdir()), sorted([x["path"] for x in entries] + ["build.json", "metadata.json"]))
check("run directory members", sorted(p.name for p in RUN.iterdir()), sorted(["run.json", "initial-state.json", "checkpoints.json", "events.jsonl", "computational-results.json"]))
check("public fixture copy", (BUILD / "fixture.json").read_bytes(), (ROOT / "docs/gate-9/fixture.json").read_bytes())
check("prediction copy", (BUILD / "independent-predictions.json").read_bytes(), (ROOT / "docs/gate-9/independent-predictions.json").read_bytes())

ctx = FIXTURE["commonContext"]
context_hash = hash_json(ctx)
check("context hash", context_hash, PRED["contextHash"])
check("context manifest", [MANIFEST["contextHash"], RUN_META["contextHash"]], [context_hash] * 2)
queries = [q["id"] for q in ctx["queries"]]
reference = next(w for w in ctx["worlds"] if w["id"] == ctx["referenceWorldId"])
for world in ctx["worlds"]:
    for query in queries:
        check(f"exact {world['id']} {query}", observe(world["source"], query), PRED["exactObservations"][world["id"]][query])

for choices, predicted in zip(itertools.product(queries, repeat=2), PRED["allOrderedChoiceResults"]):
    check(f"choice order {choices}", list(choices), predicted["choiceQueryIds"])
    items = [{"index": i, "queryId": q, "observation": observe(reference["source"], q)} for i, q in enumerate(["project", *choices])]
    payload = {"schema": "gate9-choice-trace-v1", "fixtureId": FIXTURE["fixtureId"], "caseId": ctx["caseId"], "referenceWorldId": reference["id"], "contextHash": context_hash, "occurrences": items}
    survivors = [w["id"] for w in ctx["worlds"] if all(observe(w["source"], item["queryId"]) == item["observation"] for item in unique(items, queries))]
    check(f"order {choices} occurrences", items, predicted["occurrences"])
    check(f"order {choices} survivors", survivors, predicted["compatibleWorldIds"])
    check(f"order {choices} trace hash", hash_json(payload), predicted["traceHash"])
    check(f"order {choices} information hash", info_hash(items, queries, context_hash), predicted["informationHash"])
    check(f"order {choices} prefix hashes", [info_hash(items[:n], queries, context_hash) for n in (1, 2, 3)], predicted["watchAcquiredPrefixInformationHashes"])

checkpoints = json.loads((RUN / "checkpoints.json").read_text())
check("checkpoint count", len(checkpoints), 10)
check("initial-state copy", json.loads((RUN / "initial-state.json").read_text()), checkpoints[0])
for record, expected in zip(checkpoints, PRED["savedCheckpoints"]):
    s = record["state"]
    for key in ("seconds",):
        check(f"checkpoint {expected['seconds']} {key}", record[key], expected[key])
    for key in ("condition", "phase", "localSeconds", "tourPaused", "presentationPaused", "acquiredOccurrenceIndices", "traceHash", "practiceOpen"):
        check(f"checkpoint {expected['seconds']} {key}", s[key], expected[key])
    check(f"checkpoint {expected['seconds']} accepted count", len(s["choices"]), expected["acceptedChoiceCount"])
    check(f"checkpoint {expected['seconds']} trace available", s["trace"] is not None, expected["sealedTraceAvailable"])
    check(f"checkpoint {expected['seconds']} visible", record["visibleOccurrenceIndices"], expected["visibleOccurrenceIndices"])
    check(f"checkpoint {expected['seconds']} information", record["acquiredInformationHash"], expected["acquiredInformationHash"])
    check(f"checkpoint {expected['seconds']} completed worlds", s["completedSummary"]["compatibleWorldIds"] if s["completedSummary"] else None, expected["completedCompatibleWorldIds"])
    semantic = {k: s[k] for k in ("mode", "condition", "phase", "tourPaused", "presentationPaused", "tourSeconds", "localSeconds", "choices", "acquiredOccurrenceIndices", "trace", "traceHash", "completedSummary", "reviewStatus", "practiceOpen")}
    semantic["draftOccurrences"] = None if s["trace"] else s["occurrences"]
    semantic["visibleOccurrenceIndices"] = record["visibleOccurrenceIndices"]
    check(f"checkpoint {expected['seconds']} semantic fingerprint", hash_json(semantic), record["semanticFingerprint"])
    check(f"checkpoint {expected['seconds']} tour cursor", s["tourSeconds"], expected["seconds"])

events = [json.loads(line) for line in (RUN / "events.jsonl").read_text().splitlines() if line]
scheduled = [(b["seconds"], e) for b in FIXTURE["savedTour"]["boundaries"] for e in b.get("events", [])]
check("event count", len(events), len(scheduled))
for index, (actual, (seconds, spec)) in enumerate(zip(events, scheduled), 1):
    check(f"event {index} sequence", actual["sequence"], index)
    check(f"event {index} identity", [actual["eventId"], actual["sessionId"]], [f"{RUN_ID}-scripted-demonstration:{index}", f"{RUN_ID}-scripted-demonstration"])
    check(f"event {index} route", [actual["type"], actual["origin"], actual["tourSeconds"], actual["result"]], [spec["type"], spec["origin"], seconds, "accepted"])
    check(f"event {index} provenance", [actual["actor"], actual["provenance"]], ["scripted_demonstration"] * 2)
    for key in ("queryId", "condition", "index", "reason", "localSeconds"):
        if key in spec:
            check(f"event {index} intended {key}", actual["intended"].get(key), spec[key])
    if index > 1 and events[index - 2]["tourSeconds"] == actual["tourSeconds"]:
        check(f"event {index} same-boundary fingerprint chain", actual["beforeFingerprint"], events[index - 2]["afterFingerprint"])
check("computation status", json.loads((RUN / "computational-results.json").read_text())["status"], "passed")
check("human count", RUN_META["humanParticipantCount"], 0)

out = {"schema": "gate9-immutable-build-audit-v1", "status": "PASS" if not errors else "FAIL", "runId": RUN_ID, "buildId": BUILD_ID, "sourceSha256": FULL_SOURCE_HASH, "contextHash": context_hash, "manifestFileCount": len(entries), "exactOutputCount": len(ctx["worlds"]) * len(queries), "orderedChoiceCount": len(PRED["allOrderedChoiceResults"]), "checkpointCount": len(checkpoints), "canonicalEventCount": len(events), "checkCount": checks, "errors": errors}
(ROOT / "audit/gate-9/build-audit.json").write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps(out, indent=2))
