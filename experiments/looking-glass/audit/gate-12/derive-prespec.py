#!/usr/bin/env python3
"""Independent Gate 12 finite derivation; imports no instrument implementation."""
import hashlib
import itertools
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs/gate-12"
OUT = ROOT / "audit/gate-12/prespec-derivation.json"
NAMES = ["experiment-charter.md", "model-contract.md", "record-contract.md", "fixture.json", "independent-predictions.json"]
files = [{"path": f"docs/gate-12/{n}", "bytes": (DOCS / n).stat().st_size,
          "sha256": hashlib.sha256((DOCS / n).read_bytes()).hexdigest()} for n in NAMES]
fixture = json.loads((DOCS / "fixture.json").read_text())
pred = json.loads((DOCS / "independent-predictions.json").read_text())
charter, model, record = [(DOCS / n).read_text() for n in NAMES[:3]]
checks = []

def check(name, ok):
    checks.append({"name": name, "pass": bool(ok)})

def canonical(x):
    return json.dumps(x, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

def digest(x):
    return hashlib.sha256(canonical(x).encode()).hexdigest()

modes = fixture["sourceModes"]
order = [m["id"] for m in modes]
groups = [g["id"] for g in fixture["groups"]]
refs = {r["id"]: r for r in fixture["references"]}
assignments = fixture["referenceAssignments"]
scenarios = fixture["availabilityScenarios"]
presence = fixture["proposalPresenceStates"]
check("five authored inputs and matching fixture identity", len(files) == 5 and all(f["bytes"] > 0 for f in files) and fixture["fixtureId"] == pred["fixtureId"])
check("source and fixed order", [(m["id"], m["retainedChannels"], m["sendMinutes"]) for m in modes] == [("P1",2,1),("P2",4,3),("P3",6,5)] and order == fixture["fixedModeOrder"] == pred["sourceOrder"] == fixture["procedure"]["tieBreakOrder"])
check("source hash definition", fixture["sourceHashPayload"] == "Canonical JSON of the ordered sourceModes array")
check("exact groups and references", groups == ["ARCHIVE", "DISPATCH"] and set(refs) == {"R_DETAIL","R_SPEED"} and all(r["version"] == 1 for r in refs.values()))
check("assignments and one changed binding", [(a["id"], a["referencesByGroup"]["ARCHIVE"]["id"], a["referencesByGroup"]["DISPATCH"]["id"]) for a in assignments] == [("BASE","R_DETAIL","R_SPEED"),("DETAIL_CONTROL","R_DETAIL","R_DETAIL")])
check("scenario eligibility", [(s["id"], s["eligibleModeIds"]) for s in scenarios] == [("ALL",order),("EXTREMES",["P1","P3"]),("NONE",[])])
check("four presence states", presence == [[],["ARCHIVE"],["DISPATCH"],groups])
check("procedure identity, score, statuses", fixture["procedure"]["id"] == "MINIMAX_RANK" and fixture["procedure"]["version"] == 1 and fixture["procedure"]["score"] == "max(rankARCHIVE(mode), rankDISPATCH(mode))" and fixture["procedure"]["missingStatus"] == "blocked-missing-proposal" and fixture["procedure"]["emptyStatus"] == "blocked-no-eligible-option" and fixture["procedure"]["selectedStatus"] == "procedure-selected")
check("safe provenance and action", fixture["jointActionTemplate"]["enacted"] is False and fixture["proposalRule"]["humanPreferenceClaim"] is False and fixture["runtime"]["mutationApi"] is False and fixture["runtime"]["perDocumentUuidOutsideSemantic"] is True)

ranked = {
    "R_DETAIL": sorted(modes, key=lambda m: (-m["retainedChannels"], order.index(m["id"]))),
    "R_SPEED": sorted(modes, key=lambda m: (m["sendMinutes"], order.index(m["id"])))
}
ranks = {ref: {m["id"]: i for i, m in enumerate(items)} for ref, items in ranked.items()}
for ref in ("R_DETAIL", "R_SPEED"):
    actual = {"orderedModeIds": [m["id"] for m in ranked[ref]], "ranksByMode": ranks[ref], "firstChoice": ranked[ref][0]["id"]}
    check(f"rank {ref}", all(pred["rankings"][ref][k] == v for k,v in actual.items()))
check("source metric order distinct", [m["id"] for m in ranked["R_DETAIL"]] == ["P3","P2","P1"] and [m["id"] for m in ranked["R_SPEED"]] == order)

def outcome(assignment, scenario, present):
    bindings = assignment["referencesByGroup"]
    available = scenario["eligibleModeIds"]
    first = {g: ranked[bindings[g]["id"]][0]["id"] for g in present}
    missing = [g for g in groups if g not in present]
    both = not missing
    different = first[groups[0]] != first[groups[1]] if both else None
    base = {"assignmentId": assignment["id"], "scenarioId": scenario["id"], "presentGroups": present,
            "missingGroupIds": missing, "firstChoicesByGroup": first, "differentFirstChoices": different,
            "selectedModeId": None, "matchesFirstChoiceByGroup": {g: None for g in groups},
            "jointAction": None, "scoreRows": [], "tiedMinimizers": [], "tieBreakUsed": False}
    if missing:
        base["status"] = "blocked-missing-proposal"
        return base
    if not available:
        base["status"] = "blocked-no-eligible-option"
        return base
    rows = []
    for mode_id in available:
        by_group = {g: ranks[bindings[g]["id"]][mode_id] for g in groups}
        rows.append({"modeId": mode_id, "ranksByGroup": by_group, "worstRank": max(by_group.values())})
    best = min(r["worstRank"] for r in rows)
    tied = [m for m in order if any(r["modeId"] == m and r["worstRank"] == best for r in rows)]
    selected = tied[0]
    base.update(status="procedure-selected", scoreRows=rows, tiedMinimizers=tied,
                selectedModeId=selected, tieBreakUsed=len(tied)>1,
                matchesFirstChoiceByGroup={g: selected == first[g] for g in groups},
                jointAction={"operation":"simulate-shared-export", "modeId":selected, "slotCount":1, "enacted":False})
    return base

derived = [outcome(a,s,p) for a,s,p in itertools.product(assignments,scenarios,presence)]
check("24 independent contexts", len(derived) == pred["outcomeCount"] == 24 and len({(r["assignmentId"],r["scenarioId"],tuple(r["presentGroups"])) for r in derived}) == 24)
check("predictions exact cardinality and order", len(pred["expectedOutcomes"]) == 24)
for i, (actual, expected) in enumerate(zip(derived, pred["expectedOutcomes"])):
    check(f"outcome {i:02d} {actual['assignmentId']}/{actual['scenarioId']}/{','.join(actual['presentGroups']) or 'empty'}", actual == expected)
counts = {status: sum(r["status"] == status for r in derived) for status in ["blocked-missing-proposal","blocked-no-eligible-option","procedure-selected"]}
check("status counts", counts == {"blocked-missing-proposal":18,"blocked-no-eligible-option":2,"procedure-selected":4})
check("missing precedes empty eligibility", all(r["status"] == "blocked-missing-proposal" for r in derived if r["scenarioId"] == "NONE" and len(r["presentGroups"]) < 2))
check("BASE disagreement survives selected and no availability", all(r["differentFirstChoices"] is True for r in derived if r["assignmentId"] == "BASE" and len(r["presentGroups"]) == 2))
check("control keeps two group identities", all(set(r["firstChoicesByGroup"]) == set(groups) and r["differentFirstChoices"] is False for r in derived if r["assignmentId"] == "DETAIL_CONTROL" and len(r["presentGroups"]) == 2))
check("blocked actions null, not false matches", all(r["jointAction"] is None and r["selectedModeId"] is None and all(v is None for v in r["matchesFirstChoiceByGroup"].values()) for r in derived if r["status"].startswith("blocked")))
check("selected actions remain simulated", all(r["jointAction"]["enacted"] is False and r["jointAction"]["slotCount"] == 1 for r in derived if r["status"] == "procedure-selected"))
check("BASE tie-break exactly P1 over P3", next(r for r in derived if r["assignmentId"] == "BASE" and r["scenarioId"] == "EXTREMES" and len(r["presentGroups"]) == 2)["tiedMinimizers"] == ["P1","P3"])
check("source and proposal preservation declared", pred["proposalPreservation"]["availabilityNeverReranks"] and pred["proposalPreservation"]["jointSelectionNeverChangesLocalProposal"] and pred["proposalPreservation"]["controlIsFreshBranch"] and pred["proposalPreservation"]["humanConsensusInferred"] is False)
check("expected primary local records", pred["primaryBrowserRecords"]["expectedProposalRecords"] == 4 and pred["primaryBrowserRecords"]["expectedCreatedOutcomeRecords"] == 5 and pred["primaryBrowserRecords"]["expectedReusedEvaluationCount"] == 1)
check("creation order invariant explicitly stated", "identical per-group proposal content" in pred["creationOrderInvariant"] and "provenance event order remains different" in pred["creationOrderInvariant"])

events = fixture["savedTour"]["events"]
check("eight exact events and seven checkpoints", events == pred["canonicalScheduledEvents"] and len(events) == pred["scheduledEventCount"] == 8 and fixture["savedTour"]["checkpoints"] == [0,4,8,12,16,20,24] and pred["checkpointCount"] == 7)
check("schedule and same-boundary order", [(e["seconds"],e["type"],e["origin"]) for e in events] == [(4,"proposal-record","replay"),(8,"proposal-record","replay"),(12,"procedure-evaluate","replay"),(16,"representation-select","replay"),(20,"scenario-select","replay"),(20,"procedure-evaluate","replay"),(24,"canonical-restore","replay"),(24,"tour-stop","automatic")])
check("stop reason", events[-1]["payload"] == {"reason":"end-of-sequence"} and fixture["savedTour"]["durationSeconds"] == 24)
stages = [(0,"diagram","ALL",[],None,None),(4,"diagram","ALL",["ARCHIVE"],None,None),(8,"diagram","ALL",groups,None,None),(12,"diagram","ALL",groups,"C-A-ALL","P2"),(16,"plain","ALL",groups,"C-A-ALL","P2"),(20,"plain","EXTREMES",groups,"C-A-EXTREMES","P1"),(24,"diagram","ALL",[],None,None)]
check("seven authored checkpoint rows", len(pred["checkpointExpectations"]) == len(stages))
for row, (sec,rep,scenario,recorded,outcome_id,selected) in zip(pred["checkpointExpectations"], stages):
    check(f"checkpoint {sec}", all(row[k] == v for k,v in {"seconds":sec,"representation":rep,"assignmentId":"BASE","scenarioId":scenario,"recordedGroups":recorded,"currentOutcomeId":outcome_id,"selectedModeId":selected}.items()))
check("checkpoint selected comparisons", all(pred["checkpointExpectations"][i]["differentFirstChoices"] is True and pred["checkpointExpectations"][i]["matchesFirstChoiceByGroup"] == ({"ARCHIVE":False,"DISPATCH":True} if i == 5 else {"ARCHIVE":False,"DISPATCH":False}) for i in (3,4,5)))
check("initial/final display and natural stop", fixture["initialState"]["recordedGroups"] == [] and pred["checkpointExpectations"][-1]["endReason"] == "end-of-sequence" and fixture["canonicalRecords"]["localCreationClaim"] is False)
check("18 comparisons prescribed, not observed", pred["browserPausedComparisonsPlanned"] == 18 and "18 designated comparisons total" in record)
check("critical first-use before checkpoint baseline", "This path comes first on candidate001" in record and "Baseline checkpoints after first use" in record)
check("publication race safeguard", "semantic-generation token independent of snapshotRevision" in model and "Queue layout measurement until semantic rendering completes" in model and "paused control→scroll race" in model and "one captured clock value" in model)
check("lossless acquisition and truthful export", "shallow string chunks" in model and "Export first records its own export event" in model and "included-through sequence" in model)
check("browser limits and separate historical links", "roughly55–70 complete observations" in record and "visible Gate11 replay and results links" in record and "18 designated comparisons total" in record)
check("no human, no next gate", "zero human participants" in charter and "Gate 13 is unapproved" in charter and "untested human coordination" in record.lower())

errors = [c["name"] for c in checks if not c["pass"]]
report = {"schema":"gate12-independent-prespec-derivation-v1", "status":"PASS" if not errors else "BLOCKED",
          "inputFiles":files, "sourceHash":digest(modes), "rankings":ranks, "firstChoicesByAssignment":{a["id"]:{g:ranked[a["referencesByGroup"][g]["id"]][0]["id"] for g in groups} for a in assignments},
          "outcomes":derived, "outcomeCount":len(derived), "statusCounts":counts,
          "scheduledEventCount":len(events), "checkpointCount":len(stages), "browserPausedComparisonsPlannedNotObserved":18,
          "checkCount":len(checks), "passCount":len(checks)-len(errors), "errors":errors, "checks":checks,
          "implementationImports":[], "browserObservations":0, "humanParticipants":0}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(report, indent=2)+"\n")
print(json.dumps({k:report[k] for k in ("status","checkCount","passCount","errors","outcomeCount","statusCounts","scheduledEventCount","checkpointCount")}, indent=2))
