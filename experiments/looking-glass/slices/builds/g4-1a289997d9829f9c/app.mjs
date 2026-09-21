import { RUN_ID, DURATION_MS, STEP_MS, SAMPLE_MS, CHECKPOINTS_MS, CAMERA, SCALE,
  clampTime, modelAt, displayPoint, sourceState, sliceState, projectionState, movieState,
  geometryState, checkpointState, displayState } from './model.mjs';

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const sessionId = crypto.randomUUID();
let run, trace;
let simulationTimeMs = 0, sliceLevelOverride = null, cameraYawOverride = null;
let ambiguityLevelOverride = null, movieAngleOverride = null;
let inspectorOpen = false, suppressInspectorToggle = false;
let playing = false, playbackToken = 0, renderToken = 0, environmentRefreshFrame = 0;
let startWallMs = 0, startSimulationTimeMs = 0, sequence = 0, logQueue = Promise.resolve();
const diagnostics = { renderer: 'SVG from analytic 3D sets; stored movie read from immutable 3D-only JSON', activityLog: 'Pending first saved event' };
const fmt = n => n === null ? '∅' : Math.abs(n) < 1e-12 ? '0' : Number(n).toFixed(6);
const vec = a => `(${a.map(fmt).join(', ')})`;
const deg = rad => (rad * 180 / Math.PI).toFixed(1);
const mode = () => [sliceLevelOverride, cameraYawOverride, ambiguityLevelOverride, movieAngleOverride].every(v => v === null) ? 'saved-run' : 'exploration';
function state() {
  const index = Math.round(simulationTimeMs / SAMPLE_MS);
  return modelAt(simulationTimeMs, { sliceLevelOverride, cameraYawOverride, ambiguityLevelOverride,
    movieAngleOverride, movieFrame: trace?.frames[index] ?? null,
    displayOptions: { inspectorOpen } });
}
function svgEl(tag, attrs = {}, value = null) {
  const el = document.createElementNS(NS, tag);
  for (const [name, val] of Object.entries(attrs)) el.setAttribute(name, String(val));
  if (value !== null) el.textContent = value;
  return el;
}
function environment() {
  const rect = $('slice-svg').getBoundingClientRect();
  const sceneRects = {};
  for (const id of ['slice-svg', 'projection-svg', 'movie-source-svg', 'movie-stored-svg']) {
    const el = $(id), r = el.getBoundingClientRect(), style = getComputedStyle(el);
    sceneRects[id] = { x: r.x, y: r.y, width: r.width, height: r.height,
      visible: style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0 };
  }
  sceneRects.ambiguity = [...document.querySelectorAll('#ambiguity-cards svg')].map(el => {
    const r = el.getBoundingClientRect(), style = getComputedStyle(el);
    return { x: r.x, y: r.y, width: r.width, height: r.height,
      visible: style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0 };
  });
  return { viewport: { width: innerWidth, height: innerHeight, devicePixelRatio: window.devicePixelRatio },
    sceneRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    sceneRects, inspectorOpen: document.querySelector('details.inspector').open,
    documentScrollWidth: document.documentElement.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth };
}
function refreshEnvironment() {
  const current = environment();
  try { const visible = JSON.parse($('state-json').textContent); Object.assign(visible, current);
    $('state-json').textContent = JSON.stringify(visible, null, 2); } catch { /* Initial paint. */ }
  $('diagnostics').textContent = JSON.stringify({ ...diagnostics, ...current }, null, 2);
}
function scheduleEnvironmentRefresh() {
  if (environmentRefreshFrame) return;
  environmentRefreshFrame = requestAnimationFrame(() => { environmentRefreshFrame = 0; refreshEnvironment(); });
}
function capture() { return { s: state(), playing, mode: mode(), environment: environment() }; }
async function digest(value) {
  const bytes = new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map(b => b.toString(16).padStart(2, '0')).join('');
}
async function hashes(c) {
  const [sourceSha256, sliceSha256, projectionSha256, movieSha256, geometrySha256,
    checkpointSha256, displaySha256] = await Promise.all([
    digest(sourceState()), digest(sliceState(c.s)), digest(projectionState(c.s)), digest(movieState(c.s)),
    digest(geometryState(c.s)), digest(checkpointState(c.s)), digest(displayState(c.s))]);
  return { sourceSha256, sliceSha256, projectionSha256, movieSha256, geometrySha256,
    checkpointSha256, displaySha256 };
}
function summary(c) {
  return { simulationTimeMs: c.s.simulationTimeMs, mode: c.mode, playing: c.playing,
    sliceLevelW: c.s.slice.levelW, sliceClass: c.s.slice.classification, sliceRadius: c.s.slice.radius,
    fixedProjection: c.s.projection, ambiguityLevelW: c.s.ambiguity.levelW,
    movieSourceCenter3: c.s.movie.sourceProjection.center3,
    movieStoredCenter3: c.s.movie.stored3dFrame?.center ?? null,
    movieIntervention: c.s.movie.intervention, controls: c.s.controls, ...c.environment };
}
function record(type, payload, origin, before = capture()) {
  const after = capture(), ordinal = ++sequence, wallTimeUtc = new Date().toISOString();
  logQueue = logQueue.catch(() => {}).then(async () => {
    const [beforeHashes, afterHashes] = await Promise.all([hashes(before), hashes(after)]);
    const event = { seq: ordinal, kind: 'observed-ui', sessionId, runId: RUN_ID, buildId: run.buildId,
      actor: 'unspecified-ui', origin, type, payload, wallTimeUtc,
      simTimeBeforeMs: before.s.simulationTimeMs, simTimeAfterMs: after.s.simulationTimeMs,
      mode: after.mode, before: { ...summary(before), ...beforeHashes },
      observed: { ...summary(after), ...afterHashes } };
    const response = await fetch('/api/activity', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    diagnostics.activityLog = `Saved event ${ordinal} · ${type} · ${origin}`;
    refreshEnvironment();
  }).catch(error => { diagnostics.activityLog = `Could not save event ${ordinal}: ${String(error)}`; refreshEnvironment(); });
}
function drawAxes(svg, camera) {
  const origin = displayPoint([0, 0, 0], camera);
  const axes = [
    { p: [1.6, 0, 0], color: '#bc7d68', label: 'x' },
    { p: [0, 1.6, 0], color: '#92c2aa', label: 'y' },
    { p: [0, 0, 1.6], color: '#88a9cf', label: 'z' }
  ];
  for (const axis of axes) {
    const end = displayPoint(axis.p, camera);
    svg.append(svgEl('line', { x1: origin[0], y1: origin[1], x2: end[0], y2: end[1],
      stroke: axis.color, 'stroke-width': 1.5, 'stroke-opacity': .6 }));
    svg.append(svgEl('text', { x: end[0] + 5, y: end[1] - 4, fill: axis.color, 'font-size': 12 }, axis.label));
  }
}
function drawBall(svg, ball, camera, color = 'gold') {
  svg.replaceChildren();
  svg.append(svgEl('rect', { x: 0, y: 0, width: 640, height: 420, fill: 'transparent' }));
  drawAxes(svg, camera);
  if (ball.classification === 'empty' || ball.radius === null) {
    svg.append(svgEl('text', { x: 320, y: 218, 'text-anchor': 'middle', fill: '#f1c49c',
      'font-size': 22, 'font-family': 'Georgia, serif' }, 'EMPTY · NO POINTS'));
    return;
  }
  const center3 = ball.center3 ?? ball.center ?? [0, 0, 0];
  const [cx, cy] = displayPoint(center3, camera);
  if (ball.classification === 'boundary-point' || ball.radius === 0) {
    svg.append(svgEl('circle', { cx, cy, r: 13, fill: 'none', stroke: '#f3c384',
      'stroke-width': 2, 'stroke-dasharray': '3 3' }));
    svg.append(svgEl('circle', { cx, cy, r: 3, fill: '#fff1c9' }));
    svg.append(svgEl('text', { x: cx + 20, y: cy - 15, fill: '#f3d9af', 'font-size': 14 }, 'one location'));
    return;
  }
  const r = ball.radius * SCALE;
  const fill = color === 'blue' ? '#3b8f9e' : color === 'rose' ? '#b57780' : '#c99257';
  svg.append(svgEl('circle', { cx, cy, r, fill, 'fill-opacity': .27,
    stroke: color === 'blue' ? '#9ddbe1' : '#f7d4a0', 'stroke-width': 2.5 }));
  for (const [axisA, axisB, opacity] of [[0, 1, .65], [0, 2, .48], [1, 2, .42]]) {
    const points = Array.from({ length: 65 }, (_, i) => {
      const t = 2 * Math.PI * i / 64, p = [...center3];
      p[axisA] += ball.radius * Math.cos(t); p[axisB] += ball.radius * Math.sin(t);
      return displayPoint(p, camera);
    });
    const path = `M ${points.map(p => `${p[0]} ${p[1]}`).join(' L ')} Z`;
    svg.append(svgEl('path', { d: path, fill: 'none', stroke: '#d8eeee',
      'stroke-opacity': opacity, 'stroke-width': 1.25 }));
  }
  svg.append(svgEl('circle', { cx, cy, r: 3, fill: '#fff1d1' }));
}
function renderAmbiguity(s) {
  const target = $('ambiguity-cards'); target.replaceChildren();
  for (const candidate of s.ambiguity.candidates) {
    const card = document.createElement('article'); card.className = 'candidate';
    const h = document.createElement('h3'); h.textContent = `${candidate.id} · center w=${candidate.sourceCenter4[3] > 0 ? '+' : ''}${candidate.sourceCenter4[3]}`;
    const initial = document.createElement('p'); initial.textContent = `Initial w=0 slice: radius ${fmt(candidate.initialSlice.radius)}; xyz projection: unit ball.`;
    const selected = document.createElement('p'); selected.textContent = `Selected w=${fmt(s.ambiguity.levelW)} slice: ${candidate.selectedSlice.classification}, radius ${fmt(candidate.selectedSlice.radius)}.`;
    const svg = svgEl('svg', { viewBox: '0 0 640 420', role: 'img', 'aria-label': `${candidate.id} selected slice` });
    drawBall(svg, candidate.selectedSlice, s.camera, candidate.id === 'ball-plus' ? 'gold' : 'rose');
    card.append(h, initial, selected, svg); target.append(card);
  }
  $('ambiguity-status').textContent = s.ambiguity.levelW === 0 ? 'Initial: both radius √3/2' : 'Intervention: radius 1 versus one point';
  $('ambiguity-initial').classList.toggle('active', s.ambiguity.levelW === 0);
  $('ambiguity-intervention').classList.toggle('active', s.ambiguity.levelW === 0.5);
}
async function render() {
  const token = ++renderToken, c = capture(), s = c.s;
  $('mode-chip').textContent = playing ? 'PLAYING' : mode() === 'saved-run' ? 'PAUSED · SAVED RUN' : 'PAUSED · EXPLORATION';
  $('time-readout').textContent = `${(simulationTimeMs / 1000).toFixed(1)}s / 40s`;
  $('playback-readout').textContent = playing ? 'Saved sequence playing' : 'Clock paused';
  $('slice-badge').textContent = s.slice.classification.toUpperCase();
  $('slice-level').textContent = fmt(s.slice.levelW);
  $('slice-class').textContent = s.slice.classification;
  $('slice-radius').textContent = fmt(s.slice.radius);
  $('slice-note').textContent = s.slice.classification === 'empty' ?
    'No points satisfy x²+y²+z²+s²≤1 at this level. No ball is drawn.' :
    s.slice.classification === 'boundary-point' ? 'The boundary slice is exactly one 3D location. The symbol marks its location; it is not a finite ball.' :
      `The 3D slice is a solid ball of radius ${fmt(s.slice.radius)}. The wire curves help depict volume on this 2D screen.`;
  $('slice-value').textContent = fmt(s.slice.levelW);
  $('camera-value').textContent = `${deg(s.camera.yaw)}°`;
  $('slice-control').value = String(Math.round(s.slice.levelW * 100));
  $('camera-control').value = String(Math.round(s.camera.yaw * 180 / Math.PI));
  $('scrub').value = String(simulationTimeMs);
  $('seek-value').textContent = `${(simulationTimeMs / 1000).toFixed(1)}s`;
  drawBall($('slice-svg'), s.slice, s.camera);
  drawBall($('projection-svg'), s.projection, s.camera, 'blue');
  renderAmbiguity(s);
  drawBall($('movie-source-svg'), s.movie.sourceProjection, s.camera, 'gold');
  drawBall($('movie-stored-svg'), { center3: s.movie.stored3dFrame.center, radius: s.movie.stored3dFrame.radius }, s.camera, 'blue');
  const d = Math.hypot(...s.movie.sourceProjection.center3.map((v, i) => v - s.movie.stored3dFrame.center[i]));
  $('movie-comparison').textContent = `${vec(s.movie.sourceProjection.center3)} / ${vec(s.movie.stored3dFrame.center)} / ${fmt(d)}`;
  $('movie-note').textContent = s.movie.intervention === 'saved-turn' ?
    `At sampled t=${(s.movie.stored3dFrame.timeMs / 1000).toFixed(1)}s, the 3D-only saved frame agrees with the analytic projection. Matching these frames does not identify the source.` :
    `Known −90° source turn at 20s: the analytic projected center moves to +0.5, while the unchanged stored 3D frame remains at −0.5. This rejects this fixed recording under that intervention; it does not reject every adaptive 3D model.`;
  $('movie-heldout').classList.toggle('active', s.movie.intervention !== 'saved-turn');
  $('movie-heldout').disabled = simulationTimeMs !== 20_000;
  const digests = await hashes(c);
  if (token !== renderToken) return;
  $('source-digest').textContent = digests.sourceSha256;
  $('geometry-digest').textContent = digests.geometrySha256;
  $('checkpoint-digest').textContent = digests.checkpointSha256;
  $('display-digest').textContent = digests.displaySha256;
  $('state-json').textContent = JSON.stringify({ ...summary(c), ...environment(), ...digests,
    model: s, movieTraceSha256: run.movieTraceSha256,
    fingerprintContract: 'SHA-256 of JSON.stringify objects; source/slice/projection/movie/checkpoint separately bound; checkpoint includes quantized time; all hashes exclude wall time, playback flag, session and browser environment',
    renderer: diagnostics.renderer }, null, 2);
  refreshEnvironment();
}
function stopPlayback() { playing = false; playbackToken++; }
function pause(origin = 'manual-control', reason = 'pause button') {
  if (!playing) return;
  const before = capture(); stopPlayback(); record('playback.pause', { reason }, origin, before); render();
}
function frame(token) {
  if (!playing || token !== playbackToken) return;
  const nextTimeMs = clampTime(startSimulationTimeMs + performance.now() - startWallMs);
  if (nextTimeMs !== simulationTimeMs) { simulationTimeMs = nextTimeMs; render(); }
  if (simulationTimeMs >= DURATION_MS) { pause('automatic-playback', 'end-of-sequence'); return; }
  requestAnimationFrame(() => frame(token));
}
function play() {
  if (playing) return;
  const before = capture();
  if (simulationTimeMs >= DURATION_MS) simulationTimeMs = 0;
  sliceLevelOverride = cameraYawOverride = ambiguityLevelOverride = movieAngleOverride = null;
  playing = true; startWallMs = performance.now(); startSimulationTimeMs = simulationTimeMs;
  const token = ++playbackToken;
  record('playback.play', { fromSimulationTimeMs: simulationTimeMs }, 'manual-control', before);
  render(); requestAnimationFrame(() => frame(token));
}
function restore(ms, type, origin = 'manual-control') {
  const before = capture(); stopPlayback();
  sliceLevelOverride = cameraYawOverride = ambiguityLevelOverride = movieAngleOverride = null;
  if (inspectorOpen) { suppressInspectorToggle = true; inspectorOpen = false; document.querySelector('details.inspector').open = false; }
  simulationTimeMs = clampTime(ms);
  record(type, { requestedSimulationTimeMs: ms, simulationTimeMs,
    quantizationMs: SAMPLE_MS, restoreCanonicalControls: true }, origin, before); render();
}
async function loadEvidence() {
  const target = $('evidence-links'); target.replaceChildren();
  try {
    const response = await fetch('/api/evidence', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const evidence = await response.json();
    if (evidence.status) target.append(document.createTextNode(evidence.status + ' '));
    for (const shot of evidence.screenshots || []) {
      const a = document.createElement('a'); a.href = shot.url; a.textContent = shot.label;
      a.target = '_blank'; a.rel = 'noopener'; target.append(a, document.createTextNode(' · '));
    }
    if (evidence.resultsUrl) { const a = document.createElement('a'); a.href = evidence.resultsUrl;
      a.textContent = 'Gate 4 results'; a.target = '_blank'; a.rel = 'noopener'; target.append(a); }
  } catch { target.textContent = 'Browser evidence pending.'; }
}
async function init() {
  const [runResponse, traceResponse] = await Promise.all([fetch('/api/run'), fetch('/api/movie-trace')]);
  if (!runResponse.ok || !traceResponse.ok) throw new Error('Saved run or 3D-only movie trace load failed');
  run = await runResponse.json();
  const traceText = await traceResponse.text();
  if (await digest(traceText) !== run.movieTraceSha256) throw new Error('Saved 3D movie trace hash mismatch');
  trace = JSON.parse(traceText);
  if (run.runId !== RUN_ID || run.durationMs !== DURATION_MS || trace.frames.length !== 401 ||
    trace.frames.some((f, i) => f.timeMs !== i * SAMPLE_MS || !Array.isArray(f.center) || f.center.length !== 3 || f.radius !== 1))
    throw new Error('Saved run/trace does not match this build');
  $('run-id').textContent = RUN_ID;
  $('library-current').textContent = `${RUN_ID} · ${run.buildId} · canonical paused start`;
  $('build-readout').textContent = `Build ${run.buildId} · ${run.dependencyIdentity}`;
  $('recovery-command').textContent = `node /Users/paul/BTC-Learning/experiments/looking-glass/slices/builds/${run.buildId}/server.mjs`;
  Object.assign(diagnostics, { buildId: run.buildId, runId: RUN_ID, uiSessionId: sessionId,
    movieTraceSha256: run.movieTraceSha256, movieFrameCount: trace.frames.length,
    activityActor: 'unspecified-ui' });
  for (const ms of CHECKPOINTS_MS) { const b = document.createElement('button'); b.textContent = `${ms / 1000}s`; b.dataset.checkpoint = String(ms);
    b.addEventListener('click', () => restore(ms, 'checkpoint.restore')); $('checkpoints').append(b); }
  $('play').addEventListener('click', play);
  $('pause').addEventListener('click', () => pause());
  $('replay').addEventListener('click', () => { restore(0, 'replay.open'); play(); });
  $('library-replay').addEventListener('click', () => { restore(0, 'replay.open'); play(); });
  $('step').addEventListener('click', () => restore(simulationTimeMs + STEP_MS, 'playback.step'));
  $('reset').addEventListener('click', () => restore(0, 'experiment.reset'));
  $('scrub').addEventListener('input', e => restore(Number(e.target.value), 'playback.seek'));
  $('seek-button').addEventListener('click', () => restore(Number($('seek-request').value), 'playback.seek'));
  $('slice-control').addEventListener('input', e => { const before = capture(); stopPlayback(); sliceLevelOverride = Number(e.target.value) / 100;
    record('slice.set', { levelW: sliceLevelOverride }, 'manual-control', before); render(); });
  $('camera-control').addEventListener('input', e => { const before = capture(); stopPlayback(); cameraYawOverride = Number(e.target.value) * Math.PI / 180;
    record('camera.set', { yaw: cameraYawOverride }, 'manual-control', before); render(); });
  $('ambiguity-initial').addEventListener('click', () => { const before = capture(); stopPlayback(); ambiguityLevelOverride = 0;
    record('ambiguity.compare', { levelW: 0, expectedRelation: 'equal-in-declared-observations' }, 'manual-control', before); render(); });
  $('ambiguity-intervention').addEventListener('click', () => { const before = capture(); stopPlayback(); ambiguityLevelOverride = 0.5;
    record('ambiguity.compare', { levelW: 0.5, expectedRelation: 'distinguished-solid-versus-point' }, 'manual-control', before); render(); });
  $('movie-heldout').addEventListener('click', () => { const before = capture(); stopPlayback(); movieAngleOverride = -Math.PI / 2;
    record('source.rotation.set', { sourceId: 'ball-plus', knownAngleRadians: movieAngleOverride,
      simulationTimeMs, storedTraceUnchanged: true, expectedCenterDistance: 1 }, 'manual-control', before); render(); });
  $('movie-compare').addEventListener('click', () => { const before = capture(), movie = before.s.movie;
    record('movie.compare', { frameIndex: movie.index, frameTimeMs: movie.stored3dFrame.timeMs,
      sourceAngleRadians: movie.sourceAngleRadians,
      sourceCenter3: movie.sourceProjection.center3,
      storedCenter3: movie.stored3dFrame.center,
      sourceRadius: movie.sourceProjection.radius, storedRadius: movie.stored3dFrame.radius,
      centerDistance: movie.comparison.centerDistance, radiusDifference: movie.comparison.radiusDifference,
      scope: 'selected stored 3D frame versus independently computed raw 3D source projection' }, 'manual-control', before);
    render(); });
  $('movie-saved').addEventListener('click', () => { const before = capture(); stopPlayback(); movieAngleOverride = null;
    record('movie.source-turn.restore', { simulationTimeMs }, 'manual-control', before); render(); });
  window.addEventListener('resize', () => { render(); scheduleEnvironmentRefresh(); });
  window.addEventListener('scroll', scheduleEnvironmentRefresh, { passive: true });
  document.addEventListener('scroll', scheduleEnvironmentRefresh, { passive: true, capture: true });
  document.querySelector('details.inspector').addEventListener('toggle', () => {
    if (suppressInspectorToggle) { suppressInspectorToggle = false; scheduleEnvironmentRefresh(); return; }
    const before = capture();
    before.environment.inspectorOpen = inspectorOpen;
    inspectorOpen = document.querySelector('details.inspector').open;
    scheduleEnvironmentRefresh(); requestAnimationFrame(scheduleEnvironmentRefresh);
    record('display.options.set', { inspectorOpen }, 'manual-control', before);
    render();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); loadEvidence(); } });
  record('replay.open', { runId: RUN_ID, buildId: run.buildId, openingState: 'paused-at-start' }, 'programmatic-restore');
  render(); loadEvidence();
}
init().catch(error => { diagnostics.loadError = String(error); $('mode-chip').textContent = 'RUN LOAD ERROR'; refreshEnvironment(); });
