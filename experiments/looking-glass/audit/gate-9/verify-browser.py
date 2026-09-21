#!/usr/bin/env python3
"""Independent exact hash, acquisition, endpoint, checkpoint, and layout audit."""

import hashlib
import json
from collections import Counter, defaultdict
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
E = ROOT / "evidence/gate-9"
FIXTURE = json.loads((ROOT / "docs/gate-9/fixture.json").read_text())
PRED = json.loads((ROOT / "docs/gate-9/independent-predictions.json").read_text())
OBS = json.loads((E / "browser-observations.json").read_text())
EXPORTS = json.loads((E / "exported-routes.json").read_text())
CHECKPOINTS = json.loads((E / "checkpoint-review.json").read_text())
SAVED_CHECKPOINTS = {x["seconds"]: x for x in json.loads((ROOT / "matched-observation/runs/G9-MATCHED-003/checkpoints.json").read_text())}
CTX = FIXTURE["commonContext"]
QUERIES = [q["id"] for q in CTX["queries"]]
REF = next(w for w in CTX["worlds"] if w["id"] == CTX["referenceWorldId"])
errors = []


def check(label, okay):
    if not okay:
        errors.append(label)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def rat(value):
    value = Fraction(value)
    return str(value.numerator) if value.denominator == 1 else f"{value.numerator}/{value.denominator}"


def observe(source, query):
    x, y, z, w, v = map(Fraction, source)
    values = {"project": (x, y, z), "xw90": (-w, y, z), "yv90": (x, -v, z)}[query]
    return {"kind": "point", "pointId": "P", "xyz": [rat(value) for value in values]}


def unique(occurrences):
    return [{"queryId": q, "observation": next(o["observation"] for o in occurrences if o["queryId"] == q)} for q in QUERIES if any(o["queryId"] == q for o in occurrences)]


CONTEXT_HASH = sha(CTX)


def info_hash(occurrences):
    return sha({"contextHash": CONTEXT_HASH, "observations": unique(occurrences)})


def compatibility(occurrences):
    selected = unique(occurrences)
    worlds = [w for w in CTX["worlds"] if all(observe(w["source"], item["queryId"]) == item["observation"] for item in selected)]
    properties = list(dict((tuple(w["propertyValue"]), w["propertyValue"]) for w in worlds).values())
    return {"compatibleWorldIds": [w["id"] for w in worlds], "propertyDetermined": len(properties) == 1, "remainingPropertyValues": properties}


def trace_for(choices):
    occurrences = [{"index": i, "queryId": q, "observation": observe(REF["source"], q)} for i, q in enumerate(["project", *choices])]
    return {"schema": "gate9-choice-trace-v1", "fixtureId": FIXTURE["fixtureId"], "caseId": CTX["caseId"], "referenceWorldId": REF["id"], "contextHash": CONTEXT_HASH, "occurrences": occurrences}


traces = {sha(trace_for(choice)): trace_for(choice) for choice in ([a, b] for a in QUERIES for b in QUERIES)}
check("context hash equals prespec", CONTEXT_HASH == PRED["contextHash"])
check("nine trace hashes", {x["traceHash"] for x in PRED["allOrderedChoiceResults"]} == set(traces))
observation_mismatches = []
incomplete_watch_count = 0
static_ready_count = 0
viewport_widths = Counter()
live_fingerprint_mismatches = []
for row in OBS:
    index = row["index"]
    p = row["inspector"]
    s = p["state"]
    label = f"observation {index}"
    check(f"{label} identity", (p["runId"], p["buildId"], p["fixtureId"]) == ("G9-MATCHED-003", "g9-15c3bf973fe0c6cd", FIXTURE["fixtureId"]))
    check(f"{label} context hash", p["contextHash"] == CONTEXT_HASH and sha(p["commonContext"]) == CONTEXT_HASH)
    check(f"{label} acquired information hash", info_hash(p["acquiredOccurrences"]) == p["acquiredInformationHash"])
    check(f"{label} acquired indices", [o["index"] for o in p["acquiredOccurrences"]] == s["acquiredOccurrenceIndices"])
    check(f"{label} visible indices", [o["index"] for o in p["visibleOccurrences"]] == s["visibleOccurrenceIndices"])
    for occurrence in p["acquiredOccurrences"] + p["visibleOccurrences"]:
        check(f"{label} exact output {occurrence['index']}", occurrence["observation"] == observe(REF["source"], occurrence["queryId"]))
    expected_visible = [0, 1, 2] if s["condition"] == "static" else [min(2, int(s["localSeconds"] // 2))] if s["condition"] == "watch" else [len(s["choices"])]
    check(f"{label} visible rule", s["visibleOccurrenceIndices"] == expected_visible)
    check(f"{label} endpoint eligibility", p["endpointComparisonEligible"] == (s["phase"] == "complete" and bool(p["traceHash"])))
    if s["phase"] == "complete" and p["traceHash"]:
        trace = traces.get(p["traceHash"])
        check(f"{label} known complete trace", trace is not None)
        if trace:
            check(f"{label} information hash", p["informationHash"] == info_hash(trace["occurrences"]))
            check(f"{label} completed summary", p["completedSummary"] == compatibility(trace["occurrences"]))
    if s["condition"] == "static":
        check(f"{label} full static occurrence access", s["acquiredOccurrenceIndices"] == [0, 1, 2] and s["visibleOccurrenceIndices"] == [0, 1, 2])
        if s["phase"] == "ready":
            static_ready_count += 1
            check(f"{label} static ready not endpoint", not p["endpointComparisonEligible"] and p["completedSummary"] is None)
    if s["condition"] == "watch" and s["phase"] != "complete":
        incomplete_watch_count += 1
        acquired = set(s["acquiredOccurrenceIndices"])
        check(f"{label} watch prefix acquired", s["acquiredOccurrenceIndices"] == list(range(len(acquired))) and set(s["visibleOccurrenceIndices"]).issubset(acquired))
        check(f"{label} watch future withheld", s["trace"] is None and s["traceWithheld"] is True and p["informationHash"] is None and p["completedSummary"] is None and not p["endpointComparisonEligible"])
        check(f"{label} watch choice IDs prefix", len(s["choices"]) <= max(0, len(acquired) - 1))
        check(f"{label} watch export text clear", row["exportText"] == "")
        event_export = next((b for b in row["buttons"] if b["id"] == "export-events"), None)
        check(f"{label} watch event export disabled", event_export is not None and event_export["disabled"] is True)
    trace = traces.get(p["traceHash"])
    semantic = {key: s[key] for key in ("mode", "condition", "phase", "tourPaused", "presentationPaused", "tourSeconds", "localSeconds", "choices", "draftOccurrences", "acquiredOccurrenceIndices", "trace", "traceHash", "visibleOccurrenceIndices", "completedSummary", "reviewStatus", "practiceOpen")}
    if s["condition"] == "watch" and s["phase"] != "complete" and trace:
        semantic["choices"] = [o["queryId"] for o in trace["occurrences"][1:]]
        semantic["trace"] = trace
    if sha(semantic) != p["semanticFingerprint"]:
        live_fingerprint_mismatches.append(index)
    view = row["viewport"]
    viewport_widths[view["width"]] += 1
    meta = p["viewport"]
    check(f"{label} fresh viewport", (view["width"], view["height"], view["scrollX"], view["scrollY"], view["documentWidth"], view["documentHeight"]) == (meta["innerWidth"], meta["innerHeight"], meta["scrollX"], meta["scrollY"], meta["documentWidth"], meta["documentHeight"]))
    check(f"{label} no horizontal page overflow", view["documentWidth"] <= view["width"])
    check(f"{label} card count", len(row["cards"]) == len(meta["cards"]) == len(s["visibleOccurrenceIndices"]))
    check(f"{label} fixed SVG dimensions", all(c["width"] == 280 and c["height"] == 200 for c in row["cards"]) and all(c["svgWidth"] == 280 and c["svgHeight"] == 200 and c["width"] == 302 for c in meta["cards"]))
    check(f"{label} card order", [c["index"] for c in meta["cards"]] == s["visibleOccurrenceIndices"])

check("incomplete watch observations exist", incomplete_watch_count > 0)
check("static ready observations exist", static_ready_count > 0)
check("two target viewport widths observed", 960 in viewport_widths and 1280 in viewport_widths)
check("live fingerprint mismatches limited to active tour clocks", all(not OBS[i]["inspector"]["state"]["tourPaused"] and OBS[i]["inspector"]["state"]["tourSeconds"] % 1 != 0 for i in live_fingerprint_mismatches))
check("no paused/checkpoint/export fingerprint mismatch", not set(live_fingerprint_mismatches) & ({r["observation"] for r in CHECKPOINTS} | {r["observation"] for r in EXPORTS}))
check("live fingerprint mismatch bound", len(live_fingerprint_mismatches) <= 3)

by_recipe = defaultdict(dict)
for row in EXPORTS:
    recipe = row["recipe"]
    condition = row["condition"]
    value = row["value"]
    route = value["route"]
    label = f"export {recipe}/{condition}@{row['observation']}"
    trace = value["trace"]
    check(f"{label} trace hash", sha(trace) == value["traceHash"] == route["parentTraceHash"])
    check(f"{label} exact trace", trace == trace_for(value["envelope"]["choiceQueryIds"]))
    check(f"{label} 3 occurrences", len(trace["occurrences"]) == len(route["occurrences"]) == 3 and route["occurrences"] == trace["occurrences"])
    check(f"{label} information", route["informationHash"] == route["acquiredInformationHash"] == info_hash(trace["occurrences"]))
    check(f"{label} completed", route["phase"] == "complete" and route["acquiredOccurrenceIndices"] == [0, 1, 2])
    check(f"{label} context", trace["contextHash"] == route["contextHash"] == CONTEXT_HASH)
    check(f"{label} summary", route["summary"] == compatibility(trace["occurrences"]))
    check(f"{label} current condition", route["condition"] == condition)
    obs = OBS[row["observation"]]
    check(f"{label} browser export JSON", json.loads(obs["exportText"]) == value)
    check(f"{label} browser endpoint", obs["inspector"]["state"]["phase"] == "complete" and obs["inspector"]["state"]["condition"] == condition and obs["inspector"]["traceHash"] == value["traceHash"])
    if recipe.startswith("G9-T0") and recipe in FIXTURE["softwareOrder"]["recipeIds"]:
        check(f"{label} local actual trace provenance", value["envelope"]["provenance"] == "local_control")
        by_recipe[recipe][condition] = value

check("16 actual route exports", len(EXPORTS) == 16)
check("12 primary route exports", len(by_recipe) == 4 and all(set(x) == {"choose", "watch", "static"} for x in by_recipe.values()))
for recipe in FIXTURE["softwareOrder"]["recipeIds"]:
    group = by_recipe.get(recipe, {})
    if len(group) != 3:
        continue
    choose, watch, static = (group[name] for name in ("choose", "watch", "static"))
    check(f"{recipe} completed mode parity", len({v["traceHash"] for v in group.values()}) == 1 and len({v["route"]["informationHash"] for v in group.values()}) == 1 and all(v["route"]["occurrences"] == choose["trace"]["occurrences"] for v in group.values()))
    check(f"{recipe} survivor parity", all(v["route"]["summary"] == choose["route"]["summary"] for v in group.values()))
    check(f"{recipe} expected count", len(choose["route"]["summary"]["compatibleWorldIds"]) == {"G9-T01": 1, "G9-T02": 1, "G9-T03": 2, "G9-T04": 4}[recipe])
    check(f"{recipe} watch/static review labels", watch["route"]["reviewStatus"] == static["route"]["reviewStatus"] == ("standard-playback" if recipe == "G9-T01" else "manual-review"))
check("T01/T02 same info, different trace", by_recipe["G9-T01"]["choose"]["route"]["informationHash"] == by_recipe["G9-T02"]["choose"]["route"]["informationHash"] and by_recipe["G9-T01"]["choose"]["traceHash"] != by_recipe["G9-T02"]["choose"]["traceHash"])
check("T03 repeat retained", [o["queryId"] for o in by_recipe["G9-T03"]["static"]["route"]["occurrences"]] == ["project", "xw90", "xw90"])
check("T04 repeat retained", [o["queryId"] for o in by_recipe["G9-T04"]["static"]["route"]["occurrences"]] == ["project", "project", "project"])

check("24 designated checkpoints", len(CHECKPOINTS) == 24)
passes = Counter(row["pass"] for row in CHECKPOINTS)
check("checkpoint pass counts", passes == {"initial": 10, "after-exploration": 10, "after-reopen": 2, "after-reload": 2})
for row in CHECKPOINTS:
    expected = SAVED_CHECKPOINTS[row["seconds"]]
    obs = OBS[row["observation"]]["inspector"]
    check(f"checkpoint {row['pass']} {row['seconds']} fingerprint", row["semanticFingerprint"] == obs["semanticFingerprint"] == expected["semanticFingerprint"])
    check(f"checkpoint {row['pass']} {row['seconds']} state", (row["condition"], row["phase"], row["localSeconds"]) == (obs["state"]["condition"], obs["state"]["phase"], obs["state"]["localSeconds"]) == (expected["state"]["condition"], expected["state"]["phase"], expected["state"]["localSeconds"]))
    check(f"checkpoint {row['pass']} {row['seconds']} paused", obs["state"]["tourPaused"] and obs["state"]["presentationPaused"])

out = {"schema": "gate9-browser-observation-audit-v1", "status": "PASS_WITH_QUALIFICATION" if not errors and live_fingerprint_mismatches else "PASS" if not errors else "FAIL", "observationCount": len(OBS), "exactSemanticFingerprints": len(OBS) - len(live_fingerprint_mismatches), "liveClockFingerprintMismatches": live_fingerprint_mismatches, "viewportsByWidth": dict(viewport_widths), "incompleteWatchObservations": incomplete_watch_count, "staticReadyObservations": static_ready_count, "actualRouteExports": len(EXPORTS), "primaryRecipeModeEndpoints": sum(len(x) for x in by_recipe.values()), "designatedCheckpointObservations": len(CHECKPOINTS), "errors": errors}
(ROOT / "audit/gate-9/browser-audit.json").write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps(out, indent=2))
