// Preserve the initial candidate's first observed metadata failure and images.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const evidence = resolve(root, 'evidence/gate-4');
const observations = (JSON.parse(await readFile(resolve(evidence, 'browser-observations.json')))).filter(o => o.index <= 12);
const captures = (JSON.parse(await readFile(resolve(evidence, 'capture-index.json')))).filter(c =>
  c.buildId === 'g4-1a289997d9829f9c' && c.afterObservation <= 12);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const jpegDimensions = bytes => {
  for (let i = 2; i < bytes.length - 9;) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker = bytes[i + 1]; i += 2;
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = bytes.readUInt16BE(i);
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))
      return { width: bytes.readUInt16BE(i + 5), height: bytes.readUInt16BE(i + 3) };
    i += length;
  }
  return null;
};
const mismatches = observations.filter(o => o.state?.viewport?.devicePixelRatio !== o.outer?.viewport?.devicePixelRatio)
  .map(o => ({ index: o.index, label: o.label, inspectorDpr: o.state?.viewport?.devicePixelRatio,
    actualDpr: o.outer?.viewport?.devicePixelRatio, viewport: o.outer?.viewport }));
const originals = [];
for (const c of captures) {
  const bytes = await readFile(resolve(evidence, c.path));
  originals.push({ label: c.label, path: c.path, sha256: sha(bytes), bytes: bytes.length,
    dimensions: jpegDimensions(bytes), beforeObservation: c.beforeObservation,
    afterObservation: c.afterObservation, originalUnedited: c.originalUnedited });
}
const result = { kind: 'initial-candidate-actual-browser-audit', runId: 'G4-SLICES-001',
  buildId: 'g4-1a289997d9829f9c', frozenObservationIndexes: observations.map(o => o.index),
  observationCount: observations.length, dprMismatches: mismatches,
  status: mismatches.length ? 'FAIL: inspector DPR stale after viewport setting in initial observations' : 'No initial DPR mismatch found',
  imageInspection: [
    { label: '001-C0-center-0s', observation: 'Both equal-radius solid-ball depictions visible at paused 0s; initial stale DPR belongs to this capture.' },
    { label: '001-C1-point-16s', observation: 'Primary slice shows one small location glyph and BOUNDARY-POINT badge; reference remains full ball.' },
    { label: '001-C2-empty-20s', observation: 'Primary slice shows EMPTY · NO POINTS and no slice ball/point; reference remains full ball.' }
  ],
  originals,
  limit: 'First twelve observations only; subsequent candidate 001 actions and any candidate 002 repair require separate audit.' };
await writeFile(resolve(root, 'audit/gate-4/G4-SLICES-001-browser-audit-initial.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ observations: observations.length, dprMismatches: mismatches.length,
  originalImages: originals.length, status: result.status }));
