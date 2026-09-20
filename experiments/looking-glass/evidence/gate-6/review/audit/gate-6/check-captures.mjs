import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runId = process.argv[3] || 'G6-LOCAL-003';
const run = JSON.parse(await readFile(resolve(root, `local-models/runs/${runId}/run.json`)));
const index = JSON.parse(await readFile(resolve(root, 'evidence/gate-6/capture-index.json')));
const observations = JSON.parse(await readFile(resolve(root, 'evidence/gate-6/browser-observations.json')));
const byIndex = new Map(observations.map(item => [item.index, item]));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function jpegDimensions(bytes) {
  assert.equal(bytes[0], 0xff); assert.equal(bytes[1], 0xd8);
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    let marker = bytes[offset + 1];
    while (marker === 0xff) marker = bytes[++offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    const length = bytes.readUInt16BE(offset + 2);
    assert.ok(length >= 2);
    offset += 2 + length;
  }
  throw new Error('No JPEG frame dimensions');
}
assert.ok(index.length >= 7 && index.length <= 12);
const captures = [];
for (const item of index) {
  assert.equal(item.runId, runId);
  assert.equal(item.buildId, run.buildId);
  assert.equal(item.mime, 'image/jpeg');
  assert.equal(item.originalBytesUnchanged, true);
  const before = byIndex.get(item.beforeObservation), after = byIndex.get(item.afterObservation);
  assert.ok(before && after, `bracket ${item.label}`);
  assert.equal(before.state.runId, item.runId);
  assert.equal(after.state.runId, item.runId);
  assert.equal(before.state.buildId, item.buildId);
  assert.equal(after.state.buildId, item.buildId);
  assert.equal(before.state.fullState.simulationTimeMs, item.beforeSimulationTimeMs);
  assert.equal(after.state.fullState.simulationTimeMs, item.afterSimulationTimeMs);
  assert.ok(before.index < after.index);
  const bytes = await readFile(resolve(root, item.path));
  assert.equal(bytes.length, item.bytes, `bytes ${item.label}`);
  assert.equal(sha256(bytes), item.sha256, `SHA ${item.label}`);
  const dimensions = jpegDimensions(bytes);
  const expected = item.label.includes('960') ? { width: 960, height: 720 } : { width: 1280, height: 720 };
  assert.deepEqual(dimensions, expected, `original dimensions ${item.label}`);
  assert.deepEqual(before.outer.viewport.width, dimensions.width);
  assert.deepEqual(after.outer.viewport.width, dimensions.width);
  captures.push({ label: item.label, path: item.path, sha256: item.sha256, bytes: bytes.length,
    dimensions, beforeObservation: before.index, afterObservation: after.index,
    simulationTimeBracketMs: [item.beforeSimulationTimeMs, item.afterSimulationTimeMs] });
}
const result = { kind: 'gate-6-independent-original-capture-audit', runId,
  buildId: run.buildId, originalCount: captures.length, captures,
  limits: 'A playback capture is bracketed by actual observations; its exact atomic frame time is not asserted.',
  checksPassed: true };
if (process.argv[2]) await writeFile(resolve(process.argv[2]), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ originalCount: captures.length, checksPassed: true }));
