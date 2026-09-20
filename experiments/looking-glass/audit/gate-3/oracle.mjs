// Independent Gate 3 oracle. This file deliberately imports no hypercube code.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const EPS = 1e-10;
const assertions = [];
function check(name, fn) {
  try { fn(); assertions.push({ name, pass: true }); }
  catch (error) { assertions.push({ name, pass: false, error: String(error) }); }
}
const close = (actual, expected, message = '') => assert.ok(Math.abs(actual - expected) <= EPS, `${message}: ${actual} != ${expected}`);
const vectorClose = (actual, expected, message = '') => {
  assert.equal(actual.length, expected.length, message);
  actual.forEach((value, i) => close(value, expected[i], `${message}[${i}]`));
};
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const norm2 = a => dot(a, a);
const sub = (a, b) => a.map((value, i) => value - b[i]);
const transpose = matrix => matrix[0].map((_, i) => matrix.map(row => row[i]));
const multiply = (a, b) => a.map(row => transpose(b).map(column => dot(row, column)));
const mv = (matrix, vector) => matrix.map(row => dot(row, vector));
function determinant(matrix) {
  if (matrix.length === 1) return matrix[0][0];
  return matrix[0].reduce((sum,value,column)=>sum + (column%2?-1:1)*value*
    determinant(matrix.slice(1).map(row=>row.filter((_,i)=>i!==column))),0);
}
function rank(matrix, tolerance = EPS) {
  const a = matrix.map(row => [...row]);
  const scale = Math.max(1, ...a.flat().map(Math.abs));
  let pivotRow = 0;
  for (let column = 0; column < a[0].length && pivotRow < a.length; column++) {
    let best = pivotRow;
    for (let i = pivotRow + 1; i < a.length; i++) if (Math.abs(a[i][column]) > Math.abs(a[best][column])) best = i;
    if (Math.abs(a[best][column]) <= tolerance * scale) continue;
    [a[pivotRow], a[best]] = [a[best], a[pivotRow]];
    const pivot = a[pivotRow][column];
    for (let j = column; j < a[0].length; j++) a[pivotRow][j] /= pivot;
    for (let i = 0; i < a.length; i++) {
      if (i === pivotRow) continue;
      const factor = a[i][column];
      for (let j = column; j < a[0].length; j++) a[i][j] -= factor * a[pivotRow][j];
    }
    pivotRow++;
  }
  return pivotRow;
}
function solveSquare(matrix, rhs) {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);
  for (let column = 0; column < n; column++) {
    let best = column;
    for (let i = column + 1; i < n; i++) if (Math.abs(a[i][column]) > Math.abs(a[best][column])) best = i;
    assert.ok(Math.abs(a[best][column]) > EPS, 'singular normal equations');
    [a[column], a[best]] = [a[best], a[column]];
    const pivot = a[column][column];
    for (let j = column; j <= n; j++) a[column][j] /= pivot;
    for (let i = 0; i < n; i++) {
      if (i === column) continue;
      const factor = a[i][column];
      for (let j = column; j <= n; j++) a[i][j] -= factor * a[column][j];
    }
  }
  return a.map(row => row[n]);
}
function rotation(theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return [[c,0,0,-s],[0,1,0,0],[0,0,1,0],[s,0,0,c]];
}
const P = [[1,0,0,0],[0,1,0,0],[0,0,1,0]];
const shadow = (q, theta) => mv(P, mv(rotation(theta), q));
function camera(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return [[cy,0,-sy],[-sp*sy,cp,-sp*cy],[cp*sy,sp,cp*cy]];
}
const screen = (p, yaw, pitch) => {
  const [horizontal, vertical] = mv(camera(yaw, pitch), p);
  return [320 + 80*horizontal, 210 - 80*vertical];
};
const vertices = [];
for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) for (let d = 0; d < 2; d++)
  vertices.push({ id: `v${a}${b}${c}${d}`, q: [a,b,c,d].map(bit => 2*bit-1) });
const edges = [];
for (let i = 0; i < vertices.length; i++) for (let j = i+1; j < vertices.length; j++) {
  const differences = vertices[i].q.filter((value, axis) => value !== vertices[j].q[axis]).length;
  if (differences === 1) edges.push({ id: `e-${vertices[i].id}-${vertices[j].id}`, from: vertices[i].id, to: vertices[j].id });
}
const byId = Object.fromEntries(vertices.map(v => [v.id, v.q]));
const A = byId.v1110, B = byId.v1111;
const times = [0,8000,16000,24000,32000];
const angles = times.map(t => t <= 16000 ? Math.PI*t/32000 : Math.PI*(32000-t)/32000);
const expectedPairDistances = [0, Math.SQRT2, 2, Math.SQRT2, 0];

check('16 unique lexicographically ordered ±1 vertices and 32 unique one-coordinate edges', () => {
  assert.equal(vertices.length, 16); assert.equal(new Set(vertices.map(v => v.id)).size, 16);
  assert.equal(edges.length, 32); assert.equal(new Set(edges.map(e => e.id)).size, 32);
  assert.ok(vertices.every(v => v.q.every(value => Math.abs(value) === 1)));
  assert.ok(vertices.every(v => edges.filter(e => e.from === v.id || e.to === v.id).length === 4));
  assert.ok(edges.every(e => norm2(sub(byId[e.from], byId[e.to])) === 4));
});
check('vertex affine span is four; solid, boundary and skeleton dimensions differ', () => {
  const base = byId.v0000;
  const differenceRows = ['v1000','v0100','v0010','v0001'].map(id => sub(byId[id], base));
  assert.equal(rank(differenceRows), 4);
  assert.equal(rank(differenceRows.map(row => row.map(value => value/2))), 4);
});
check('all 120 unordered source pairs have the prespecified squared-distance histogram', () => {
  const histogram = {};
  for (let i=0;i<16;i++) for (let j=i+1;j<16;j++) {
    const d2 = norm2(sub(vertices[i].q,vertices[j].q));
    histogram[d2] = (histogram[d2] ?? 0) + 1;
  }
  assert.deepEqual(histogram, {4:32,8:48,12:32,16:8});
});
check('source norms and all 120 pair distances persist at each checkpoint', () => {
  for (const theta of [...angles,...[15,30,60,75].map(deg=>deg*Math.PI/180)]) {
    const rotated = vertices.map(v => mv(rotation(theta), v.q));
    rotated.forEach(q => close(norm2(q), 4));
    for (let i=0;i<16;i++) for(let j=i+1;j<16;j++) close(norm2(sub(rotated[i],rotated[j])), norm2(sub(vertices[i].q,vertices[j].q)));
  }
});
check('R transpose R identity and inverse round trip', () => {
  const I = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
  for (const theta of [...angles,...[15,30,60,75].map(deg=>deg*Math.PI/180), 0.37, -1.2]) {
    const R = rotation(theta);
    multiply(transpose(R), R).forEach((row,i)=>vectorClose(row,I[i]));
    close(determinant(R),1);
    vertices.forEach(v=>vectorClose(mv(rotation(-theta),mv(R,v.q)),v.q));
  }
});
check('A and B retain source distance two; shadow distances follow 0,√2,2,√2,0', () => {
  assert.equal(norm2(sub(A,B)),4);
  angles.forEach((theta,i)=>close(Math.sqrt(norm2(sub(shadow(A,theta),shadow(B,theta)))),expectedPairDistances[i]));
  vectorClose(mv(rotation(Math.PI/4), A),[Math.SQRT2,1,1,0]);
  vectorClose(mv(rotation(Math.PI/4), B),[0,1,1,Math.SQRT2]);
});
check('coincidence multiplicities and collapsed edge counts at 0,45,90 degrees', () => {
  for (const [theta, expectedLocations, expectedCollapsed] of [[0,8,8],[Math.PI/4,12,0],[Math.PI/2,8,8]]) {
    const positions = Object.fromEntries(vertices.map(v=>[v.id,shadow(v.q,theta)]));
    const groups = [];
    for (const v of vertices) {
      const group = groups.find(g=>norm2(sub(positions[g[0]],positions[v.id])) < EPS*EPS);
      if (group) group.push(v.id); else groups.push([v.id]);
    }
    assert.equal(groups.length,expectedLocations);
    assert.equal(edges.filter(e=>norm2(sub(positions[e.from],positions[e.to]))<EPS*EPS).length,expectedCollapsed);
  }
});
check('camera changes screen position but not source or raw projected coordinates', () => {
  const q = byId.v1011, p = shadow(q, Math.PI/4);
  assert.notDeepEqual(screen(p,Math.PI/6,Math.PI/9),screen(p,Math.PI/2,Math.PI/9));
  vectorClose(shadow(q,Math.PI/4),p);
});
check('fixed shadow and camera-only stacks have rank three and w null direction', () => {
  assert.equal(rank(P),3); vectorClose(mv(P,[0,0,0,1]),[0,0,0]);
  const C1 = camera(Math.PI/6,Math.PI/9), C2 = camera(Math.PI/2,Math.PI/9);
  const cameraStack = [...multiply(C1,P),...multiply(C2,P)];
  assert.equal(rank(cameraStack),3);
  vectorClose(mv(cameraStack,[0,0,0,1]),Array(6).fill(0));
  const S = [[1,0,0],[0,1,0]];
  assert.ok(rank([...multiply(S,multiply(C1,P)),...multiply(S,multiply(C2,P))])<=3);
  assert.deepEqual(vertices.filter(v=>norm2(sub(shadow(v.q,0),shadow(A,0)))<EPS*EPS).map(v=>v.id),['v1110','v1111']);
});
check('known zero and ninety degree source observations stack to rank four and diag(1,2,2,1) Gram', () => {
  const M = [...multiply(P,rotation(0)),...multiply(P,rotation(Math.PI/2))];
  assert.equal(rank(M),4);
  const expected = [[1,0,0,0],[0,2,0,0],[0,0,2,0],[0,0,0,1]];
  multiply(transpose(M),M).forEach((row,i)=>vectorClose(row,expected[i]));
});
check('observations plus known matrices reconstruct all 16 sources with opaque IDs', () => {
  const M = [...multiply(P,rotation(0)),...multiply(P,rotation(Math.PI/2))];
  const gram = multiply(transpose(M),M);
  let maxCoordinateError=0,maxResidual=0;
  for (const [i,v] of vertices.entries()) {
    const opaqueId = `opaque-${i*17+3}`; // Deliberately does not encode source coordinates.
    const observed = [...shadow(v.q,0),...shadow(v.q,Math.PI/2)];
    const reconstructed = solveSquare(gram,mv(transpose(M),observed));
    assert.ok(opaqueId.startsWith('opaque-'));
    maxCoordinateError=Math.max(maxCoordinateError,...sub(reconstructed,v.q).map(Math.abs));
    maxResidual=Math.max(maxResidual,...sub(mv(M,reconstructed),observed).map(Math.abs));
  }
  assert.ok(maxCoordinateError <= EPS && maxResidual <= EPS);
});
check('rank threshold keeps near-zero rotation underdetermined', () => {
  assert.equal(rank([...P,...multiply(P,rotation(1e-12))],EPS),3);
  assert.equal(rank([...P,...multiply(P,rotation(Math.PI/2))],EPS),4);
});

const result = {
  oracle: 'gate-3-independent-v1', tolerance: EPS,
  source: { vertices, edges, marked: { A:'v1110', B:'v1111', edge:'e-v1110-v1111' } },
  checkpoints: times.map((timeMs,i)=>({ timeMs, thetaRad:angles[i], ASourceRotated:mv(rotation(angles[i]),A), BSourceRotated:mv(rotation(angles[i]),B), AShadow:shadow(A,angles[i]), BShadow:shadow(B,angles[i]), pairShadowDistance:expectedPairDistances[i] })),
  assertions, passed: assertions.filter(a=>a.pass).length, failed: assertions.filter(a=>!a.pass).length,
};
writeFileSync(new URL('./oracle-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ passed:result.passed, failed:result.failed, failures:assertions.filter(a=>!a.pass) }));
if (result.failed) process.exitCode=1;
