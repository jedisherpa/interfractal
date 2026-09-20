// Read-only audit of browser-origin UI events and root's separate action trace.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runId = process.argv[2] || 'G4-SLICES-002';
const run = JSON.parse(await readFile(resolve(root, `slices/runs/${runId}/run.json`)));
const evidence = resolve(root, 'evidence/gate-4');
const activityPath = resolve(evidence, runId === 'G4-SLICES-002' ? 'observed-activity.jsonl' :
  `candidates/${runId}/observed-activity.jsonl`);
const activityText = await readFile(activityPath, 'utf8');
const events = activityText.trim().split('\n').filter(Boolean).map(JSON.parse);
const observations = (JSON.parse(await readFile(resolve(evidence, 'browser-observations.json'))))
  .filter(o => o.diagnostics?.runId === runId);
const actions = (JSON.parse(await readFile(resolve(evidence, 'browser-action-trace.json'))))
  .filter(a => a.label.startsWith(runId.slice(-3)));
const checks = [];
const check = (name, errors, detail = {}) => checks.push({ name, pass: errors.length === 0,
  errorCount: errors.length, errors: errors.slice(0, 20), ...detail });
const eventErrors = [];
const bySession = new Map();
for (const e of events) {
  const session = bySession.get(e.sessionId) || [];
  if (e.kind !== 'observed-ui' || e.runId !== runId || e.buildId !== run.buildId ||
    e.actor !== 'unspecified-ui' || !['manual-control','automatic-playback','programmatic-restore'].includes(e.origin) ||
    !Number.isInteger(e.seq) || !e.payload || !e.before || !e.observed ||
    e.simTimeBeforeMs !== e.before.simulationTimeMs || e.simTimeAfterMs !== e.observed.simulationTimeMs ||
    !e.observed.checkpointSha256 || !e.before.checkpointSha256 ||
    (session.length && e.seq <= session.at(-1).seq))
    eventErrors.push({ sessionId: e.sessionId, seq: e.seq, type: e.type, reason: 'identity/order/state field mismatch' });
  session.push(e); bySession.set(e.sessionId, session);
}
check('semantic events bind exact run/build, actor, origins, state and per-session sequence', eventErrors,
  { eventCount: events.length, sessionCount: bySession.size });
const find = (type, predicate = () => true) => events.find(e => e.type === type && predicate(e));
const semanticErrors = [];
const initial = find('replay.open', e => e.origin === 'programmatic-restore' && e.simTimeAfterMs === 0);
const play = find('playback.play', e => e.origin === 'manual-control');
const manualPause = find('playback.pause', e => e.origin === 'manual-control');
const autoEnd = find('playback.pause', e => e.origin === 'automatic-playback' &&
  e.payload.reason === 'end-of-sequence' && e.simTimeAfterMs === 40000 && !e.observed.playing);
for (const [label, event] of [['initial open',initial],['manual play',play],['manual pause',manualPause],['automatic end',autoEnd],
  ['slice.set',find('slice.set')],['camera.set',find('camera.set')],['ambiguity.compare',find('ambiguity.compare')],
  ['source.rotation.set',find('source.rotation.set')],['movie.compare',find('movie.compare')],
  ['display.options.set',find('display.options.set')],['playback.step',find('playback.step')],
  ['playback.seek',find('playback.seek')],['checkpoint.restore',find('checkpoint.restore')]])
  if (!event) semanticErrors.push({ label, reason: 'required actual semantic event absent' });
check('all consequential control types and exact automatic end are recorded', semanticErrors);
const seekErrors = [];
for (const [request, actual] of [[8050,8100],[-100,0],[40500,40000]]) {
  if (!find('playback.seek', e => e.payload.requestedSimulationTimeMs === request && e.simTimeAfterMs === actual))
    seekErrors.push({ request, actual, reason: 'actual numeric seek absent or not quantized/clamped' });
}
const endpoint = find('playback.step', e => e.simTimeBeforeMs === 40000 && e.simTimeAfterMs === 40000);
if (!endpoint) seekErrors.push({ reason: 'endpoint step clamp absent' });
check('actual numeric non-grid/out-of-range seek and endpoint step semantics', seekErrors);
const isolationErrors = [];
for (const e of events) {
  if (['slice.set','camera.set','source.rotation.set'].includes(e.type) &&
    e.before.sourceSha256 !== e.observed.sourceSha256)
    isolationErrors.push({ seq: e.seq, type: e.type, reason: 'source fingerprint changed' });
  if (['slice.set','camera.set','source.rotation.set'].includes(e.type) &&
    e.before.projectionSha256 !== e.observed.projectionSha256)
    isolationErrors.push({ seq: e.seq, type: e.type, reason: 'fixed projection fingerprint changed' });
  if (e.type === 'camera.set' && (e.before.sliceSha256 !== e.observed.sliceSha256 ||
    e.before.movieSha256 !== e.observed.movieSha256 || e.simTimeBeforeMs !== e.simTimeAfterMs))
    isolationErrors.push({ seq: e.seq, type: e.type, reason: 'camera altered raw states or clock' });
  if (e.type === 'slice.set' && (e.before.movieSha256 !== e.observed.movieSha256 ||
    e.simTimeBeforeMs !== e.simTimeAfterMs || e.observed.mode !== 'exploration' || e.observed.playing))
    isolationErrors.push({ seq: e.seq, type: e.type, reason: 'slice override altered movie/clock or did not pause exploration' });
  if (e.type === 'source.rotation.set' && (e.before.sliceSha256 !== e.observed.sliceSha256 ||
    e.simTimeBeforeMs !== e.simTimeAfterMs || e.observed.movieStoredCenter3?.[0] !== e.before.movieStoredCenter3?.[0]))
    isolationErrors.push({ seq: e.seq, type: e.type, reason: 'movie angle altered primary slice/clock/stored frame' });
}
check('actual camera, slice and movie controls isolate the declared raw states', isolationErrors);
const baseline = new Map();
const restoreErrors = [];
for (const o of observations) {
  const s = o.state;
  if (s?.mode !== 'saved-run' || s.playing || ![0,8000,16000,20000,24000,32000,40000].includes(s.simulationTimeMs) ||
    s.model?.displayOptions?.inspectorOpen) continue;
  const previous = baseline.get(s.simulationTimeMs);
  if (!previous) baseline.set(s.simulationTimeMs, s.checkpointSha256);
  else if (previous !== s.checkpointSha256) restoreErrors.push({ index: o.index,
    timeMs: s.simulationTimeMs, expected: previous, actual: s.checkpointSha256 });
}
for (const t of [0,8000,16000,20000,24000,32000,40000])
  if (!baseline.has(t)) restoreErrors.push({ timeMs: t, reason: 'no canonical same-browser baseline' });
check('canonical checkpoint fingerprints repeat exactly across controls/reopen/reload', restoreErrors,
  { baselineCount: baseline.size });
const active = observations.filter(o => o.state?.playing).map(o => ({ index:o.index,
  timeMs:o.state.simulationTimeMs, kind:o.state.model.slice.kind, radius:o.state.model.slice.radius }));
const activeErrors = [];
if (!active.some(o => o.timeMs > 0 && o.timeMs < 16000 && o.kind === 'solid'))
  activeErrors.push({ reason: 'active preboundary solid not observed' });
if (!active.some(o => o.timeMs > 16000 && o.timeMs < 24000 && o.kind === 'empty'))
  activeErrors.push({ reason: 'active empty interval not observed' });
if (!active.some(o => o.timeMs > 24000 && o.timeMs < 40000 && o.kind === 'solid'))
  activeErrors.push({ reason: 'active returning solid not observed' });
if (!autoEnd) activeErrors.push({ reason: 'uninterrupted automatic endpoint not recorded' });
check('active playback crosses before, empty and return intervals and auto-stops', activeErrors,
  { activeObservations: active, minimumVisiblePreboundaryRadius: Math.min(...active.filter(o=>o.timeMs<16000).map(o=>o.radius ?? Infinity)) });
const actionErrors = [];
if (!actions.length) actionErrors.push({ reason: 'root action trace absent' });
for (let i=1;i<actions.length;i++) if (actions[i].index <= actions[i-1].index)
  actionErrors.push({ index: actions[i].index, reason: 'nonmonotonic root action index' });
check('independent computer-use action trace retained with failed attempts', actionErrors,
  { actionCount: actions.length, failedAttempts: actions.filter(a => a.toolError).map(a => ({index:a.index,label:a.label,error:a.toolError})) });
const result = { checkedAtUtc: new Date().toISOString(), kind: 'browser-activity-and-restoration-audit',
  runId, buildId: run.buildId, eventCount: events.length, sessionCount: bySession.size,
  activitySource: activityPath.replace(root + '/', ''),
  observationCount: observations.length, actionCount: actions.length,
  pass: checks.every(c => c.pass), passed: checks.filter(c => c.pass).length,
  failed: checks.filter(c => !c.pass).length, checks,
  limit: 'Event/activity state and external action records; does not infer human comprehension or continuous unrecorded movie equality.' };
await writeFile(resolve(root, `audit/gate-4/${runId}-activity-audit.json`), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ pass: result.pass, passed: result.passed, failed: result.failed,
  events: events.length, sessions: bySession.size, observations: observations.length,
  failures: checks.filter(c=>!c.pass).map(c=>({name:c.name,errors:c.errors})) }));
if (!result.pass) process.exitCode = 1;
