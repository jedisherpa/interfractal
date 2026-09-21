const $ = id => document.getElementById(id);
const svgNS = 'http://www.w3.org/2000/svg';
const el = (tag, className, value) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = String(value);
  return node;
};
const svgEl = (tag, attrs = {}) => {
  const node = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};
const text = (id, value) => { $(id).textContent = String(value); };
const fmt = value => {
  const rounded = Math.abs(Number(value)) < 0.0000005 ? 0 : Number(value);
  return rounded.toFixed(6).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
};
const TOUR = [
  ['Q01', 'static'], ['Q02', 'prescribed'], ['Q03', 'interactive'],
  ['Q04', 'prescribed'], ['Q05', 'static'], ['Q06', 'interactive'],
  ['Q07', 'attention'], ['Q08', 'plain']
];
const checkpoints = Array.from({length: 9}, (_, i) => i * 6000);
const S = {
  fixture: null, run: null, sessionId: crypto.randomUUID(), taskId: 'Q01', condition: 'static',
  frameIndex: 0, mode: 'saved', simulationMs: 0, playing: false, playKind: null,
  timer: null, lastTick: 0, selected: new Map(), receipts: new Map(), explanations: new Map(),
  digestGeneration: 0, actor: 'unattributed_local', logSeq: 0, lastLoggedState: null
};
const task = () => S.fixture.tasks.find(t => t.id === S.taskId);
const conditions = t => t.family === 'geometry' ? ['static', 'prescribed', 'interactive'] : ['attention', 'plain'];
const currentPublicState = () => ({runId: S.run.runId, buildId: S.run.buildId,
  mode: S.mode === 'saved' ? 'saved-replay' : 'exploration',
  simulationTimeMs: S.simulationMs, cursorSeconds: S.simulationMs / 1000,
  paused: !S.playing, actor: S.actor, selectedPointId: task().selectedPointId || null,
  viewport: {innerWidth: window.innerWidth, innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio, scrollX: window.scrollX, scrollY: window.scrollY},
  scene: {width: Math.round($('frames').getBoundingClientRect().width),
    height: Math.round($('frames').getBoundingClientRect().height),
    svgSizes: [...$('frames').querySelectorAll('svg')].map(svg => ({
      width: Math.round(svg.getBoundingClientRect().width),
      height: Math.round(svg.getBoundingClientRect().height)}))}, taskId: S.taskId,
  condition: S.condition, frameIndex: S.frameIndex, playing: S.playing,
  availableFrameIds: task().frames.map(f => f.id),
  answerCount: S.receipts.size, revealedCount: S.explanations.size});
async function digest(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const output = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(output)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function eventBoundary() {
  return {simulationTimeMs: S.simulationMs, taskId: S.taskId, condition: S.condition,
    frameIndex: S.frameIndex, paused: !S.playing, actor: S.actor,
    answerCount: S.receipts.size, revealedCount: S.explanations.size};
}
function record(type, origin = 'user-control', intended = {}) {
  const after = eventBoundary(), before = S.lastLoggedState;
  S.lastLoggedState = after;
  fetch('/api/activity', {method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({sessionId: S.sessionId, seq: ++S.logSeq, type, origin,
      actor: S.actor, taskId: S.taskId, condition: S.condition,
      frameId: task().frames[S.frameIndex]?.id, intended, before, after})}).catch(() => {});
}
function stopClock() {
  S.playing = false; S.playKind = null;
  if (S.timer) clearInterval(S.timer);
  S.timer = null;
}
function tourAt(ms) {
  const t = Math.max(0, Math.min(48000, Math.round(ms / 100) * 100));
  const block = t === 48000 ? 0 : Math.floor(t / 6000);
  const offset = t === 48000 ? 0 : t % 6000;
  const [taskId, condition] = TOUR[block];
  return {t, taskId, condition,
    frameIndex: ['static', 'attention'].includes(condition) ? 0 : Math.min(2, Math.floor(offset / 2000))};
}
function seek(ms, origin = 'manual') {
  stopClock();
  const scheduled = tourAt(ms);
  S.mode = 'saved'; S.simulationMs = scheduled.t; S.taskId = scheduled.taskId;
  S.condition = scheduled.condition; S.frameIndex = scheduled.frameIndex;
  render();
  if (origin === 'manual') record('replay.seek');
}
function reopen() {
  stopClock();
  S.selected.clear(); S.receipts.clear(); S.explanations.clear();
  S.sessionId = crypto.randomUUID(); S.actor = 'unattributed_local';
  S.logSeq = 0; S.lastLoggedState = null;
  seek(0, 'restore');
  record('replay.reopen');
}
function playTour(fromStart = false) {
  if (fromStart || S.mode !== 'saved' || S.simulationMs === 48000) seek(0, 'restore');
  stopClock(); S.playing = true; S.playKind = 'tour'; S.lastTick = performance.now();
  S.timer = setInterval(() => {
    const priorTask = S.taskId, priorFrame = S.frameIndex;
    const now = performance.now();
    const elapsed = now - S.lastTick; S.lastTick = now;
    const next = Math.min(48000, S.simulationMs + elapsed);
    const scheduled = tourAt(next);
    S.simulationMs = scheduled.t; S.taskId = scheduled.taskId;
    S.condition = scheduled.condition; S.frameIndex = scheduled.frameIndex;
    if (S.taskId !== priorTask || S.frameIndex !== priorFrame)
      record('replay.frame-or-task', 'replay', {fromTaskId: priorTask, fromFrameIndex: priorFrame});
    if (S.simulationMs >= 48000) {
      stopClock(); record('replay.auto-stop', 'automatic', {reason: 'end-of-sequence'});
    }
    render();
  }, 100);
  record(fromStart ? 'replay.from-start' : 'replay.play');
  render();
}
function selectTask(id) {
  if (!S.fixture.tasks.some(t => t.id === id)) return;
  stopClock(); S.mode = 'explore'; S.taskId = id;
  S.condition = conditions(task())[0]; S.frameIndex = 0;
  render(); record('task.open');
}
function selectCondition(condition) {
  if (!conditions(task()).includes(condition)) return;
  stopClock(); S.mode = 'explore';
  if (task().family === 'geometry') S.frameIndex = 0;
  S.condition = condition;
  render(); record('condition.select');
}
function selectFrame(index) {
  if (!Number.isInteger(index) || index < 0 || index >= task().frames.length) return;
  stopClock(); S.mode = 'explore'; S.frameIndex = index;
  render(); record('frame.select');
}
function playFrames() {
  stopClock(); S.mode = 'explore'; S.frameIndex = 0;
  S.playing = true; S.playKind = 'frames'; S.lastTick = performance.now();
  let elapsed = 0;
  S.timer = setInterval(() => {
    const now = performance.now(); elapsed += now - S.lastTick; S.lastTick = now;
    const next = Math.min(task().frames.length - 1, Math.floor(elapsed / 2000));
    if (next !== S.frameIndex) { S.frameIndex = next; render(); record('presentation.frame', 'automatic'); }
    if (elapsed >= task().frames.length * 2000) {
      stopClock(); render(); record('presentation.auto-stop', 'automatic', {reason: 'end-of-sequence'});
    }
  }, 100);
  record('frames.play'); render();
}

function renderTeaching() {
  const container = $('teaching-content'); container.replaceChildren();
  const ul = el('ul');
  S.fixture.teaching.text.forEach(line => ul.append(el('li', null, line)));
  container.append(ul);
  container.append(el('p', null,
    `Suggested teaching: ${S.fixture.teaching.recommendedSeconds}s, optional. Suggested task time: ${S.fixture.timing.recommendedTaskSeconds}s, optional. There is no recorded human timing or performance.`));
  container.append(el('p', null,
    'Geometry: the sheet, sequence, and frame selector offer the same finite observations. The sequence holds each frame for 2 seconds; no in-between model frames exist. Attention: local objects and the plain table use the same records and rules.'));
  const software = el('button', '', 'Software validation mode');
  software.id = 'software-validation';
  software.addEventListener('click', () => {
    S.actor = 'software_validation'; software.classList.add('active');
    record('validation.mode-select'); render();
  });
  container.append(software);
  container.append(el('p', null, 'Select this before agent or host answer-mechanics checks. UI actions never authenticate a human participant.'));
}
function renderCaseList() {
  const list = $('case-list'); list.replaceChildren();
  S.fixture.tasks.forEach(t => {
    const b = el('button', S.taskId === t.id ? 'active' : '', t.id);
    b.append(el('small', null, t.family === 'geometry' ? 'Geometry observation' : 'Reference / scale'));
    b.addEventListener('click', () => selectTask(t.id)); list.append(b);
  });
}
function renderTask() {
  const t = task();
  text('case-label', `${t.id} · ${t.family.toUpperCase()}`);
  text('task-prompt', t.prompt);
  text('task-family', t.family === 'geometry' ? 'GEOMETRY' : 'REFERENCE / SCALE');
  const facts = $('facts'); facts.replaceChildren();
  t.availableFacts.forEach(fact => facts.append(el('li', null, fact)));
  const buttons = $('condition-buttons'); buttons.replaceChildren();
  conditions(t).forEach(condition => {
    const b = el('button', S.condition === condition ? 'active' : '', S.fixture.conditions[condition].label);
    b.addEventListener('click', () => selectCondition(condition)); buttons.append(b);
  });
  text('condition-desc', S.fixture.conditions[S.condition].access);
}
function cameraXY(point, camera) {
  const yaw = camera.yawDegrees * Math.PI / 180;
  const pitch = camera.pitchDegrees * Math.PI / 180;
  const [x, y, z] = point;
  const horizontal = x * Math.cos(yaw) + z * Math.sin(yaw);
  const depth = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const vertical = y * Math.cos(pitch) - depth * Math.sin(pitch);
  return [160 + horizontal * camera.scale, 115 - vertical * camera.scale];
}
function pointSvg(frame, selectedId) {
  const svg = svgEl('svg', {viewBox: '0 0 320 230', role: 'img',
    'aria-label': `Display-camera drawing for ${frame.id}; raw xyz observations follow`});
  for (const p of [40, 80, 120, 160, 200, 240, 280]) {
    svg.append(svgEl('line', {x1: p, y1: 12, x2: p, y2: 218, stroke: '#1e3942', 'stroke-width': 1}));
  }
  for (const p of [35, 75, 115, 155, 195])
    svg.append(svgEl('line', {x1: 12, y1: p, x2: 308, y2: p, stroke: '#1e3942', 'stroke-width': 1}));
  svg.append(svgEl('line', {x1: 160, y1: 15, x2: 160, y2: 215, stroke: '#567783', 'stroke-width': 1}));
  svg.append(svgEl('line', {x1: 15, y1: 115, x2: 305, y2: 115, stroke: '#567783', 'stroke-width': 1}));
  for (const p of frame.points) {
    const [x, y] = cameraXY(p.xyz, frame.displayCamera);
    const fill = p.id === selectedId ? '#e6c785' : '#86c6be';
    if (p.marker === 'square') svg.append(svgEl('rect', {x: x - 7, y: y - 7, width: 14, height: 14,
      rx: 2, fill, stroke: '#10252b', 'stroke-width': 2}));
    else svg.append(svgEl('circle', {cx: x, cy: y, r: 8, fill, stroke: '#10252b', 'stroke-width': 2}));
    const label = svgEl('text', {x: x + 11, y: y - 10, fill: '#eef2e9',
      'font-family': 'system-ui', 'font-size': 14, 'font-weight': 700});
    label.textContent = p.id; svg.append(label);
  }
  return svg;
}
function ballSvg(frame, title, body) {
  const svg = svgEl('svg', {viewBox: '0 0 320 230', role: 'img',
    'aria-label': `${title}: ${body.kind}${body.radius === null ? '' : `, radius ${body.radius}`}`});
  svg.append(svgEl('ellipse', {cx: 160, cy: 181, rx: 100, ry: 19, fill: '#0f2c32'}));
  if (body.kind === 'ball') {
    const radius = Math.max(2, 75 * body.radius / 1.2);
    svg.append(svgEl('circle', {cx: 160, cy: 108, r: radius,
      fill: title === 'Projection' ? '#438e9b' : '#af8d55',
      stroke: title === 'Projection' ? '#94d1d0' : '#e4c889', 'stroke-width': 3}));
    svg.append(svgEl('ellipse', {cx: 160, cy: 108, rx: radius, ry: Math.max(4, radius * .38),
      fill: 'none', stroke: '#e7f0e0aa', 'stroke-width': 1.5}));
  } else if (body.kind === 'point') {
    svg.append(svgEl('circle', {cx: 160, cy: 108, r: 6, fill: '#e4c889'}));
  }
  const label = svgEl('text', {x: 160, y: 208, 'text-anchor': 'middle', fill: '#e9f0eb',
    'font-family': 'system-ui', 'font-size': 15, 'font-weight': 700});
  label.textContent = body.kind === 'empty' ? 'EMPTY' : `${body.kind.toUpperCase()} · r = ${body.radius}`;
  svg.append(label); return svg;
}
function makeTable(headers, rows, className = '') {
  const table = el('table', className), head = el('thead'), tr = el('tr');
  headers.forEach(value => tr.append(el('th', null, value)));
  head.append(tr); table.append(head);
  const tbody = el('tbody');
  rows.forEach(row => {
    const line = el('tr'); row.forEach(value => line.append(el('td', null, value)));
    tbody.append(line);
  });
  table.append(tbody); return table;
}
function renderPointFrame(card, t, frame) {
  card.append(pointSvg(frame, t.selectedPointId));
  const p = frame.parameters;
  const parameterText = [`α ${p.alphaDegrees}°`];
  if (p.betaDegrees !== undefined) parameterText.push(`β ${p.betaDegrees}°`);
  card.append(el('p', 'frame-meta', `Source settings: ${parameterText.join(' · ')}. Display camera: yaw ${frame.displayCamera.yawDegrees}°, pitch ${frame.displayCamera.pitchDegrees}°.`));
  card.append(makeTable(['Point', 'raw x′', 'raw y′', 'raw z′'], frame.points.map(point =>
    [point.id, ...point.xyz.map(fmt)])));
}
function renderBallFrame(card, t, frame) {
  const pair = el('div', 'context-pair');
  if (frame.projection) {
    const a = el('div'); a.append(ballSvg(frame, 'Projection', frame.projection)); pair.append(a);
  }
  const b = el('div'); b.append(ballSvg(frame, 'Slice', frame.slice)); pair.append(b);
  card.append(pair);
  if (frame.parameters.sliceW !== undefined)
    card.append(el('p', 'frame-meta', `Slice plane w = ${frame.parameters.sliceW}. Full projection remains a separate observation.`));
  else card.append(el('p', 'frame-meta', `Display camera: yaw ${frame.displayCamera.yawDegrees}°, pitch ${frame.displayCamera.pitchDegrees}°. Hidden settings are not supplied.`));
  card.append(makeTable(frame.projection ? ['Observation', 'Kind', 'Radius'] : ['Observation', 'Kind', 'Radius'],
    [['Slice', frame.slice.kind, frame.slice.radius === null ? '—' : frame.slice.radius],
      ...(frame.projection ? [['Full projection', frame.projection.kind, frame.projection.radius]] : [])]));
}
function recordDetails(frame, contextId) {
  const record = frame.records?.find(r => r.contextId === contextId);
  if (!record) return 'No source cost detail is supplied in this frame.';
  return `Record ${record.id}: capacity ${record.capacity}; existing access ${record.existingAccess ? 'yes' : 'no'}; required costs ${record.requiredCosts.map(c => `${c.id} ${c.tokens}`).join(', ')} tokens.`;
}
function renderContextFrame(card, frame) {
  card.append(el('p', 'frame-meta', `Shared reference ${frame.referenceId}. Receiving screen: capacity ≥${frame.receiver.capacityMin}; setup cost ≤${frame.receiver.budgetMax} tokens. Detail: ${frame.detailLevel}.`));
  const references = frame.references.map(r => `${r.id}: ${r.wording} (${r.criteria}; ${r.scope}; ${r.author} v${r.version})`).join(' · ');
  card.append(el('p', 'frame-meta', references));
  if (S.condition === 'attention') {
    const pair = el('div', 'context-pair');
    frame.contexts.forEach(c => {
      const item = el('article', 'context-card');
      item.append(el('strong', null, c.id));
      item.append(el('p', null, `Local reference: ${c.localReferenceId}`));
      item.append(el('p', null, `Outward summary: capacity ≥60 = ${c.outwardSummary.capacity60 ? 'yes' : 'no'}`));
      item.append(el('p', null, recordDetails(frame, c.id)));
      pair.append(item);
    });
    card.append(pair);
    card.append(el('p', 'link-note', 'Typed costs belong to their named source record. Card position does not establish a relation or receiver result.'));
  } else {
    card.append(makeTable(['Context', 'Local reference', 'Outward summary', 'Source detail'],
      frame.contexts.map(c => [c.id, c.localReferenceId,
        `capacity ≥60: ${c.outwardSummary.capacity60 ? 'yes' : 'no'}`, recordDetails(frame, c.id)]), 'plain-table'));
  }
}
function renderObservation() {
  const t = task(), all = S.condition === 'static';
  text('observation-title', all ? 'Complete finite frame sheet' : 'Finite frame observation');
  text('frame-readout', all ? `${t.frames.length} frames together` : `${t.frames[S.frameIndex].id} / ${t.frames.length}`);
  const controls = $('frame-controls'); controls.replaceChildren();
  if (!all && t.frames.length > 1) {
    if (S.condition === 'prescribed') {
      const play = el('button', '', S.playing && S.playKind === 'frames' ? 'Pause sequence' : 'Play 2s/frame sequence');
      play.addEventListener('click', () => {
        if (S.playing && S.playKind === 'frames') { stopClock(); render(); record('frames.pause'); }
        else playFrames();
      }); controls.append(play);
    }
    t.frames.forEach((frame, index) => {
      const b = el('button', index === S.frameIndex ? 'active' : '', frame.id);
      b.addEventListener('click', () => selectFrame(index)); controls.append(b);
    });
  }
  const holder = $('frames'); holder.replaceChildren();
  for (const frame of all ? t.frames : [t.frames[S.frameIndex]]) {
    const card = el('article', 'frame-card');
    const head = el('header'); head.append(el('strong', null, frame.id));
    head.append(el('span', null, t.scene === 'contexts' ? 'REFERENCE FRAME' : 'SOURCE OBSERVATION'));
    card.append(head);
    if (t.scene === 'points') renderPointFrame(card, t, frame);
    else if (t.scene === 'contexts') renderContextFrame(card, frame);
    else renderBallFrame(card, t, frame);
    holder.append(card);
  }
  text('observation-footnote', t.family === 'geometry'
    ? 'Only the listed discrete frames are supplied. The raw xyz table is the source projection before the display camera. No intermediate source observations are available.'
    : 'Both representations expose the same supplied frame records and reference criteria. Where costs are absent, neither view can infer them.');
}
function renderAnswer() {
  const t = task(), options = $('choices'); options.replaceChildren();
  const submitted = S.receipts.get(t.id), revealed = S.explanations.get(t.id);
  t.options.forEach(option => {
    const label = el('label', 'choice');
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'choice';
    input.value = option.id; input.checked = S.selected.get(t.id) === option.id;
    input.disabled = Boolean(submitted);
    input.addEventListener('change', () => { S.selected.set(t.id, option.id); });
    label.append(input, el('span', null, option.label)); options.append(label);
  });
  $('submit').disabled = Boolean(submitted);
  $('skip').disabled = Boolean(submitted);
  $('reveal').disabled = !submitted || Boolean(revealed);
  const explanation = $('explanation'); explanation.hidden = !revealed;
  explanation.replaceChildren();
  if (revealed) {
    explanation.append(el('strong', null, `Model answer: ${revealed.correctChoice}`));
    explanation.append(el('p', null, revealed.explanation));
  }
  text('answer-status', revealed ? 'Explanation deliberately revealed. Reopen saved start or reload to clear it.'
    : submitted ? `Response ${submitted.status}. Reveal is now available.`
      : 'The model explanation stays closed until submission or skip.');
}
function renderInspector() {
  const state = currentPublicState();
  text('state-json', JSON.stringify(state, null, 2));
  const generation = ++S.digestGeneration;
  digest(task().frames).then(async frames => {
    const checkpoint = await digest({simulationTimeMs: S.simulationMs, taskId: S.taskId,
      condition: S.condition, frameIndex: S.frameIndex, answerCount: S.receipts.size,
      revealed: S.explanations.size > 0, frameSetSha256: frames});
    const display = await digest(state);
    if (generation === S.digestGeneration)
      text('hash-readout', `Public frame set SHA-256 ${frames} · Semantic checkpoint SHA-256 ${checkpoint} · Display state SHA-256 ${display}`);
  }).catch(error => text('hash-readout', String(error)));
}
function render() {
  text('mode-chip', S.playing ? 'PLAYING · SAVED TOUR' : S.mode === 'saved' ? 'PAUSED · SAVED TOUR' : 'PAUSED · EXPLORATION');
  text('tour-time', `${(S.simulationMs / 1000).toFixed(1)}s / 48s`);
  $('scrub').value = String(S.simulationMs);
  text('play-pause', S.playing && S.playKind === 'tour' ? 'Pause' : 'Play');
  renderCaseList(); renderTask(); renderObservation(); renderAnswer(); renderInspector();
}
async function submit(skipped) {
  const t = task(), choiceId = S.selected.get(t.id);
  if (!skipped && !choiceId) { text('answer-status', 'Select one answer first, or use Skip this case.'); return; }
  $('submit').disabled = true; $('skip').disabled = true;
  try {
    const response = await fetch('/api/submit', {method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({taskId: t.id, sessionId: S.sessionId, actor: S.actor,
        skipped, choiceId: skipped ? null : choiceId})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    S.receipts.set(t.id, {...result, status: skipped ? 'skipped' : 'submitted'});
    render(); record(skipped ? 'answer.skip' : 'answer.submit');
  } catch (error) { text('answer-status', `Submission failed: ${error.message}`); renderAnswer(); }
}
async function reveal() {
  const t = task(), prior = S.receipts.get(t.id);
  if (!prior) return;
  $('reveal').disabled = true;
  try {
    const response = await fetch('/api/reveal', {method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({taskId: t.id, sessionId: S.sessionId, receipt: prior.receipt})});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    S.explanations.set(t.id, result); render(); record('answer.reveal');
  } catch (error) { text('answer-status', `Reveal failed: ${error.message}`); $('reveal').disabled = false; }
}
function bind() {
  $('reopen').addEventListener('click', reopen);
  $('replay').addEventListener('click', () => playTour(true));
  $('play-pause').addEventListener('click', () => {
    if (S.playing && S.playKind === 'tour') { stopClock(); render(); record('replay.pause'); }
    else playTour(false);
  });
  $('step-back').addEventListener('click', () => seek(S.simulationMs - 1000));
  $('step-forward').addEventListener('click', () => seek(S.simulationMs + 1000));
  $('scrub').addEventListener('input', event => seek(Number(event.target.value)));
  checkpoints.forEach((ms, index) => {
    const b = el('button', null, index === 8 ? '48s · reset' : `${ms / 1000}s · Q0${index + 1}`);
    b.addEventListener('click', () => seek(ms)); $('checkpoints').append(b);
  });
  $('submit').addEventListener('click', () => submit(false));
  $('skip').addEventListener('click', () => submit(true));
  $('reveal').addEventListener('click', reveal);
}
async function init() {
  const [fixtureResponse, runResponse] = await Promise.all([fetch('/public-cases.json'), fetch('/api/run')]);
  if (!fixtureResponse.ok || !runResponse.ok) throw new Error('Public fixture or run identity unavailable');
  S.fixture = await fixtureResponse.json(); S.run = await runResponse.json();
  if (S.fixture.tasks.length !== 8 || S.run.runId !== 'G7-INTERPRET-001') throw new Error('Unexpected Gate 7 identity');
  text('run-id', `${S.run.runId} · ${S.run.buildId}`);
  text('build-readout', `${S.run.buildId} · ${S.run.sourceSha256.slice(0, 16)}`);
  text('recovery-command', `node interpretation/builds/${S.run.buildId}/server.mjs`);
  fetch('/review/replay-collection.json').then(response => response.ok ? response.json() : null)
    .then(collection => {
      if (!collection?.entries) return;
      const holder = $('historical-links'); holder.replaceChildren();
      collection.entries.filter(item => item.gate >= 0 && item.gate <= 6).forEach(item => {
        const a = el('a', null, `Gate ${item.gate} · ${item.runId}`);
        a.href = item.url; a.target = '_blank'; a.rel = 'noopener'; holder.append(a);
      });
    }).catch(() => {});
  window.addEventListener('resize', renderInspector);
  window.addEventListener('scroll', renderInspector, {passive: true});
  renderTeaching(); bind(); render(); record('replay.open', 'replay');
}
init().catch(error => { text('mode-chip', 'LOAD ERROR'); text('task-prompt', String(error)); });
