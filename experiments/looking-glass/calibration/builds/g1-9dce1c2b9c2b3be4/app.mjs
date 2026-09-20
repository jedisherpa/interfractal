import { RUN_ID, DURATION_MS, STEP_MS, CHECKPOINTS_MS, MARKED_PAIR, modelAt, geometryState, clampTime } from './model.mjs';

const $ = id => document.getElementById(id);
const svgNs = 'http://www.w3.org/2000/svg';
let run;
let simulationTimeMs = 0;
let playing = false;
let sourceAngleOverride = null;
let cameraYawOverride = null;
let startWall = 0;
let startSimulationTimeMs = 0;
let playbackToken = 0;
let renderToken = 0;
let sequence = 0;
let logQueue = Promise.resolve();
const sessionId = crypto.randomUUID();
const actor = 'unspecified-ui';
const diagnostics = { rendererUsed: 'SVG 2D projected from computed 3D points', activityLog: 'Pending first saved event' };

function element(tag, attrs = {}, label = null) {
  const item = document.createElementNS(svgNs, tag);
  for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, String(value));
  if (label !== null) item.textContent = label;
  return item;
}
function state() { return modelAt(simulationTimeMs, { sourceAngleOverride, cameraYawOverride }); }
function mode() { return sourceAngleOverride === null && cameraYawOverride === null ? 'saved-run' : 'exploration'; }
function snapshot() {
  const s = state();
  return { state: s, summary: { simulationTimeMs: s.simulationTimeMs, sourceTheta: s.sourceRotation.theta,
    camera: s.camera, pairSourceDistance: s.pairSourceDistance, pairShadowDistance: s.pairShadowDistance,
    playing, mode: mode(), selectedVertexIds: MARKED_PAIR } };
}
async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function record(type, intended, before = snapshot()) {
  const after = snapshot();
  const ordinal = ++sequence;
  const wallTimestamp = new Date().toISOString();
  // Capture both states and the intended action before the next display redraw.
  logQueue = logQueue.catch(() => {}).then(async () => {
    const event = { sequence: ordinal, kind: 'observed-ui', sessionId, actor, runId: RUN_ID, buildId: run?.buildId,
      type, intended, before: { ...before.summary, stateSha256: await sha256(before.state), geometrySha256: await sha256(geometryState(before.state)) },
      observed: { ...after.summary, stateSha256: await sha256(after.state), geometrySha256: await sha256(geometryState(after.state)) },
      previousSimulationTimeMs: before.summary.simulationTimeMs, observedSimulationTimeMs: after.summary.simulationTimeMs, wallTimestamp };
    const response = await fetch('/api/activity', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    diagnostics.activityLog = `Saved event ${ordinal} (${type})`;
    updateDiagnostics();
  }).catch(error => { diagnostics.activityLog = `Could not save event ${ordinal}: ${String(error)}`; updateDiagnostics(); });
}
function updateDiagnostics() { $('diagnostics').textContent = JSON.stringify(diagnostics, null, 2); }
function drawSource(s) {
  const svg = $('source-drawing');
  svg.replaceChildren();
  const byId = Object.fromEntries(s.vertices.map(v => [v.id, v]));
  const xy = vertex => [250 + vertex.screen[0] * s.fixedScalePxPerUnit, 180 + vertex.screen[1] * s.fixedScalePxPerUnit];
  const depths = s.vertices.map(v => v.cameraCoordinates[2]);
  const minDepth = Math.min(...depths), span = Math.max(...depths) - minDepth || 1;
  for (const edge of s.edges) {
    const a = byId[edge.from], b = byId[edge.to];
    const [x1, y1] = xy(a), [x2, y2] = xy(b);
    const depth = ((a.cameraCoordinates[2] + b.cameraCoordinates[2]) / 2 - minDepth) / span;
    svg.append(element('line', { x1, y1, x2, y2, stroke: '#b8dcd2', 'stroke-width': depth > .5 ? 2.8 : 1.6,
      'stroke-opacity': (.4 + .55 * depth).toFixed(3), 'vector-effect': 'non-scaling-stroke', 'data-edge-id': edge.id }));
  }
  for (const vertex of [...s.vertices].sort((a, b) => a.cameraCoordinates[2] - b.cameraCoordinates[2])) {
    const [x, y] = xy(vertex);
    const selected = MARKED_PAIR.includes(vertex.id);
    if (vertex.id === 'v110') svg.append(element('rect', { x: x - 6.2, y: y - 6.2, width: 12.4, height: 12.4, transform: `rotate(45 ${x} ${y})`, fill: '#e8bc84', stroke: '#1e2c32', 'stroke-width': 2, 'data-vertex-id': vertex.id }));
    else svg.append(element('circle', { cx: x, cy: y, r: vertex.id === 'v111' ? 7 : 4.6,
      fill: vertex.id === 'v111' ? '#152e35' : '#c9dcd6', stroke: vertex.id === 'v111' ? '#afe9e4' : '#1a3439', 'stroke-width': 2.2, 'data-vertex-id': vertex.id }));
    svg.append(element('text', { x: x + (selected ? 11 : 8), y: y - (selected ? 8 : 6), fill: selected ? '#ffe4b9' : '#bfd5d1',
      'font-size': selected ? 14 : 10, 'font-weight': selected ? 750 : 650, 'paint-order': 'stroke', stroke: '#10232b', 'stroke-width': 3 }, vertex.id));
  }
}
function drawShadow(s, groups) {
  const svg = $('shadow-drawing');
  svg.replaceChildren();
  const byId = Object.fromEntries(s.vertices.map(v => [v.id, v]));
  const xy = point => [250 + point[0] * s.fixedScalePxPerUnit, 180 - point[1] * s.fixedScalePxPerUnit];
  svg.append(element('line', { x1: 250, y1: 26, x2: 250, y2: 334, stroke: '#51646b', 'stroke-opacity': .5, 'stroke-dasharray': '3 5' }));
  svg.append(element('line', { x1: 58, y1: 180, x2: 442, y2: 180, stroke: '#51646b', 'stroke-opacity': .5, 'stroke-dasharray': '3 5' }));
  for (const edge of s.edges) {
    const a = byId[edge.from], b = byId[edge.to];
    const [x1, y1] = xy(a.shadow), [x2, y2] = xy(b.shadow);
    if (!edge.shadowCollapsed) svg.append(element('line', { x1, y1, x2, y2, stroke: '#edc995', 'stroke-opacity': .61, 'stroke-width': 2.3, 'vector-effect': 'non-scaling-stroke', 'data-edge-id': edge.id }));
    else svg.append(element('circle', { cx: x1, cy: y1, r: 2.1, fill: '#f8d8a3', 'data-collapsed-edge-id': edge.id }));
  }
  for (const group of groups) {
    const [x, y] = xy(group.xy);
    const marked = group.ids.some(id => MARKED_PAIR.includes(id));
    svg.append(element('circle', { cx: x, cy: y, r: marked ? 9 : group.ids.length > 1 ? 7.5 : 6,
      fill: marked ? '#f0c390' : '#e3d4b5', stroke: '#172b32', 'stroke-width': 2, 'data-vertex-ids': group.ids.join(',') }));
    if (group.ids.length > 1) svg.append(element('circle', { cx: x, cy: y, r: marked ? 13 : 11, fill: 'none', stroke: marked ? '#b9eeea' : '#f0d6a7', 'stroke-width': 1.7 }));
    svg.append(element('text', { x: x + 10, y: y - 10, fill: marked ? '#ffe4b9' : '#e5d7bf', 'font-size': group.ids.length > 1 ? 12 : 10,
      'font-weight': marked ? 750 : 650, 'paint-order': 'stroke', stroke: '#19252d', 'stroke-width': 3.5 }, group.ids.join(' · ')));
  }
}
function render() {
  const s = state();
  const groups = s.shadowSites.map(site => ({ xy: site.xy, ids: site.sourceIds }));
  drawSource(s); drawShadow(s, groups);
  const seconds = simulationTimeMs / 1000;
  const angle = s.sourceRotation.theta * 180 / Math.PI;
  $('mode-chip').textContent = mode() === 'exploration' ? 'EXPLORATION · PAUSED' : playing ? 'SAVED RUN · PLAYING' : 'SAVED RUN · PAUSED';
  $('time-readout').textContent = `00:${String(Math.floor(seconds)).padStart(2, '0')} / 00:40`;
  $('angle-readout').textContent = `Source turn ${angle.toFixed(1)}°`;
  $('camera-readout').textContent = `Camera yaw ${(s.camera.yaw * 180 / Math.PI).toFixed(1)}° · pitch 20.0°`;
  $('source-distance').textContent = s.pairSourceDistance.toFixed(3);
  $('shadow-distance').textContent = s.pairShadowDistance.toFixed(3);
  $('overlap-readout').textContent = `${groups.length} shadow sites · ${s.edges.filter(edge => edge.shadowCollapsed).length} collapsed edges`;
  $('seek-value').textContent = `${seconds.toFixed(1)} s`;
  $('scrub').value = String(simulationTimeMs);
  $('turn-value').textContent = `${angle.toFixed(1)}°`;
  $('turn').value = String(Math.round(angle));
  $('look-value').textContent = `${(s.camera.yaw * 180 / Math.PI).toFixed(1)}°`;
  $('look').value = String(Math.round(s.camera.yaw * 180 / Math.PI));
  const token = ++renderToken;
  Promise.all([sha256(s), sha256(geometryState(s))]).then(([stateSha256, geometrySha256]) => {
    if (token !== renderToken) return;
    $('state-json').textContent = JSON.stringify({ ...s, runId: RUN_ID, buildId: run?.buildId,
      stateSha256, geometrySha256, shadowGroups: groups, playback: { playing, mode: mode() } }, null, 2);
  }).catch(error => { diagnostics.hashError = String(error); updateDiagnostics(); });
}
function stopPlayback() { playing = false; playbackToken++; }
function pause() { const before = snapshot(); stopPlayback(); record('playback.pause', { simulationTimeMs }, before); render(); }
function frame(token) {
  if (!playing || token !== playbackToken) return;
  simulationTimeMs = clampTime(startSimulationTimeMs + performance.now() - startWall);
  render();
  if (simulationTimeMs >= DURATION_MS) { pause(); return; }
  requestAnimationFrame(() => frame(token));
}
function play() {
  const before = snapshot();
  sourceAngleOverride = null; cameraYawOverride = null;
  if (simulationTimeMs >= DURATION_MS) simulationTimeMs = 0;
  playing = true;
  startWall = performance.now(); startSimulationTimeMs = simulationTimeMs;
  const token = ++playbackToken;
  record('playback.play', { fromSimulationTimeMs: simulationTimeMs, camera: 'fixed canonical' }, before);
  render(); requestAnimationFrame(() => frame(token));
}
function seek(timeMs, type = 'playback.seek', before = snapshot()) {
  stopPlayback(); sourceAngleOverride = null; cameraYawOverride = null;
  simulationTimeMs = clampTime(timeMs);
  record(type, { simulationTimeMs, camera: 'fixed canonical' }, before);
  render();
}
function testWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    diagnostics.webgl = gl ? `available: ${typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 'WebGL2' : 'WebGL1'}` : 'unavailable: context creation returned null';
    if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch (error) { diagnostics.webgl = `unavailable: ${String(error)}`; }
  diagnostics.viewport = { width: innerWidth, height: innerHeight, devicePixelRatio };
  updateDiagnostics();
}
async function loadEvidence() {
  try {
    const response = await fetch('/api/evidence');
    if (!response.ok) return;
    const evidence = await response.json();
    const target = $('evidence'); target.replaceChildren();
    if (Array.isArray(evidence.screenshots) && evidence.screenshots.length) {
      for (const shot of evidence.screenshots) {
        const link = document.createElement('a'); link.href = shot.url; link.textContent = `${shot.label} · ${(shot.simulationTimeMs / 1000).toFixed(1)}s`;
        link.target = '_blank'; link.rel = 'noopener'; target.append(link);
      }
    } else target.textContent = evidence.status || 'Captures pending.';
    if (evidence.resultsUrl) { const link = document.createElement('a'); link.href = evidence.resultsUrl; link.textContent = 'Results'; link.target = '_blank'; link.rel = 'noopener'; target.append(link); }
  } catch (error) { diagnostics.evidence = String(error); updateDiagnostics(); }
}
async function init() {
  const response = await fetch('/api/run');
  if (!response.ok) throw new Error(`Run load failed: ${response.status}`);
  run = await response.json();
  if (run.runId !== RUN_ID || run.durationMs !== DURATION_MS) throw new Error('Saved run does not match this build');
  $('run-id').textContent = run.runId;
  $('build-readout').textContent = `Build ${run.buildId} · base ${run.baseRevision.slice(0, 12)} · ${run.dependencyIdentity}`;
  Object.assign(diagnostics, { buildId: run.buildId, runId: run.runId, uiSessionId: sessionId, activityActor: actor, initialStateHash: run.initialStateHash });
  testWebGL();
  record('replay.open', { runId: run.runId, openingState: 'paused-at-start' }); render(); loadEvidence();
  $('play').addEventListener('click', play);
  $('replay').addEventListener('click', () => { seek(0, 'replay.open'); play(); });
  $('pause').addEventListener('click', pause);
  $('step').addEventListener('click', () => seek(simulationTimeMs + STEP_MS, 'playback.step'));
  $('reset').addEventListener('click', () => seek(0, 'calibration.reset'));
  $('open-run').addEventListener('click', () => seek(0, 'replay.open'));
  $('scrub').addEventListener('input', event => seek(Number(event.target.value), 'playback.seek'));
  for (const button of document.querySelectorAll('[data-checkpoint]')) button.addEventListener('click', () => { const t = Number(button.dataset.checkpoint); if (CHECKPOINTS_MS.includes(t)) seek(t, 'checkpoint.restore'); });
  $('turn').addEventListener('input', event => { const before = snapshot(); stopPlayback(); sourceAngleOverride = Number(event.target.value) * Math.PI / 180; record('source.rotation.set', { thetaRadians: sourceAngleOverride, context: 'exploration' }, before); render(); });
  $('look').addEventListener('input', event => { const before = snapshot(); stopPlayback(); cameraYawOverride = Number(event.target.value) * Math.PI / 180; record('camera.set', { yawRadians: cameraYawOverride, context: 'exploration' }, before); render(); });
}
init().catch(error => { diagnostics.loadError = String(error); updateDiagnostics(); $('mode-chip').textContent = 'RUN LOAD ERROR'; });
