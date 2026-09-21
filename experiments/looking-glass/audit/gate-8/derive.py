"""Independent Gate 8 oracle; uses only the public fixture and Python stdlib."""

import itertools
import json
from decimal import Decimal, ROUND_HALF_UP
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = json.loads((ROOT / "docs/gate-8/fixture.json").read_text())
PREDICTIONS = json.loads((ROOT / "docs/gate-8/independent-predictions.json").read_text())
TOLERANCE = Fraction(FIXTURE["numericDiagnosticTolerance"])


def number(value):
    return Fraction(value)


def rational(value):
    value = Fraction(value)
    return str(value.numerator) if value.denominator == 1 else f"{value.numerator}/{value.denominator}"


def observe(world, query):
    if "source" in world:
        source = list(map(number, world["source"]))
        x, y, z, w = source[:4]
        if query["kind"] == "project":
            coords = (x, y, z)
        elif query["kind"] == "xw90":
            coords = (-w, y, z)
        elif query["kind"] == "yv90":
            coords = (x, -source[4], z)
        else:
            raise ValueError(query)
        return {"kind": "point", "pointId": "P", "xyz": list(map(rational, coords))}

    if query["kind"] == "project":
        return {"kind": "ball", "center": ["0"] * 3, "radiusSquared": world["radiusSquared"]}
    setting = number(query["setting"])
    center_w = number(world["center"][3])
    q = number(world["radiusSquared"]) - (setting - center_w) ** 2
    if q < 0:
        return {"kind": "empty"}
    return {"kind": "ball" if q > 0 else "point", "center": ["0"] * 3, "radiusSquared": rational(q)}


def label(value):
    decimal_value = Decimal(value.numerator) / Decimal(value.denominator)
    rounded = decimal_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return "0.00" if rounded == 0 else f"{rounded:.2f}"


def diagnostic(a, b):
    if a["kind"] != b["kind"] or a.get("pointId") != b.get("pointId"):
        return {"exactEqual": False, "withinTolerance": False, "roundedLabelsEqual": False}
    field = "xyz" if "xyz" in a else "center"
    av = [number(x) for x in a.get(field, [])]
    bv = [number(x) for x in b.get(field, [])]
    if "radiusSquared" in a:
        av.append(number(a["radiusSquared"]))
        bv.append(number(b["radiusSquared"]))
    return {
        "exactEqual": a == b,
        "withinTolerance": all(abs(x - y) <= TOLERANCE for x, y in zip(av, bv)),
        "roundedLabelsEqual": all(label(x) == label(y) for x, y in zip(av, bv)),
    }


def same_property(a, b):
    return a["propertyValue"] == b["propertyValue"]


def pair_ids(pair):
    return [pair[0]["id"], pair[1]["id"]]


def compare_bundle(outputs, a, b, query_ids):
    comparisons = [diagnostic(outputs[a][q], outputs[b][q]) for q in query_ids]
    return {key: all(item[key] for item in comparisons) for key in comparisons[0]}


def solve_case(case):
    worlds = case["worlds"]
    queries = {q["id"]: q for q in case["queries"]}
    outputs = {w["id"]: {q: observe(w, query) for q, query in queries.items()} for w in worlds}
    pairs = list(itertools.combinations(worlds, 2))
    baseline = case["baselineQueryIds"]
    extra = case["additionalQueryIds"]
    diagnostics = []
    for a, b in pairs:
        diagnostics.append({"pair": pair_ids((a, b)), "propertyEqual": same_property(a, b),
                            **compare_bundle(outputs, a["id"], b["id"], baseline)})
    subsets = []
    for size in range(len(extra) + 1):
        for chosen in itertools.combinations(extra, size):
            unresolved = [pair_ids((a, b)) for a, b in pairs if not same_property(a, b)
                          and compare_bundle(outputs, a["id"], b["id"], baseline + list(chosen))["exactEqual"]]
            subsets.append({"additionalQueryIds": list(chosen), "familyPropertyDetermined": not unresolved,
                            "unresolvedUnequalPropertyPairs": unresolved})
    valid = [s for s in subsets if s["familyPropertyDetermined"]]
    if valid:
        minimum_size = len(valid[0]["additionalQueryIds"])
        minimum = {"status": "determined", "size": minimum_size,
                   "subsets": [s["additionalQueryIds"] for s in valid if len(s["additionalQueryIds"]) == minimum_size]}
    else:
        minimum = {"status": "none-in-menu", "size": None, "subsets": [],
                   "fullMenuSurvivingPairs": subsets[-1]["unresolvedUnequalPropertyPairs"]}
    classes = {}
    for world in worlds:
        key = json.dumps([outputs[world["id"]][q] for q in baseline], sort_keys=True)
        classes.setdefault(key, []).append(world["id"])
    separating = {q: [pair_ids((a, b)) for a, b in pairs
                      if not compare_bundle(outputs, a["id"], b["id"], [q])["exactEqual"]] for q in extra}
    return {
        "observations": outputs,
        "baselineExactClasses": list(classes.values()),
        "baselinePairDiagnostics": diagnostics,
        "separatingPairsByAdditionalQuery": separating,
        "subsets": subsets,
        "minimum": minimum,
        "outsideMenu": {q["id"]: {w["id"]: observe(w, q) for w in worlds}
                        for q in case["outsideMenuQueries"]},
    }


def check_prediction(case_id, derived):
    expected = PREDICTIONS["cases"][case_id]
    for key in ("observations", "baselineExactClasses", "baselinePairDiagnostics",
                "separatingPairsByAdditionalQuery", "subsets", "minimum"):
        assert derived[key] == expected[key], f"{case_id} {key} mismatch"
    if case_id == "G8-C03":
        assert derived["outsideMenu"]["slicePlusHalf"] == expected["outsideMenu"]["observations"]
    if case_id == "G8-C04":
        a, b = FIXTURE["cases"][3]["worlds"]
        dx = abs(number(a["source"][0]) - number(b["source"][0]))
        assert rational(dx) == expected["baselineAbsoluteXDifference"]
        assert [label(number(w["source"][0])) for w in (a, b)] == expected["baselineRoundedXLabels"]
        after = compare_bundle(derived["observations"], a["id"], b["id"], ["project", "xw90"])
        assert after == {k: expected["afterXwPairDiagnostics"][0][k]
                         for k in ("exactEqual", "withinTolerance", "roundedLabelsEqual")}


def checkpoint_check(cases):
    expected = PREDICTIONS["canonicalReplay"]["checkpoints"]
    assert [c["timeSeconds"] for c in expected] == list(range(0, 33, 4))
    results = []
    for cp in expected:
        case = next(c for c in FIXTURE["cases"] if c["id"] == cp["caseId"])
        derived = cases[case["id"]]
        reference = next(w for w in case["worlds"] if w["id"] == cp["referenceWorldId"])
        qids = case["baselineQueryIds"] + cp["selectedAdditionalQueryIds"]
        compatible = [w["id"] for w in case["worlds"] if compare_bundle(
            derived["observations"], reference["id"], w["id"], qids)["exactEqual"]]
        property_values = [w["propertyValue"] for w in case["worlds"] if w["id"] in compatible]
        determined = all(value == property_values[0] for value in property_values)
        assert compatible == cp["compatibleWorldIds"]
        assert determined == cp["localPropertyDetermined"]
        assert cp["cameraYawDegrees"] == 0 and not cp["certificateVisible"] and cp["paused"]
        assert cp["mode"] == "saved-replay"
        results.append({"timeSeconds": cp["timeSeconds"], "caseId": case["id"],
                        "selectedAdditionalQueryIds": cp["selectedAdditionalQueryIds"],
                        "compatibleWorldIds": compatible, "localPropertyDetermined": determined})
    return results


def matrix_rank(rows):
    matrix = [[Fraction(x) for x in row] for row in rows]
    pivot_row = 0
    for col in range(len(matrix[0])):
        pivot = next((r for r in range(pivot_row, len(matrix)) if matrix[r][col]), None)
        if pivot is None:
            continue
        matrix[pivot_row], matrix[pivot] = matrix[pivot], matrix[pivot_row]
        scale = matrix[pivot_row][col]
        matrix[pivot_row] = [x / scale for x in matrix[pivot_row]]
        for r in range(len(matrix)):
            if r != pivot_row:
                scale = matrix[r][col]
                matrix[r] = [x - scale * y for x, y in zip(matrix[r], matrix[pivot_row])]
        pivot_row += 1
    return pivot_row


def observation_rank(dimension, query_ids):
    basis = [[Fraction(i == j) for i in range(dimension)] for j in range(dimension)]
    rows = []
    for query in query_ids:
        if query == "project":
            rows.extend(basis[:3])
        elif query == "xw90":
            rows.extend([[-v for v in basis[3]], basis[1], basis[2]])
        elif query == "yv90":
            rows.extend([basis[0], [-v for v in basis[4]], basis[2]])
        else:
            raise ValueError(query)
    return matrix_rank(rows)


def main():
    cases = {case["id"]: solve_case(case) for case in FIXTURE["cases"]}
    for case_id, derived in cases.items():
        check_prediction(case_id, derived)
    assert sum(len(c["baselinePairDiagnostics"]) for c in cases.values()) == 9
    assert sum(len(c["subsets"]) for c in cases.values()) == 12
    assert sum(sum(not p["propertyEqual"] and p["exactEqual"] for p in c["baselinePairDiagnostics"])
               for c in cases.values()) == 8
    assert [cases[f"G8-C0{i}"]["minimum"]["size"] for i in (1, 2, 3, 4)] == [1, 2, None, 0]
    assert label(Fraction(-1, 10**12)) == "0.00"
    ranks = {
        "G8-C01": {"project": observation_rank(4, ["project"]),
                    "project+xw90": observation_rank(4, ["project", "xw90"])},
        "G8-C02": {"project": observation_rank(5, ["project"]),
                    "project+xw90": observation_rank(5, ["project", "xw90"]),
                    "project+yv90": observation_rank(5, ["project", "yv90"]),
                    "project+xw90+yv90": observation_rank(5, ["project", "xw90", "yv90"])},
        "G8-C04": {"project": observation_rank(4, ["project"]),
                    "project+xw90": observation_rank(4, ["project", "xw90"])},
    }
    assert ranks == {"G8-C01": {"project": 3, "project+xw90": 4},
                     "G8-C02": {"project": 3, "project+xw90": 4,
                                 "project+yv90": 4, "project+xw90+yv90": 5},
                     "G8-C04": {"project": 3, "project+xw90": 4}}
    report = {"kind": "gate8-independent-rational-derivation", "source": "public fixture only",
              "predictionComparison": "all checked fields agree", "caseResults": cases,
              "canonicalCheckpoints": checkpoint_check(cases),
              "linearObservationRanks": ranks,
              "cameraInformation": "yaw is absent from all forward equations and signatures"}
    path = ROOT / "audit/gate-8/independent-results.json"
    path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"result": "PASS", "cases": 4, "pairs": 9, "subsets": 12, "checkpoints": 9,
                      "output": str(path)}))


if __name__ == "__main__":
    main()
