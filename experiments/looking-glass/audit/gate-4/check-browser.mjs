// Independent read-only audit of actual UI observations and original captures.
// This imports no slices code and never operates the browser.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const runId = process.argv[2] || 'G4-SLICES-002';
const run = JSON.parse(await readFile(resolve(root, `slices/runs/${runId}/run.json`)));
const trace = JSON.parse(await readFile(resolve(root, `slices/runs/${runId}/movie-3d.json`)));
const evidence = resolve(root, 'evidence/gate-4');
const candidate = resolve(evidence, 'candidates', runId);
const read = async path => JSON.parse(await readFile(path));
const allObservations = await read(resolve(evidence, 'browser-observations.json'));
const allCaptures = await read(resolve(evidence, 'capture-index.json'));
const observations = allObservations.filter(o => o.diagnostics?.runId === runId);
const captures = allCaptures.filter(c => c.runId === runId);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const near = (a, b, tol = 1e-10) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
const vec = (a, b, tol = 1e-10) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => near(v, b[i], tol));
const rect = (a, b) => a && b && ['x', 'y', 'width', 'height'].every(k => near(a[k], b[k], 1e-6)) && a.visible === b.visible;
const screen = ([x, y, z], camera) => {
  const a = Math.cos(camera.yaw) * x - Math.sin(camera.yaw) * z;
  const b = Math.sin(camera.yaw) * x + Math.cos(camera.yaw) * z;
  return [320 + 80 * a, 210 - 80 * (Math.cos(camera.pitch) * y - Math.sin(camera.pitch) * b)];
};
const expectedSlice = (c, s) => {
  const d = s - c, u = 1 - d * d;
  return { d, u, kind: u > 0 ? 'solid' : u === 0 ? 'point' : 'empty', radius: u < 0 ? null : Math.sqrt(u) };
};
const checks = [];
const check = (name, errors, detail = {}) => checks.push({ name, pass: errors.length === 0,
  errorCount: errors.length, errors: errors.slice(0, 20), ...detail });
const identityErrors = observations.filter(o => o.diagnostics.buildId !== run.buildId ||
  o.state?.movieTraceSha256 !== run.movieTraceSha256 || !String(o.url).includes('127.0.0.1:43997'))
  .map(o => ({ index: o.index, buildId: o.diagnostics.buildId, url: o.url }));
check('actual observations bind exact run, build, trace and local URL', identityErrors, { count: observations.length });
const mathErrors = [];
for (const o of observations) {
  const state = o.state, m = state?.model, t = state?.simulationTimeMs;
  if (!m || !Number.isInteger(t) || t < 0 || t > 40000 || t % 100) { mathErrors.push({ index: o.index, reason: 'missing model or invalid quantized clock' }); continue; }
  const s = m.slice, e = expectedSlice(s.sourceCenterW, s.levelW), movie = m.movie, frame = trace.frames[t / 100];
  if (s.kind !== e.kind || !near(s.deltaW, e.d) || !near(s.discriminant, e.u) ||
    (s.radius === null ? e.radius !== null : !near(s.radius, e.radius)) ||
    (e.kind === 'empty' ? s.center3 !== null : !vec(s.center3, [0,0,0])) ||
    m.source.id !== 'ball-center' || !vec(m.source.center4, [0,0,0,0]) ||
    !vec(m.projection.center3, [0,0,0]) || m.projection.radius !== 1 ||
    JSON.stringify(m.projection.matrix) !== JSON.stringify([[1,0,0,0],[0,1,0,0],[0,0,1,0]]) ||
    state.sliceClass !== s.classification || !near(state.sliceLevelW, s.levelW) ||
    (state.sliceRadius === null ? s.radius !== null : !near(state.sliceRadius, s.radius)))
    mathErrors.push({ index: o.index, reason: 'raw primary slice or fixed projection mismatch' });
  if (!frame || !vec(movie.stored3dFrame?.center, frame.center) || movie.stored3dFrame?.timeMs !== t ||
    movie.stored3dFrame?.radius !== 1 || movie.index !== t / 100 || movie.sourceId !== 'ball-plus' ||
    !near(movie.sourceProjection.center3[0], -.5 * Math.sin(movie.sourceAngleRadians)) ||
    !vec(movie.sourceProjection.center3.slice(1), [0,0]) || movie.sourceProjection.radius !== 1 ||
    !vec(movie.rotatedCenter4, [-.5 * Math.sin(movie.sourceAngleRadians),0,0,.5 * Math.cos(movie.sourceAngleRadians)]) ||
    !near(movie.comparison.centerDistance, Math.hypot(...movie.sourceProjection.center3.map((v,i) => v-frame.center[i]))) ||
    !near(movie.comparison.radiusDifference, 0))
    mathErrors.push({ index: o.index, reason: 'model movie, standalone frame or raw comparison mismatch' });
  const candidates = m.ambiguity?.candidates;
  if (!Array.isArray(candidates) || candidates.length !== 2 ||
    candidates.some((candidate, i) => {
      const c = i === 0 ? .5 : -.5, initial = expectedSlice(c, 0), selected = expectedSlice(c, m.ambiguity.levelW);
      return candidate.id !== (i === 0 ? 'ball-plus' : 'ball-minus') ||
        !vec(candidate.sourceCenter4, [0,0,0,c]) ||
        candidate.initialSlice.kind !== initial.kind || !near(candidate.initialSlice.radius, initial.radius) ||
        candidate.selectedSlice.kind !== selected.kind || !near(candidate.selectedSlice.radius, selected.radius) ||
        !vec(candidate.fixedProjection.center3, [0,0,0]) || candidate.fixedProjection.radius !== 1;
    })) mathErrors.push({ index: o.index, reason: 'candidate class or known-plane predictions mismatch' });
}
check('all observed raw slices, projection, ambiguity and movie values obey frozen equations', mathErrors);
const environmentErrors = [];
for (const o of observations) {
  const s = o.state, a = o.outer;
  if (!s?.viewport || !a?.viewport || !near(s.viewport.width, a.viewport.width, 1e-6) ||
    !near(s.viewport.height, a.viewport.height, 1e-6) ||
    !near(s.viewport.devicePixelRatio, a.viewport.devicePixelRatio, 1e-6) ||
    s.inspectorOpen !== a.inspectorOpen ||
    s.documentScrollWidth !== a.documentScrollWidth || s.documentClientWidth !== a.documentClientWidth ||
    a.documentScrollWidth > a.documentClientWidth + 1 ||
    !['slice-svg','projection-svg','movie-source-svg','movie-stored-svg'].every(id => rect(s.sceneRects?.[id], a.sceneRects?.[id])) ||
    !Array.isArray(s.sceneRects?.ambiguity) || !Array.isArray(a.ambiguityRects) ||
    s.sceneRects.ambiguity.length !== a.ambiguityRects.length ||
    s.sceneRects.ambiguity.some((r,i) => !rect(r,a.ambiguityRects[i])))
    environmentErrors.push({ index: o.index, label: o.label, inspectorDpr: s?.viewport?.devicePixelRatio,
      actualDpr: a?.viewport?.devicePixelRatio, inspectorScrollWidth: s?.documentScrollWidth,
      actualScrollWidth: a?.documentScrollWidth });
}
check('fresh inspector viewport/DPR/scene rectangles/visibility and bounded page width', environmentErrors);
const viewportSizes = [...new Set(observations.map(o => `${o.outer?.viewport?.width}x${o.outer?.viewport?.height}`))];
const viewportErrors = ['1280x720','1280x900','960x720'].filter(size => !viewportSizes.includes(size))
  .map(size => ({ expectedSize: size, reason: 'prespecified actual viewport condition absent' }));
check('all three prespecified viewport sizes were observed', viewportErrors, { viewportSizes });
const sceneErrors = [];
for (const o of observations) {
  const m = o.state?.model, scenes = o.scenes;
  if (!m || !Array.isArray(scenes) || scenes.length !== 6 || scenes.some(s => s.viewBox !== '0 0 640 420')) {
    sceneErrors.push({ index: o.index, reason: 'missing six scenes or wrong viewBox' }); continue;
  }
  const specs = [
    { raw: m.slice, scene: scenes[0] },
    { raw: m.projection, scene: scenes[1] },
    { raw: m.ambiguity.candidates[0].selectedSlice, scene: scenes[2] },
    { raw: m.ambiguity.candidates[1].selectedSlice, scene: scenes[3] },
    { raw: m.movie.sourceProjection, scene: scenes[4] },
    { raw: { center3: m.movie.stored3dFrame.center, radius: m.movie.stored3dFrame.radius }, scene: scenes[5] }
  ];
  for (const [i, { raw, scene }] of specs.entries()) {
    const shapes = scene.shapes, center = raw.center3 ?? [0,0,0], centerScreen = screen(center, m.camera);
    const solids = shapes.filter(x => x.tag === 'circle' && x.attributes?.['fill-opacity'] === '0.27');
    const glyph = shapes.filter(x => x.tag === 'text' && x.text === 'one location');
    const empty = shapes.filter(x => x.tag === 'text' && x.text === 'EMPTY · NO POINTS');
    if (raw.radius === null) {
      if (solids.length || glyph.length || empty.length !== 1) sceneErrors.push({ index: o.index, scene: i, reason: 'empty scene drawn incorrectly' });
    } else if (raw.radius === 0) {
      if (solids.length || glyph.length !== 1 || empty.length) sceneErrors.push({ index: o.index, scene: i, reason: 'point scene drawn incorrectly' });
    } else {
      const circle = solids[0];
      if (solids.length !== 1 || shapes.filter(x => x.tag === 'path').length !== 3 ||
        !near(Number(circle?.attributes?.cx), centerScreen[0]) ||
        !near(Number(circle?.attributes?.cy), centerScreen[1]) ||
        !near(Number(circle?.attributes?.r), 80 * raw.radius))
        sceneErrors.push({ index: o.index, scene: i, reason: 'solid center/radius or sampled curves mismatch' });
    }
  }
}
check('actual SVG scenes distinguish solid, point and empty with declared camera/scale', sceneErrors);
const checkpointErrors = [];
for (const t of [0,8000,16000,20000,24000,32000,40000]) {
  const group = observations.filter(o => o.state?.simulationTimeMs === t && o.state?.mode === 'saved-run' && !o.state?.playing);
  if (!group.length) checkpointErrors.push({ timeMs: t, reason: 'no paused canonical browser observation' });
  else {
    const h = t <= 20000 ? t / 20000 : (40000 - t) / 20000;
    if (!group.some(o => near(o.state.model.slice.levelW, 1.25*h) &&
      near(o.state.model.movie.sourceAngleRadians, Math.PI/2*h)))
      checkpointErrors.push({ timeMs: t, reason: 'checkpoint raw values mismatch' });
  }
}
check('all seven paused canonical checkpoints observed at predicted values', checkpointErrors);
const jpegDimensions = bytes => {
  for (let i=2;i<bytes.length-9;) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker=bytes[i+1];i+=2;
    if (marker===0xd8 || marker===0xd9 || marker===0x01 || marker>=0xd0&&marker<=0xd7) continue;
    const length=bytes.readUInt16BE(i);
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))
      return { width: bytes.readUInt16BE(i+5), height: bytes.readUInt16BE(i+3) };
    i+=length;
  }
  return null;
};
const captureErrors = [], verifiedCaptures = [];
for (const c of captures) {
  try {
    const bytes = await readFile(resolve(evidence, c.path)), dims = jpegDimensions(bytes),
      before = observations.find(o => o.index === c.beforeObservation),
      after = observations.find(o => o.index === c.afterObservation), hash = sha(bytes);
    verifiedCaptures.push({ label: c.label, path: c.path, sha256: hash, bytes: bytes.length, dimensions: dims });
    if (!dims || !before || !after || c.buildId !== run.buildId ||
      !c.originalUnedited || c.timeIntervalMs?.[0] !== before.state?.simulationTimeMs ||
      c.timeIntervalMs?.[1] !== after.state?.simulationTimeMs ||
      c.sha256 !== hash || c.bytes !== bytes.length ||
      c.imageDimensions?.width !== dims.width || c.imageDimensions?.height !== dims.height ||
      c.beforeViewport?.width !== before.outer?.viewport?.width ||
      c.beforeViewport?.height !== before.outer?.viewport?.height ||
      c.afterViewport?.width !== after.outer?.viewport?.width ||
      c.afterViewport?.height !== after.outer?.viewport?.height)
      captureErrors.push({ label: c.label, reason: 'original image identity or observation binding mismatch' });
  } catch (error) { captureErrors.push({ label: c.label, error: String(error) }); }
}
check('original captures exist and bind to actual before/after states', captureErrors, { captureCount: captures.length });
const result = { checkedAtUtc: new Date().toISOString(), kind: 'actual-browser-observation-audit',
  runId, buildId: run.buildId, observationCount: observations.length, captureCount: captures.length,
  verifiedCaptures, pass: checks.every(c => c.pass), passed: checks.filter(c => c.pass).length,
  failed: checks.filter(c => !c.pass).length, checks,
  limit: 'This checks recorded actual state, DOM geometry, environment and original capture bytes. It does not create observations or infer human comprehension.' };
await writeFile(resolve(root, `audit/gate-4/${runId}-browser-audit.json`), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ pass: result.pass, passed: result.passed, failed: result.failed,
  observationCount: observations.length, captureCount: captures.length,
  failures: checks.filter(c => !c.pass).map(c => ({ name: c.name, errors: c.errors })) }));
if (!result.pass) process.exitCode = 1;
