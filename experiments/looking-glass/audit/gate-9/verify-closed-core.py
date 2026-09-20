#!/usr/bin/env python3
"""Verify closed Gate 9 browser core files, captures, and acquisition joins."""

import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "evidence/gate-9"
MANIFEST_PATH = EVIDENCE / "CORE_TRIAL_CLOSED.json"
MANIFEST_SHA = "2bc665deb66351e70ccd13fc57056365cecb75a2f2e892205fc56f79544dd6d0"
errors = []


def check(label, value):
    if not value:
        errors.append(label)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


manifest_bytes = MANIFEST_PATH.read_bytes()
manifest = json.loads(manifest_bytes)
check("manifest SHA", digest(manifest_bytes) == MANIFEST_SHA)
check("manifest identity", (manifest["runId"], manifest["buildId"]) == ("G9-MATCHED-003", "g9-15c3bf973fe0c6cd"))
check("pinned file count", len(manifest["files"]) == 32)
check("unique pinned paths", len({x["path"] for x in manifest["files"]}) == len(manifest["files"]))
for item in manifest["files"]:
    file = (ROOT / item["path"]).resolve()
    check(f"pin path contained {item['path']}", file.is_relative_to(ROOT))
    try:
        data = file.read_bytes()
    except OSError:
        errors.append(f"missing pinned {item['path']}")
        continue
    check(f"pin digest {item['path']}", digest(data) == item["sha256"])
    check(f"pin size {item['path']}", len(data) == item["bytes"])
    check(f"pin read-only {item['path']}", os.stat(file).st_mode & 0o222 == 0)

observations = json.loads((EVIDENCE / "browser-observations.json").read_text())
actions = json.loads((EVIDENCE / "action-trace.json").read_text())
captures = json.loads((EVIDENCE / "capture-index.json").read_text())
dimensions = json.loads((EVIDENCE / "capture-dimensions.json").read_text())
sessions = json.loads((EVIDENCE / "event-session-index.json").read_text())
nonactions = json.loads((EVIDENCE / "browser-non-actions.json").read_text())
historical = json.loads((EVIDENCE / "historical-browser-review.json").read_text())
console = json.loads((EVIDENCE / "console-review.json").read_text())
check("observation count", len(observations) == 307)
check("observation indices", [x["index"] for x in observations] == list(range(307)))
check("action call count", len(actions) == 135)
check("action indices", [x["index"] for x in actions] == list(range(135)))
check("action success count", sum(bool(x.get("success")) for x in actions) == 134)
failed = [x for x in actions if not x.get("success")]
check("one preserved failed disabled export", len(failed) == 1 and "Export completed route" in failed[0]["name"])
for action in actions:
    for key in ("beforeObservation", "afterObservation"):
        if key in action:
            check(f"action {action['index']} {key} reference", 0 <= action[key] < len(observations))
    if "beforeObservation" in action and "afterObservation" in action:
        check(f"action {action['index']} bracketing", action["beforeObservation"] <= action["afterObservation"])
check("nonaction count", len(nonactions) == 2)
for item in nonactions:
    check(f"nonaction {item['kind']} reference", 0 <= item["observation"] < len(observations))
    check(f"nonaction {item['kind']} actually disabled", all(x["disabled"] for x in item["controls"]))
check("capture count", len(captures) == len(dimensions) == 13)
dimension_by_path = {x["path"]: x for x in dimensions}
for i, capture in enumerate(captures):
    path = capture["path"]
    image_path = ROOT / path
    check(f"capture {i} index", capture["index"] == i)
    check(f"capture {i} dimension record", path in dimension_by_path)
    check(f"capture {i} observation brackets", 0 <= capture["beforeObservation"] <= capture["afterObservation"] < len(observations))
    data = image_path.read_bytes()
    check(f"capture {i} digest", digest(data) == capture["sha256"])
    check(f"capture {i} byte count", len(data) == capture["bytes"])
    with Image.open(image_path) as image:
        check(f"capture {i} JPEG format", image.format == "JPEG")
        actual_size = image.size
    d = dimension_by_path[path]
    check(f"capture {i} dimensions", actual_size == (d["width"], d["height"]))
    for key, ref in (("beforeViewport", capture["beforeObservation"]), ("afterViewport", capture["afterObservation"])):
        viewport = observations[ref]["viewport"]
        check(f"capture {i} {key} CSS size", (d[key]["width"], d[key]["height"]) == (viewport["width"], viewport["height"]))
        check(f"capture {i} {key} image size", actual_size == (viewport["width"], viewport["height"]))
    check(f"capture {i} recorded viewport match", d["matchesBeforeCssViewport"] is True)
    check(f"capture {i} time bracket", time(observations[capture["beforeObservation"]]["observedAtUtc"]) <= time(capture["capturedAtUtc"]) <= time(observations[capture["afterObservation"]]["observedAtUtc"]))

check("session count", len(sessions) == 3)
event_total = 0
for entry in sessions:
    session = json.loads((ROOT / entry["path"]).read_text())
    events = session["events"]
    event_total += len(events)
    check(f"session {entry['sessionId']} count", len(events) == entry["eventCount"])
    check(f"session {entry['sessionId']} identity", all(e["sessionId"] == entry["sessionId"] for e in events))
    check(f"session {entry['sessionId']} observation", 0 <= entry["observation"] < len(observations))
check("semantic event total", event_total == 151)
check("console errors absent", console["logs"] == [])
historical_text = next((x["text"] for x in historical["observation"]["pres"] if x["id"] == "state-json"), None)
try:
    historical_state = json.loads(historical_text)
except (TypeError, ValueError):
    historical_state = {}
check("historical visible Gate8 identity", (historical_state.get("runId"), historical_state.get("buildId")) == ("G8-AMBIGUITY-001", "g8-f5c5ee62889da529"))
check("historical paused start", historical_state.get("paused") is True and historical_state.get("cursorSeconds") == 0)
check("historical action bracket", 0 <= historical["beforeObservation"] < len(observations))

out = {"schema": "gate9-closed-core-audit-v1", "status": "PASS" if not errors else "FAIL", "manifestSha256": digest(manifest_bytes), "pinnedFileCount": len(manifest["files"]), "observationCount": len(observations), "actionCalls": len(actions), "successfulActions": len(actions) - len(failed), "failedActions": len(failed), "originalCaptureCount": len(captures), "eventSessionCount": len(sessions), "semanticEventCount": event_total, "historicalVisibleRun": historical_state.get("runId"), "errors": errors}
(ROOT / "audit/gate-9/core-audit.json").write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps(out, indent=2))
