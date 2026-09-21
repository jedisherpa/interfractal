#!/usr/bin/env python3
"""Read-only exact route audit of the host's immutable Gate 11 server."""
import hashlib
import http.client
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "receiver-summary/builds/g11-4a38606632d77897a06e"
RUN = ROOT / "receiver-summary/runs/G11-RECEIVER-001"
AUDIT = ROOT / "audit/gate-11"


def request(method, path):
    connection = http.client.HTTPConnection("127.0.0.1", 44004, timeout=5)
    connection.request(method, path)
    response = connection.getresponse()
    status = response.status
    headers = dict(response.getheaders())
    body = response.read()
    connection.close()
    return status, headers, body


routes = {"/": BUILD / "index.html", "/index.html": BUILD / "index.html"}
for name in ("app.mjs", "model.mjs", "receiver.mjs", "style.css", "fixture.json", "build.json"):
    routes["/" + name] = BUILD / name
for name in ("run.json", "initial-state.json", "events.jsonl", "checkpoints.json"):
    routes["/run/" + name] = RUN / name

checks = []
probes = []


def check(name, pass_, **meta):
    checks.append({"name": name, "pass": bool(pass_), **meta})


for route, file in routes.items():
    expected = file.read_bytes()
    status, headers, body = request("GET", route)
    check("GET " + route, status == 200 and body == expected and headers.get("Content-Length") == str(len(expected)) and headers.get("X-Content-Type-Options") == "nosniff", status=status, sha256=hashlib.sha256(body).hexdigest())
    status, headers, body = request("HEAD", route)
    check("HEAD " + route, status == 200 and body == b"" and headers.get("Content-Length") == str(len(expected)), status=status)

denied = ["/docs/gate-11/fixture.json", "/audit/gate-11/prespec-review.json", "/run/computational-results.json", "/run/run-manifest.json", "/source-manifest.json", "/server.mjs", "/review/results.html", "/review/unknown.html", "/missing", "/run/../run.json", "/%2e%2e/run.json", "/%252e%252e/run.json", "//fixture.json", "/fixture.json?x=1", "/fixture.json#x", "/fixture\\.json"]
for route in denied:
    status, headers, body = request("GET", route)
    check("deny " + route, status == 404, status=status)
for method in ("POST", "PUT", "DELETE", "OPTIONS"):
    status, headers, body = request(method, "/")
    check("reject " + method, status == 405, status=status)

result = {"schema": "gate11-candidate001-independent-http-v1", "status": "PASS" if all(x["pass"] for x in checks) else "FAIL", "checkCount": len(checks), "passCount": sum(x["pass"] for x in checks), "readOnlyHost": "http://127.0.0.1:44004", "routeChecks": checks}
(AUDIT / "candidate-001-http-check.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({key: value for key, value in result.items() if key != "routeChecks"}, indent=2))
if result["status"] != "PASS":
    raise SystemExit(1)
