#!/usr/bin/env python3
"""Audit actual browser semantic events and the uninterrupted saved tour."""

import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
E = ROOT / "evidence/gate-9"
FIXTURE = json.loads((ROOT / "docs/gate-9/fixture.json").read_text())
sessions_index = json.loads((E / "event-session-index.json").read_text())
observed = [json.loads(line) for line in (E / "observed-activity.jsonl").read_text().splitlines() if line]
actions = json.loads((E / "action-trace.json").read_text())
observations = json.loads((E / "browser-observations.json").read_text())
exports = json.loads((E / "exported-routes.json").read_text())
errors = []
sessions = []


def check(label, okay):
    if not okay:
        errors.append(label)


def t(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


for entry in sessions_index:
    bundle = json.loads((ROOT / entry["path"]).read_text())
    events = bundle["events"]
    sessions.append(events)
    check(f"session {entry['sessionId']} event count", len(events) == entry["eventCount"])
    check(f"session {entry['sessionId']} sequence", [e["sequence"] for e in events] == list(range(1, len(events) + 1)))
    check(f"session {entry['sessionId']} IDs", all(e["eventId"] == f"{entry['sessionId']}:{e['sequence']}" and e["sessionId"] == entry["sessionId"] for e in events))
    check(f"session {entry['sessionId']} run/build", all((e["runId"], e["buildId"]) == ("G9-MATCHED-003", "g9-15c3bf973fe0c6cd") for e in events))
    check(f"session {entry['sessionId']} UTC order", all(t(a["atUtc"]) <= t(b["atUtc"]) for a, b in zip(events, events[1:])))
    for a, b in zip(events, events[1:]):
        if a["tourSeconds"] == b["tourSeconds"] and a["localSeconds"] == b["localSeconds"]:
            check(f"same-time fingerprint chain {entry['sessionId']} {a['sequence']}->{b['sequence']}", a["afterFingerprint"] == b["beforeFingerprint"])
    for event in events:
        check(f"event result {event['eventId']}", event["result"] == "accepted")
        if event["origin"] == "user-control":
            check(f"actual control actor {event['eventId']}", event["actor"] == "unattributed_local" and event["provenance"] == "local_control")
        if event["origin"] == "replay":
            check(f"replay actor {event['eventId']}", event["actor"] == "scripted_demonstration" and event["provenance"] == "scripted_demonstration")
        if event["type"] == "trace-seal":
            prior = events[event["sequence"] - 2]
            check(f"separate choice/seal {event['eventId']}", prior["type"] == "choose-query" and prior["result"] == "accepted" and prior["afterFingerprint"] == event["beforeFingerprint"] and event["intended"].get("reason") == "choice-budget-complete")
        if event["type"] == "presentation-stop":
            check(f"natural presentation reason {event['eventId']}", event["origin"] == "automatic" and event["intended"] == {"reason": "end-of-presentation", "localSeconds": 6} and event["localSeconds"] == 6)
        if event["type"] == "tour-stop":
            check(f"natural tour reason {event['eventId']}", event["origin"] == "automatic" and event["intended"].get("reason") == "end-of-sequence" and event["tourSeconds"] == 24)
        if event["type"] == "finish-sheet-review":
            check(f"manual sheet reason {event['eventId']}", event["intended"].get("reason") == "manual-review-complete")
        if event["type"] == "presentation-step" and event["intended"].get("nextLocalSeconds") == 6:
            check(f"manual watch reason {event['eventId']}", event["intended"].get("reason") == "manual-review-complete")

flattened = [event for session in sessions for event in session]
check("151 event rows", len(flattened) == len(observed) == 151)
check("observed activity exact session concatenation", observed == flattened)
check("three sessions", [len(x) for x in sessions] == [132, 18, 1])
failed_actions = [a for a in actions if not a.get("success")]
check("one failed disabled export", len(failed_actions) == 1 and failed_actions[0]["name"] == "Export completed route")
if failed_actions:
    action = failed_actions[0]
    before = observations[action["beforeObservation"]]["inspector"]
    after = observations[action["afterObservation"]]["inspector"]
    check("disabled export generated no event", before["eventCount"] == after["eventCount"] and before["state"]["phase"] == after["state"]["phase"] == "draft")

tour = sessions[1]
start = next(e for e in tour if e["type"] == "tour-play")
stop = next(e for e in tour if e["type"] == "tour-stop")
wall = (t(stop["atUtc"]) - t(start["atUtc"])).total_seconds()
check("24-second uninterrupted tour wall duration", 23.7 <= wall <= 24.3)
actual_schedule = [e for e in tour if start["sequence"] < e["sequence"] <= stop["sequence"]]
specified = [(b["seconds"], event) for b in FIXTURE["savedTour"]["boundaries"] for event in b.get("events", [])]
check("12 uninterrupted scheduled events", len(actual_schedule) == len(specified) == 12)
for index, (actual, (seconds, expected)) in enumerate(zip(actual_schedule, specified), 1):
    check(f"tour event {index} type/origin/time", (actual["type"], actual["origin"], actual["tourSeconds"]) == (expected["type"], expected["origin"], seconds))
    check(f"tour event {index} intended fields", all(actual["intended"].get(key) == value for key, value in expected.items() if key not in ("type", "origin")))
check("tour natural local stops", [e["tourSeconds"] for e in actual_schedule if e["type"] == "presentation-stop"] == [12, 20])
check("tour same-boundary choice/seal", actual_schedule[1]["afterFingerprint"] == actual_schedule[2]["beforeFingerprint"])
check("tour same-boundary watch select/play", actual_schedule[3]["afterFingerprint"] == actual_schedule[4]["beforeFingerprint"])
check("tour same-boundary static select/play", actual_schedule[8]["afterFingerprint"] == actual_schedule[9]["beforeFingerprint"])

main_events = {e["eventId"]: e for e in sessions[0]}
canonical_events = {e["eventId"]: e for e in [json.loads(line) for line in (ROOT / "matched-observation/runs/G9-MATCHED-003/events.jsonl").read_text().splitlines() if line]}
for row in exports:
    value = row["value"]
    envelope = value["envelope"]
    refs = envelope["acceptedChoiceEvents"]
    check(f"export {row['recipe']} {row['condition']} ref count", len(refs) == 2 and envelope["acceptedChoiceEventIds"] == [r["eventId"] for r in refs])
    check(f"export {row['recipe']} {row['condition']} choice inputs", envelope["choiceQueryIds"] == [r["intended"]["queryId"] for r in refs])
    for ref in refs:
        if ref.get("referenceOnly"):
            source = canonical_events.get(ref["eventId"])
            check(f"canonical restored reference {ref['eventId']}", source is not None and source["type"] == "choose-query" and source["intended"] == ref["intended"] and ref["canonicalRunEventSource"]["eventsRoute"] == "/api/events")
            check(f"restored ref not fabricated in actual session {ref['eventId']}", ref["eventId"] not in main_events)
        else:
            source = main_events.get(ref["eventId"])
            check(f"actual choice reference {ref['eventId']}", source == ref and source["type"] == "choose-query" and source["result"] == "accepted")

out = {"schema": "gate9-browser-event-audit-v1", "status": "PASS" if not errors else "FAIL", "sessionEventCounts": [len(x) for x in sessions], "semanticEventCount": len(flattened), "continuousTourScheduledEvents": len(actual_schedule), "continuousTourWallSeconds": wall, "naturalTourStopUtc": stop["atUtc"], "actualRouteExportsChecked": len(exports), "failedDisabledExportActions": len(failed_actions), "errors": errors}
(ROOT / "audit/gate-9/event-audit.json").write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps(out, indent=2))
