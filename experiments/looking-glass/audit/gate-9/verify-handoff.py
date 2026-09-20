#!/usr/bin/env python3
"""Read-only final Gate 9 packet, local route, replay, and presentation check."""

import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import urlopen

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
E = ROOT / "evidence/gate-9"
A = ROOT / "audit/gate-9"
run = json.loads((E / "run-evidence.json").read_text())
review = json.loads((E / "presentation-review.json").read_text())
captures = json.loads((E / "capture-index.json").read_text())
final = json.loads((A / "final-checks.json").read_text())
errors = []


def check(label, okay):
    if not okay:
        errors.append(label)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def fetch(url):
    try:
        with urlopen(url, timeout=4) as response:
            return response.status, response.read(), response.headers.get("Content-Type", "")
    except Exception as error:
        return 0, str(error).encode(), ""


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "img":
            self.images.append(attributes)
        if tag == "a":
            self.links.append(attributes.get("href"))


report = (E / "results.html").read_bytes()
packet = (E / "GATE_9_PACKET.md").read_bytes()
page = Page()
page.feed(report.decode())
check("run status and identity", (run["status"], run["runId"], run["buildId"], run["sourceSha256"]) == ("PASS_WITH_QUALIFICATION", "G9-MATCHED-003", "g9-15c3bf973fe0c6cd", final["sourceSha256"]))
check("core pin and qualification", run["closedCoreManifestSha256"] == final["closedCoreManifestSha256"] and run["qualification"]["observationIndices"] == [219, 236, 283] and run["qualification"]["mechanismProven"] is False)
check("counts and statuses", run["counts"] == final["counts"] and run["componentStatuses"] == final["componentStatuses"])
check("no human result or Gate 10 execution", run["humanParticipants"] == 0 and run["humanOutcomes"] == "untested" and run["nextGate"]["approved"] is False and run["nextGate"]["executed"] is False)
check("report lead and explicit qualification", all(text in report for text in (b"Independent audit", b"pass with qualification", b"Three live inspector mismatches remain", b"219, 236 and 283", b"24 designated paused checkpoints", b"Zero human participants")))
check("packet bounded conclusion", all(text in packet for text in (b"PASS_WITH_QUALIFICATION", b"219, 236 and 283", b"zero human participants", b"unapproved and unrun")))
check("report restart/packet/evidence links", all(link in page.links for link in ("/", "/review/packet.md", "/review/audit.md", "/review/run-evidence.json", "#next")))
check("report has four primary image embeds", len(page.images) == 4 and all(image.get("loading") == "lazy" and image.get("width") == "1280" and image.get("height") == "720" for image in page.images))

pin_results = []
for pin in run["pins"]:
    path = ROOT / pin["path"]
    content = path.read_bytes() if path.is_file() else b""
    okay = path.is_file() and len(content) == pin["bytes"] and sha(content) == pin["sha256"]
    pin_results.append({"path": pin["path"], "pass": okay})
    check(f"run-evidence pin {pin['path']}", okay)
check("14 noncyclic pins", len(pin_results) == 14 and len({p["path"] for p in pin_results}) == 14)
check("audit pin identities", run["independentAuditSha256"] == sha((A / "AUDIT.md").read_bytes()) and run["independentFinalChecksSha256"] == sha((A / "final-checks.json").read_bytes()))

original_by_path = {item["path"]: item for item in captures}
check("13 original capture entries", len(captures) == len(run["originalCaptures"]) == 13)
for item in run["originalCaptures"]:
    path = item["path"]
    reference = original_by_path.get(path)
    content = (ROOT / path).read_bytes() if (ROOT / path).is_file() else b""
    check(f"original image {path}", reference is not None and item["sha256"] == reference["sha256"] == sha(content) and item["bytes"] == reference["bytes"] == len(content))
four = ["006-t01-completed-choice-full.jpg", "010-t01-watch-full-manual-review.jpg", "005-t01-static-sheet.jpg", "007-t04-nonseparating-static.jpg"]
check("four embedded originals order", [image.get("src", "").split("/")[-1] for image in page.images] == four)

presentation = []
for capture in review["captures"]:
    path = ROOT / capture["path"]
    content = path.read_bytes() if path.is_file() else b""
    dimensions = Image.open(path).size if path.is_file() else None
    okay = sha(content) == capture["sha256"] and dimensions == (1280, 720) and "presentation-" in path.name and capture["path"] not in original_by_path
    presentation.append({"path": capture["path"], "sha256": sha(content), "dimensions": dimensions, "pass": okay})
    check(f"separate presentation capture {capture['path']}", okay)
check("four presentation-only captures", len(presentation) == 4)
check("six actual presentation observations", len(review["observations"]) == 6 and len(review["actions"]) == 5 and not review["console"])
lead, first, sheet, replay, returned, next_decision = review["observations"]
check("lead qualification visible", "Three live inspector mismatches remain" in lead["dom"] and "pass with qualification" in lead["dom"])
check("all embedded originals loaded after scroll", len(sheet["layout"]["images"]) == 4 and all(image["complete"] and (image["naturalWidth"], image["naturalHeight"]) == (1280, 720) for image in sheet["layout"]["images"]))
check("presentation layout no horizontal overflow", all(o.get("layout", {}).get("scrollWidth") == 1280 for o in (lead, first, sheet)))
check("actual paused report-to-replay handoff", all(token in replay["dom"] for token in ("G9-MATCHED-003", "g9-15c3bf973fe0c6cd", '\\"eventCount\\": 0', '\\"tourPaused\\": true', '\\"phase\\": \\"draft\\"')))
check("return and next decision", "pass with qualification" in returned["dom"] and "Proposed, unapproved and unrun" in next_decision["dom"])

base = "http://127.0.0.1:44002"
local_routes = {
    "/review/results.html": report,
    "/review/packet.md": packet,
    "/review/run-evidence.json": (E / "run-evidence.json").read_bytes(),
    "/review/audit.md": (A / "AUDIT.md").read_bytes(),
}
for item in captures:
    local_routes["/review/screenshots/" + Path(item["path"]).name] = (ROOT / item["path"]).read_bytes()
served = []
for route, expected in local_routes.items():
    status, content, content_type = fetch(base + route)
    okay = status == 200 and content == expected
    served.append({"route": route, "status": status, "bytes": len(content), "sha256": sha(content), "contentType": content_type, "pass": okay})
    check(f"served route exact bytes {route}", okay)
status, live_run, _ = fetch(base + "/api/run")
check("live Gate 9 immutable run route", status == 200 and b"G9-MATCHED-003" in live_run and b"g9-15c3bf973fe0c6cd" in live_run)

replays = []
entries = run["replayCollection"]["entries"]
check("ten ordered replay identities", [entry["gate"] for entry in entries] == list(range(10)))
html_links = [link for link in page.links if link and link.startswith("http://127.0.0.1:")]
check("ten report replay links", html_links == [entry["url"] for entry in entries])
for entry in entries:
    root_status, root_body, _ = fetch(entry["url"])
    results_status, results_body, _ = fetch(entry["resultsUrl"])
    packet_exists = (ROOT / entry["packetPath"]).is_file()
    restart_target = Path(entry["restartCommand"].split()[-1])
    okay = root_status == results_status == 200 and entry["runId"].encode() in results_body and entry["buildId"].encode() in results_body and packet_exists and restart_target.is_file()
    replays.append({"gate": entry["gate"], "url": entry["url"], "runId": entry["runId"], "buildId": entry["buildId"], "rootStatus": root_status, "resultsStatus": results_status, "resultsBytes": len(results_body), "packetExists": packet_exists, "restartTargetExists": restart_target.is_file(), "identityInResults": entry["runId"].encode() in results_body and entry["buildId"].encode() in results_body, "pass": okay})
    check(f"replay {entry['gate']} readiness and identity", okay)

result = {"schema": "gate9-handoff-independent-addendum-v1", "status": "PASS" if not errors else "FAIL", "qualifiedSoftwareVerdictUnchanged": final["status"], "scope": "Read-only post-core packet and supported-browser presentation handoff; no extension to the closed instrument trial", "packetSha256": sha(packet), "resultsHtmlSha256": sha(report), "runEvidenceSha256": sha((E / "run-evidence.json").read_bytes()), "presentationReviewSha256": sha((E / "presentation-review.json").read_bytes()), "closedCoreManifestSha256": final["closedCoreManifestSha256"], "pinCount": len(pin_results), "pins": pin_results, "servedRouteCount": len(served), "servedRoutes": served, "presentationObservationCount": len(review["observations"]), "presentationCaptureCount": len(presentation), "presentationCaptures": presentation, "replayCount": len(replays), "replays": replays, "errors": errors}
(A / "handoff-addendum.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({key: value for key, value in result.items() if key not in ("pins", "servedRoutes", "presentationCaptures", "replays")}, indent=2))
