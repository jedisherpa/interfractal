#!/usr/bin/env python3
"""Read-only verification of the recovery revision and its preserved predecessor."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent.parent
PREVIOUS = HERE.parent / "materials-v1"
# The manifest itself is pinned separately from the files it enumerates.
EXPECTED_PREVIOUS = "b7152720317987bcfa027e98104cb2f1695b0fc3ffd29a1272293e919c8cea5c"
failures = []


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


prior = subprocess.run([sys.executable, str(PREVIOUS / "verify-frozen.py")],
                       capture_output=True, text=True, check=False)
if prior.returncode != 0:
    failures.append({"scope": "previous freeze", "stdout": prior.stdout, "stderr": prior.stderr})
if digest(PREVIOUS / "FREEZE_MANIFEST.json") != EXPECTED_PREVIOUS:
    failures.append({"scope": "previous manifest", "reason": "digest changed"})

manifest_path = HERE / "FREEZE_MANIFEST.json"
rows = []
if not manifest_path.is_file():
    failures.append({"scope": "recovery freeze", "reason": "manifest missing"})
else:
    rows = json.loads(manifest_path.read_text())["files"]
seen = set()
for row in rows:
    relative = row["path"]
    raw_target = PROJECT / relative
    if row.get("type") == "symlink":
        if relative in seen or not raw_target.parent.resolve().is_relative_to(HERE):
            failures.append({"path": relative, "reason": "duplicate or outside recovery revision"})
            continue
        seen.add(relative)
        if not raw_target.is_symlink():
            failures.append({"path": relative, "reason": "expected retained test symlink"})
            continue
        link_text = str(raw_target.readlink())
        link_bytes = link_text.encode()
        if (link_text != row["target"] or len(link_bytes) != row["bytes"]
                or hashlib.sha256(link_bytes).hexdigest() != row["sha256"]):
            failures.append({"path": relative, "reason": "symlink text changed"})
        continue
    target = (PROJECT / relative).resolve()
    if relative in seen or not target.is_relative_to(HERE):
        failures.append({"path": relative, "reason": "duplicate or outside recovery revision"})
        continue
    seen.add(relative)
    if not target.is_file() or (PROJECT / relative).is_symlink():
        failures.append({"path": relative, "reason": "missing or not regular file"})
    elif digest(target) != row["sha256"] or target.stat().st_size != row["bytes"]:
        failures.append({"path": relative, "reason": "hash or size mismatch"})
actual = {str(path.relative_to(PROJECT)) for path in HERE.rglob("*")
          if (path.is_file() or path.is_symlink()) and path != manifest_path}
if actual != seen:
    failures.append({"scope": "recovery inventory", "extra": sorted(actual - seen),
                     "missing": sorted(seen - actual)})

try:
    previous_result = json.loads(prior.stdout)
except json.JSONDecodeError:
    previous_result = {"rawOutput": prior.stdout}
print(json.dumps({"previous": previous_result, "recoveryEntries": len(rows),
                  "recoveryManifestSha256": digest(manifest_path) if manifest_path.is_file() else None,
                  "failures": failures, "pass": not failures,
                  "scope": "Byte preservation only; no research execution or human approval implied."}, indent=2))
sys.exit(1 if failures else 0)
