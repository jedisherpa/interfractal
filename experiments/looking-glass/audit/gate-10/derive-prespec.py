#!/usr/bin/env python3
"""Independent Gate 10 exact prespec derivation; imports no product implementation."""

import hashlib
import json
import re
from math import isqrt
from fractions import Fraction as Q
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
D = ROOT / "docs/gate-10"
A = ROOT / "audit/gate-10"
NAMES = ["experiment-charter.md", "model-contract.md", "record-contract.md", "fixture.json", "private-answer-key.json", "independent-predictions.json"]
files = {name: (D / name).read_bytes() for name in NAMES}
fixture = json.loads(files["fixture.json"])
key = json.loads(files["private-answer-key.json"])
pred = json.loads(files["independent-predictions.json"])
errors = []
checks = 0


def check(label, okay):
    global checks
    checks += 1
    if not okay:
        errors.append(label)


def norm(value):
    value = Q(value)
    return str(value.numerator) if value.denominator == 1 else f"{value.numerator}/{value.denominator}"


def exact(value):
    return isinstance(value, str) and re.fullmatch(r"-?\d+(?:/[1-9]\d*)?", value) is not None and norm(value) == value


def point(source, query):
    x, y, z, w = map(Q, source)
    c, s = Q(query["cos"]), Q(query["sin"])
    return [norm(c * x - s * w), norm(y), norm(z)]


def rank(rows):
    a = [[Q(value) for value in row] for row in rows]
    pivots = 0
    for col in range(len(a[0])):
        pivot = next((r for r in range(pivots, len(a)) if a[r][col]), None)
        if pivot is None:
            continue
        a[pivots], a[pivot] = a[pivot], a[pivots]
        d = a[pivots][col]
        a[pivots] = [v / d for v in a[pivots]]
        for r in range(len(a)):
            if r != pivots:
                f = a[r][col]
                a[r] = [v - f * p for v, p in zip(a[r], a[pivots])]
        pivots += 1
    return pivots


def ball_slice(center_w, radius_squared, setting):
    delta = radius_squared - (setting - center_w) ** 2
    if delta < 0:
        return {"kind": "empty", "center": None, "delta": norm(delta), "radiusSquared": None, "radius": None}
    if delta == 0:
        return {"kind": "point", "center": ["0", "0", "0"], "delta": "0", "radiusSquared": "0", "radius": "0"}
    nroot = isqrt(delta.numerator)
    droot = isqrt(delta.denominator)
    radius = norm(Q(nroot, droot)) if nroot * nroot == delta.numerator and droot * droot == delta.denominator else None
    return {"kind": "ball", "center": ["0", "0", "0"], "delta": norm(delta), "radiusSquared": norm(delta), "radius": radius}


queries = {q["id"]: q for q in fixture["pointQueries"]}
check("six stable input files", len(files) == 6)
check("shared fixture identity", fixture["fixtureId"] == key["fixtureId"] == pred["fixtureId"] == "G10-FIXTURE-001")
check("public human flag", fixture["humanEligible"] is False)
check("query order", list(queries) == ["a0", "am", "a90", "a180"])
check("exact query coefficients", all(exact(q["cos"]) and exact(q["sin"]) for q in queries.values()))
check("declared exact trigonometry", [(q["cos"], q["sin"]) for q in queries.values()] == [("1", "0"), ("3/5", "4/5"), ("0", "1"), ("-1", "0")])
check("unit query pairs", all(Q(q["cos"]) ** 2 + Q(q["sin"]) ** 2 == 1 for q in queries.values()))
for name, query in queries.items():
    matrix = [[query["cos"], "0", "0", norm(-Q(query["sin"]))], ["0", "1", "0", "0"], ["0", "0", "1", "0"]]
    check(f"{name} independent matrix", pred["matrixRows"][name] == matrix)
check("camera and card contract", fixture["rendering"] == {"cardWidthCss": 280, "cardHeightCss": 200, "scaleCssPerUnit": 50, "defaultYawDegrees": 0, "defaultPitchDegrees": 20, "decimalPlaces": 6, "autoscale": False})

practice = fixture["practice"]
check("practice source and identity", practice["id"] == "P00" and practice["sourceId"] == "G10-PRACTICE-P00" and all(exact(v) for v in practice["source"]))
practice_values = [point(practice["source"], queries[s["queryId"]]) for s in practice["supports"]]
for support, computed in zip(practice["supports"], practice_values):
    check(f"practice support {support['id']}", support["xyz"] == computed)
practice_target = point(practice["source"], queries[practice["targetQueryId"]])
check("practice target", practice["workedTarget"] == {"kind": "point", "xyz": practice_target})
check("practice oracle", pred["practice"]["xyzw"] == practice["source"] and pred["practice"]["a0"] == practice_values[0] and pred["practice"]["a90"] == practice_values[1] and pred["practice"]["am"] == practice_target)
check("practice has no response options", "options" not in practice and "expectedOptionId" not in practice)

tasks = fixture["tasks"]
answers = {x["caseId"]: x for x in key["answers"]}
point_oracle = {x["caseId"]: x for x in pred["pointChecks"]}
ball_oracle = {x["caseId"]: x for x in pred["ballChecks"]}
check("five fixed cases", [t["id"] for t in tasks] == ["T01", "T02", "T03", "T04", "T05"] and set(answers) == {t["id"] for t in tasks})
check("assessment sources separate", len({t["sourceId"] for t in tasks}) == 5 and practice["sourceId"] not in {t["sourceId"] for t in tasks})
check("point/ball category split", [(t["family"], t["category"]) for t in tasks] == [("point4-rotation", "interpolation"), ("point4-rotation", "unseen-setting"), ("point4-rotation", "same-family-setting"), ("ball4-slice", "changed-family"), ("ball4-slice", "changed-family")])
computed_cases = []

for task in tasks:
    case_id = task["id"]
    answer = answers[case_id]
    options = {option["id"]: option["hypothesis"] for option in task["options"]}
    check(f"{case_id} four options", list(options) == ["O1", "O2", "O3", "O4"])
    check(f"{case_id} key option exists", answer["expectedOptionId"] in options)
    check(f"{case_id} no public expected label", "expectedOptionId" not in task and "source" not in task and "answer" not in task)
    check(f"{case_id} target query only", "xyz" not in task["target"] and "delta" not in task["target"])
    if case_id in ("T01", "T02"):
        first, second = task["supports"]
        check(f"{case_id} support query sequence", [first["queryId"], second["queryId"]] == ["a0", "a90"])
        check(f"{case_id} y/z agree", first["xyz"][1:] == second["xyz"][1:])
        source = [first["xyz"][0], *first["xyz"][1:], norm(-Q(second["xyz"][0]))]
        check(f"{case_id} source exact", all(exact(v) for v in source) and answer["source"]["xyzw"] == source and answer["source"]["id"] == task["sourceId"])
        checks_support = [point(source, queries[s["queryId"]]) == s["xyz"] for s in task["supports"]]
        check(f"{case_id} supports recomputed", all(checks_support))
        target = point(source, queries[task["target"]["queryId"]])
        expected = {"kind": "unique-point", "xyz": target}
        check(f"{case_id} exact answer", answer["target"] == expected and options[answer["expectedOptionId"]] == expected)
        check(f"{case_id} exactly one matching option", sum(value == expected for value in options.values()) == 1)
        oracle = point_oracle[case_id]
        check(f"{case_id} author oracle", oracle["xyzw"] == source and oracle["supports"] == [s["xyz"] for s in task["supports"]] and oracle["target"] == target and oracle["expectedOptionId"] == answer["expectedOptionId"])
        rows = [row for support in task["supports"] for row in pred["matrixRows"][support["queryId"]]]
        check(f"{case_id} rank four", rank(rows) == oracle["stackedRank"] == 4)
        if case_id == "T02":
            check("T02 target identified by first support alone", target == [norm(-Q(first["xyz"][0])), *first["xyz"][1:]] and oracle["targetAlreadyIdentifiedByA0Alone"] is True)
        computed_cases.append({"caseId": case_id, "family": task["family"], "source": source, "supportRank": rank(rows), "target": expected, "expectedOptionId": answer["expectedOptionId"]})
    elif case_id == "T03":
        first, second = task["supports"]
        check("T03 identical raw supports", first["queryId"] == second["queryId"] == "a0" and first["xyz"] == second["xyz"] and [first["cameraYawDegrees"], second["cameraYawDegrees"]] == [0, 45])
        sources = answer["sourceClass"]["admissibleSources"]
        check("T03 no secretly selected source", answer["sourceClass"]["selectedSource"] is None and answer["sourceClass"]["id"] == task["sourceId"])
        check("T03 exact witnesses", len(sources) == 2 and {source[3] for source in sources} == {"-2", "2"} and all(point(source, queries["a0"]) == first["xyz"] for source in sources) and "either -2 or 2" in task["facts"][0])
        targets = sorted((point(source, queries[task["target"]["queryId"]]) for source in sources), key=lambda xyz: tuple(map(Q, xyz)))
        expected = {"kind": "point-set", "points": targets, "unique": False}
        check("T03 two exact outputs", answer["target"] == expected and options[answer["expectedOptionId"]] == {"kind": "point-set", "points": targets})
        check("T03 exactly one matching option", sum(value == options[answer["expectedOptionId"]] for value in options.values()) == 1)
        oracle = point_oracle[case_id]
        rows = [row for support in task["supports"] for row in pred["matrixRows"][support["queryId"]]]
        check("T03 rank three/null w", rank(rows) == oracle["stackedRank"] == 3 and oracle["sourceNullVector"] == ["0", "0", "0", "1"])
        check("T03 author oracle", oracle["admissibleSources"] == sources and oracle["targetSet"] == targets and oracle["unique"] is False and oracle["expectedOptionId"] == answer["expectedOptionId"])
        computed_cases.append({"caseId": case_id, "family": task["family"], "sourceClass": sources, "supportRank": rank(rows), "target": expected, "expectedOptionId": answer["expectedOptionId"]})
    else:
        first, second = task["supports"]
        s1, s2 = Q(first["sliceSetting"]), Q(second["sliceSetting"])
        d1, d2 = Q(first["radiusSquared"]), Q(second["radiusSquared"])
        center_w = (d2 - d1 + s2**2 - s1**2) / (2 * (s2 - s1))
        radius_squared = d1 + (s1 - center_w) ** 2
        check(f"{case_id} distinct supports", s1 != s2 and radius_squared >= 0)
        check(f"{case_id} support observations", all(ball_slice(center_w, radius_squared, Q(s["sliceSetting"]))["kind"] == s["kind"] and ball_slice(center_w, radius_squared, Q(s["sliceSetting"]))["radiusSquared"] == s["radiusSquared"] and ball_slice(center_w, radius_squared, Q(s["sliceSetting"]))["radius"] == s["radius"] for s in task["supports"]))
        check(f"{case_id} private source", answer["source"]["id"] == task["sourceId"] and answer["source"]["center"] == ["0", "0", "0", norm(center_w)] and answer["source"]["radiusSquared"] == norm(radius_squared) and answer["source"]["radius"] == norm(Q(isqrt(radius_squared.numerator), isqrt(radius_squared.denominator))))
        target = ball_slice(center_w, radius_squared, Q(task["target"]["sliceSetting"]))
        check(f"{case_id} exact target", answer["target"] == target)
        option = options[answer["expectedOptionId"]]
        check(f"{case_id} option classification", option["kind"] == target["kind"] and (option.get("radiusSquared") == target["radiusSquared"] if target["kind"] == "point" else True))
        check(f"{case_id} unique option kind", sum(value["kind"] == target["kind"] for value in options.values()) == 1)
        oracle = ball_oracle[case_id]
        check(f"{case_id} author oracle", oracle["cw"] == norm(center_w) and oracle["radiusSquared"] == norm(radius_squared) and oracle["targetDelta"] == target["delta"] and oracle["targetKind"] == target["kind"] and oracle["targetRadiusSquared"] == target["radiusSquared"] and oracle["expectedOptionId"] == answer["expectedOptionId"])
        computed_cases.append({"caseId": case_id, "family": task["family"], "centerW": norm(center_w), "radiusSquared": norm(radius_squared), "target": target, "expectedOptionId": answer["expectedOptionId"]})

check("practice answer distinct from point assessments", all(case["target"].get("xyz") != practice_target for case in computed_cases if case["family"] == "point4-rotation"))
check("author split agrees", pred["split"]["practiceSources"] == [practice["sourceId"]] and pred["split"]["assessmentPointSources"] == [t["sourceId"] for t in tasks[:3]] and pred["split"]["assessmentBallSources"] == [t["sourceId"] for t in tasks[3:]])
check("five target/source pairs frozen", pred["split"]["assessmentTargetSourceQueryPairs"] == [[t["sourceId"], t["target"]["queryId"] if "queryId" in t["target"] else f"slice:{t['target']['sliceSetting']}"] for t in tasks])
check("unworked a180 target", "a180" not in [s["queryId"] for s in practice["supports"]] + [practice["targetQueryId"]] and pred["split"]["unworkedSameFamilyQueryIds"] == ["a180"])
check("canonical tour no answers", fixture["savedTour"]["answers"] == fixture["savedTour"]["reveals"] == [] and fixture["savedTour"]["practiceOpen"] is False)
expected_checkpoints = [{"seconds": t, "caseId": c} for t, c in zip([0, 4, 8, 12, 16, 20], ["T01", "T02", "T03", "T04", "T05", "T01"])]
check("six checkpoints", pred["checkpoints"] == expected_checkpoints and fixture["savedTour"]["checkpoints"] == [0, 4, 8, 12, 16, 20] and fixture["savedTour"]["durationSeconds"] == 20)
check("canonical case order", fixture["savedTour"]["caseOrder"] == [x["caseId"] for x in expected_checkpoints] and fixture["savedTour"]["secondsPerCase"] == 4)
expected_events = [{"seconds": t, "type": "case-select", "caseId": c, "origin": "replay"} for t, c in zip([4, 8, 12, 16, 20], ["T02", "T03", "T04", "T05", "T01"])] + [{"seconds": 20, "type": "tour-stop", "origin": "automatic", "reason": "end-of-sequence"}]
check("six answer-free scheduled events", pred["canonicalScheduledEvents"] == expected_events)
check("checkpoint payload answer-free", pred["checkpointCommon"]["responsePhase"] == "none" and pred["checkpointCommon"]["response"] is None and pred["checkpointCommon"]["revealedResult"] is None and pred["checkpointCommon"]["attachedLocalAttempt"] is None)
recipe = pred["primaryBrowserResponseRecipe"]
check("browser recipe case order", [x["caseId"] for x in recipe] == [t["id"] for t in tasks])
grades = []
for item in recipe:
    response = item["response"]
    expected_option = answers[item["caseId"]]["expectedOptionId"]
    grade = None if response["kind"] == "skip" and response["optionId"] is None else "correct" if response["optionId"] == expected_option else "incorrect"
    grades.append(grade)
    check(f"browser recipe {item['caseId']}", item["beforeReveal"] == "withheld" and item["afterRevealSoftwareGrade"] == grade)
check("one wrong three correct one skip", grades == ["incorrect", "correct", "correct", None, "correct"])
repeat = pred["separateReviewRecipe"]
check("separate correction attempt", repeat["caseId"] == "T01" and repeat["response"] == {"kind": "answer", "optionId": "O2"} and repeat["priorReveal"] is True and repeat["afterRevealSoftwareGrade"] == "correct" and repeat["originalWrongResponseUnchanged"] is True)
check("private key not copied into public fixture", all(field not in task for task in tasks for field in ("expectedOptionId", "softwareGrade", "explanation", "answer", "source")))
check("private key explicitly nonserved", "nonserved" in key["visibility"] and pred["status"].endswith("independent audit pending"))

result = {
    "schema": "gate10-prespec-independent-review-v1",
    "status": "PASS" if not errors else "BLOCKED",
    "inputFiles": [{"path": f"docs/gate-10/{name}", "sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content)} for name, content in files.items()],
    "checkCount": checks,
    "practice": {"source": practice["source"], "supports": practice_values, "target": practice_target},
    "cases": computed_cases,
    "browserRecipeGrades": grades,
    "canonicalCheckpoints": expected_checkpoints,
    "canonicalScheduledEvents": expected_events,
    "errors": errors,
    "implementationOrBrowserClaim": False,
    "humanOutcome": "untested",
}
A.mkdir(parents=True, exist_ok=True)
(A / "prespec-review.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({key: value for key, value in result.items() if key not in ("inputFiles", "cases")}, indent=2))
