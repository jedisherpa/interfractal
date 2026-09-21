import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Gate 0–5 hashes were pinned by the Gate 6 independent audit. Gate 6's hash
// was pinned from the committed, completed Gate 6 freeze before Gate 7 work.
const manifestHashes = [
  '0dd3d5b9bd66ec07f8ee7d82db407365acc4eb2a04b1d0f9bb1ed8783ef82dc5',
  '302bc210ce9e7f45573ce4515229fd6402f491db12b8d173c9bd26f98438587d',
  '52d91bfe40813a6f041b8806a036bc78c144f2a1fbe03e73f3fc05ff03de1104',
  '1ddc109fa40fe4bf091fa90903ebb96d0d6c48d822f7158420084694d5f28edf',
  '2c91c1c5eccaca75f44f3c29dd32d7797a02bbc45f4538e007ac390fc69b1ee9',
  'fa7fb2f90ae5494e5e736ee868fc8823ece13f1b297b7d040086b6652c25dd03',
  '27f4f63245fe0a0c9e11b3740337463dede62e31669468e5b371fc6b4e2e5492',
];
const expectedEntries = [61, 95, 120, 139, 141, 112, 204];
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const seen = new Set();
const gates = [];

for (let gate = 0; gate <= 6; gate++) {
  const manifestPath = `evidence/gate-${gate}/GATE_${gate}_FREEZE.json`;
  const bytes = await readFile(resolve(root, manifestPath));
  assert.equal(sha256(bytes), manifestHashes[gate], `${manifestPath} changed`);
  const manifest = JSON.parse(bytes);
  assert.equal(manifest.gate, gate, `${manifestPath} gate identity`);
  assert.equal(manifest.files.length, expectedEntries[gate], `${manifestPath} entry count`);
  for (const file of manifest.files) {
    assert.equal(typeof file.path, 'string', `${manifestPath} invalid path`);
    assert.equal(isAbsolute(file.path), false, `${manifestPath} absolute path`);
    const target = resolve(root, file.path);
    const rel = relative(root, target);
    assert.ok(rel && rel !== '..' && !rel.startsWith('../'), `${manifestPath} path escapes root`);
    assert.equal(seen.has(file.path), false, `duplicate frozen path: ${file.path}`);
    seen.add(file.path);
    const contents = await readFile(target);
    assert.equal(sha256(contents), file.sha256, `${file.path} hash changed`);
    if (file.bytes !== undefined) assert.equal(contents.length, file.bytes, `${file.path} size changed`);
  }
  gates.push({ gate, manifestSha256: manifestHashes[gate], entries: manifest.files.length });
}

assert.equal(seen.size, 872, 'total unique frozen entries');
console.log(JSON.stringify({ kind: 'gate-7-prior-integrity', allUnchanged: true, totalEntries: seen.size, gates }, null, 2));
