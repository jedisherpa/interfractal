import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// GET only: safe to run against the root-operated actual server without adding
// submit/reveal/activity events. It does not stand in for browser inspection.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const base = process.argv[2] ?? 'http://127.0.0.1:44000';
const key = JSON.parse(await readFile(resolve(root, 'docs/gate-7/private-answer-key.json')));
const publicPaths = ['/', '/index.html', '/style.css', '/app.mjs', '/public-cases.json',
  '/api/run', '/api/checkpoints', '/api/events'];
const reviewPaths = ['/review/results.html', '/review/replay-collection.json', '/review/packet.md',
  '/review/audit.md', '/review/run-evidence.json', '/review/source-review.md'];
const privatePaths = ['/private-answer-key.json', '/independent-predictions.json',
  '/model.mjs', '/server.mjs', '/build.mjs', '/test.mjs', '/build.json',
  '/docs/gate-7/private-answer-key.json', '/review/private-answer-key.json',
  '/api/reveal', '/api/submit', '/api/activity', '/api/reset', '/%2e%2e/private-answer-key.json',
  '/%2e%2e/%2e%2e/docs/gate-7/private-answer-key.json',
  '/review/screenshots/%2e%2e/private-answer-key.json'];
const got = [];
for (const path of [...publicPaths, ...reviewPaths, ...privatePaths]) {
  const response = await fetch(`${base}${path}`, {redirect: 'manual'});
  const body = await response.text();
  const permitted = publicPaths.includes(path);
  const optionalReview = reviewPaths.includes(path);
  assert.ok(optionalReview ? [200, 404].includes(response.status) : response.status === (permitted ? 200 : 404),
    `${path} returned ${response.status}`);
  assert.equal(response.headers.get('cache-control'), 'no-store', `${path} cache control`);
  if (response.status === 200) for (const answer of key.answers) {
    assert.ok(!body.includes(answer.explanation), `${path} exposes exact key explanation`);
    assert.ok(!body.includes(JSON.stringify(answer.privateDerivation)), `${path} exposes private derivation`);
  }
  if (optionalReview && response.status === 200)
    assert.ok(!/privateDerivation|expectedChoice|correctChoice|Model answer:/.test(body), `${path} exposes keyed review fields`);
  got.push({ path, status: response.status });
}
const fixtureResponse = await fetch(`${base}/public-cases.json`);
assert.equal(fixtureResponse.status, 200);
const fixture = await fixtureResponse.json();
assert.equal(fixture.tasks?.length, 8, 'public task count');
assert.ok(fixture.tasks.every(task => !Object.hasOwn(task, 'answer') && !Object.hasOwn(task, 'expectedChoice')));
const captures = JSON.parse(await readFile(resolve(root, 'evidence/gate-7/capture-index.json')));
const failedCaptures = JSON.parse(await readFile(resolve(root,
  'evidence/gate-7/failed-candidates/G7-INTERPRET-001/capture-index.json')));
const shownImages = ['001-slice-sheet.jpg', '002-slice-sheet.jpg',
  '002-context-records-960.jpg', '002-plain-records-960.jpg'];
for (const name of shownImages) {
  const capture = [...captures, ...failedCaptures].find(item => item.path.endsWith(`/${name}`));
  assert.ok(capture, `${name} capture index`);
  const response = await fetch(`${base}/review/screenshots/${name}`);
  assert.equal(response.status, 200, `${name} screenshot route`);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const content = Buffer.from(await response.arrayBuffer());
  assert.equal(content.length, capture.bytes, `${name} served bytes`);
  assert.equal(createHash('sha256').update(content).digest('hex'), capture.sha256,
    `${name} served hash`);
}
console.log(JSON.stringify({kind: 'gate-7-independent-get-route-audit', base,
  publicRoutes: publicPaths.length, deniedRoutes: privatePaths.length, allPassed: true,
  optionalReviewRoutes: reviewPaths.length, checkedOriginalImageRoutes: shownImages.length,
  checked: got}, null, 2));
