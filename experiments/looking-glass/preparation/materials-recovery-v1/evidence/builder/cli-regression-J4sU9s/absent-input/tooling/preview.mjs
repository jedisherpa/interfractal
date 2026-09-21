#!/usr/bin/env node
// Read-only, single-document researcher preview. No arbitrary file routes.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDirectEntry } from './cli-entry.mjs';

export function startPreview(portArgument = process.argv[2] ?? 44010) {
  const port = Number(portArgument);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('Usage: node preview.mjs [port 1024-65535]');
  }
  const htmlPath = resolve(import.meta.dirname, '../package-candidate-004/review/index.html');
  const html = readFileSync(htmlPath);
  const server = createServer((request, response) => {
    if (request.method !== 'GET' || !['/', '/index.html'].includes(request.url)) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': html.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; base-uri 'none'; form-action 'none'",
    });
    response.end(html);
  });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`Researcher preview: http://127.0.0.1:${port}/\n`);
  });
  return server;
}

if (isDirectEntry(import.meta.url)) startPreview();
