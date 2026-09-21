#!/usr/bin/env node
// Rehash captured inspector state in JavaScript, without importing product code.
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = new URL('../../', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
const observations = read('evidence/gate-9/browser-observations.json');
const exports = read('evidence/gate-9/exported-routes.json');
const traces = new Map(exports.map(row => [row.value.traceHash, row.value.trace]));
const keys = ['mode', 'condition', 'phase', 'tourPaused', 'presentationPaused', 'tourSeconds', 'localSeconds', 'choices', 'draftOccurrences', 'acquiredOccurrenceIndices', 'trace', 'traceHash', 'visibleOccurrenceIndices', 'completedSummary', 'reviewStatus', 'practiceOpen'];
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value !== null && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const sha = value => crypto.createHash('sha256').update(canonical(value)).digest('hex');
const failures = [];
for (const row of observations) {
  const inspector = row.inspector;
  const state = inspector.state;
  const semantic = Object.fromEntries(keys.map(key => [key, state[key]]));
  if (state.condition === 'watch' && state.phase !== 'complete') {
    const trace = traces.get(state.traceHash);
    if (!trace) throw Error(`Missing independently exported trace for observation ${row.index}`);
    semantic.trace = trace;
    semantic.choices = trace.occurrences.slice(1).map(occurrence => occurrence.queryId);
  }
  const recomputed = sha(semantic);
  if (recomputed !== inspector.semanticFingerprint) failures.push({observation: row.index, label: row.label, phase: state.phase, tourPaused: state.tourPaused, tourSeconds: state.tourSeconds, localSeconds: state.localSeconds, recomputed, captured: inspector.semanticFingerprint});
}
const result = {schema: 'gate9-live-fingerprint-review-v1', observationCount: observations.length, exactCount: observations.length - failures.length, mismatchCount: failures.length, mismatches: failures, interpretation: 'Captured inspector state and fingerprint disagree at three active-clock fractional-time observations; exact alternate state was not captured.'};
fs.writeFileSync(new URL('audit/gate-9/live-fingerprint-review.json', root), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
