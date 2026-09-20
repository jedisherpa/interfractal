import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const expectedManifestHashes = [
  '0dd3d5b9bd66ec07f8ee7d82db407365acc4eb2a04b1d0f9bb1ed8783ef82dc5',
  '302bc210ce9e7f45573ce4515229fd6402f491db12b8d173c9bd26f98438587d',
  '52d91bfe40813a6f041b8806a036bc78c144f2a1fbe03e73f3fc05ff03de1104',
  '1ddc109fa40fe4bf091fa90903ebb96d0d6c48d822f7158420084694d5f28edf',
  '2c91c1c5eccaca75f44f3c29dd32d7797a02bbc45f4538e007ac390fc69b1ee9',
  'fa7fb2f90ae5494e5e736ee868fc8823ece13f1b297b7d040086b6652c25dd03',
];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const gates = [];
for (let gate = 0; gate <= 5; gate++) {
  const path = `evidence/gate-${gate}/GATE_${gate}_FREEZE.json`;
  const bytes = await readFile(resolve(root, path));
  assert.equal(sha256(bytes), expectedManifestHashes[gate], `Gate ${gate} manifest changed`);
  const manifest = JSON.parse(bytes);
  for (const file of manifest.files) {
    const contents = await readFile(resolve(root, file.path));
    assert.equal(sha256(contents), file.sha256, `Gate ${gate} ${file.path}`);
    if (file.bytes !== undefined) assert.equal(contents.length, file.bytes, `Gate ${gate} ${file.path} length`);
  }
  gates.push({ gate, manifestSha256: sha256(bytes), entries: manifest.files.length, unchanged: true });
}
const totalEntries = gates.reduce((sum, gate) => sum + gate.entries, 0);
assert.equal(totalEntries, 668);
const result = { kind: 'gate-6-independent-prior-integrity', checkedAtUtc: new Date().toISOString(),
  totalEntries, gates, allUnchanged: true };
await writeFile(resolve(root, 'audit/gate-6/prior-integrity.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ totalEntries, allUnchanged: true }));
