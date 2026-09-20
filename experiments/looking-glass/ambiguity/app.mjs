import {CHECKPOINT_SECONDS, DURATION_SECONDS, caseById, deriveView, enumerateCertificate,
  informationFingerprint, rationalNumber, roundedLabel, semanticFingerprint, stateAt, transition} from './model.mjs';

const [fixture, run] = await Promise.all([
  fetch('/fixture.json', {cache:'no-store'}).then(response => response.json()),
  fetch('/api/run', {cache:'no-store'}).then(response => response.json())
]);
const app = document.querySelector('#app');
const sessionId = crypto.randomUUID();
const actor = 'unattributed_local';
let state = stateAt(0, fixture), rawOpen = false, inspectorOpen = false;
let seq = 0, activityChain = Promise.resolve(), activityError = '';
let timer = null, startedAt = 0, lastBoundary = 0;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const propertyText = value => Array.isArray(value) ? `(${value.join(', ')})` : String(value);

function queueEvent(origin, type, intended, before, after, result = 'applied', reason = null) {
  const event = {seq: ++seq, sessionId, origin, actor, type, intended, result, reason,
    simulationCursorSeconds: after.cursorSeconds,
    beforeSemanticFingerprint: semanticFingerprint(before, fixture),
    afterSemanticFingerprint: semanticFingerprint(after, fixture)};
  activityChain = activityChain.then(async () => {
    const response = await fetch('/api/activity', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(event)});
    if (!response.ok) throw new Error(`Activity HTTP ${response.status}`);
  }).catch(error => {activityError = `Event log failed: ${error.message}`; render();});
}
function setState(next, origin, type, intended = {}, result = 'applied', reason = null) {
  const before = state;
  state = next;
  queueEvent(origin, type, intended, before, state, result, reason);
  render();
}
function stopTimer() { if (timer !== null) clearInterval(timer); timer = null; }
function action(type, value) {
  if (type === 'pause') {
    if (state.paused) return;
    const now = Math.min(DURATION_SECONDS, (Date.now() - startedAt) / 1000);
    stopTimer();
    const next = {...stateAt(now, fixture), paused:true};
    setState(next, 'user-control', 'tour-pause', {cursorSeconds:now});
    return;
  }
  if (type === 'play' || type === 'replay') {
    stopTimer();
    const result = transition(state, {type}, fixture);
    setState(result.state, 'user-control', type === 'play' ? 'tour-play' : 'tour-replay-from-start',
      {cursorSeconds:result.state.cursorSeconds}, result.result);
    startedAt = Date.now() - state.cursorSeconds * 1000;
    lastBoundary = Math.floor(state.cursorSeconds / 4) * 4;
    timer = setInterval(tick, 100);
    return;
  }
  stopTimer();
  const result = transition(state, {type,value}, fixture);
  const eventType = ({case:'case-select',reference:'reference-select','add-query':'add-query',
    'reset-observations':'reset-observations',camera:'camera-select',certificate:value ? 'certificate-reveal':'certificate-hide',
    checkpoint:'checkpoint-restore',previous:'previous-checkpoint',next:'next-checkpoint',reopen:'reopen-saved-start'})[type];
  setState(result.state, 'user-control', eventType || type, {value}, result.result);
}
function replayBoundary(t) {
  if (t === 8 || t === 20 || t === 28) {
    const next = {...stateAt(t, fixture), paused:false};
    setState(next, 'replay', 'case-select', {caseId:next.caseId, referenceWorldId:next.referenceWorldId,
      resetToBaseline:true});
  }
  const additions = t === 4 || t === 12 || t === 32 ? ['xw90'] :
    t === 16 ? ['yv90'] : t === 24 ? ['sliceMinus2','slicePlus2'] : [];
  for (const queryId of additions) {
    const caseData = caseById(fixture, state.caseId);
    const selected = caseData.additionalQueryIds.filter(id =>
      state.selectedAdditionalQueryIds.includes(id) || id === queryId);
    setState({...state, cursorSeconds:t, selectedAdditionalQueryIds:selected}, 'replay', 'add-query', {queryId});
  }
  if (t === 32) {
    stopTimer();
    setState({...state, cursorSeconds:32, paused:true}, 'automatic', 'tour-stop',
      {cursorSeconds:32}, 'applied', 'end-of-sequence');
  }
}
function tick() {
  const cursor = Math.min(DURATION_SECONDS, (Date.now() - startedAt) / 1000);
  for (let t = lastBoundary + 4; t <= Math.floor(cursor / 4) * 4 && t <= 32; t += 4) {
    replayBoundary(t);
    lastBoundary = t;
  }
  if (timer !== null) {
    state = {...state, cursorSeconds:cursor, paused:false};
    render();
  }
}

function draw(observation, yaw) {
  const cx = 130, cy = 64, scale = 43, rad = yaw * Math.PI / 180, pitch = 20 * Math.PI / 180;
  const projected = xyz => {
    const [x,y,z] = xyz.map(rationalNumber);
    const horizontal = Math.cos(rad)*x + Math.sin(rad)*z;
    const depth = -Math.sin(rad)*x + Math.cos(rad)*z;
    return [cx + scale*horizontal, cy - scale*(Math.cos(pitch)*y - Math.sin(pitch)*depth)];
  };
  let mark = '';
  if (observation.kind === 'empty') mark = '<text x="130" y="66" text-anchor="middle" fill="#ffd8a3" font-size="17">∅ empty slice</text>';
  else if (observation.kind === 'point') {
    const [x,y] = projected(observation.xyz || observation.center);
    mark = `<circle cx="${x}" cy="${y}" r="6" fill="#8ce4d1" stroke="#e5fff8" stroke-width="2"/>`;
  } else {
    const [x,y] = projected(observation.center);
    const radius = Math.sqrt(rationalNumber(observation.radiusSquared))*scale;
    mark = `<circle cx="${x}" cy="${y}" r="${radius}" fill="#1d727866" stroke="#8ce4d1" stroke-width="2"/><circle cx="${x}" cy="${y}" r="3" fill="#fff"/>`;
  }
  return `<svg viewBox="0 0 260 125" role="img" aria-label="Fixed-scale view of ${escapeHtml(observation.kind)}">
    <path d="M 12 64 H 248 M 130 8 V 116" stroke="#36566a" stroke-width="1"/>${mark}</svg>`;
}
function observationRaw(observation) {
  if (observation.kind === 'empty') return '{kind: empty}';
  if (observation.xyz) return `P xyz = (${observation.xyz.join(', ')})`;
  return `${observation.kind} center = (${observation.center.join(', ')}); radius² = ${observation.radiusSquared}`;
}
function observationLabels(observation) {
  if (observation.kind === 'empty') return 'No 3D slice';
  if (observation.xyz) return `Display xyz: (${observation.xyz.map(roundedLabel).join(', ')})`;
  return `Display center: (${observation.center.map(roundedLabel).join(', ')}); radius²: ${roundedLabel(observation.radiusSquared)}`;
}
function certificateHtml(certificate) {
  const minimum = certificate.minimum.status === 'none-in-menu' ?
    `None in this menu. Surviving full-menu pair: ${certificate.minimum.fullMenuSurvivingPairs.map(pair=>pair.join(' ↔ ')).join('; ')}.` :
    `Smallest added-query count: ${certificate.minimum.size}; all minimum subsets: ${certificate.minimum.subsets.map(s=>s.length ? s.join(' + ') : '∅').join('; ')}.`;
  return `<div class="certificate"><p><strong>Finite family certificate.</strong> ${escapeHtml(minimum)} Exhaustively checked ${certificate.subsetCountExamined} allowed subsets.</p>
  <p>Unequal-property baseline exact collisions: ${escapeHtml(certificate.baselineCollisionPairs.length ? certificate.baselineCollisionPairs.map(pair=>pair.join(' ↔ ')).join('; ') : 'none')}.</p>
  <p>Separators by added query: ${Object.entries(certificate.separatingPairsByAdditionalQuery).map(([id,pairs])=>
    `<span class="tag">${escapeHtml(id)}: ${pairs.length} pair${pairs.length===1?'':'s'}</span>`).join('')}</p>
  <table><thead><tr><th>Added subset</th><th>Family property determined?</th><th>Unresolved unequal-property pairs</th></tr></thead><tbody>
  ${certificate.subsets.map(s=>`<tr><td>${escapeHtml(s.additionalQueryIds.join(' + ')||'∅')}</td><td>${s.familyPropertyDetermined?'Yes':'No'}</td><td>${escapeHtml(s.unresolvedUnequalPropertyPairs.map(pair=>pair.join(' ↔ ')).join('; ')||'none')}</td></tr>`).join('')}</tbody></table>
  ${certificate.outsideMenu.map(item=>`<p class="warning"><strong>Outside-menu example, not selectable or counted:</strong> ${escapeHtml(item.queryId)} gives ${Object.entries(item.observations).map(([id,obs])=>`${id}: ${observationRaw(obs)}`).map(escapeHtml).join('; ')}. This only limits the conclusion to the declared menu.</p>`).join('')}</div>`;
}
function refreshInspector() {
  if (!window.__LG_STATE__) return;
  window.__LG_STATE__.viewport={width:innerWidth,height:innerHeight,
    devicePixelRatio:devicePixelRatio,scrollX:scrollX,scrollY:scrollY};
  window.__LG_STATE__.scene={clientWidth:document.documentElement.clientWidth,
    clientHeight:document.documentElement.clientHeight,
    scrollWidth:document.documentElement.scrollWidth,
    scrollHeight:document.documentElement.scrollHeight,
    observedPanelRects:[...document.querySelectorAll('.query svg')].map(element=>{
      const rect=element.getBoundingClientRect();
      return {x:rect.x,y:rect.y,width:rect.width,height:rect.height};
    })};
  const pre=document.querySelector('#state-json');
  if(pre) pre.textContent=JSON.stringify(window.__LG_STATE__,null,2);
}
function render() {
  const caseData = caseById(fixture, state.caseId), view = deriveView(state, fixture);
  const information = informationFingerprint(state, fixture), semantic = semanticFingerprint(state, fixture);
  const inspector = {runId:run.runId, buildId:run.buildId, fixtureId:fixture.fixtureId,
    sessionId, mode:state.mode, paused:state.paused, cursorSeconds:state.cursorSeconds,
    caseId:state.caseId, referenceWorldId:state.referenceWorldId,
    selectedAdditionalQueryIds:view.selectedAdditionalQueryIds, cameraYawDegrees:state.cameraYawDegrees,
    certificateVisible:state.certificateVisible, observedBundle:view.observedBundle,
    compatibleWorldIds:view.compatibleWorldIds, localPropertyDetermined:view.localPropertyDetermined,
    pairDiagnostics:view.pairDiagnostics, certificate:view.certificate,
    semanticFingerprint:semantic, informationFingerprint:information,
    viewport:{width:innerWidth,height:innerHeight,devicePixelRatio:devicePixelRatio,
      scrollX:scrollX,scrollY:scrollY},
    scene:{clientWidth:document.documentElement.clientWidth,clientHeight:document.documentElement.clientHeight,
      scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}};
  window.__LG_STATE__ = inspector;
  const compatibleText = view.compatibleWorldIds.join(', ');
  const sourceRows = caseData.worlds.map(world => `<tr><td><strong>${escapeHtml(world.id)}</strong></td><td><code>${escapeHtml(world.source ? `(${world.source.join(', ')})` : `center (${world.center.join(', ')}), radius² ${world.radiusSquared}`)}</code></td><td>${escapeHtml(propertyText(world.propertyValue))}</td></tr>`).join('');
  app.innerHTML = `<main><header><h1>Indistinguishable worlds · Gate 8</h1>
  <p class="lede">A transparent finite benchmark: every source world and property is public. Choose a reference world, compare its exact raw observations with every candidate, and test the allowed observations. The camera only changes the drawing.</p>
  <div class="identity">Run ${escapeHtml(run.runId)} · build ${escapeHtml(run.buildId)} · fixture ${escapeHtml(fixture.fixtureId)} · no participant responses</div></header>
  <section class="card"><h2>Saved 32-second tour</h2><div class="row"><button data-action="play" ${state.paused?'':'disabled'}>Play</button>
  <button data-action="pause" ${state.paused?'disabled':''}>Pause</button><button data-action="replay">Replay from start</button>
  <button data-action="previous">Previous checkpoint</button><button data-action="next">Next checkpoint</button>
  <button data-action="reopen">Reopen saved start</button></div>
  <div class="row checkpoint">${CHECKPOINT_SECONDS.map(t=>`<button data-action="checkpoint" data-value="${t}" aria-label="Restore paused ${t} second checkpoint">${t}s</button>`).join('')}</div>
  <p class="small">${state.paused?'Paused':'Playing'} at ${state.cursorSeconds.toFixed(1)}s · ${escapeHtml(state.mode)}. Checkpoints restore the saved state. Manual controls enter exploration and preserve the cursor.</p></section>
  <div class="grid"><div><section class="card"><h2>${escapeHtml(caseData.id)} · ${escapeHtml(caseData.title)}</h2>
  <div class="row"><label>Case <select id="case-select">${fixture.cases.map(item=>`<option value="${item.id}" ${item.id===state.caseId?'selected':''}>${escapeHtml(item.id)} · ${escapeHtml(item.title)}</option>`).join('')}</select></label>
  <label>Public reference <select id="reference-select">${caseData.worlds.map(world=>`<option value="${world.id}" ${world.id===state.referenceWorldId?'selected':''}>${escapeHtml(world.id)}</option>`).join('')}</select></label></div>
  <p class="small">Property: ${escapeHtml(caseData.propertyDefinition)}. Selecting a case or reference resets observations, camera and certificate.</p>
  <h3>Public candidate sources</h3><table><thead><tr><th>World</th><th>Exact source</th><th>Property</th></tr></thead><tbody>${sourceRows}</tbody></table></section>
  <section class="card"><h2>Observed query records</h2><p class="small">Exact fractions determine compatibility. Drawings use a fixed scale; two-decimal labels and tolerance are diagnostics only.</p>
  <div class="query-grid">${view.observedBundle.map(({queryId,observation})=>{
    const query = caseData.queries.find(item=>item.id===queryId);
    return `<article class="query"><h3>${escapeHtml(query.label)}</h3>${draw(observation,state.cameraYawDegrees)}<p class="raw">${escapeHtml(observationRaw(observation))}</p><p class="label">${escapeHtml(observationLabels(observation))}</p></article>`;
  }).join('')}</div><details id="raw-details" ${rawOpen?'open':''}><summary>Full exact observation bundle</summary><pre>${escapeHtml(JSON.stringify(view.observedBundle,null,2))}</pre></details></section></div>
  <div><section class="card"><h2>Allowed observations</h2><div class="row">${caseData.additionalQueryIds.map(id=>{
    const query=caseData.queries.find(item=>item.id===id);
    return `<button data-action="add-query" data-value="${id}" aria-pressed="${state.selectedAdditionalQueryIds.includes(id)}">${escapeHtml(query.label)}</button>`;
  }).join('')}</div><p><button data-action="reset-observations">Reset to baseline</button></p>
  <h3>Display camera only</h3><div class="row">${fixture.cameraYawDegrees.map(deg=>`<button data-action="camera" data-value="${deg}" aria-pressed="${state.cameraYawDegrees===deg}">${deg>0?'+':''}${deg}°</button>`).join('')}</div></section>
  <section class="card"><h2>What the exact records establish</h2><p class="status">Compatible with ${escapeHtml(state.referenceWorldId)}: <strong>${escapeHtml(compatibleText)}</strong>.<br>Property determined for this reference: <strong>${view.localPropertyDetermined?'yes':'no'}</strong>.</p>
  ${state.caseId==='G8-C04'?'<p class="warning"><strong>Rounded-label trap:</strong> baseline raw x values differ exactly (−1/1000000000000 versus +1/1000000000000), their difference is 1/500000000000, they are within the 1/10000000000 diagnostic tolerance, and both display as 0.00. Exact baseline minimum added queries: zero.</p>':''}
  <p class="small">Pair diagnostics for the current observation set:</p><table><thead><tr><th>Pair</th><th>Exact</th><th>Near</th><th>2-dec labels</th></tr></thead><tbody>${view.pairDiagnostics.map(d=>`<tr><td>${escapeHtml(d.pair.join(' ↔ '))}</td><td>${d.exactEqual?'same':'different'}</td><td>${d.withinTolerance?'near':'far'}</td><td>${d.roundedLabelsEqual?'same':'different'}</td></tr>`).join('')}</tbody></table>
  <p><button data-action="certificate" data-value="${!state.certificateVisible}">${state.certificateVisible?'Hide':'Show'} finite certificate</button></p>${view.certificate?certificateHtml(view.certificate):''}</section></div></div>
  <section class="card"><h2>State inspector</h2><p class="small">Semantic SHA-256: <code>${semantic}</code><br>Information SHA-256: <code>${information}</code></p>
  <details id="inspector-details" ${inspectorOpen?'open':''}><summary>Complete current state JSON</summary><pre id="state-json">${escapeHtml(JSON.stringify(inspector,null,2))}</pre></details>${activityError?`<p class="error">${escapeHtml(activityError)}</p>`:''}</section>
  <footer class="footer">The finite conclusion is limited to these public families and query menus. <a href="http://127.0.0.1:44000/" target="_blank" rel="noopener">Open preserved Gate 7 replay</a> · <a href="/review/results.html">Gate 8 visual results</a> · <a href="/review/packet.md">Gate 8 packet</a> · <a href="/review/audit.md">Independent audit</a> · <a href="/review/source-review.md">Source review</a></footer></main>`;
  document.querySelector('#raw-details').addEventListener('toggle', event => {rawOpen=event.target.open;});
  document.querySelector('#inspector-details').addEventListener('toggle', event => {inspectorOpen=event.target.open;});
  refreshInspector();
}
app.addEventListener('click', event => {
  const button=event.target.closest('button[data-action]'); if (!button) return;
  const type=button.dataset.action, raw=button.dataset.value;
  const value=type==='checkpoint'||type==='camera' ? Number(raw) : type==='certificate' ? raw==='true' : raw;
  action(type,value);
});
app.addEventListener('change', event => {
  if (event.target.id==='case-select') action('case',event.target.value);
  if (event.target.id==='reference-select') action('reference',event.target.value);
});
addEventListener('resize',render);
addEventListener('scroll',refreshInspector,{passive:true});
render();
