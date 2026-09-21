#!/usr/bin/env python3
"""Verify all Gate 0–8 frozen file entries without changing history."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
expected_counts = [61, 95, 120, 139, 141, 112, 204, 107, 102]
git_format = subprocess.check_output(["git", "rev-parse", "--show-object-format"], cwd=ROOT, text=True).strip()
tree = subprocess.check_output(["git", "ls-tree", "-rz", "HEAD"], cwd=ROOT).split(b"\0")
git_blobs = {}
for row in tree:
    if row:
        head, path = row.split(b"\t", 1)
        mode, kind, oid = head.split(b" ")
        if kind == b"blob":
            git_blobs[path.decode("utf-8")] = oid.decode("ascii")

def sha256(data):
    return hashlib.sha256(data).hexdigest()

def git_oid(data):
    payload = f"blob {len(data)}\0".encode() + data
    return getattr(hashlib, git_format)(payload).hexdigest()

gates, errors = [], []
for gate in range(9):
    path = ROOT / f"evidence/gate-{gate}/GATE_{gate}_FREEZE.json"
    manifest = json.loads(path.read_bytes())
    files = manifest["files"]
    if len(files) != expected_counts[gate]:
        errors.append({"gate": gate, "kind": "entry-count", "actual": len(files), "expected": expected_counts[gate]})
    matched = 0
    git_matched = 0
    for entry in files:
        rel = entry["path"]
        target = (ROOT / rel).resolve()
        if not target.is_relative_to(ROOT):
            errors.append({"gate": gate, "path": rel, "kind": "outside-project"})
            continue
        try:
            data = target.read_bytes()
        except OSError:
            errors.append({"gate": gate, "path": rel, "kind": "missing"})
            continue
        if sha256(data) != entry["sha256"] or ("bytes" in entry and len(data) != entry["bytes"]):
            errors.append({"gate": gate, "path": rel, "kind": "manifest-mismatch"})
            continue
        matched += 1
        if rel in git_blobs and git_oid(data) == git_blobs[rel]:
            git_matched += 1
        else:
            errors.append({"gate": gate, "path": rel, "kind": "git-blob-mismatch-or-untracked"})
    gates.append({"gate": gate, "manifestPath": str(path.relative_to(ROOT)), "manifestSha256": sha256(path.read_bytes()), "entryCount": len(files), "worktreeMatches": matched, "gitBlobMatches": git_matched})

out = {"schema": "gate9-history-integrity-v1", "status": "PASS" if not errors else "FAIL", "gitObjectFormat": git_format, "totalEntries": sum(x["entryCount"] for x in gates), "totalWorktreeMatches": sum(x["worktreeMatches"] for x in gates), "totalGitBlobMatches": sum(x["gitBlobMatches"] for x in gates), "gates": gates, "errors": errors}
(ROOT / "audit/gate-9/history-integrity.json").write_text(json.dumps(out, indent=2) + "\n")
print(json.dumps({k: out[k] for k in ("status", "gitObjectFormat", "totalEntries", "totalWorktreeMatches", "totalGitBlobMatches", "errors")}, indent=2))
