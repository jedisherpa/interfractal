import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const checked = [];
for (const gate of [0, 1, 2, 3]) {
  const manifestPath = resolve(root, `evidence/gate-${gate}/GATE_${gate}_FREEZE.json`);
  const manifest = JSON.parse(await readFile(manifestPath));
  for (const entry of manifest.files) {
    const bytes = await readFile(resolve(root, entry.path));
    checked.push({ gate, path: entry.path,
      pass: (entry.bytes === undefined || bytes.length === entry.bytes) && hash(bytes) === entry.sha256 });
  }
}
assert.equal(checked.length, 415, 'expected cumulative prior frozen entry count');
const failed = checked.filter(entry => !entry.pass);
const result = { kind: 'prior-frozen-byte-integrity', gateCounts: [0, 1, 2, 3].map(gate =>
  ({ gate, entries: checked.filter(entry => entry.gate === gate).length })),
  checkedEntries: checked.length, failed, pass: failed.length === 0 };
await writeFile(resolve(root, 'audit/gate-4/prior-integrity.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
if (!result.pass) process.exitCode = 1;
