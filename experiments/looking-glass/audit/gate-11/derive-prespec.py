#!/usr/bin/env python3
"""Independent Gate 11 finite-model derivation; imports no implementation code."""

import copy
import hashlib
import itertools
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs/gate-11"
AUDIT = ROOT / "audit/gate-11"
NAMES = ["experiment-charter.md", "model-contract.md", "record-contract.md", "fixture.json", "independent-predictions.json"]
inputs = [{"path": f"docs/gate-11/{name}", "bytes": (DOCS / name).stat().st_size, "sha256": hashlib.sha256((DOCS / name).read_bytes()).hexdigest()} for name in NAMES]
fixture = json.loads((DOCS / "fixture.json").read_text())
pred = json.loads((DOCS / "independent-predictions.json").read_text())
contract = (DOCS / "model-contract.md").read_text()
record = (DOCS / "record-contract.md").read_text()
charter = (DOCS / "experiment-charter.md").read_text()
checks = []


def check(label, condition):
    checks.append({"name": label, "pass": bool(condition)})


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


worlds = fixture["worlds"]
world_order = [w["id"] for w in worlds]
by_id = {w["id"]: w for w in worlds}
menu = fixture["repairMenu"]
menu_ids = [m["id"] for m in menu]
bits = {m["id"]: m["bit"] for m in menu}
check("five authored files", len(inputs) == 5 and all(x["bytes"] > 0 for x in inputs))
check("fixture/prediction identity", fixture["fixtureId"] == pred["fixtureId"])
check("four ordered worlds", world_order == ["W00", "W01", "W10", "W11"] == fixture["worldOrder"] == pred["worldOrder"])
check("three exact menu bits", bits == {"calibration": 1, "authorization": 2, "paint": 4})
check("two declared receivers", [r["id"] for r in fixture["receivers"]] == ["R_COUNT", "R_RELEASE"])
check("logical base source reference", fixture["baseSummaryPayload"]["sourceRef"] == {"familyId": fixture["familyId"], "logicalRecordId": "LOT", "fields": ["id", "assetType", "units"], "dereferenceWithinReceiver": False})
check("base payload exact fields", set(fixture["baseSummaryPayload"]) == {"schema", "lotId", "assetType", "units", "sourceRef", "additions"} and fixture["baseSummaryPayload"]["additions"] == {})
check("allowed payload key list exact", set(fixture["allowedPayloadKeys"]) == set(fixture["baseSummaryPayload"]))
check("no covert receiver inputs", set(fixture["forbiddenReceiverInputs"]) >= {"worldId", "sourceHash", "revisionId"} and "fullSourceHash" not in fixture["allowedPayloadKeys"])
check("menu entry schemas exact", all(set(m["entryKeys"]) == set(m["copy"]) | {"sourceRef"} for m in menu))
check("fixed menu source references", all(m["sourceRef"]["familyId"] == fixture["familyId"] and m["sourceRef"]["logicalRecordId"] == m["sourceRecord"] and m["sourceRef"]["fields"] == list(m["copy"].values()) and not m["sourceRef"]["dereferenceWithinReceiver"] for m in menu))
check("menu status domains", fixture["statusDomains"] == {"calibration": ["expired", "current"], "authorization": ["pending", "approved"]} and all(m["domain"] == fixture["statusDomains"][m["id"]] for m in menu if m["id"] != "paint") and next(m for m in menu if m["id"] == "paint")["domain"] == ["amber"])


def full_answer(world, receiver):
    records = world["records"]
    lot, cal, auth = (records[k] for k in ("LOT", "CAL", "AUTH"))
    assert cal["lotId"] == auth["lotId"] == lot["id"] == "LOT"
    count = lot["units"] >= 4
    result = count if receiver == "R_COUNT" else count and cal["status"] == "current" and auth["status"] == "approved"
    return "yes" if result else "no"


def fields_for(mask):
    return [m["id"] for m in menu if mask & m["bit"]]


def project(world, mask):
    payload = copy.deepcopy(fixture["baseSummaryPayload"])
    lot = world["records"]["LOT"]
    assert payload["lotId"] == lot["id"] and payload["assetType"] == lot["assetType"] and payload["units"] == lot["units"]
    for item in menu:
        if not mask & item["bit"]:
            continue
        source = world["records"][item["sourceRecord"]]
        copied = {dest: source[source_field] for dest, source_field in item["copy"].items()}
        copied["sourceRef"] = copy.deepcopy(item["sourceRef"])
        payload["additions"][item["id"]] = copied
    return payload


def partial(payload, receiver):
    # Pure rule: this function only reads its supplied payload and receiver ID.
    assert receiver in ("R_COUNT", "R_RELEASE")
    count = payload["units"] >= 4
    if not count:
        return {"status": "determined", "possibleAnswers": ["no"], "answer": "no"}
    if receiver == "R_COUNT":
        return {"status": "determined", "possibleAnswers": ["yes"], "answer": "yes"}
    additions = payload["additions"]
    cal = additions.get("calibration", {}).get("status")
    auth = additions.get("authorization", {}).get("status")
    if cal == "expired" or auth == "pending":
        return {"status": "determined", "possibleAnswers": ["no"], "answer": "no"}
    if cal == "current" and auth == "approved":
        return {"status": "determined", "possibleAnswers": ["yes"], "answer": "yes"}
    return {"status": "insufficient", "possibleAnswers": ["no", "yes"], "answer": None}


def certificate(mask):
    payloads = {w["id"]: project(w, mask) for w in worlds}
    groups = {}
    for world_id in world_order:
        groups.setdefault(canonical(payloads[world_id]), []).append(world_id)
    blocks = sorted(groups.values(), key=lambda ids: ids[0])
    rows = [{"worldIds": ids, "releaseAnswers": sorted({full_answer(by_id[i], "R_RELEASE") for i in ids}), "countAnswers": sorted({full_answer(by_id[i], "R_COUNT") for i in ids})} for ids in blocks]
    conflict = [list(pair) for ids in blocks for pair in itertools.combinations(ids, 2) if full_answer(by_id[pair[0]], "R_RELEASE") != full_answer(by_id[pair[1]], "R_RELEASE")]
    return {"mask": mask, "fields": fields_for(mask), "entryCount": len(fields_for(mask)), "blocks": rows,
            "localReleaseResultsByWorld": {i: partial(payloads[i], "R_RELEASE")["status"] if partial(payloads[i], "R_RELEASE")["answer"] is None else partial(payloads[i], "R_RELEASE")["answer"] for i in world_order},
            "localCountResultsByWorld": {i: partial(payloads[i], "R_COUNT")["answer"] for i in world_order},
            "releaseGloballySufficient": all(len(row["releaseAnswers"]) == 1 for row in rows),
            "countGloballySufficient": all(len(row["countAnswers"]) == 1 for row in rows),
            "conflictingReleasePairs": conflict}, payloads


check("exact full-source status grid", [(w["records"]["CAL"]["status"], w["records"]["AUTH"]["status"]) for w in worlds] == [("expired", "pending"), ("expired", "approved"), ("current", "pending"), ("current", "approved")])
check("all four world lot values", all(w["records"]["LOT"] == {"id": "LOT", "assetType": "field-scanner", "units": 4, "paint": "amber"} for w in worlds))
check("all four world source bindings", all(w["records"]["CAL"]["lotId"] == w["records"]["AUTH"]["lotId"] == "LOT" for w in worlds))
world_bytes_before = canonical(worlds)
for receiver in ("R_COUNT", "R_RELEASE"):
    answers = [full_answer(w, receiver) for w in worlds]
    check(f"full truth {receiver}", answers == pred["truth"][receiver])
for w, authored in zip(worlds, pred["derivations"]):
    check(f"derivation {w['id']}", (authored["worldId"], authored["count"], authored["calibration"], authored["authorization"], authored["R_COUNT"], authored["R_RELEASE"]) == (w["id"], 4, w["records"]["CAL"]["status"], w["records"]["AUTH"]["status"], full_answer(w, "R_COUNT"), full_answer(w, "R_RELEASE")))

certs = []
all_payloads = {}
partition_signatures = {}
for mask in range(8):
    cert, payloads = certificate(mask)
    certs.append(cert)
    all_payloads[mask] = payloads
    partition_signatures[mask] = [row["worldIds"] for row in cert["blocks"]]
    check(f"subset certificate mask {mask}", cert == pred["subsetCertificates"][mask])
    for world_id in world_order:
        payload = payloads[world_id]
        source = by_id[world_id]["records"]
        check(f"mask {mask} {world_id} exact copied fields", set(payload["additions"]) == set(fields_for(mask)) and all(all(payload["additions"][m["id"]][out] == source[m["sourceRecord"]][src] for out, src in m["copy"].items()) for m in menu if m["id"] in payload["additions"]))
        check(f"mask {mask} {world_id} logical references", payload["sourceRef"] == fixture["baseSummaryPayload"]["sourceRef"] and all(payload["additions"][m["id"]]["sourceRef"] == m["sourceRef"] and not m["sourceRef"]["dereferenceWithinReceiver"] for m in menu if m["id"] in payload["additions"]))
        check(f"mask {mask} {world_id} no source identity in receiver payload", all(k not in canonical(payload) for k in ('"worldId"', '"fullSourceHash"', '"revisionId"', '"originEventReference"')))
        check(f"mask {mask} {world_id} local answer sound", partial(payload, "R_RELEASE")["answer"] in (None, full_answer(by_id[world_id], "R_RELEASE")))

check("32 independent world/subset projections", len(all_payloads) == 8 and sum(len(v) for v in all_payloads.values()) == 32)
check("projection does not mutate full source", canonical(worlds) == world_bytes_before)
check("complete payload baseline collision", len({canonical(v) for v in all_payloads[0].values()}) == 1 and pred["baseline"]["fullPayloadsByteEqualAcrossWorlds"] is True)
check("baseline count yes and release insufficient", all(partial(v, "R_COUNT")["answer"] == "yes" and partial(v, "R_RELEASE")["status"] == "insufficient" for v in all_payloads[0].values()))
check("paint changes bytes not partition", all(all_payloads[m] != all_payloads[m | 4] and partition_signatures[m] == partition_signatures[m | 4] for m in range(4)))
partition_hashes = {m: digest(partition_signatures[m]) for m in range(8)}
check("paint partition hashes equal", all(partition_hashes[m] == partition_hashes[m | 4] for m in range(4)) and len(set(partition_hashes.values())) == 4)
check("authored partition equalities", pred["partitionEqualities"] == [[0, 4], [1, 5], [2, 6], [3, 7]])
sufficient = [m for m, c in enumerate(certs) if c["releaseGloballySufficient"]]
minimal = [m for m in sufficient if not any(n != m and (n & m) == n and n in sufficient for n in range(8))]
min_size = min(len(fields_for(m)) for m in sufficient)
check("release sufficient masks", sufficient == pred["minimality"]["sufficientMasks"] == [3, 7])
check("unique subset-minimal repair", minimal == pred["minimality"]["subsetMinimalMasks"] == [3])
check("release cardinality-minimum", min_size == pred["minimality"]["cardinalityMinimum"] == 2 and [m for m in sufficient if len(fields_for(m)) == min_size] == pred["minimality"]["cardinalityMinimumMasks"] == [3])
check("singletons and proper subsets fail", all(not certs[m]["releaseGloballySufficient"] for m in [0, 1, 2, 4]) and pred["minimality"]["allSingleEntryMasksFail"] == [1, 2, 4] and pred["minimality"]["properSubsetsOfMask3Fail"] == [0, 1, 2])
check("remove calibration witness", ["W01", "W11"] in certs[2]["conflictingReleasePairs"] and pred["minimality"]["removeCalibrationWitness"] == ["W01", "W11"])
check("remove authorization witness", ["W10", "W11"] in certs[1]["conflictingReleasePairs"] and pred["minimality"]["removeAuthorizationWitness"] == ["W10", "W11"])
check("count empty minimum", all(c["countGloballySufficient"] for c in certs) and pred["countMinimality"]["subsetMinimalMasks"] == [0] and pred["countMinimality"]["cardinalityMinimum"] == 0)
false_pos = [w["id"] for w in worlds if full_answer(w, "R_COUNT") == "yes" and full_answer(w, "R_RELEASE") == "no"]
check("wrong shortcut three false positives", false_pos == pred["wrongShortcut"]["falsePositiveWorlds"] == ["W00", "W01", "W10"] and pred["wrongShortcut"]["falsePositiveCount"] == 3 and pred["wrongShortcut"]["notActualReceiverEvaluator"])

local_min = {}
for world_id in world_order:
    determined = [m for m in range(8) if partial(all_payloads[m][world_id], "R_RELEASE")["answer"] is not None]
    n = min(len(fields_for(m)) for m in determined)
    menus = [fields_for(m) for m in determined if len(fields_for(m)) == n]
    local_min[world_id] = {"minimum": n, "minimalMenus": menus}
check("four local minima", local_min == pred["localMinimalityInReleaseReceiver"])
check("negative single-field local determination but global insufficiency", partial(all_payloads[1]["W00"], "R_RELEASE")["answer"] == "no" and partial(all_payloads[2]["W10"], "R_RELEASE")["answer"] == "no" and not certs[1]["releaseGloballySufficient"] and not certs[2]["releaseGloballySufficient"])
check("positive single-field local insufficiency", partial(all_payloads[1]["W11"], "R_RELEASE")["status"] == partial(all_payloads[2]["W11"], "R_RELEASE")["status"] == "insufficient")
check("full source hash definition", fixture["inspectionEnvelopeRule"]["sourceHashPayload"] == "Canonical JSON of the world records object" and fixture["inspectionEnvelopeRule"]["familyHashPayload"] == "Canonical JSON of the full ordered fixture worlds array")
world_hashes = {w["id"]: digest(w["records"]) for w in worlds}
family_hash = digest(worlds)
check("four distinct inspection-only world hashes", len(set(world_hashes.values())) == 4 and all(h not in canonical(payload) for h in world_hashes.values() for projections in all_payloads.values() for payload in projections.values()))
check("inspection envelope outside receiver", fixture["inspectionEnvelopeRule"]["passedToReceiver"] is False and set(fixture["inspectionEnvelopeRule"]["fields"]) == {"worldId", "fullSourceHash", "sourceRecordFieldPaths", "projectionRule", "revisionId", "originEventReference"})

revisions = fixture["canonicalRevisions"]
check("canonical revision lineage", [(x["id"], x["parentId"], x["fields"]) for x in revisions] == [("S0", None, []), ("S1", "S0", ["calibration"]), ("S2", "S1", ["calibration", "authorization"])])
check("canonical creation truthful", all(x["provenance"] == "scripted_demonstration" for x in revisions) and revisions[1]["requestedFields"] == ["calibration"] and revisions[2]["requestedFields"] == ["authorization"])
check("empty/duplicate/paint control defined", fixture["repairRule"]["emptySelection"].startswith("Create retained") and fixture["repairRule"]["duplicateSelection"].startswith("Create retained") and fixture["repairRule"]["unknownSelection"].startswith("Reject"))
check("representation parity domain", fixture["representations"] == ["diagram", "plain"] and fixture["relationTypes"] == ["summarizes", "supplied-to", "depends-on", "sourced-from"])
check("representation parity explicitly specified", "same selected payload" in contract and "informationHash" in contract and "No answer-specific data appears only in one mode" in contract)
check("pure evaluator boundary explicitly specified", "evaluateReceiver(payload, receiverId)" in contract and "no fixture-world import" in contract and "Reject unknown receiver IDs" in contract and "unsafe integer values" in contract)
check("local registry and source provenance explicitly specified", "immutable revision record" in contract and "source-family hash" in contract and "parent" in contract and "referenceOnly" in contract)

events = fixture["savedTour"]["events"]
check("seven event schedule", [(x["seconds"], x["type"], x["origin"]) for x in events] == [(4, "receiver-select", "replay"), (8, "witness-open", "replay"), (12, "repair-apply", "replay"), (16, "repair-apply", "replay"), (20, "representation-select", "replay"), (24, "canonical-restore", "replay"), (24, "tour-stop", "automatic")])
check("no fabricated event at zero", all(x["seconds"] > 0 for x in events))
check("24 seconds and seven checkpoints", fixture["savedTour"]["durationSeconds"] == 24 and fixture["savedTour"]["checkpointSeconds"] == [0, 4, 8, 12, 16, 20, 24] and pred["canonicalScheduledEventCount"] == 7)
check("event repair lineage and stop", events[2]["payload"] == {"parentId": "S0", "requestedFields": ["calibration"], "revisionId": "S1"} and events[3]["payload"] == {"parentId": "S1", "requestedFields": ["authorization"], "revisionId": "S2"} and events[-1]["payload"] == {"reason": "end-of-sequence"})
stages = [(0, "W11", "R_COUNT", "S0", 0, "diagram", None), (4, "W11", "R_RELEASE", "S0", 0, "diagram", None), (8, "W11", "R_RELEASE", "S0", 0, "diagram", ["W10", "W11"]), (12, "W11", "R_RELEASE", "S1", 1, "diagram", ["W10", "W11"]), (16, "W11", "R_RELEASE", "S2", 3, "diagram", ["W10", "W11"]), (20, "W11", "R_RELEASE", "S2", 3, "plain", ["W10", "W11"]), (24, "W11", "R_COUNT", "S0", 0, "diagram", None)]
for authored, (sec, wid, rid, rev, mask, representation, pair) in zip(pred["checkpointExpectations"], stages):
    p = all_payloads[mask][wid]
    local = partial(p, rid)
    relation = None
    if pair:
        same = canonical(all_payloads[mask][pair[0]]) == canonical(all_payloads[mask][pair[1]])
        relation = "collides-with-conflicting-answers" if same else "separated"
    check(f"checkpoint {sec} derived", all(authored[k] == v for k, v in {"seconds": sec, "worldId": wid, "receiverId": rid, "revisionId": rev, "fields": fields_for(mask), "representation": representation, "localAnswer": local["answer"], "globalSufficient": certs[mask]["countGloballySufficient"] if rid == "R_COUNT" else certs[mask]["releaseGloballySufficient"], "witnessPair": pair}.items()) and (pair is None or authored["witnessRelation"] == relation) and ("possibleAnswers" not in authored or authored["possibleAnswers"] == local["possibleAnswers"]))
check("checkpoint 24 end reason", pred["checkpointExpectations"][-1]["endReason"] == "end-of-sequence")
check("initial state exact", fixture["initialState"] == {"mode": "saved-tour", "cursorSeconds": 0, "paused": True, "endReason": None, "representation": "diagram", "worldId": "W11", "receiverId": "R_COUNT", "revisionId": "S0", "repairDraft": [], "witnessPair": None, "fullSourceOpen": False, "certificateOpen": False})
check("checkpoint common pending status", pred["checkpointCommon"] == {"mode": "saved-tour", "paused": True, "repairDraft": [], "fullSourceOpen": False, "certificateOpen": False})
check("18 checkpoint browser protocol", pred["browserCountsPrespecifiedNotObserved"]["pausedCheckpoints"] == 18 and "18 designated paused" in record)
check("historical replay and results are separate destinations", "http://127.0.0.1:44003/`" in record and "http://127.0.0.1:44003/review/results.html`" in record and "that label is not present in the preserved instrument itself" in record)
check("real first-use prioritized", "Critical first-use path before secondary presentation work" in record and "first browser acquisition" in charter)
check("snapshot/export safeguards specified", "After DOM rendering, export expansion" in contract and "Log an export event" in record)
check("read-only routes and explicit run specified", "All routes are read-only" in contract and "explicit required `--run`" in contract)
check("no human or Gate12 execution", "Zero human participants" in charter and "Gate 12" in charter and "unapproved" in charter)

errors = [x["name"] for x in checks if not x["pass"]]
report = {"schema": "gate11-independent-prespec-derivation-v1", "status": "PASS" if not errors else "BLOCKED", "inputFiles": inputs,
          "checkCount": len(checks), "passCount": len(checks) - len(errors), "errors": errors,
          "worldOrder": world_order, "fullTruth": {r: [full_answer(w, r) for w in worlds] for r in ("R_COUNT", "R_RELEASE")},
          "worldSourceHashes": world_hashes, "familyHash": family_hash, "projectionCount": sum(len(x) for x in all_payloads.values()),
          "projectionPayloadHashes": {str(m): {wid: digest(payload) for wid, payload in all_payloads[m].items()} for m in range(8)},
          "partitionHashes": {str(m): partition_hashes[m] for m in range(8)},
          "copiedSourcePathsByMenu": {m["id"]: [f'{m["sourceRecord"]}.{v}' for v in m["copy"].values()] for m in menu},
          "subsetCertificates": certs, "sufficientReleaseMasks": sufficient, "subsetMinimalReleaseMasks": minimal,
          "cardinalityMinimum": min_size, "countMinimumMask": 0, "localReleaseMinimum": local_min,
          "partitionEqualities": [[m, m | 4] for m in range(4)], "wrongShortcutFalsePositiveWorlds": false_pos,
          "canonicalEventCount": len(events), "canonicalCheckpointCount": len(fixture["savedTour"]["checkpointSeconds"]),
          "browserCheckpointCountPrespecifiedNotObserved": pred["browserCountsPrespecifiedNotObserved"]["pausedCheckpoints"],
          "checks": checks, "implementationImports": [], "browserObservations": 0, "humanParticipants": 0}
AUDIT.mkdir(parents=True, exist_ok=True)
(AUDIT / "prespec-derivation.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({k: report[k] for k in ("status", "checkCount", "passCount", "errors", "projectionCount", "sufficientReleaseMasks", "subsetMinimalReleaseMasks", "cardinalityMinimum", "canonicalEventCount", "canonicalCheckpointCount", "browserCheckpointCountPrespecifiedNotObserved")}, indent=2))
