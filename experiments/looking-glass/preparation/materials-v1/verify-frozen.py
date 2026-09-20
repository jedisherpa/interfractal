#!/usr/bin/env python3
"""Read-only SHA-256 verification of this materials freeze and archived gates."""
import hashlib
import json
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent.parent
failures = []


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_manifest(path):
    manifest = json.loads(path.read_text())
    rows = manifest["files"]
    seen = set()
    for row in rows:
        relative = row["path"]
        target = (PROJECT / relative).resolve()
        if relative in seen or not target.is_relative_to(PROJECT):
            failures.append({"path": relative, "reason": "duplicate or outside project"})
            continue
        seen.add(relative)
        if not target.is_file():
            failures.append({"path": relative, "reason": "missing file"})
        elif digest(target) != row["sha256"] or (
            "bytes" in row and target.stat().st_size != row["bytes"]
        ):
            failures.append({"path": relative, "reason": "hash or size mismatch"})
    return len(rows)


history = json.loads((HERE / "evidence/historical-integrity-at-start.json").read_text())
historical_entries = 0
for row in history["manifests"]:
    path = PROJECT / row["path"]
    if digest(path) != row["sha256"]:
        failures.append({"path": row["path"], "reason": "historical manifest changed"})
    historical_entries += verify_manifest(path)

current = HERE / "FREEZE_MANIFEST.json"
if not current.is_file():
    failures.append({"path": str(current.relative_to(PROJECT)), "reason": "materials freeze not yet present"})
    current_entries = 0
else:
    current_entries = verify_manifest(current)

print(json.dumps({
    "historicalEntries": historical_entries,
    "materialsEntries": current_entries,
    "materialsManifestSha256": digest(current) if current.is_file() else None,
    "failures": failures,
    "pass": not failures,
    "scope": "Byte preservation only; no research execution or human approval implied."
}, indent=2))
sys.exit(1 if failures else 0)
