#!/usr/bin/env python3
"""Independent finite Gate 13 prespec derivation; no instrument imports."""
import hashlib
import itertools
import json
from fractions import Fraction
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "docs/gate-13"
OUT = ROOT / "audit/gate-13/prespec-derivation.json"
NAMES = ("experiment-charter.md", "model-contract.md", "record-contract.md", "fixture.json", "independent-predictions.json")

def read(path):
    return (ROOT / path).read_bytes()

def digest(data):
    return hashlib.sha256(data).hexdigest()

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()

def object_hash(value):
    return digest(canonical(value))

def ratio(n, d):
    if d == 0:
        return {"status": "undefined", "reason": "zero-denominator"}
    r = Fraction(n, d)
    return {"status": "defined", "numerator": r.numerator, "denominator": r.denominator}

checks = []
def check(label, passed, detail=None):
    checks.append({"name": label, "pass": bool(passed), **({"detail": detail} if not passed and detail is not None else {})})

files = [{"path": "docs/gate-13/" + name, "bytes": len(read("docs/gate-13/" + name)), "sha256": digest(read("docs/gate-13/" + name))} for name in NAMES]
fixture = json.loads(read("docs/gate-13/fixture.json"))
oracle = json.loads(read("docs/gate-13/independent-predictions.json"))
charter, model, record = (read("docs/gate-13/" + n).decode() for n in NAMES[:3])
ledger_path = "docs/program-requirements-and-status.md"
ledger = read(ledger_path).decode()
ledger_hash = digest(read(ledger_path))

check("five stable authored inputs and fixture identity", len(files) == 5 and all(x["bytes"] > 0 for x in files) and fixture["fixtureId"] == oracle["fixtureId"] == "G13-FIXTURE-001")
check("author-provided fixture/oracle digest pin", files[3]["sha256"] == "95238cd28d4c7af803733585940f60c56733d04dfdc00a216aef1385483247d8" and files[4]["sha256"] == "fb085a57ac9c65b0b70011e80150a377ab0fa7e77ed6c125eb8bb76db239eaa4")
check("case IDs, order, and count", fixture["caseOrder"] == ["MISMATCH", "TRUE_CONTROL", "ZERO_CONTROL"] == [c["id"] for c in fixture["cases"]] and len(fixture["cases"]) == oracle["caseResultCount"] == 3)
check("public synthetic scope and no participant claim", fixture["scope"]["public"] is True and fixture["scope"]["authoredCounterexample"] is True and fixture["scope"]["empiricallyPersuasive"] is False and fixture["scope"]["humanParticipants"] == 0 and "Zero human participants" in charter)
check("predicate and units", fixture["predicate"] == {"id":"TWICE_COUNT","version":1,"definition":"B.completedCount == 2 * A.completedCount","unit":"tiles","ratioNotNeededToDecideEquality":True})
check("source hashes use complete source, display hashes complete display", fixture["hashPolicy"]["sourcePayload"] == "the selected case.source object" and fixture["hashPolicy"]["originalDisplayPayload"] == "the selected case.originalDisplay object" and fixture["hashPolicy"]["correctionDisplayPayload"] == "the selected non-null case.correctionDisplay object" and fixture["hashPolicy"]["algorithm"] == "SHA-256")
check("representations and zero-marker contract", fixture["representations"] == ["visual","plain"] and fixture["visualEncoding"]["viewBox"] == [0,0,320,160] and fixture["visualEncoding"]["plotWidth"] == 240 and "no positive-width replacement bar" in fixture["visualEncoding"]["zeroMarker"])

derived = []
configs = []
expected_basic = {"MISMATCH": (80,90,70,False,10,(80,160),(192,216)), "TRUE_CONTROL": (40,80,0,True,40,(96,192),None), "ZERO_CONTROL": (0,10,0,False,10,(0,24),(0,24))}
for case, authored in zip(fixture["cases"], oracle["caseResults"]):
    cid = case["id"]
    source = case["source"]
    original = case["originalDisplay"]
    correction = case["correctionDisplay"]
    counts = {r["id"]: r["completedCount"] for r in source["records"]}
    a, b = counts["A"], counts["B"]
    lo, hi, width = (original["scale"][k] for k in ("lowerBound","upperBound","plotWidth"))
    offsets = [a-lo,b-lo]
    widths = [Fraction(width*x,hi-lo) for x in offsets]
    correct = None
    if correction is not None:
        newlo, newhi, newwidth = (correction["scale"][k] for k in ("lowerBound","upperBound","plotWidth"))
        new_offsets = [a-newlo,b-newlo]
        new_widths = [Fraction(newwidth*x,newhi-newlo) for x in new_offsets]
        correct = {"displaySha256":object_hash(correction),"lowerBound":newlo,"offsets":new_offsets,"svgWidths":[int(x) for x in new_widths],"lengthRatio":ratio(new_offsets[1],new_offsets[0]),"text":correction["text"],"factsTrue":True,"sourceUnchanged":True,"originalUnchanged":True}
        check(f"{cid} correction uses exact integer widths and same source", all(x.denominator == 1 for x in new_widths) and newlo == 0 and newhi == hi and newwidth == width and correction["sourceOrder"] == original["sourceOrder"])
    row = {"caseId":cid,"sourceSha256":object_hash(source),"originalDisplaySha256":object_hash(original),"sourceCounts":counts,"predicateOperands":{"leftB":b,"rightTwiceA":2*a},"originalStatementVerdict":b == 2*a,"difference":b-a,"countRatio":ratio(b,a),"originalLowerBound":lo,"originalOffsets":offsets,"originalSvgWidths":[int(x) for x in widths],"originalLengthRatio":ratio(offsets[1],offsets[0]),"correctionAllowedAfterCheck":b != 2*a,"diagnosis":case["diagnosis"],"correction":correct}
    derived.append(row)
    check(f"{cid} source records are bounded same-window counts", list(counts) == ["A","B"] and all(isinstance(x,int) and 0 <= x <= 100 for x in counts.values()) and "same stipulated window" in source["scope"] and source["unit"] == "tiles")
    check(f"{cid} original exact geometry and statement binding", 0 <= lo <= min(a,b) <= hi == 100 and width == 240 and all(x.denominator == 1 for x in widths) and original["sourceOrder"] == ["A","B"] and original["statement"]["predicate"] == "TWICE_COUNT" and original["statement"]["predicateVersion"] == 1)
    check(f"{cid} independently derived oracle row", row == authored, {"derived":row,"authored":authored})
    ea,eb,el,et,ed,ew,ecw = expected_basic[cid]
    check(f"{cid} declared control arithmetic", (a,b,lo,b == 2*a,b-a,tuple(row["originalSvgWidths"]),tuple(correct["svgWidths"]) if correct else None) == (ea,eb,el,et,ed,ew,ecw))
    if cid == "MISMATCH":
        check("cropped-length false 2x versus source 9/8", row["countRatio"] == ratio(9,8) and row["originalLengthRatio"] == ratio(2,1) and row["correction"]["lengthRatio"] == ratio(9,8) and "10 more tiles" in correction["text"] and "not completed counts" in correction["debrief"])
    if cid == "TRUE_CONTROL":
        check("true control has no correction", correction is None and row["originalStatementVerdict"] is True and row["countRatio"] == row["originalLengthRatio"] == ratio(2,1))
    if cid == "ZERO_CONTROL":
        check("zero denominator does not obscure false equality", row["originalStatementVerdict"] is False and row["countRatio"] == row["originalLengthRatio"] == ratio(1,0) and row["originalSvgWidths"][0] == 0 and "undefined" in correction["text"] and "neither is a finite" in correction["debrief"])
    for version, display in (("original",original),("corrected",correction)):
        if display is None:
            continue
        d_lo = display["scale"]["lowerBound"]
        d_w = [int(Fraction(display["scale"]["plotWidth"]*(x-d_lo),display["scale"]["upperBound"]-d_lo)) for x in (a,b)]
        for rep in fixture["representations"]:
            configs.append({"caseId":cid,"version":version,"representation":rep,"sourceCounts":counts,"lowerBound":d_lo,"svgWidths":d_w,"statementText":original["statement"]["text"] if version == "original" else correction["text"],"displayedStatementTrue":row["originalStatementVerdict"] if version == "original" else True,"originalCheckVerdict":row["originalStatementVerdict"]})

check("five valid versions times two representations", len(configs) == oracle["displayConfigurationCount"] == 10 and configs == oracle["displayConfigurations"])
check("five same-information pairs", oracle["informationParityPairs"] == [{"caseId":c["caseId"],"version":c["version"],"representations":["visual","plain"]} for c in configs[::2]] and all({k:v for k,v in configs[i].items() if k != "representation"} == {k:v for k,v in configs[i+1].items() if k != "representation"} for i in range(0,len(configs),2)))
check("no corrected true-control combination", not any(x["caseId"] == "TRUE_CONTROL" and x["version"] == "corrected" for x in configs) and oracle["negativeControls"]["correctedTrueControlValid"] is False)
check("three checks, two corrections, one reuse planned", oracle["primaryBrowserRecords"] == {"checkRecords":3,"correctionRecords":2,"deliberateCheckReuses":1,"caseOrder":fixture["caseOrder"],"sourceMutations":0,"originalDisplayMutations":0,"humanResponses":0})
check("invalid and duplicate action controls", oracle["negativeControls"] == {"beforeCheckCorrectionAllowed":False,"trueControlCorrectionAllowed":False,"zeroCountRatioUndefined":True,"zeroStatementStillFalse":True,"wrongBindingMutationAllowed":False,"correctedTrueControlValid":False,"duplicateCheckCreatesRecord":False})
check("local/canonical provenance and reload contract", fixture["localRecordRules"]["localProvenance"] == "host_controlled_software" and fixture["localRecordRules"]["canonicalProvenance"] == fixture["canonicalRecords"]["provenance"] == "scripted_demonstration" and fixture["localRecordRules"]["reopenPreservesLocalHistory"] is True and fixture["localRecordRules"]["reloadPreservesLocalHistory"] is False and fixture["localRecordRules"]["reloadChangesDocumentUuid"] is True)
check("canonical registry is explicitly non-performed at zero", fixture["canonicalRecords"]["publicPrecomputationAllowed"] is True and "not raw registry presence" in fixture["canonicalRecords"]["performedStateDeterminedBy"] and fixture["initialState"]["activeCheck"] is False and fixture["initialState"]["activeCorrection"] is False)

events = fixture["savedTour"]["events"]
check("seven exact ordered scheduled events", events == oracle["scheduledEvents"] and len(events) == fixture["savedTour"]["eventCount"] == oracle["scheduledEventCount"] == 7 and [(e["atSeconds"],e["type"],e["origin"]) for e in events] == [(4,"source-inspect","replay"),(8,"statement-check","replay"),(12,"correction-apply","replay"),(16,"representation-select","replay"),(20,"version-select","replay"),(24,"canonical-restore","replay"),(24,"tour-stop","automatic")])
check("checkpoints and natural stop", fixture["savedTour"]["checkpointSeconds"] == [0,4,8,12,16,20,24] and fixture["savedTour"]["durationSeconds"] == 24 and fixture["savedTour"]["naturalStopReason"] == oracle["naturalStopReason"] == "end-of-sequence" and oracle["checkpointCount"] == 7)
state = {"caseId":"MISMATCH","paused":True,"representation":"visual","version":"original","sourceOpen":False,"recordsOpen":False,"activeCheck":False,"activeCorrection":False,"originalRetainedCorrectionMarker":False,"localRecordsInSelectedCanonicalDisplay":0}
checkpoint_rows=[]
for second in fixture["savedTour"]["checkpointSeconds"]:
    for event in (e for e in events if e["atSeconds"] == second):
        kind=event["type"]
        if kind == "source-inspect": state["sourceOpen"] = event["payload"]["open"]
        elif kind == "statement-check": state["activeCheck"] = True
        elif kind == "correction-apply": state["activeCorrection"] = True; state["version"] = "corrected"
        elif kind == "representation-select": state["representation"] = event["payload"]["representation"]
        elif kind == "version-select": state["version"] = event["payload"]["version"]; state["originalRetainedCorrectionMarker"] = state["version"] == "original" and state["activeCorrection"]
        elif kind == "canonical-restore": state = {**state,"representation":"visual","version":"original","sourceOpen":False,"recordsOpen":False,"activeCheck":False,"activeCorrection":False,"originalRetainedCorrectionMarker":False}
    checkpoint_rows.append({"seconds":second,**state})
for derived_cp, author_cp in zip(checkpoint_rows,oracle["checkpointExpectations"]):
    check(f"checkpoint {derived_cp['seconds']} exact state", derived_cp == author_cp, {"derived":derived_cp,"authored":author_cp})
check("18 paused comparisons are planned not observed", oracle["plannedPausedComparisons"] == 18 and "18 comparisons total" in record)
check("first-use browser workflow precedes replay baseline", "Critical first use on candidate001, before polish" in record and "Canonical baseline after first use" in record)
check("same evidence access and information parity declared", "one identical action away in both" in charter and "information hashes" in model and "same enabled control" in model and "The source panel contains identical complete fixture rows" in model)
check("correction preservation and own export event declared", "referencing that check" in charter and "Source, original display and prior records remain byte-equal" in model and "Each export appends its own event" in model)
check("atomic semantic publication and metadata remeasure declared", "Clone semantic state once" in model and "Keep semantic generation separate from layout/metadata revision" in model and "do not reject a legitimate semantic result" in model)
check("actual browser acquisition and limited claims declared", "single DOM read" in record and "40,000 characters" in record and "Zero human participants" in charter and "does not establish" in charter)
check("future gate remains unapproved", "Gate14 — Geometry ablations" in record and "require their own next decisions" in record and "Gate13 is the currently approved execution" in ledger)

check("program ledger input hash pinned", ledger_hash == "167e547151eb8685e616da41b6a5bcdb102c392b1aca3c7a215a17aea6332c18")
check("ledger correctly maps archive 07 four-snapshot dependency", all(s in ledger for s in ("Eighteen unique synthetic event cards","four six-card packets","Peer-blind initial snapshots","Four-snapshot feasibility bench","full-union single solver","Not run")))
check("ledger correctly maps archive 03 P0–P5 and B/C", all(s in ledger for s in ("P0 constructs","P1a instrument","P1b semantic","P2a cognitive interviews","P2b feasibility","P3 B/C collection","P4 mechanisms","P5 cross-scale","Not ready / no collection")))
check("ledger correctly maps archive 05 sequencing and limits", "P1b semantic and measurement acceptance corpus" in ledger and "Gate10 remains negative" in ledger and "Not delivered" in ledger and "not the updated full-program package" in ledger)
check("separate next full-program and Gate14 decisions", "separate from the next Looking Glass Gate14 decision" in ledger and "neither approval should silently substitute" in ledger)

errors = [x for x in checks if not x["pass"]]
result = {"schema":"gate13-independent-prespec-derivation-v1","status":"PASS" if not errors else "BLOCKED","authoredInputFiles":files,"programLedger":{"path":ledger_path,"bytes":len(read(ledger_path)),"sha256":ledger_hash},"sourceReview":{"path":"research/gate-13/source-review.md","sha256":digest(read("research/gate-13/source-review.md"))},"derivedCaseResults":derived,"derivedDisplayConfigurations":configs,"derivedCheckpointExpectations":checkpoint_rows,"scheduledEventCount":len(events),"plannedBrowserComparisonsNotObserved":oracle["plannedPausedComparisons"],"checkCount":len(checks),"passCount":len(checks)-len(errors),"errors":errors,"checks":checks,"implementationImports":[],"browserObservations":0,"humanParticipants":0}
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n")
print(json.dumps({k:result[k] for k in ("status","checkCount","passCount","errors","scheduledEventCount")},indent=2,ensure_ascii=False))
