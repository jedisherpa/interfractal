#!/usr/bin/env python3
"""Read-only HTTP allowlist audit of immutable Gate 9 candidate 003."""

import hashlib
import http.client
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "matched-observation/builds/g9-15c3bf973fe0c6cd"
RUN = ROOT / "matched-observation/runs/G9-MATCHED-003"
PORT = 44002
BASE = "127.0.0.1"
RESULTS = []
ERRORS = []


def request(method, target):
    connection = http.client.HTTPConnection(BASE, PORT, timeout=8)
    connection.request(method, target)
    response = connection.getresponse()
    body = response.read()
    headers = dict(response.getheaders())
    status = response.status
    connection.close()
    return status, body, headers


def check(method, target, status_expected, file=None):
    status, body, headers = request(method, target)
    expected_bytes = file.read_bytes() if file else None
    valid = status == status_expected
    if valid and expected_bytes is not None and method == "GET":
        valid = body == expected_bytes
    if valid and method == "HEAD":
        valid = len(body) == 0
    if valid and status == 200:
        valid = headers.get("x-content-type-options") == "nosniff" and headers.get("cache-control") == "no-store"
    result = {"method": method, "target": target, "status": status, "expectedStatus": status_expected, "bodySha256": hashlib.sha256(body).hexdigest() if body else None, "bytes": len(body), "matchedExpectedBytes": body == expected_bytes if expected_bytes is not None and method == "GET" else None, "pass": valid}
    RESULTS.append(result)
    if not valid:
        ERRORS.append(result)


served = {
    "/": BUILD / "index.html",
    "/index.html": BUILD / "index.html",
    "/style.css": BUILD / "style.css",
    "/app.mjs": BUILD / "app.mjs",
    "/core.mjs": BUILD / "core.mjs",
    "/engine.mjs": BUILD / "engine.mjs",
    "/fixture.json": BUILD / "fixture.json",
    "/metadata.json": BUILD / "metadata.json",
    "/api/build": BUILD / "build.json",
    "/api/run": RUN / "run.json",
    "/api/initial-state": RUN / "initial-state.json",
    "/api/checkpoints": RUN / "checkpoints.json",
    "/api/events": RUN / "events.jsonl",
    "/api/computation": RUN / "computational-results.json",
    "/review/source-review.md": ROOT / "research/gate-9/source-review.md",
}
for target, file in served.items():
    check("GET", target, 200, file)
check("HEAD", "/", 200, served["/"])
check("HEAD", "/api/build", 200, served["/api/build"])
check("GET", "/fixture.json?audit=read-only", 200, served["/fixture.json"])

not_served = [
    "/independent-predictions.json",
    "/PRESPEC_FREEZE.json",
    "/build.json",
    "/test.mjs",
    "/README.md",
    "/docs/gate-9/fixture.json",
    "/audit/gate-9/prepackage-final-audit.json",
    "/matched-observation/builds/g9-15c3bf973fe0c6cd/server.mjs",
    "/../docs/gate-9/fixture.json",
    "/%2e%2e/docs/gate-9/fixture.json",
    "/review/screenshots/../../docs/gate-9/fixture.json",
    "/review/screenshots/%2e%2e%2f%2e%2e%2fdocs%2fgate-9%2ffixture.json",
    "/review/screenshots/nonexistent-audit-image.jpg",
    "/review/screenshots/../nonexistent-audit-image.jpg",
]
for target in not_served:
    check("GET", target, 404)
check("POST", "/", 404)
check("POST", "/api/run", 404)

review_routes = {
    "/review/results.html": ROOT / "evidence/gate-9/results.html",
    "/review/packet.md": ROOT / "evidence/gate-9/GATE_9_PACKET.md",
    "/review/audit.md": ROOT / "audit/gate-9/AUDIT.md",
    "/review/run-evidence.json": ROOT / "evidence/gate-9/run-evidence.json",
}
for target, file in review_routes.items():
    check("GET", target, 200 if file.exists() else 404, file if file.exists() else None)

out = {"schema": "gate9-route-audit-v1", "status": "PASS" if not ERRORS else "FAIL", "baseUrl": f"http://{BASE}:{PORT}/", "checks": len(RESULTS), "allowedContentRoutes": len(served), "results": RESULTS, "errors": ERRORS, "browserInteraction": False}
(ROOT / "audit/gate-9/route-audit.json").write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps({"status": out["status"], "checks": out["checks"], "errors": ERRORS, "reviewRoutes": [r for r in RESULTS if r["target"] in review_routes]}, indent=2))
