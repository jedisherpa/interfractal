// Independent Gate 1 oracle. This file deliberately imports no calibration code.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, '../..');
const prespecDir = join(project, 'docs/gate-1');
const freeze = JSON.parse(readFileSync(join(prespecDir, 'PRESPEC_FREEZE.json')));
const predictions = JSON.parse(readFileSync(join(prespecDir, 'independent-predictions.json')));
const tolerance = 1e-10;
const checks = [];
function record(name, work) {
  try { work(); checks.push({ name, status: 'pass' }); }
  catch (error) { checks.push({ name, status: 'fail', detail: error.message }); }
}
function near(actual, expected, label) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: got ${actual}, expected ${expected}`);
}
function vector(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label} length`);
  actual.forEach((value, index) => near(value, expected[index], `${label}[${index}]`));
}
function equal(actual, expected, label) { assert.deepEqual(actual, expected, label); }
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function length(v) { return Math.hypot(...v); }
function diff(a, b) { return a.map((n, i) => n - b[i]); }
function key(v) { return v.map(n => Math.abs(n) < tolerance ? 0 : Math.round(n / tolerance)).join(','); }

// Derive the source graph from bits, including all 28 pairwise distances.
const ids = Array.from({ length: 8 }, (_, n) => `v${n.toString(2).padStart(3, '0')}`);
const source = new Map(ids.map(id => [id, [...id.slice(1)].map(bit => 2 * Number(bit) - 1)]));
const pairs = ids.flatMap((id, i) => ids.slice(i + 1).map(other => [id, other]));
const edges = pairs.filter(([a, b]) => [...a.slice(1)].reduce((n, bit, i) => n + (bit !== b[i + 1]), 0) === 1)
  .map(([a, b]) => ({ id: `${a}-${b}`, from: a, to: b }));
function turn([x, y, z], angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [c * x - s * z, y, s * x + c * z];
}
function camera([x, y, z], yaw, pitch) {
  const xcam = Math.cos(yaw) * x + Math.sin(yaw) * z;
  const z1 = -Math.sin(yaw) * x + Math.cos(yaw) * z;
  return [xcam, Math.cos(pitch) * y - Math.sin(pitch) * z1,
    Math.sin(pitch) * y + Math.cos(pitch) * z1];
}
function theta(time) {
  return Math.PI * (time <= 20000 ? time : 40000 - time) / 40000;
}
function geometry(time, yaw = Math.PI / 6, pitch = Math.PI / 9, angle = theta(time)) {
  return ids.map(id => {
    const originalSource = source.get(id);
    const rotatedSource = turn(originalSource, angle);
    const shadow = rotatedSource.slice(0, 2);
    const displayCamera = camera(rotatedSource, yaw, pitch);
    return { id, originalSource, rotatedSource, shadow, displayCamera,
      sourceViewScreen: [displayCamera[0], -displayCamera[1]] };
  });
}
function groupedSites(vertices) {
  const groups = new Map();
  for (const vertex of vertices) {
    const k = key(vertex.shadow);
    if (!groups.has(k)) groups.set(k, { xy: vertex.shadow, sourceIds: [] });
    groups.get(k).sourceIds.push(vertex.id);
  }
  return [...groups.values()].map(item => ({ ...item, multiplicity: item.sourceIds.length }))
    .sort((a, b) => a.xy[0] - b.xy[0] || a.xy[1] - b.xy[1]);
}
function shadowEdges(vertices) {
  const byId = new Map(vertices.map(v => [v.id, v.shadow]));
  const collapsed = [];
  const groups = new Map();
  for (const edge of edges) {
    const a = byId.get(edge.from), b = byId.get(edge.to);
    if (length(diff(a, b)) <= tolerance) { collapsed.push(edge.id); continue; }
    const endpoints = [a, b].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const k = endpoints.map(key).join('|');
    if (!groups.has(k)) groups.set(k, { endpoints, sourceEdgeIds: [] });
    groups.get(k).sourceEdgeIds.push(edge.id);
  }
  return { collapsed,
    segments: [...groups.values()].map(item => ({ ...item, multiplicity: item.sourceEdgeIds.length }))
      .sort((a, b) => a.endpoints[0][0] - b.endpoints[0][0]
        || a.endpoints[0][1] - b.endpoints[0][1]
        || a.endpoints[1][0] - b.endpoints[1][0]
        || a.endpoints[1][1] - b.endpoints[1][1]) };
}
function compareSites(actual, expected, label) {
  equal(actual.length, expected.length, `${label} count`);
  for (let i = 0; i < actual.length; i++) {
    vector(actual[i].xy, expected[i].xy, `${label}[${i}].xy`);
    equal(actual[i].sourceIds, expected[i].sourceIds, `${label}[${i}].IDs`);
    equal(actual[i].multiplicity, expected[i].multiplicity, `${label}[${i}].multiplicity`);
  }
}
function compareSegments(actual, expected, label) {
  equal(actual.length, expected.length, `${label} count`);
  for (let i = 0; i < actual.length; i++) {
    actual[i].endpoints.forEach((xy, j) => vector(xy, expected[i].endpoints[j], `${label}[${i}].endpoints[${j}]`));
    equal(actual[i].sourceEdgeIds, expected[i].sourceEdgeIds, `${label}[${i}].IDs`);
    equal(actual[i].multiplicity, expected[i].multiplicity, `${label}[${i}].multiplicity`);
  }
}

record('prespec freeze hashes', () => {
  equal(freeze.gate, 1, 'gate');
  equal(freeze.gate0PreservationCommit, '6fb4ecbd516aa9a9dc23710c7ffcda4e8c65b819', 'G0 commit');
  for (const file of freeze.files) equal(sha256(readFileSync(join(prespecDir, file.path))), file.sha256, file.path);
});
record('eight bit-derived vertex IDs and all twelve Hamming edges', () => {
  equal(predictions.sourceVertices, ids.map(id => ({ id, xyz: source.get(id) })), 'vertices');
  equal(predictions.sourceEdges, edges, 'edges');
});
record('all 28 source pairwise distances and multiplicities', () => {
  equal(pairs.length, 28, 'pair count');
  for (const [a, b] of pairs) {
    const differingBits = [...a.slice(1)].reduce((n, bit, i) => n + (bit !== b[i + 1]), 0);
    near(length(diff(source.get(a), source.get(b))), 2 * Math.sqrt(differingBits), `${a}/${b}`);
  }
  equal([1, 2, 3].map(n => ({ distance: 2 * Math.sqrt(n), count: pairs.filter(([a, b]) =>
    length(diff(source.get(a), source.get(b))) === 2 * Math.sqrt(n)).length })),
  predictions.invariants.pairwiseDistanceMultiplicity, 'distance multiplicities');
  for (const id of ids) near(length(source.get(id)), Math.sqrt(3), `${id} norm`);
  for (const edge of edges) near(length(diff(source.get(edge.from), source.get(edge.to))), 2, `${edge.id} length`);
});
record('algebraic inverse R(-theta)R(theta) at 0, 15, 45, 90 degrees', () => {
  for (const degrees of [0, 15, 45, 90]) for (const id of ids) {
    const angle = degrees * Math.PI / 180;
    vector(turn(turn(source.get(id), angle), -angle), source.get(id), `${id}@${degrees}`);
  }
});
for (const checkpoint of predictions.checkpoints) {
  const time = checkpoint.simulationTimeMs;
  record(`checkpoint ${time}: rotation, projection, camera, all vertices`, () => {
    const angle = theta(time), vertices = geometry(time);
    near(checkpoint.sourceAngleRadians, angle, 'angle radians');
    near(checkpoint.sourceAngleDegrees, angle * 180 / Math.PI, 'angle degrees');
    near(checkpoint.cameraYawRadians, Math.PI / 6, 'yaw');
    near(checkpoint.cameraPitchRadians, Math.PI / 9, 'pitch');
    equal(checkpoint.vertices.length, 8, 'vertex count');
    for (let i = 0; i < 8; i++) {
      const actual = vertices[i], expected = checkpoint.vertices[i];
      equal(expected.id, actual.id, `vertex ${i} ID`);
      for (const field of ['originalSource', 'rotatedSource', 'shadow', 'displayCamera', 'sourceViewScreen'])
        vector(actual[field], expected[field], `${time}/${actual.id}/${field}`);
    }
  });
  record(`checkpoint ${time}: 28 distances, 12 edges, shadow memberships`, () => {
    const vertices = geometry(time), byId = new Map(vertices.map(v => [v.id, v]));
    for (const [a, b] of pairs) {
      const expected = length(diff(source.get(a), source.get(b)));
      near(length(diff(byId.get(a).rotatedSource, byId.get(b).rotatedSource)), expected, `${a}/${b}`);
    }
    for (const edge of edges) near(length(diff(byId.get(edge.from).rotatedSource,
      byId.get(edge.to).rotatedSource)), 2, edge.id);
    const pair = [byId.get('v110'), byId.get('v111')];
    near(length(diff(pair[0].shadow, pair[1].shadow)), checkpoint.trackedPairShadowDistance, 'tracked shadow distance');
    near(length(diff(pair[0].rotatedSource, pair[1].rotatedSource)), checkpoint.trackedPairSourceDistance, 'tracked source distance');
    const sites = groupedSites(vertices), projectedEdges = shadowEdges(vertices);
    equal(sites.length, checkpoint.distinctShadowSiteCount, 'site count');
    compareSites(sites, checkpoint.shadowSites, 'sites');
    equal(projectedEdges.collapsed, checkpoint.collapsedSourceEdgeIds, 'collapsed IDs');
    equal(projectedEdges.collapsed.length, checkpoint.collapsedSourceEdgeCount, 'collapsed count');
    compareSegments(projectedEdges.segments, checkpoint.nonzeroShadowSegments, 'segments');
  });
}
record('source-return geometry t=40000 equals t=0', () => {
  const initial = geometry(0), returned = geometry(40000);
  for (let i = 0; i < 8; i++) for (const field of ['originalSource', 'rotatedSource', 'shadow', 'displayCamera', 'sourceViewScreen'])
    vector(initial[i][field], returned[i][field], `${initial[i].id}/${field}`);
});
record('camera-only yaw120 changes view but preserves source and shadow', () => {
  const before = geometry(10000), after = geometry(10000, 2 * Math.PI / 3);
  let changed = 0;
  for (let i = 0; i < 8; i++) {
    for (const field of ['originalSource', 'rotatedSource', 'shadow'])
      vector(after[i][field], before[i][field], `${before[i].id}/${field}`);
    if (length(diff(after[i].sourceViewScreen, before[i].sourceViewScreen)) > tolerance) changed++;
  }
  assert.ok(changed > 0, 'source view must change');
});
record('source-only 30 degree counterfactual, fixed camera', () => {
  const vertices = geometry(10000, Math.PI / 6, Math.PI / 9, Math.PI / 6);
  const byId = new Map(vertices.map(v => [v.id, v]));
  vector(byId.get('v110').rotatedSource, predictions.counterfactuals.sourceOnlyAt10000.v110Rotated, 'v110');
  vector(byId.get('v111').rotatedSource, predictions.counterfactuals.sourceOnlyAt10000.v111Rotated, 'v111');
  near(length(diff(byId.get('v110').shadow, byId.get('v111').shadow)), 1, 'pair shadow distance');
});

const result = {
  schema: 'looking-glass-gate-1-independent-oracle-v1',
  generatedAtUtc: new Date().toISOString(),
  scope: 'Frozen prespec arithmetic only; no implementation import or browser observation',
  toleranceAbsolute: tolerance,
  sourceVertexCount: ids.length,
  sourceEdgeCount: edges.length,
  sourcePairCount: pairs.length,
  checks,
  passed: checks.filter(item => item.status === 'pass').length,
  failed: checks.filter(item => item.status === 'fail').length
};
writeFileSync(join(here, 'oracle-results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: result.passed, failed: result.failed, failures: checks.filter(c => c.status === 'fail') }, null, 2));
if (result.failed) process.exitCode = 1;
