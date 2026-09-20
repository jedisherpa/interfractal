"""Verify all prior freeze entries in both the working tree and committed HEAD."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GIT_PREFIX = "experiments/looking-glass/"
REVISION = "cbb32394e741bcaab78a0970a0905236c706d33e"
EXPECTED_COUNTS = [61, 95, 120, 139, 141, 112, 204, 107]
EXPECTED_MANIFEST_SHA256 = [
    "0dd3d5b9bd66ec07f8ee7d82db407365acc4eb2a04b1d0f9bb1ed8783ef82dc5",
    "302bc210ce9e7f45573ce4515229fd6402f491db12b8d173c9bd26f98438587d",
    "52d91bfe40813a6f041b8806a036bc78c144f2a1fbe03e73f3fc05ff03de1104",
    "1ddc109fa40fe4bf091fa90903ebb96d0d6c48d822f7158420084694d5f28edf",
    "2c91c1c5eccaca75f44f3c29dd32d7797a02bbc45f4538e007ac390fc69b1ee9",
    "fa7fb2f90ae5494e5e736ee868fc8823ece13f1b297b7d040086b6652c25dd03",
    "27f4f63245fe0a0c9e11b3740337463dede62e31669468e5b371fc6b4e2e5492",
    "7e33339de2a492f909d04f8c78602bd1461869319df8f6a017692f4780fc946c",
]


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


assert git("rev-parse", "HEAD").decode().strip() == REVISION
assert git("rev-parse", "--show-object-format").decode().strip() == "sha1"
tree = {}
for row in git("ls-tree", "-r", "-z", REVISION).split(b"\0"):
    if row:
        metadata, path = row.split(b"\t", 1)
        tree[path.decode()] = metadata.split()[-1].decode()

seen = set()
gates = []
for gate, expected_count in enumerate(EXPECTED_COUNTS):
    manifest_path = f"evidence/gate-{gate}/GATE_{gate}_FREEZE.json"
    raw = (ROOT / manifest_path).read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    assert sha == EXPECTED_MANIFEST_SHA256[gate], f"changed manifest: {manifest_path}"
    committed = git("show", f"{REVISION}:{GIT_PREFIX}{manifest_path}")
    assert raw == committed, f"manifest differs from HEAD: {manifest_path}"
    manifest = json.loads(raw)
    assert manifest["gate"] == gate and len(manifest["files"]) == expected_count
    for entry in manifest["files"]:
        rel = entry["path"]
        assert rel not in seen, f"duplicate path {rel}"
        seen.add(rel)
        assert not Path(rel).is_absolute() and ".." not in Path(rel).parts
        content = (ROOT / rel).read_bytes()
        if "bytes" in entry:
            assert len(content) == entry["bytes"], f"size mismatch: {rel}"
        assert hashlib.sha256(content).hexdigest() == entry["sha256"], f"SHA256 mismatch: {rel}"
        git_blob_sha1 = hashlib.sha1(f"blob {len(content)}\0".encode() + content).hexdigest()
        assert tree.get(rel) == git_blob_sha1, f"HEAD blob mismatch: {rel}"
    gates.append({"gate": gate, "manifestSha256": sha, "entries": expected_count,
                  "workingTreeAndHeadAgree": True})
assert len(seen) == 979
report = {"kind": "gate8-independent-history-integrity", "revision": REVISION,
          "entriesVerified": len(seen), "allUnchanged": True, "gates": gates}
path = ROOT / "audit/gate-8/history-integrity.json"
path.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({"result": "PASS", "entries": len(seen), "output": str(path)}))
