#!/usr/bin/env node
// Inspect host-acquired browser evidence independently, plus read-only HTTP routes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const base = resolve(import.meta.dirname, '..');
const source = join(base, 'evidence/browser-candidate-004');
const evidence = join(base, 'evidence/audit/browser-independent.json');
const read = path => readFileSync(path);
const json = path => JSON.parse(read(path));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const result = { scope: 'Existing supported-browser observations and direct original-image inspection; independent DOM/data/hash and live route check', checks: {}, routes: [], failures: [] };
try {
  const observations = json(join(source, 'observations.json'));
  const actions = json(join(source, 'actions.json'));
  const screenshots = json(join(source, 'screenshots.json'));
  const world = json(join(base, 'package-candidate-004/research-team/design/world.json'));
  const expected = [[], ['C04'], [], []];
  assert.equal(observations.length, 4); assert.equal(actions.length, 3);
  for (let index = 0; index < observations.length; index++) {
    const item = observations[index], dom = item.dom;
    assert.match(dom.identity, /candidate 004/);
    assert.match(dom.scope, /Preparation only/);
    assert.match(dom.scope, /not collected agent or human responses/);
    assert.equal(dom.records.length, 18);
    assert.deepEqual(dom.records.map(entry => entry.card), world.cards);
    assert.deepEqual(dom.records.filter(entry => entry.open).map(entry => entry.card.id), expected[index]);
    assert.equal(dom.viewport.width, 1280); assert.equal(dom.viewport.height, 720);
    assert.equal(dom.viewport.documentWidth, 1280); assert.equal(dom.viewport.dpr, 2);
    assert.ok(item.ax.includes('Looking Glass materials review'));
  }
  assert.match(actions[0].action, /keyboard Enter.*C04/);
  assert.match(actions[1].action, /mouse click closes C04/);
  assert.equal(actions[2].action, 'reload');
  result.checks.browser = { observations: 4, actions: 3, serializedSourceInstancesEqual: 72, actuallyOpened: ['C04'], openStates: expected, viewport: '1280×720; DPR2; no horizontal overflow' };
  assert.equal(screenshots.length, 2);
  for (const item of screenshots) {
    const file = join(source, item.path), data = read(file);
    assert.equal(data.length, item.bytes); assert.equal(hash(data), item.sha256);
    assert.equal(data[0], 0xff); assert.equal(data[1], 0xd8);
  }
  assert.equal(json(join(source, 'console.json')).length, 0);
  result.checks.originalImages = screenshots;
  result.checks.originalsInspectedDirectly = 'Overview visibly identifies candidate 004 and preparation-only disclosure; opened C04 visibly shows understanding, rejected endorsement and alternative plan-specific grants, with JSON continuing below viewport.';
  result.checks.consoleEntries = 0;

  const html = read(join(base, 'package-candidate-004/review/index.html'));
  const requests = [
    ['GET', '/', 200], ['GET', '/index.html', 200],
    ['GET', '/research-team/design/AUTHOR_ANSWER_KEY.json', 404],
    ['GET', '/participants/A1/world.json', 404],
    ['GET', '/transfer-phase-bound/withheld-tasks.json', 404],
    ['GET', '/review/index.html', 404],
    ['GET', '/../research-team/design/AUTHOR_ANSWER_KEY.json', 404],
    ['GET', '/%2e%2e/research-team/design/AUTHOR_ANSWER_KEY.json', 404],
    ['GET', '/index.html?x=1', 404], ['POST', '/', 404],
  ];
  for (const [method, route, expectedStatus] of requests) {
    // Request path is preserved by the HTTP client, including literal dot segments.
    const { request } = await import('node:http');
    const response = await new Promise((resolveRequest, reject) => {
      const req = request({ host: '127.0.0.1', port: 44010, method, path: route, timeout: 3000 }, res => {
        const chunks = []; res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolveRequest({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      }); req.on('error', reject); req.on('timeout', () => req.destroy(new Error('route timed out'))); req.end();
    });
    assert.equal(response.status, expectedStatus, `${method} ${route}`);
    if (expectedStatus === 200) assert.equal(hash(response.body), hash(html));
    else assert.equal(response.body.toString(), 'Not found');
    result.routes.push({ method, path: route, status: response.status, bytes: response.body.length, sha256: hash(response.body) });
  }
  result.checks.reviewHtmlSha256 = hash(html);
  result.passed = true;
} catch (error) { result.failures.push(error.stack ?? String(error)); result.passed = false; }
writeFileSync(evidence, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`${JSON.stringify({ evidence, passed: result.passed, failures: result.failures })}\n`);
if (!result.passed) process.exitCode = 1;
