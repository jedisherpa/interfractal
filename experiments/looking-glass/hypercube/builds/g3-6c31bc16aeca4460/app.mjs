import { RUN_ID, DURATION_MS, STEP_MS, CHECKPOINTS_MS, CAMERA, SCALE, SOURCE, EDGES, MARKED_PAIR,
  clampTime, modelAt, geometryState, checkpointState, displayState, reconstruct, projectionMatrix,
  cameraMatrix, matrixRank, displayProjection } from './model.mjs';

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const actor = 'unspecified-ui';
const sessionId = crypto.randomUUID();
let run;
let simulationTimeMs = 0;
let sourceAngleOverride = null;
let cameraYawOverride = null;
let selectedVertexId = MARKED_PAIR[0];
let selectedEdgeId = EDGES.find(e => e.from === MARKED_PAIR[0] && e.to === MARKED_PAIR[1]).id;
let compareCondition = 'source';
let playing = false;
let startWallMs = 0;
let startSimulationTimeMs = 0;
let playbackToken = 0;
let renderToken = 0;
let environmentRefreshFrame = 0;
let sequence = 0;
let logQueue = Promise.resolve();
const diagnostics = { renderer: 'SVG from computed 3D coordinates; no WebGL dependency', activityLog: 'Pending first saved event' };
const sourceIdentity = { vertices: SOURCE, edges: EDGES };
const state = () => modelAt(simulationTimeMs, { sourceAngleOverride, cameraYawOverride });
const mode = () => sourceAngleOverride === null && cameraYawOverride === null ? 'saved-run' : 'exploration';
const degrees = rad => (rad * 180 / Math.PI).toFixed(1);
const fmt = n => Math.abs(n) < 1e-10 ? '0' : Number(n).toFixed(6);
const vec = a => `(${a.map(fmt).join(', ')})`;

function svgEl(tag, attrs = {}, label = null) {
  const el = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  if (label !== null) el.textContent = label;
  return el;
}
function browserEnvironment() {
  const rect = $('shadow-svg').getBoundingClientRect();
  return { viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
    sceneRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    documentScrollWidth: document.documentElement.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth };
}
// Native details opening can scroll the page after the model redraw. Refresh
// environment metadata at the next paint without changing state fingerprints.
function refreshEnvironment() {
  const environment = browserEnvironment();
  const stateJson = $('state-json');
  if (stateJson.textContent) {
    try {
      const visible = JSON.parse(stateJson.textContent);
      Object.assign(visible, environment);
      stateJson.textContent = JSON.stringify(visible, null, 2);
    } catch { /* Initial load may not have written a state yet. */ }
  }
  $('diagnostics').textContent = JSON.stringify({ ...diagnostics, ...environment }, null, 2);
}
function scheduleEnvironmentRefresh() {
  if (environmentRefreshFrame) return;
  environmentRefreshFrame = requestAnimationFrame(() => {
    environmentRefreshFrame = 0;
    refreshEnvironment();
  });
}
function capture() {
  const s = state();
  return { s, mode: mode(), playing, selectedVertexId, selectedEdgeId,
    sourceAngleOverride, cameraYawOverride, compareCondition, environment: browserEnvironment() };
}
async function digest(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const result = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(result)].map(n => n.toString(16).padStart(2, '0')).join('');
}
function canonicalCheckpoint(c) {
  return { ...checkpointState(c.s), selectedVertexId: c.selectedVertexId, selectedEdgeId: c.selectedEdgeId,
    sourceAngleOverride: c.sourceAngleOverride, cameraYawOverride: c.cameraYawOverride,
    compareCondition: c.compareCondition };
}
async function hashed(c) {
  const [sourceSha256, projectionSha256, checkpointSha256, displaySha256] = await Promise.all([
    digest(sourceIdentity), digest(geometryState(c.s)), digest(canonicalCheckpoint(c)), digest(displayState(c.s))]);
  return { sourceSha256, projectionSha256, geometrySha256: projectionSha256, checkpointSha256, displaySha256 };
}
function summary(c) {
  return { simulationTimeMs: c.s.simulationTimeMs, sourceTheta: c.s.rotation.theta, camera: c.s.camera,
    pairSourceDistance: c.s.pairSourceDistance, pairProjectedDistance: c.s.pairProjectedDistance,
    selectedVertexId: c.selectedVertexId, selectedEdgeId: c.selectedEdgeId,
    mode: c.mode, playing: c.playing, compareCondition: c.compareCondition, sourceAngleOverride: c.sourceAngleOverride,
    cameraYawOverride: c.cameraYawOverride, ...c.environment };
}
function record(type, payload, origin, before = capture()) {
  const after = capture();
  const ordinal = ++sequence;
  const wallTimeUtc = new Date().toISOString();
  logQueue = logQueue.catch(() => {}).then(async () => {
    const [beforeHashes, observedHashes] = await Promise.all([hashed(before), hashed(after)]);
    const event = { seq: ordinal, kind: 'observed-ui', sessionId, runId: RUN_ID,
      buildId: run.buildId, actor, origin, type, payload, wallTimeUtc,
      simTimeBeforeMs: before.s.simulationTimeMs, simTimeAfterMs: after.s.simulationTimeMs,
      mode: after.mode, before: { ...summary(before), ...beforeHashes },
      observed: { ...summary(after), ...observedHashes } };
    const response = await fetch('/api/activity', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    diagnostics.activityLog = `Saved event ${ordinal} · ${type} · ${origin}`;
    $('diagnostics').textContent = JSON.stringify({ ...diagnostics, ...browserEnvironment() }, null, 2);
  }).catch(error => {
    diagnostics.activityLog = `Could not save event ${ordinal}: ${String(error)}`;
    $('diagnostics').textContent = JSON.stringify({ ...diagnostics, ...browserEnvironment() }, null, 2);
  });
}
function pointPosition(v) { return v.screen; }
function draw(s) {
  const svg = $('shadow-svg'); svg.replaceChildren();
  const byId = Object.fromEntries(s.vertices.map(v => [v.id, v]));
  // Fixed screen guides; no fit-to-content scaling.
  svg.append(svgEl('line', { x1: 320, y1: 0, x2: 320, y2: 420, stroke: '#41616a', 'stroke-opacity': .35 }));
  svg.append(svgEl('line', { x1: 0, y1: 210, x2: 640, y2: 210, stroke: '#41616a', 'stroke-opacity': .35 }));
  const depths = s.vertices.map(v => v.cameraCoordinates[2]);
  const minDepth = Math.min(...depths), depthSpan = Math.max(...depths) - minDepth || 1;
  for (const edge of s.edges) {
    const a = byId[edge.from], b = byId[edge.to];
    const [x1, y1] = pointPosition(a), [x2, y2] = pointPosition(b);
    const collapsed = Math.hypot(...a.projected.map((n, i) => n - b.projected[i])) < 1e-10;
    if (collapsed) continue; // The edge remains in the model and inspector by ID.
    const depth = ((a.cameraCoordinates[2] + b.cameraCoordinates[2]) / 2 - minDepth) / depthSpan;
    const selected = edge.id === selectedEdgeId;
    const line = svgEl('line', { x1, y1, x2, y2, stroke: selected ? '#ffd191' : '#9ec6c6',
      'stroke-width': selected ? 4 : depth > .5 ? 2.3 : 1.5,
      'stroke-opacity': selected ? 1 : (.35 + .5 * depth).toFixed(3),
      'vector-effect': 'non-scaling-stroke', 'data-edge-id': edge.id, role: 'button', tabindex: '0',
      'aria-label': `Select edge ${edge.id}` });
    line.append(svgEl('title', {}, edge.id));
    const select = () => { const before = capture(); selectedEdgeId = edge.id; record('edge.select', { edgeId: edge.id }, 'manual-control', before); render(); };
    line.addEventListener('click', select);
    line.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
    svg.append(line);
  }
  // Group actual screen-coincident hit targets as well as projected coincidences.
  // A 2D screen overlap may contain several distinct 3D projected sites.
  const screenSites = [];
  for (const v of s.vertices) {
    let site = screenSites.find(group => Math.hypot(group.screen[0] - v.screen[0], group.screen[1] - v.screen[1]) < 1e-8);
    if (!site) { site = { screen: v.screen, sourceIds: [] }; screenSites.push(site); }
    site.sourceIds.push(v.id);
  }
  for (const site of screenSites) {
    const v = byId[site.sourceIds[0]];
    const [cx, cy] = pointPosition(v);
    const marked = site.sourceIds.some(id => MARKED_PAIR.includes(id));
    const isSelected = site.sourceIds.includes(selectedVertexId);
    if (marked) svg.append(svgEl('circle', { cx, cy, r: 11, fill: 'none', stroke: '#f3bb73', 'stroke-width': 3 }));
    const hit = svgEl('circle', { cx, cy, r: isSelected ? 6.5 : 5, fill: marked ? '#7fd3d0' : '#c7ded7',
      stroke: '#122b32', 'stroke-width': 1.5, role: 'button', tabindex: '0',
      'data-source-ids': site.sourceIds.join(','),
      'aria-label': `Screen site of ${site.sourceIds.join(' and ')}` });
    hit.append(svgEl('title', {}, `Screen site: ${site.sourceIds.join(', ')}`));
    const select = () => {
      const before = capture();
      if (site.sourceIds.length === 1) selectedVertexId = site.sourceIds[0];
      diagnostics.siteSelection = site.sourceIds.length > 1
        ? `Ambiguous screen hit: ${site.sourceIds.join(', ')}. Choose the exact source ID in the Vertex selector.`
        : `Selected ${selectedVertexId} from the SVG.`;
      record('vertex.select', { sourceIdsAtProjectedSite: site.sourceIds, selectedVertexId,
        ambiguousHit: site.sourceIds.length > 1 }, 'manual-control', before);
      render();
    };
    hit.addEventListener('click', select);
    hit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
    svg.append(hit);
    if (site.sourceIds.includes(MARKED_PAIR[0]) || site.sourceIds.includes(MARKED_PAIR[1])) {
      const labels = site.sourceIds.filter(id => MARKED_PAIR.includes(id)).map(id => id === MARKED_PAIR[0] ? 'A' : 'B');
      svg.append(svgEl('text', { x: cx + 13, y: cy - 9, fill: '#ffe0aa', 'font-size': 13, 'font-weight': 800 }, labels.join('/')));
    }
  }
}
function drawPair(s) {
  const byId = Object.fromEntries(s.vertices.map(v => [v.id, v]));
  $('pair-cards').replaceChildren();
  for (const [i, id] of MARKED_PAIR.entries()) {
    const v = byId[id], card = document.createElement('div');
    card.className = `pair-card ${i ? 'b' : 'a'}`;
    const h = document.createElement('h3'); h.textContent = `${i ? 'B' : 'A'} · ${id}`; card.append(h);
    for (const [label, values] of [['4D source', v.originalSource], ['4D rotated', v.rotatedSource], ['3D projected', v.projected]]) {
      const line = document.createElement('code'); line.textContent = `${label}: ${vec(values)}`; card.append(line);
    }
    $('pair-cards').append(card);
  }
  $('source-distance').textContent = fmt(s.pairSourceDistance);
  $('projected-distance').textContent = fmt(s.pairProjectedDistance);
  const same = s.pairProjectedDistance < 1e-10;
  $('pair-badge').textContent = same ? '2 IDs · 1 projected site' : '2 IDs · 2 projected sites';
  $('coincidence-note').textContent = same
    ? 'The highlighted pair coincides in the computed xyz projection. Both IDs and their source w-edge remain in the model. The edge has zero projected length.'
    : 'The known x–w source rotation reveals a separation in projected x. The original 4D pair distance remains fixed.';
}
function observationsFor(id, angles) {
  return angles.map(theta => ({ id, theta, matrix: projectionMatrix(theta),
    projected: modelAt(0, { sourceAngleOverride: theta }).vertices.find(v => v.id === id).projected }));
}
function observability() {
  const id = selectedVertexId;
  const fixed = observationsFor(id, [0]);
  const additional = observationsFor(id, [0, Math.PI / 2]);
  const camera30 = { yaw: Math.PI / 6, pitch: CAMERA.pitch }, camera120 = { yaw: 2 * Math.PI / 3, pitch: CAMERA.pitch };
  const appendHiddenZero = row => [...row, 0];
  const p0 = fixed[0].projected;
  const cameraOnly = [camera30, camera120].map(camera => ({ id, camera,
    matrix: cameraMatrix(camera).map(appendHiddenZero),
    projected: displayProjection(p0, camera).cameraCoordinates }));
  const cameraRows = cameraOnly.flatMap(o => o.matrix);
  const screenRows = [camera30, camera120].flatMap(camera => cameraMatrix(camera).slice(0, 2).map(appendHiddenZero));
  const cameraScreens = [camera30, camera120].map(camera => ({ yawDegrees: Math.round(camera.yaw * 180 / Math.PI),
    screen: displayProjection(p0, camera).screen }));
  const cases = [
    { title: 'One fixed source view', obs: fixed, note: 'w is hidden; infinitely many 4D points fit.' },
    { title: 'Camera-only second view', obs: cameraOnly, note: `Camera 30°/120°: 3D camera rows rank ${matrixRank(cameraRows)}, screen rows rank ${matrixRank(screenRows)}. Screen sites: ${cameraScreens.map(v => `${v.yawDegrees}° ${vec(v.screen)}`).join(' · ')}. w stays hidden.` },
    { title: 'Known 90° source view', obs: additional, note: 'The extra x row reveals w for this known ID.' }
  ];
  const target = $('observability'); target.replaceChildren();
  for (const c of cases) {
    const result = reconstruct(c.obs);
    const card = document.createElement('div'); card.className = `ob-card ${['fixed','camera','source'][cases.indexOf(c)] === compareCondition ? 'chosen' : ''}`;
    const h = document.createElement('h3'); h.textContent = c.title; card.append(h);
    const lines = [`Source ID: ${id}`, `Stacked rows: ${c.obs.length * 3} × 4; rank ${result.rank}`,
      `Observation(s): ${c.obs.map(o => `${o.camera ? `camera ${degrees(o.camera.yaw)}` : `source ${degrees(o.theta)}`}° ${vec(o.projected)}`).join(' · ')}`,
      result.reconstructed ? `Reconstructed q: ${vec(result.reconstructed)}` : 'Reconstruction: underdetermined',
      result.residual === null ? 'Residual: unavailable' : `Projected-coordinate residual: ${fmt(result.residual)}`,
      c.note];
    for (const line of lines) { const p = document.createElement('p'); p.textContent = line; card.append(p); }
    target.append(card);
  }
  const solved = reconstruct(additional);
  const truth = SOURCE.find(v => v.id === id).q; // Only after solving, for check.
  const all16 = SOURCE.map(({ id: sourceId, q }) => {
    const result = reconstruct(observationsFor(sourceId, [0, Math.PI / 2]));
    return { id: sourceId, rank: result.rank, residual: result.residual,
      reconstructed: result.reconstructed,
      truthErrorAfterSolve: Math.max(...q.map((n, i) => Math.abs(n - result.reconstructed[i]))) };
  });
  const aggregate = document.createElement('p');
  aggregate.textContent = `All 16 IDs: max post-solve coordinate error ${fmt(Math.max(...all16.map(v => v.truthErrorAfterSolve)))}; max absolute forward residual ${fmt(Math.max(...all16.map(v => v.residual)))}.`;
  target.lastElementChild.append(aggregate);
  diagnostics.observability = { sourceId: id, oneViewRank: reconstruct(fixed).rank,
    cameraOnlyRank: matrixRank(cameraRows), cameraOnlyScreenRank: matrixRank(screenRows),
    cameraOnlyMatrices: [camera30, camera120].map(camera => cameraMatrix(camera).map(appendHiddenZero)),
    cameraOnlyScreens: cameraScreens, fixedNullspaceDirection: [0,0,0,1],
    statusFixed: 'underdetermined', statusCameraOnly: 'underdetermined',
    knownSourceViewsRank: solved.rank,
    knownSourceViewsResidual: solved.residual,
    hiddenTruthComparisonAfterReconstruction: Math.hypot(...truth.map((n, i) => n - solved.reconstructed[i])),
    declaredMatrices: additional.map(o => projectionMatrix(o.theta)),
    solverInputsByCondition: { fixed, camera: cameraOnly, source: additional },
    all16, maxCoordinateErrorAfterSolve: Math.max(...all16.map(v => v.truthErrorAfterSolve)),
    maxForwardResidual: Math.max(...all16.map(v => v.residual)) };
  for (const [condition, buttonId] of [['fixed','compare-fixed'],['camera','compare-camera'],['source','compare-source']])
    $(buttonId).classList.toggle('active', condition === compareCondition);
}
async function render() {
  const token = ++renderToken;
  const c = capture(), s = c.s;
  $('mode-chip').textContent = playing ? 'PLAYING' : mode() === 'saved-run' ? 'PAUSED · SAVED RUN' : 'PAUSED · EXPLORATION';
  $('time-readout').textContent = `${(simulationTimeMs / 1000).toFixed(1)}s / 32s`;
  $('playback-readout').textContent = playing ? 'Source turn playing' : 'Clock paused';
  $('angle-readout').textContent = `x–w ${degrees(s.rotation.theta)}°`;
  $('source-value').textContent = `${degrees(s.rotation.theta)}°`;
  $('camera-value').textContent = `${degrees(s.camera.yaw)}°`;
  $('turn').value = String(Math.round(s.rotation.theta * 180 / Math.PI));
  $('look').value = String(Math.round(s.camera.yaw * 180 / Math.PI));
  $('scrub').value = String(simulationTimeMs);
  $('seek-value').textContent = `${(simulationTimeMs / 1000).toFixed(1)}s`;
  $('vertex-select').value = selectedVertexId;
  $('edge-select').value = selectedEdgeId;
  const byId = Object.fromEntries(s.vertices.map(v => [v.id, v]));
  const edge = EDGES.find(e => e.id === selectedEdgeId);
  const edgeLength = Math.hypot(...byId[edge.from].projected.map((n, i) => n - byId[edge.to].projected[i]));
  $('selection-note').textContent = `Vertex ${selectedVertexId}: q=${vec(byId[selectedVertexId].originalSource)}, p=${vec(byId[selectedVertexId].projected)}. Edge ${selectedEdgeId}: projected length ${fmt(edgeLength)}${edgeLength < 1e-10 ? ' (collapsed, source ID retained)' : ''}. ${diagnostics.siteSelection || ''}`;
  $('comparison').textContent = `Source θ=${degrees(s.rotation.theta)}°, projected ${selectedVertexId}=${vec(byId[selectedVertexId].projected)}. Camera yaw=${degrees(s.camera.yaw)}°, screen=${vec(byId[selectedVertexId].screen)}. Camera controls do not enter P R(θ).`;
  draw(s); drawPair(s); observability();
  const hashes = await hashed(c);
  if (token !== renderToken) return;
  $('geometry-digest').textContent = hashes.projectionSha256;
  $('checkpoint-digest').textContent = hashes.checkpointSha256;
  $('display-digest').textContent = hashes.displaySha256;
  $('state-json').textContent = JSON.stringify({ ...summary(c), ...browserEnvironment(), ...hashes,
    model: s, selectedEdge: { ...edge, projectedLength: edgeLength, collapsed: edgeLength < 1e-10 },
    observability: diagnostics.observability, renderer: diagnostics.renderer }, null, 2);
  $('diagnostics').textContent = JSON.stringify({ ...diagnostics, ...browserEnvironment() }, null, 2);
}
function stopPlayback() { playing = false; playbackToken++; }
function pause(origin = 'manual-control', reason = 'pause button') {
  if (!playing) return;
  const before = capture(); stopPlayback();
  record('playback.pause', { reason }, origin, before); render();
}
function frame(token) {
  if (!playing || token !== playbackToken) return;
  simulationTimeMs = clampTime(startSimulationTimeMs + (performance.now() - startWallMs));
  render();
  if (simulationTimeMs >= DURATION_MS) { pause('automatic-playback', 'end-of-sequence'); return; }
  requestAnimationFrame(() => frame(token));
}
function play() {
  if (playing) return;
  if (simulationTimeMs >= DURATION_MS) simulationTimeMs = 0;
  const before = capture();
  sourceAngleOverride = null; cameraYawOverride = null; playing = true;
  startWallMs = performance.now(); startSimulationTimeMs = simulationTimeMs;
  const token = ++playbackToken;
  record('playback.play', { fromSimulationTimeMs: simulationTimeMs }, 'manual-control', before);
  render(); requestAnimationFrame(() => frame(token));
}
function restore(ms, type, origin = 'manual-control') {
  const before = capture(); stopPlayback();
  sourceAngleOverride = null; cameraYawOverride = null;
  compareCondition = 'source';
  selectedVertexId = MARKED_PAIR[0]; selectedEdgeId = `e-${MARKED_PAIR[0]}-${MARKED_PAIR[1]}`;
  diagnostics.siteSelection = null;
  simulationTimeMs = clampTime(ms);
  record(type, { simulationTimeMs, restoreCanonicalCamera: true, restoreCanonicalSource: true }, origin, before);
  render();
}
async function loadEvidence() {
  const target = $('evidence-links'); target.replaceChildren();
  try {
    const response = await fetch('/api/evidence', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const evidence = await response.json();
    if (evidence.status) target.append(document.createTextNode(evidence.status + ' '));
    for (const shot of evidence.screenshots || []) {
      const a = document.createElement('a'); a.href = shot.url; a.textContent = `${shot.label} · ${(shot.simulationTimeMs / 1000).toFixed(1)}s`; a.target = '_blank'; a.rel = 'noopener'; target.append(a, document.createTextNode(' · '));
    }
    if (evidence.resultsUrl) { const a = document.createElement('a'); a.href = evidence.resultsUrl; a.textContent = 'Gate 3 results'; a.target = '_blank'; a.rel = 'noopener'; target.append(a); }
  } catch { target.textContent = 'Browser evidence pending.'; }
}
async function init() {
  const response = await fetch('/api/run');
  if (!response.ok) throw new Error(`Run load failed: HTTP ${response.status}`);
  run = await response.json();
  if (run.runId !== RUN_ID || run.durationMs !== DURATION_MS) throw new Error('Saved run does not match this build');
  $('run-id').textContent = run.runId;
  $('library-current').textContent = `${RUN_ID} · ${run.buildId} · canonical paused start`;
  $('build-readout').textContent = `Build ${run.buildId} · ${run.dependencyIdentity}`;
  $('recovery-command').textContent = `node /Users/paul/BTC-Learning/experiments/looking-glass/hypercube/builds/${run.buildId}/server.mjs`;
  diagnostics.buildId = run.buildId; diagnostics.runId = run.runId; diagnostics.uiSessionId = sessionId; diagnostics.activityActor = actor;
  const cp = $('checkpoints');
  for (const ms of CHECKPOINTS_MS) { const b = document.createElement('button'); b.textContent = `${ms / 1000}s`; b.dataset.checkpoint = String(ms); b.addEventListener('click', () => restore(ms, 'checkpoint.restore')); cp.append(b); }
  for (const vertex of SOURCE) { const o = document.createElement('option'); o.value = vertex.id; o.textContent = vertex.id; $('vertex-select').append(o); }
  for (const edge of EDGES) { const o = document.createElement('option'); o.value = edge.id; o.textContent = edge.id; $('edge-select').append(o); }
  $('play').addEventListener('click', play);
  $('pause').addEventListener('click', () => pause());
  $('replay').addEventListener('click', () => { restore(0, 'replay.open'); play(); });
  $('library-replay').addEventListener('click', () => { restore(0, 'replay.open'); play(); });
  $('step').addEventListener('click', () => restore(simulationTimeMs + STEP_MS, 'playback.step'));
  $('reset').addEventListener('click', () => restore(0, 'experiment.reset'));
  $('scrub').addEventListener('input', e => restore(Number(e.target.value), 'playback.seek', 'manual-control'));
  $('turn').addEventListener('input', e => { const before = capture(); stopPlayback(); sourceAngleOverride = Number(e.target.value) * Math.PI / 180;
    record('source.rotation.set', { theta: sourceAngleOverride }, 'manual-control', before); render(); });
  $('look').addEventListener('input', e => { const before = capture(); stopPlayback(); cameraYawOverride = Number(e.target.value) * Math.PI / 180;
    record('camera.set', { yaw: cameraYawOverride }, 'manual-control', before); render(); });
  $('vertex-select').addEventListener('change', e => { const before = capture(); selectedVertexId = e.target.value; diagnostics.siteSelection = null;
    record('vertex.select', { vertexId: selectedVertexId }, 'manual-control', before); render(); });
  $('edge-select').addEventListener('change', e => { const before = capture(); selectedEdgeId = e.target.value;
    record('edge.select', { edgeId: selectedEdgeId }, 'manual-control', before); render(); });
  for (const [condition, buttonId] of [['fixed','compare-fixed'],['camera','compare-camera'],['source','compare-source']]) {
    $(buttonId).addEventListener('click', () => {
      const before = capture(); compareCondition = condition; observability();
      record('observability.compare', { condition, solverInputs: diagnostics.observability.solverInputsByCondition[condition],
        status: condition === 'source' ? 'reconstructed' : 'underdetermined',
        rank: condition === 'source' ? diagnostics.observability.knownSourceViewsRank :
          condition === 'camera' ? diagnostics.observability.cameraOnlyRank : diagnostics.observability.oneViewRank,
        all16MaxCoordinateErrorAfterSolve: diagnostics.observability.maxCoordinateErrorAfterSolve,
        all16MaxForwardResidual: diagnostics.observability.maxForwardResidual }, 'manual-control', before);
      render();
    });
  }
  window.addEventListener('resize', () => { render(); scheduleEnvironmentRefresh(); });
  window.addEventListener('scroll', scheduleEnvironmentRefresh, { passive: true });
  document.addEventListener('scroll', scheduleEnvironmentRefresh, { passive: true, capture: true });
  document.querySelector('details.inspector').addEventListener('toggle', () => {
    scheduleEnvironmentRefresh();
    requestAnimationFrame(scheduleEnvironmentRefresh);
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); loadEvidence(); } });
  record('replay.open', { openingState: 'paused-at-start' }, 'programmatic-restore');
  render(); loadEvidence();
}
init().catch(error => { diagnostics.loadError = String(error); $('mode-chip').textContent = 'RUN LOAD ERROR'; $('diagnostics').textContent = JSON.stringify(diagnostics, null, 2); });
