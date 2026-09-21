import { RUN_ID, DURATION_MS, STEP_MS, CHECKPOINTS_MS, BASES, CAMERA, CLIP_RADIUS,
  baseById, baseFromLatLon, chartValid, chartCompensatedPhase, modelAt, cameraProject,
  clampTime, geometryState, clipSegmentToBall, mappingFingerprintState, checkpointFingerprintState } from './model.mjs';
import { mappingState } from './mapping.mjs';

const $ = id => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, label = null) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (label !== null) node.textContent = label;
  return node;
};
const html = (tag, className, label) => { const node = document.createElement(tag); node.className = className; node.textContent = label; return node; };
const sha256 = async value => {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new TextEncoder().encode(JSON.stringify(value));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
};
let run, recordsFixture, mappingFixture;
let simulationTimeMs = 0, playing = false, selectedBaseId = 'east', customBase = null, chart = 'N';
let phaseOverride = null, cameraYawOverride = null, referenceId = 'R_CAPACITY_60';
let selectedRecordId = null, comparing = false, showUnmapped = false;
let startWall = 0, startSimulationTimeMs = 0, playbackToken = 0, renderToken = 0, sequence = 0;
let logQueue = Promise.resolve();
const sessionId = crypto.randomUUID();
const diagnostics = { renderer: 'SVG from computed S³/R⁴ source and stereographic R³ points', actor: 'unspecified-ui', uiSessionId: sessionId };
function selectedP() { return customBase ?? baseById(selectedBaseId).p; }
function isCanonical() { return selectedBaseId === 'east' && !customBase && chart === 'N' && phaseOverride === null && cameraYawOverride === null && referenceId === 'R_CAPACITY_60'; }
function model() { return modelAt(simulationTimeMs, { baseId: selectedBaseId, basePoint: customBase, chart, phaseOverride, cameraYawOverride }); }
function mapping(id = referenceId) { return mappingState(recordsFixture,mappingFixture,id); }
function fullState() { return { model: model(), mapping: mapping(), display: { comparing, showUnmapped, selectedRecordId } }; }
function summary(state = fullState()) {
  const m = state.model;
  return { simulationTimeMs: m.simulationTimeMs, baseId: m.baseId, basePoint: m.basePoint, chart: m.chart, phase: m.phase,
    sourcePoint: m.sourcePoint, hopfPoint: m.hopfPoint, representation: m.selectedRepresentation,
    camera: m.camera, referenceId: state.mapping.reference.id, playing, mode: isCanonical() ? 'saved-run' : 'exploration',
    selectedRecordId, comparing, showUnmapped };
}
function snapshot() { const state = fullState(); return { state, summary: summary(state) }; }
function record(type, intended, before = snapshot(), origin = 'manual-control') {
  const after = snapshot(), ordinal = ++sequence, wallTimestamp = new Date().toISOString();
  logQueue = logQueue.catch(() => {}).then(async () => {
    const fields = async snap => ({ ...snap.summary, stateSha256: await sha256(checkpointFingerprintState(snap.state)),
      modelSha256: await sha256(snap.state.model), geometrySha256: await sha256(geometryState(snap.state.model)),
      mappingSha256: await sha256(mappingFingerprintState(snap.state.mapping)), recordsSha256: await sha256(recordsFixture.records) });
    const event = { sequence: ordinal, kind: 'observed-ui', sessionId, actor: 'unspecified-ui', origin,
      runId: RUN_ID, buildId: run?.buildId, type, intended, before: await fields(before), observed: await fields(after), wallTimestamp };
    const response = await fetch('/api/activity', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(event) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    diagnostics.activityLog = `Saved event ${ordinal}: ${type} / ${origin}`;
    updateDiagnostics();
  }).catch(error => { diagnostics.activityLog = `Could not save event ${ordinal}: ${error}`; updateDiagnostics(); });
}
function updateDiagnostics() { $('diagnostics').textContent = JSON.stringify(diagnostics, null, 2); }
function sphereXY(p) { return [320 + 148 * p[0], 210 - 148 * p[2]]; }
function drawSphere(m) {
  const svg = $('base-svg'); svg.replaceChildren();
  svg.append(el('circle', { cx: 320, cy: 210, r: 151, fill: '#1a414b', stroke: '#a3c4bb', 'stroke-width': 2 }));
  svg.append(el('ellipse', { cx: 320, cy: 210, rx: 148, ry: 44, fill: 'none', stroke: '#86bbb4', 'stroke-opacity': .56 }));
  svg.append(el('ellipse', { cx: 320, cy: 210, rx: 80, ry: 148, fill: 'none', stroke: '#86bbb4', 'stroke-opacity': .36 }));
  svg.append(el('line', { x1: 320, y1: 62, x2: 320, y2: 358, stroke: '#9ac4bb', 'stroke-opacity': .35, 'stroke-dasharray': '3 5' }));
  for (const base of BASES) {
    const [x, y] = sphereXY(base.p), selected = !customBase && m.baseId === base.id;
    const mark = el('circle', { cx: x, cy: y, r: selected ? 9 : 5, fill: selected ? '#f0c98c' : base.p[1] < 0 ? '#6d999b' : '#add7cc',
      stroke: '#122b34', 'stroke-width': 2, 'data-base-id': base.id, tabindex: 0, role: 'button', 'aria-label': `Select ${base.label}` });
    mark.addEventListener('click', () => selectBase(base.id, 'sphere.marker.select'));
    mark.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectBase(base.id, 'sphere.marker.select'); } });
    svg.append(mark);
    if (selected || ['north','south','east','west'].includes(base.id)) svg.append(el('text', { x: x + 11, y: y - 8, fill: selected ? '#ffe8ba' : '#bbd6d0', 'font-size': 12, 'font-weight': 700 }, base.id));
  }
  if (customBase) { const [x, y] = sphereXY(customBase); svg.append(el('circle', { cx: x, cy: y, r: 9, fill: '#f0c98c', stroke: '#172e33', 'stroke-width': 2 })); }
  svg.append(el('text', { x: 18, y: 32, fill: '#c2d8d2', 'font-size': 12 }, `Selected p = (${m.basePoint.map(v => v.toFixed(3)).join(', ')})`));
}
function fiberXY(point, camera) { const projected = cameraProject(point, camera); return { x: 320 + projected.screen[0] * 55, y: 210 + projected.screen[1] * 55, depth: projected.depth }; }
function fiberPath(samples, camera) {
  let d = '', segments = 0, clipped = 0, infinity = 0;
  const boundaries = [];
  for (let j = 0; j < samples.length; j++) {
    const a = samples[j].representation, b = samples[(j + 1) % samples.length].representation;
    if (a.kind === 'infinity' || b.kind === 'infinity') { infinity++; continue; }
    const segment = clipSegmentToBall(a.point,b.point);
    if (!segment) { clipped++; continue; }
    const A = fiberXY(segment.start, camera), B = fiberXY(segment.end, camera);
    d += `M${A.x.toFixed(3)},${A.y.toFixed(3)}L${B.x.toFixed(3)},${B.y.toFixed(3)}`;
    if (segment.clippedStart) boundaries.push(A);
    if (segment.clippedEnd) boundaries.push(B);
    segments++;
  }
  return { d, segments, clipped, infinity, boundaries };
}
function drawFibers(m) {
  const svg = $('fiber-svg'); svg.replaceChildren();
  svg.append(el('text', { x: 19, y: 31, fill: '#bcd5ce', 'font-size': 12 }, 'R³ stereo projection · ||P|| ≤ 4 clip · boundary dots mark exits'));
  const pathReports = {};
  const ordered = [...m.fibers].sort((a, b) => (a.id === m.baseId) - (b.id === m.baseId));
  for (const fiber of ordered) {
    const selected = fiber.id === m.baseId && !customBase, path = fiberPath(fiber.samples, m.camera);
    pathReports[fiber.id] = { renderedSegments: path.segments, clippedSegments: path.clipped, infinityBreaks: path.infinity, boundaryPoints: path.boundaries.length };
    const visible = el('path', { d: path.d, fill: 'none', stroke: selected ? '#f3cb89' : fiber.id === 'south' ? '#9ad1cc' : '#81aaa9',
      'stroke-width': selected ? 3.8 : 1.7, 'stroke-opacity': selected ? 1 : .58, 'stroke-linecap': 'round',
      'data-fiber-id': fiber.id });
    svg.append(visible);
    const hit = el('path', { d: path.d, fill: 'none', stroke: 'transparent', 'stroke-width': 18, 'data-fiber-id': fiber.id,
      tabindex: 0, role: 'button', 'aria-label': `Select ${fiber.id} fiber` });
    hit.addEventListener('click', () => selectBase(fiber.id, 'fiber.select'));
    hit.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectBase(fiber.id, 'fiber.select'); } });
    svg.append(hit);
    if (selected && path.boundaries.length) for (const p of path.boundaries) {
      svg.append(el('circle', { cx:p.x,cy:p.y,r:4.2,fill:'#f3cb89',stroke:'#162f38','stroke-width':1.5 }));
    }
  }
  if (customBase) {
    const path = fiberPath(m.selectedSamples, m.camera);
    pathReports.custom = { renderedSegments: path.segments, clippedSegments: path.clipped, infinityBreaks: path.infinity, boundaryPoints: path.boundaries.length };
    svg.append(el('path', { d: path.d, fill: 'none', stroke: '#f3cb89', 'stroke-width': 3.8, 'data-fiber-id': 'custom' }));
  }
  if (m.selectedRepresentation.kind === 'inside') {
    const pt = fiberXY(m.selectedRepresentation.point, m.camera);
    svg.append(el('circle', { cx: pt.x, cy: pt.y, r: 7, fill: '#fff2cb', stroke: '#22343a', 'stroke-width': 2 }));
  }
  $('fiber-status').textContent = customBase ? 'Custom point → one fiber' : `${baseById(m.baseId).label} → one fiber`;
  $('boundary-note').textContent = m.selectedRepresentation.kind === 'infinity'
    ? 'This source point is the excluded stereographic pole: its R³ image is at infinity. The source point and Hopf base remain valid.'
    : m.selectedRepresentation.kind === 'clipped' ? 'The selected R³ image lies beyond the fixed radius-4 viewport. Curve endpoints mark the clip boundary; the source point remains in the inspector.'
      : m.baseId === 'south' ? 'South fiber is an unbounded line in R³. Its boundary dots indicate continuation toward infinity; segments across infinity are never joined.'
        : 'Chart choices are local phase conventions. They do not change the selected source point when compensated.';
  return pathReports;
}
function renderAttention() {
  const reference = mapping().reference, assignments = mapping().assignments, records = recordsFixture.records;
  $('reference').value = referenceId;
  $('reference-meta').textContent = `${reference.wording} · ${reference.id} v${reference.version} · ${reference.author} · ${reference.scope}. Rule: ${reference.criteria} Full event feasibility remains unknown from this partial mapping; the weather card remains unmapped.`;
  const target = $('attention-loops'); target.replaceChildren();
  for (const [status, title] of [['yes','YES / EAST'],['no','NO / WEST'],['unmapped','UNMAPPED · NO POINT']]) {
    const box = html('div','loop','');
    box.append(html('h4','',title));
    const items = assignments.filter(a => status === 'unmapped' ? a.status === 'unmapped' : a.answer === status);
    if (status !== 'unmapped') {
      const svg = el('svg',{ viewBox:'0 0 320 220', class:'semantic-svg', role:'img', 'aria-label':`${title} display loop with selectable record markers` });
      svg.append(el('circle',{cx:160,cy:110,r:66,fill:'none',stroke:'#82aaa3','stroke-width':2.5,'stroke-dasharray':'4 4'}));
      svg.append(el('circle',{cx:160,cy:110,r:3,fill:'#84a9a4'}));
      for (const assignment of items) {
        const record = records.find(r=>r.id===assignment.recordId), phase=assignment.displayPhaseRad;
        const x=160+66*Math.cos(phase), y=110-66*Math.sin(phase);
        const group = el('g',{ 'data-record-id':record.id, tabindex:0, role:'button',
          'aria-label':`Inspect ${record.label} on ${title} loop; arbitrary phase ${phase.toFixed(3)} radians` });
        group.append(el('circle',{cx:x,cy:y,r:9,fill:selectedRecordId===record.id?'#ffe5ae':'#e3c08b',stroke:'#19323a','stroke-width':2}));
        const tx = x > 190 ? x-13 : x+13;
        group.append(el('text',{x:tx,y:y+4,fill:'#f3e3c8','font-size':12,'font-weight':700,
          'text-anchor':x>190?'end':'start','paint-order':'stroke',stroke:'#10242d','stroke-width':3},record.label));
        group.addEventListener('click',()=>selectRecord(record.id));
        group.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRecord(record.id);} });
        svg.append(group);
      }
      box.append(svg);
      box.append(html('p','note','Marker angle is an arbitrary display slot; the circle does not assert semantic topology.'));
    } else {
      for (const assignment of items) {
        if (!showUnmapped) continue;
        const record=records.find(r=>r.id===assignment.recordId), button=html('button','record-pill',`${record.label} · ${record.id}`);
        button.addEventListener('click',()=>selectRecord(record.id)); box.append(button);
      }
    }
    if (!items.length || (status === 'unmapped' && !showUnmapped)) box.append(html('span','note',status === 'unmapped' ? `${items.length} retained; show to inspect` : 'No records'));
    target.append(box);
  }
  const selected = records.find(r => r.id === selectedRecordId);
  const detail = $('record-detail'); detail.replaceChildren();
  if (selected) {
    const a = assignments.find(item => item.recordId === selected.id);
    detail.append(html('strong','',`${selected.label} · ${selected.id} · SHA-256 ${selected.contentSha256}`));
    detail.append(html('p','',`${a.status}${a.answer ? ` / ${a.answer} / ${a.baseId}` : ''}. ${a.reason} Display phase ${a.displayPhaseRad === null ? 'none' : `${a.displayPhaseRad.toFixed(3)} rad (arbitrary slot)`}.`));
    detail.append(html('pre','',JSON.stringify({ facts: selected.facts, source: selected.source, history: selected.history }, null, 2)));
  } else detail.textContent = 'Select a record on its displayed loop to inspect its immutable facts, source hash and placement reason.';
  const plain = $('plain-view'); plain.replaceChildren();
  plain.append(html('strong','','Plain equivalent · all four records, same mapping and reasons'));
  const table = document.createElement('table');
  const header = document.createElement('tr');
  for (const cell of ['Record / SHA-256','Supplied facts','Current answer / placement','Display phase','Reason','Source / history']) header.append(html('th','',cell));
  table.append(header);
  for (const record of records) {
    const a = assignments.find(item => item.recordId === record.id), tr = document.createElement('tr');
    for (const cell of [`${record.label} (${record.id})\n${record.contentSha256}`, JSON.stringify(record.facts), `${a.status}${a.answer ? ` · ${a.answer} · ${a.baseId}` : ''}`,
      a.displayPhaseRad === null ? 'none · off loop' : `${a.displayPhaseRad.toFixed(3)} rad · arbitrary display slot`,
      a.reason, JSON.stringify({source:record.source,history:record.history})]) tr.append(html('td','',cell));
    table.append(tr);
  }
  plain.append(table);
  if (comparing) {
    const otherId = referenceId === 'R_CAPACITY_60' ? 'R_EXISTING_ACCESS' : 'R_CAPACITY_60';
    const other = mapping(otherId);
    const compareTable = document.createElement('table'), row = document.createElement('tr');
    for (const cell of ['Record','Current reference','Other reference','What changed']) row.append(html('th','',cell));
    compareTable.append(row);
    for (const record of records) {
      const a = assignments.find(item => item.recordId === record.id), b = other.assignments.find(item => item.recordId === record.id);
      const tr = document.createElement('tr');
      for (const cell of [record.label, `${a.answer ?? a.status} · ${a.reason}`, `${b.answer ?? b.status} · ${b.reason}`,
        a.answer === b.answer ? 'same assignment; source unchanged' : 'criterion changes the assignment; source unchanged']) tr.append(html('td','',cell));
      compareTable.append(tr);
    }
    plain.append(html('p','',`Compare with ${other.reference.wording} Both definitions remain available; this display choice commits no participant.`));
    plain.append(compareTable);
  }
}
function render() {
  if (!run || !recordsFixture || !mappingFixture) return;
  const m = model(); drawSphere(m); const pathReports = drawFibers(m); renderAttention();
  $('mode-chip').textContent = `${isCanonical() ? 'SAVED RUN' : 'EXPLORATION'} · ${playing ? 'PLAYING' : 'PAUSED'}`;
  $('time-readout').textContent = `00:${String(Math.floor(simulationTimeMs / 1000)).padStart(2,'0')} / 00:24`;
  $('seek-value').textContent = `${(simulationTimeMs/1000).toFixed(1)}s`;
  $('scrub').value = String(simulationTimeMs);
  $('phase-readout').textContent = `Source phase ${(m.phase * 180 / Math.PI).toFixed(1)}°`;
  $('phase-value').textContent = `${(m.phase * 180 / Math.PI).toFixed(1)}°`;
  $('phase').value = String(((m.phase * 180 / Math.PI) % 360 + 360) % 360);
  $('camera-value').textContent = `${(m.camera.yaw * 180 / Math.PI).toFixed(1)}°`;
  $('camera').value = String(Math.round(m.camera.yaw * 180 / Math.PI));
  $('chart-status').textContent = `Chart ${m.chart === 'N' ? 'north' : 'south'}`;
  $('lat-value').textContent = `${(Math.asin(m.basePoint[2])*180/Math.PI).toFixed(0)}°`;
  $('lon-value').textContent = `${(Math.atan2(m.basePoint[1],m.basePoint[0])*180/Math.PI).toFixed(0)}°`;
  $('latitude').value = String(Math.round(Math.asin(m.basePoint[2])*180/Math.PI));
  $('longitude').value = String(Math.round(Math.atan2(m.basePoint[1],m.basePoint[0])*180/Math.PI));
  $('base-name').textContent = customBase ? 'Custom surface point' : baseById(m.baseId).label;
  for (const button of $('base-buttons').querySelectorAll('button')) button.classList.toggle('active', !customBase && button.dataset.baseId === selectedBaseId);
  const unavailable = !chartValid(m.basePoint, m.chart === 'N' ? 'S' : 'N');
  $('chart-toggle').disabled = unavailable;
  if (unavailable) $('chart-status').textContent += ` · ${m.chart === 'N' ? 'south chart unavailable at north pole' : 'north chart unavailable at south pole'}`;
  const token = ++renderToken;
  Promise.all([sha256(checkpointFingerprintState(fullState())), sha256(m), sha256(geometryState(m)), sha256(mappingFingerprintState(mapping())), sha256(recordsFixture.records)]).then(([stateSha256,modelSha256,geometrySha256,mappingSha256,recordsSha256]) => {
    if (token !== renderToken) return;
    $('state-json').textContent = JSON.stringify({ runId: RUN_ID, buildId: run.buildId, ...summary(), sourceNorm: m.sourceNorm,
      sampling: m.sampling, clipping: m.clipping, pathReports, selectedSamples: m.selectedSamples,
      recordHashes: recordsFixture.records.map(r => ({ id: r.id, sha256: r.contentSha256 })),
      stateSha256, modelSha256, geometrySha256, mappingSha256, recordsSha256, renderer: 'SVG', viewport: { width: innerWidth, height: innerHeight, devicePixelRatio } }, null, 2);
  }).catch(error => { diagnostics.hashError = String(error); updateDiagnostics(); });
}
function stopPlayback() { playing = false; playbackToken++; }
function restoreCanonical() { selectedBaseId = 'east'; customBase = null; chart = 'N'; phaseOverride = null; cameraYawOverride = null; referenceId = 'R_CAPACITY_60'; comparing = false; showUnmapped = false; selectedRecordId = null; }
function seek(ms, type = 'playback.seek', intended = {}, before = snapshot()) {
  stopPlayback(); restoreCanonical(); simulationTimeMs = clampTime(ms);
  record(type, { requestedSimulationTimeMs: ms, ...intended }, before, 'manual-control'); render();
}
function pause(origin = 'manual-control') { const before = snapshot(); stopPlayback(); record('playback.pause', { simulationTimeMs, reason: origin === 'automatic-playback' ? 'end-of-sequence' : 'control' }, before, origin); render(); }
function frame(token) {
  if (!playing || token !== playbackToken) return;
  simulationTimeMs = clampTime(startSimulationTimeMs + performance.now() - startWall);
  render();
  if (simulationTimeMs >= DURATION_MS) return pause('automatic-playback');
  requestAnimationFrame(() => frame(token));
}
function play() {
  const before = snapshot(); restoreCanonical();
  if (simulationTimeMs >= DURATION_MS) simulationTimeMs = 0;
  playing = true; startWall = performance.now(); startSimulationTimeMs = simulationTimeMs;
  const token = ++playbackToken;
  record('playback.play', { fromSimulationTimeMs: simulationTimeMs, sequence: 'canonical' }, before);
  render(); requestAnimationFrame(() => frame(token));
}
function selectBase(id, type = 'base.select') {
  const before = snapshot(); stopPlayback(); selectedBaseId = id; customBase = null;
  chart = id === 'south' ? 'S' : 'N';
  phaseOverride = 0;
  record(type, { baseId: id, source: type === 'fiber.select' ? 'rendered fiber' : 'surface point or named control' }, before);
  render();
}
function selectRecord(id) { const before = snapshot(); selectedRecordId = id; record('attention.record.inspect', { recordId: id }, before); render(); }
async function loadEvidence() {
  try {
    const response = await fetch('/api/evidence');
    if (!response.ok) return;
    const evidence = await response.json(), target = $('evidence-links'); target.replaceChildren();
    if (Array.isArray(evidence.screenshots) && evidence.screenshots.length) for (const shot of evidence.screenshots) {
      const link = document.createElement('a'); link.href = shot.url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = shot.label || shot.url; target.append(link, document.createTextNode(' · '));
    } else target.textContent = evidence.status || 'Browser captures pending.';
    if (evidence.resultsUrl) { const a = document.createElement('a'); a.href = evidence.resultsUrl; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Results'; target.append(a); }
  } catch (error) { diagnostics.evidenceError = String(error); updateDiagnostics(); }
}
async function init() {
  const responses = await Promise.all(['/api/run','/fictional-records.json','/reference-mappings.json'].map(url => fetch(url)));
  for (const response of responses) if (!response.ok) throw new Error(`Load failed: ${response.url} / ${response.status}`);
  [run,recordsFixture,mappingFixture] = await Promise.all(responses.map(r => r.json()));
  if (run.runId !== RUN_ID || run.durationMs !== DURATION_MS) throw new Error('Saved run does not match model');
  $('run-id').textContent = RUN_ID;
  $('build-readout').textContent = `Build ${run.buildId} · ${run.dependencyIdentity}`;
  $('library-current').textContent = `${RUN_ID} · ${run.buildId}`;
  diagnostics.buildId = run.buildId; diagnostics.runId = RUN_ID; diagnostics.viewport = { width: innerWidth, height: innerHeight, devicePixelRatio };
  updateDiagnostics();
  for (const base of BASES) {
    const button = html('button','',base.label); button.dataset.baseId = base.id;
    button.addEventListener('click', () => selectBase(base.id)); $('base-buttons').append(button);
  }
  for (const ref of mappingFixture.referenceDefinitions) { const opt = document.createElement('option'); opt.value = ref.id; opt.textContent = ref.wording; $('reference').append(opt); }
  for (const ms of CHECKPOINTS_MS) {
    const button = html('button','',`${ms/1000}s`); button.dataset.checkpoint = String(ms);
    button.addEventListener('click', () => seek(ms, 'checkpoint.restore', { checkpointMs: ms })); $('checkpoints').append(button);
  }
  $('base-svg').addEventListener('click', event => {
    if (event.target.dataset.baseId) return;
    const svg = event.currentTarget, point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(svg.getScreenCTM().inverse()), x = local.x, y = local.y,
      X = (x-320)/148, Z = -(y-210)/148, q = 1-X*X-Z*Z;
    if (q < 0) return;
    const p = [X, Math.sqrt(Math.max(0,q)), Z], before = snapshot(); stopPlayback();
    selectedBaseId = 'custom'; customBase = p; chart = chartValid(p,'N') ? 'N' : 'S'; phaseOverride = 0;
    record('base.surface.select', { basePoint: p, screen: [x,y], hemisphere: 'visible +Y' }, before); render();
  });
  $('play').addEventListener('click', play);
  $('replay').addEventListener('click', () => { seek(0, 'replay.open', { openingState: 'paused-at-start' }); play(); });
  $('pause').addEventListener('click', () => pause('manual-control'));
  $('step').addEventListener('click', () => seek(simulationTimeMs+STEP_MS,'playback.step',{ deltaMs: STEP_MS }));
  $('reset').addEventListener('click', () => seek(0,'correspondence.reset',{ checkpointMs: 0 }));
  $('scrub').addEventListener('input', event => { const requested = Number(event.currentTarget.value), before = snapshot(); seek(requested,'playback.seek',{},before); });
  $('phase').addEventListener('input', event => {
    const requestedDegrees = Number(event.currentTarget.value), before = snapshot(); stopPlayback(); phaseOverride = requestedDegrees*Math.PI/180;
    record('fiber.phase.set',{ requestedDegrees, requestedRadians: phaseOverride },before); render();
  });
  $('camera').addEventListener('input', event => {
    const requestedDegrees = Number(event.currentTarget.value), before = snapshot(); stopPlayback(); cameraYawOverride = requestedDegrees*Math.PI/180;
    record('camera.set',{ requestedDegrees, requestedRadians: cameraYawOverride },before); render();
  });
  for (const id of ['latitude','longitude']) $(id).addEventListener('input', event => {
    const requested = Number(event.currentTarget.value), before = snapshot(); stopPlayback();
    const old = selectedP(), lat = id === 'latitude' ? requested : Math.asin(old[2])*180/Math.PI,
      lon = id === 'longitude' ? requested : Math.atan2(old[1],old[0])*180/Math.PI;
    customBase = baseFromLatLon(lat,lon); selectedBaseId = 'custom';
    chart = chartValid(customBase,'N') ? 'N' : 'S';
    phaseOverride = 0;
    record('base.coordinate.set',{ requestedControl: id, requestedDegrees: requested, latitudeDegrees: lat, longitudeDegrees: lon },before); render();
  });
  $('chart-toggle').addEventListener('click', () => {
    const before = snapshot(), next = chart === 'N' ? 'S' : 'N', p = selectedP();
    if (!chartValid(p,next)) return;
    stopPlayback(); const oldPhase = phaseOverride ?? 2*Math.PI*simulationTimeMs/DURATION_MS;
    phaseOverride = chartCompensatedPhase(p,oldPhase,chart,next); chart = next;
    record('chart.switch',{ fromChart: before.summary.chart, toChart: next, phaseBefore: oldPhase, phaseAfter: phaseOverride, compensation: 'preserve source q' },before); render();
  });
  $('reference').addEventListener('change', event => { const requestedId = event.currentTarget.value, before = snapshot(); stopPlayback(); referenceId = requestedId;
    record('attention.reference.change',{ requestedReferenceId: requestedId },before); render(); });
  $('compare').addEventListener('click', () => { const before = snapshot(); comparing = !comparing; record('attention.compare.set',{ compare: comparing },before); render(); });
  $('show-unmapped').addEventListener('click', () => { const before = snapshot(); showUnmapped = !showUnmapped; record('attention.unmapped.set',{ showUnmapped },before); render(); });
  record('replay.open',{ runId: RUN_ID, openingState: 'paused-at-start' },snapshot(),'programmatic-restore');
  render(); loadEvidence();
}
init().catch(error => { diagnostics.loadError = String(error); updateDiagnostics(); $('mode-chip').textContent = 'LOAD ERROR'; });
