import { RUN_ID, DURATION_MS, STEP_MS, CHECKPOINTS_MS, modelAt, clampTime } from './model.mjs';

const $ = id => document.getElementById(id);
const svg = $('cube');
let run;
let simulationTimeMs = 0;
let playing = false;
let explorationYaw = null;
let startWall = 0;
let startSimulationTimeMs = 0;
let playbackToken = 0;
let sequence = 0;
let logQueue = Promise.resolve();
const sessionId = crypto.randomUUID();
const actor = 'unspecified-ui';
let scrubBefore = null;
let lookBefore = null;
let diagnostics = { rendererUsed: 'SVG 2D projected from computed 3D points', webgl: 'not tested yet' };
const svgNs = 'http://www.w3.org/2000/svg';

function element(tag, attrs = {}, text = null) {
  const item = document.createElementNS(svgNs, tag);
  for (const [key, value] of Object.entries(attrs)) item.setAttribute(key, String(value));
  if (text !== null) item.textContent = text;
  return item;
}

function state() { return modelAt(simulationTimeMs, explorationYaw); }
function observed() {
  const s = state();
  return { simulationTimeMs: s.simulationTimeMs, camera: s.camera, playing, mode: explorationYaw === null ? 'saved-run' : 'exploration', sourceRotation: s.sourceRotation, selectedVertexId: s.selectedVertexId };
}
function record(type, intended, before = observed()) {
  const after = observed();
  const event = { sequence: ++sequence, sessionId, actor, runId: RUN_ID, buildId: run?.buildId, type, intended, before, observed: after, previousSimulationTimeMs: before.simulationTimeMs, observedSimulationTimeMs: after.simulationTimeMs, wallTimestamp: new Date().toISOString() };
  logQueue = logQueue.then(async () => {
    const response = await fetch('/api/activity', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }).catch(error => {
    diagnostics.activityLog = `Could not save UI activity: ${String(error)}`;
    updateDiagnostics();
  });
}

function updateDiagnostics() { $('diagnostics').textContent = JSON.stringify(diagnostics, null, 2); }
function render() {
  const s = state();
  const byId = Object.fromEntries(s.vertices.map(v => [v.id, v]));
  svg.replaceChildren();
  const scale = s.fixedScalePxPerUnit, centerX = 350, centerY = 285;
  const xy = v => [centerX + v.screen[0] * scale, centerY + v.screen[1] * scale];
  const depths = s.vertices.map(v => v.camera[2]);
  const minDepth = Math.min(...depths), maxDepth = Math.max(...depths), span = maxDepth - minDepth || 1;
  for (const edge of s.edges) {
    const a = byId[edge.from], b = byId[edge.to];
    const [x1, y1] = xy(a), [x2, y2] = xy(b);
    const depth = ((a.camera[2] + b.camera[2]) / 2 - minDepth) / span;
    svg.append(element('line', { x1, y1, x2, y2, stroke: '#a6d4d4', 'stroke-width': depth > .50 ? 2.3 : 1.5, 'stroke-opacity': (.34 + .62 * depth).toFixed(3), 'vector-effect': 'non-scaling-stroke' }));
  }
  for (const v of [...s.vertices].sort((a,b) => a.camera[2] - b.camera[2])) {
    const [x, y] = xy(v), selected = v.id === s.selectedVertexId;
    if (selected) svg.append(element('circle', { cx:x, cy:y, r:24, fill:'#e6b575', 'fill-opacity':'.12' }));
    svg.append(element('circle', { cx:x, cy:y, r:selected ? 8 : 5.2, fill:selected ? '#eec185' : '#c5ddda', stroke:'#12242b', 'stroke-width':2 }));
    svg.append(element('text', { x:x+(selected?13:10), y:y-9, fill:selected?'#ffe1aa':'#b8d0ce', 'font-size':selected?16:11, 'font-weight':selected?700:600, 'paint-order':'stroke', stroke:'#102028', 'stroke-width':3 }, v.id));
  }
  const seconds = (simulationTimeMs / 1000).toFixed(1);
  $('time-readout').textContent = `00:${String(Math.floor(simulationTimeMs / 1000)).padStart(2,'0')} / 00:20`;
  $('seek-value').textContent = `${seconds} s`;
  $('scrub').value = String(simulationTimeMs);
  $('camera-readout').textContent = `camera yaw ${(s.camera.yaw * 180 / Math.PI).toFixed(1)}°`;
  $('mode-chip').textContent = explorationYaw !== null ? 'EXPLORATION · PAUSED' : playing ? 'SAVED RUN · PLAYING' : 'SAVED RUN · PAUSED';
  $('look-value').textContent = `${(s.camera.yaw * 180 / Math.PI).toFixed(1)}°`;
  $('look').value = String(Math.round(s.camera.yaw * 180 / Math.PI));
  $('state-json').textContent = JSON.stringify({ ...s, runId:RUN_ID, buildId:run?.buildId, playback:{ playing, mode:explorationYaw === null ? 'saved-run':'exploration' } }, null, 2);
}

function pause(recordEvent = true) {
  const before = observed();
  if (playing) {
    playing = false;
    playbackToken++;
    if (recordEvent) record('playback.pause', { simulationTimeMs }, before);
  } else if (recordEvent) record('playback.pause', { simulationTimeMs }, before);
  render();
}
function frame(token) {
  if (!playing || token !== playbackToken) return;
  simulationTimeMs = clampTime(startSimulationTimeMs + (performance.now() - startWall));
  render();
  if (simulationTimeMs >= DURATION_MS) { pause(); return; }
  requestAnimationFrame(() => frame(token));
}
function play() {
  const before = observed();
  explorationYaw = null;
  if (simulationTimeMs >= DURATION_MS) simulationTimeMs = 0;
  playing = true;
  const token = ++playbackToken;
  startWall = performance.now();
  startSimulationTimeMs = simulationTimeMs;
  record('playback.play', { fromSimulationTimeMs: simulationTimeMs }, before);
  render();
  requestAnimationFrame(() => frame(token));
}
function seek(t, eventType = 'playback.seek', before = observed()) {
  playing = false;
  playbackToken++;
  explorationYaw = null;
  simulationTimeMs = clampTime(t);
  record(eventType, { simulationTimeMs }, before);
  render();
}

function testWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    diagnostics.webgl = gl ? `available: ${typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 'WebGL2' : 'WebGL1'}` : 'unavailable: context creation returned null';
    if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch (error) { diagnostics.webgl = `unavailable: ${String(error)}`; }
  diagnostics.viewport = { width:innerWidth, height:innerHeight, devicePixelRatio };
  updateDiagnostics();
}
async function loadEvidence() {
  try {
    const response = await fetch('/api/evidence');
    if (!response.ok) return;
    const evidence = await response.json();
    const target = $('evidence');
    target.replaceChildren();
    if (Array.isArray(evidence.screenshots) && evidence.screenshots.length) {
      for (const shot of evidence.screenshots) {
        const a = document.createElement('a');
        a.href = shot.url; a.textContent = `${shot.label} · ${(shot.simulationTimeMs/1000).toFixed(1)}s`; a.target = '_blank'; a.rel = 'noopener';
        target.append(a);
      }
    } else target.textContent = evidence.status || 'Captures pending.';
    if (evidence.resultsUrl) {
      const a = document.createElement('a'); a.href = evidence.resultsUrl; a.textContent = 'Results'; a.target = '_blank'; a.rel = 'noopener'; target.append(a);
    }
  } catch { /* The run remains usable without capture index. */ }
}

async function init() {
  const response = await fetch('/api/run');
  if (!response.ok) throw new Error(`Run load failed: ${response.status}`);
  run = await response.json();
  if (run.runId !== RUN_ID || run.durationMs !== DURATION_MS) throw new Error('Saved run does not match this build');
  $('run-id').textContent = run.runId;
  $('build-readout').textContent = `Build ${run.buildId} · ${run.baseRevision.slice(0,12)} · ${run.dependencyIdentity}`;
  diagnostics.buildId = run.buildId;
  diagnostics.runId = run.runId;
  diagnostics.uiSessionId = sessionId;
  diagnostics.activityActor = actor;
  diagnostics.initialStateHash = run.initialStateHash;
  testWebGL();
  render();
  record('replay.open', { runId:run.runId, openingState:'paused-at-start' });
  loadEvidence();
  $('play').addEventListener('click', play);
  $('replay').addEventListener('click', () => { const before=observed(); pause(false); simulationTimeMs = 0; explorationYaw = null; record('replay.open', { runId:run.runId, fromStart:true }, before); render(); play(); });
  $('pause').addEventListener('click', () => pause());
  $('step').addEventListener('click', () => { pause(false); seek(simulationTimeMs + STEP_MS, 'playback.step'); });
  $('scrub').addEventListener('input', e => { if (!scrubBefore) scrubBefore=observed(); playing = false; playbackToken++; explorationYaw = null; simulationTimeMs = clampTime(Number(e.target.value)); render(); });
  $('scrub').addEventListener('change', e => { seek(Number(e.target.value),'playback.seek',scrubBefore || observed()); scrubBefore=null; });
  for (const button of document.querySelectorAll('[data-checkpoint]')) button.addEventListener('click', () => {
    const t = Number(button.dataset.checkpoint);
    if (!CHECKPOINTS_MS.includes(t)) return;
    seek(t, 'checkpoint.restore');
  });
  $('reset').addEventListener('click', () => seek(0, 'probe.reset'));
  $('open-run').addEventListener('click', () => { seek(0, 'replay.open'); });
  $('look').addEventListener('input', e => { if (!lookBefore) lookBefore=observed(); pause(false); explorationYaw = Number(e.target.value) * Math.PI / 180; render(); });
  $('look').addEventListener('change', e => { explorationYaw = Number(e.target.value) * Math.PI / 180; record('camera.set', { yawRadians:explorationYaw, context:'exploration' }, lookBefore || observed()); lookBefore=null; render(); });
}
init().catch(error => { diagnostics.loadError = String(error); updateDiagnostics(); $('mode-chip').textContent = 'RUN LOAD ERROR'; });
