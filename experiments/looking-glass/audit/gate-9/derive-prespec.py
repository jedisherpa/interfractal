#!/usr/bin/env python3
"""Independent Gate 9 fixture arithmetic; imports no instrument implementation."""

import hashlib
import itertools
import json
from fractions import Fraction
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
FIXTURE = json.loads((ROOT / "docs/gate-9/fixture.json").read_text())
PREDICTIONS = json.loads((ROOT / "docs/gate-9/independent-predictions.json").read_text())
SOURCE_BYTES = (ROOT / "docs/gate-8/fixture.json").read_bytes()
SOURCE = json.loads(SOURCE_BYTES)
CONTEXT = FIXTURE["commonContext"]
WORLDS = CONTEXT["worlds"]
QUERY_IDS = [q["id"] for q in CONTEXT["queries"]]
REFERENCE = next(w for w in WORLDS if w["id"] == CONTEXT["referenceWorldId"])
ERRORS = []
CHECK_COUNT = 0


def check(label, actual, expected):
    global CHECK_COUNT
    CHECK_COUNT += 1
    if actual != expected:
        ERRORS.append({"check": label, "actual": actual, "expected": expected})


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha(value):
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def rat(value):
    value = Fraction(value)
    return str(value.numerator) if value.denominator == 1 else f"{value.numerator}/{value.denominator}"


def observe(source, query, point_id="P"):
    x, y, z, w, v = map(Fraction, source)
    coords = {
        "project": (x, y, z),
        "xw90": (-w, y, z),
        "yv90": (x, -v, z),
    }[query]
    return {"kind": "point", "pointId": point_id, "xyz": [rat(c) for c in coords]}


def occurrences(choices):
    return [
        {"index": i, "queryId": q, "observation": observe(REFERENCE["source"], q)}
        for i, q in enumerate(["project", *choices])
    ]


def unique_observations(items):
    return [
        {"queryId": q, "observation": next(o["observation"] for o in items if o["queryId"] == q)}
        for q in QUERY_IDS if any(o["queryId"] == q for o in items)
    ]


CONTEXT_HASH = sha(CONTEXT)


def information_hash(items):
    return sha({"contextHash": CONTEXT_HASH, "observations": unique_observations(items)})


def trace_hash(items):
    return sha({
        "schema": "gate9-choice-trace-v1",
        "fixtureId": FIXTURE["fixtureId"],
        "caseId": CONTEXT["caseId"],
        "referenceWorldId": REFERENCE["id"],
        "contextHash": CONTEXT_HASH,
        "occurrences": items,
    })


def compatible(items):
    selected = unique_observations(items)
    return [
        world for world in WORLDS
        if all(observe(world["source"], x["queryId"]) == x["observation"] for x in selected)
    ]


check("source fixture SHA-256", hashlib.sha256(SOURCE_BYTES).hexdigest(), FIXTURE["provenance"]["sourceFixtureSha256"])
source_case = next(c for c in SOURCE["cases"] if c["id"] == FIXTURE["provenance"]["sourceCase"])
check("Gate 8 C02 worlds copied unchanged", WORLDS, source_case["worlds"])
check("query menu", QUERY_IDS, ["project", "xw90", "yv90"])
check("reference", REFERENCE["id"], "C02-W02")
check("choice baseline", FIXTURE["choiceContract"]["baselineQueryId"], "project")
check("choice budget", FIXTURE["choiceContract"]["selectionBudget"], 2)
check("repeats allowed", FIXTURE["choiceContract"]["repeatsAllowed"], True)
check("early complete forbidden", FIXTURE["choiceContract"]["earlyCompleteAllowed"], False)
check("watch schedule", [FIXTURE["presentationContract"]["watchOccurrenceSeconds"], FIXTURE["presentationContract"]["watchTotalSeconds"]], [2, 6])
check("static schedule", FIXTURE["presentationContract"]["staticReviewSeconds"], 6)
check("context hash", CONTEXT_HASH, PREDICTIONS["contextHash"])

exact = {w["id"]: {q: observe(w["source"], q) for q in QUERY_IDS} for w in WORLDS}
check("12 exact outputs", exact, PREDICTIONS["exactObservations"])
check("world/query output count", sum(map(len, exact.values())), PREDICTIONS["worldQueryOutputCount"])
practice = CONTEXT["practice"]
practice_source = practice["source"] + ["0"]
practice_expected = {
    "project": observe(practice_source, "project", "Practice-P")["xyz"],
    "repeatProject": observe(practice_source, "project", "Practice-P")["xyz"],
    "xw90": observe(practice_source, "xw90", "Practice-P")["xyz"],
    "quarterTurnSourceW": practice_source[3],
}
check("worked practice prediction", practice_expected, PREDICTIONS["practice"])
for key in ("project", "repeatProject", "xw90"):
    check(f"fixture practice {key}", practice[key], {"kind": "point", "pointId": "Practice-P", "xyz": practice_expected[key]})

results = []
for choices in itertools.product(QUERY_IDS, repeat=2):
    items = occurrences(choices)
    survivors = compatible(items)
    props = [w["propertyValue"] for w in survivors]
    result = {
        "choiceQueryIds": list(choices),
        "orderedQueryIds": [o["queryId"] for o in items],
        "occurrences": items,
        "uniqueQueryIds": [x["queryId"] for x in unique_observations(items)],
        "compatibleWorldIds": [w["id"] for w in survivors],
        "propertyDetermined": len(set(map(tuple, props))) == 1,
        "remainingPropertyValues": props,
        "traceHash": trace_hash(items),
        "informationHash": information_hash(items),
        "watchAcquiredPrefixInformationHashes": [information_hash(items[:i]) for i in (1, 2, 3)],
        "completedEndpointEqualities": [
            "choose=watch=static: contextHash",
            "choose=watch=static: traceHash",
            "choose=watch=static: informationHash",
            "each acquiredInformationHash=informationHash",
            "watch/static occurrence array=sealed choice occurrence array",
        ],
    }
    results.append(result)
check("nine ordered choice predictions", results, PREDICTIONS["allOrderedChoiceResults"])
check("nine order count", len(results), PREDICTIONS["allOrderedChoiceCount"])

by_choice = {tuple(r["choiceQueryIds"]): r for r in results}
recipes = {}
for recipe in FIXTURE["auditRecipes"]:
    rid = recipe["id"]
    recipes[rid] = by_choice[tuple(recipe["choiceQueryIds"])]
    check(f"recipe {rid}", recipes[rid], PREDICTIONS["auditRecipes"][rid])

t01 = recipes["G9-T01"]
baseline = occurrences([])
one_choice = occurrences(["xw90"])
checkpoints = []
for sec, condition, phase, local, acquired, visible, count, sealed, eligible in [
    (0, "choose", "draft", 0, [0], [0], 0, False, False),
    (2, "choose", "draft", 0, [0, 1], [1], 1, False, False),
    (4, "choose", "complete", 0, [0, 1, 2], [2], 2, True, True),
    (6, "watch", "running", 0, [0], [0], 2, True, False),
    (8, "watch", "running", 2, [0, 1], [1], 2, True, False),
    (10, "watch", "running", 4, [0, 1, 2], [2], 2, True, False),
    (12, "watch", "complete", 6, [0, 1, 2], [2], 2, True, True),
    (14, "static", "running", 0, [0, 1, 2], [0, 1, 2], 2, True, False),
    (20, "static", "complete", 6, [0, 1, 2], [0, 1, 2], 2, True, True),
    (24, "static", "complete", 6, [0, 1, 2], [0, 1, 2], 2, True, True),
]:
    current = baseline if count == 0 else one_choice if count == 1 else t01["occurrences"]
    exposed = [current[i] for i in acquired]
    checkpoints.append({
        "seconds": sec,
        "condition": condition,
        "phase": phase,
        "localSeconds": local,
        "tourPaused": True,
        "presentationPaused": True,
        "acquiredOccurrenceIndices": acquired,
        "visibleOccurrenceIndices": visible,
        "acceptedChoiceCount": count,
        "sealedTraceAvailable": sealed,
        "traceHash": t01["traceHash"] if sealed else None,
        "acquiredInformationHash": information_hash(exposed),
        "endpointComparisonEligible": eligible,
        "completedCompatibleWorldIds": t01["compatibleWorldIds"] if eligible else None,
        "practiceOpen": False,
        "provenance": "scripted_demonstration",
    })
check("ten checkpoint predictions", checkpoints, PREDICTIONS["savedCheckpoints"])
check("checkpoint count", len(checkpoints), PREDICTIONS["savedCheckpointCount"])
check("checkpoint times", [c["seconds"] for c in checkpoints], FIXTURE["savedTour"]["checkpointsSeconds"])
scheduled = sum(len(b.get("events", [])) for b in FIXTURE["savedTour"]["boundaries"])
check("scheduled event count", scheduled, PREDICTIONS["canonicalScheduledEventCountExcludingInitialAndHostActions"])
check("tour duration", FIXTURE["savedTour"]["durationSeconds"], 24)
check("software recipe order", FIXTURE["softwareOrder"]["recipeIds"], ["G9-T01", "G9-T02", "G9-T03", "G9-T04"])
check("software condition order", FIXTURE["softwareOrder"]["conditions"], ["choose", "watch", "static"])
check("no human participants", FIXTURE["humanParticipantCount"], 0)

relations = {
    "sameInformationDifferentOrder": ["G9-T01", "G9-T02"],
    "distinctInformationGroups": [["G9-T01", "G9-T02"], ["G9-T03"], ["G9-T04"]],
    "allFourTraceHashesDistinct": len({r["traceHash"] for r in recipes.values()}) == 4,
    "T03OccurrenceCount": len(recipes["G9-T03"]["occurrences"]),
    "T03UniqueQueryCount": len(recipes["G9-T03"]["uniqueQueryIds"]),
    "T04OccurrenceCount": len(recipes["G9-T04"]["occurrences"]),
    "T04UniqueQueryCount": len(recipes["G9-T04"]["uniqueQueryIds"]),
}
check("hash relations", relations, PREDICTIONS["hashRelations"])
check("T01/T02 information equality", recipes["G9-T01"]["informationHash"], recipes["G9-T02"]["informationHash"])
if recipes["G9-T01"]["traceHash"] == recipes["G9-T02"]["traceHash"]:
    ERRORS.append({"check": "T01/T02 trace distinction"})

out = {
    "schema": "gate9-independent-prespec-review-v1",
    "status": "PASS" if not ERRORS else "BLOCKED",
    "method": "Independent Python Fraction arithmetic, exhaustive three-by-three choices, and SHA-256 canonical JSON; no Gate 9 implementation imports.",
    "sourceFixtureSha256": hashlib.sha256(SOURCE_BYTES).hexdigest(),
    "contextHash": CONTEXT_HASH,
    "worldQueryOutputCount": len(WORLDS) * len(QUERY_IDS),
    "orderedChoiceCount": len(results),
    "recipeSummaries": {rid: {
        "choices": r["choiceQueryIds"],
        "compatibleWorldIds": r["compatibleWorldIds"],
        "propertyDetermined": r["propertyDetermined"],
        "traceHash": r["traceHash"],
        "informationHash": r["informationHash"],
    } for rid, r in recipes.items()},
    "checkpointTimes": [c["seconds"] for c in checkpoints],
    "scheduledEventCount": scheduled,
    "comparisonCount": CHECK_COUNT,
    "errors": ERRORS,
}
(Path(__file__).parent / "prespec-review.json").write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps(out, indent=2))
raise SystemExit(0 if not ERRORS else 1)
