# Recover candidate 004 without touching preserved materials

This is packaging recovery for authored synthetic research materials. It launches no model or human research. The frozen materials-v1 package and failed candidates remain historical evidence. Candidate 004 changes packaging entry/result checks and its identity; design, keys, tasks, prompts/settings and participant bundles remain identical to candidate 003.

The recorded runtime is Node 24.17.0 on macOS. The tested canonical, directory-symlink and file-symlink entry forms are identified in the independent audit. This is not unrestricted cross-platform compatibility. Importing the packager must remain free of CLI side effects.

## Clean rebuild from the packaged sources

Use Python 3.9+ and the recorded Node executable below, or explicitly record another compatible Node 24 runtime. Run this from any working directory. It copies **only** candidate 004's packaged builder-tooling and research-team/design into a new temporary staging directory, never invoking copied scripts inside the preserved candidate.

```sh
python3 - <<'PY'
from pathlib import Path
import hashlib, json, shutil, subprocess, tempfile

project = Path('/Users/paul/BTC-Learning/experiments/looking-glass')
source = project / 'preparation/materials-recovery-v1/package-candidate-004'
node = Path('/opt/homebrew/Cellar/node@24/24.17.0/bin/node')
expected = '66c2343ea244d5e8946b7a6841520c9af5d7361c74b358c018d8733f01bdd823'
sha = lambda data: hashlib.sha256(data).hexdigest()
assert sha((source / 'MANIFEST.json').read_bytes()) == expected
stage = Path(tempfile.mkdtemp(prefix='materials004-recovery-')).resolve()
shutil.copytree(source / 'builder-tooling', stage / 'tooling')
shutil.copytree(source / 'research-team/design', stage / 'design')
report = {'stage': str(stage), 'steps': [], 'passed': False}
log = stage / 'reproduction-result.json'
def save():
    log.write_text(json.dumps(report, indent=2) + '\n')
try:
    report['nodeVersion'] = subprocess.check_output(
        [str(node), '--version'], text=True).strip()
    for mode in ['build', 'verify']:
        command = [str(node), str(stage / 'tooling/build-package.mjs'), mode]
        result = subprocess.run(command, cwd=stage, text=True,
                                capture_output=True, timeout=60)
        report['steps'].append({'command': command, 'exitCode': result.returncode,
                               'stdout': result.stdout, 'stderr': result.stderr})
        save()
        assert result.returncode == 0, 'Command failed; inspect saved report'
        assert f'{mode} passed: 72 files;' in result.stdout, 'Success output absent'
        assert 'candidate package-candidate-004' in result.stdout
    rebuilt = stage / 'package-candidate-004'
    raw = (rebuilt / 'MANIFEST.json').read_bytes()
    assert sha(raw) == expected, 'Manifest differs'
    manifest = json.loads(raw)
    declared = {entry['path'] for entry in manifest['files']} | {'MANIFEST.json'}
    actual = {str(p.relative_to(rebuilt)) for p in rebuilt.rglob('*') if p.is_file()}
    assert len(actual) == 72 and actual == declared, 'Output inventory differs'
    for entry in manifest['files']:
        data = (rebuilt / entry['path']).read_bytes()
        assert len(data) == entry['bytes'] and sha(data) == entry['sha256']
    for name in actual:
        assert (rebuilt / name).read_bytes() == (source / name).read_bytes(), name
    report.update(passed=True, filesCompared=72, manifestSha256=sha(raw))
except Exception as error:
    report['error'] = str(error)
    raise
finally:
    save()
    print('Recovery record:', log)
print('Verified all 72 recreated files against preserved candidate 004.')
PY
```

A passing recovery requires successful commands, expected output, all 72 files, matching manifest and exact bytes. **Exit 0 or a success-like message alone is insufficient.** An existing destination causes build refusal; use another fresh staging directory rather than deleting or overwriting evidence. Keep the generated recovery record even when a command fails. Do not rerun one-shot evidence writers over their old reports.

Historical disposable regression directories contain absolute test symlinks. Preservation records their target strings without following them; those links may become stale after relocation. They document the original tested setup, not a portable recovery input. Rebuild from the packaged tooling/design as above, never by following historical fixture symlinks.

The supervising `run-candidate.mjs` additionally requires a recorded passing preflight and independently checks the child results and actual artifact. That workflow is for a fresh candidate staging area. The clean recipe above reproduces and verifies the existing candidate directly, without fabricating a preflight report.

## Inspect the read-only preview

After the rebuild, the staged `tooling/preview.mjs` reads the sibling regenerated candidate. Invoke it with Node 24 and port 44010, or another free loopback port if the preserved preview is running. The existing host preview is [localhost:44010](http://127.0.0.1:44010/).

The preview serves only `/` and `/index.html`. It exposes the full source union to researchers, not an isolated participant view. Keys, withheld tasks and participant files have no preview routes. Never give a purported blind participant the repository or this researcher overview. Recovery does not approve materials use, launch either deferred study or complete the broader preparation goal.
