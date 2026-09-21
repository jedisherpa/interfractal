import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const encoded = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const readJson = path => JSON.parse(readFileSync(path, 'utf8'));

export function writeNewDirectory(target, files) {
  if (existsSync(target)) throw new Error(`Refusing to overwrite candidate: ${target}`);
  const temp = `${target}.building-${process.pid}`;
  if (existsSync(temp)) throw new Error(`Refusing to overwrite build attempt: ${temp}`);
  mkdirSync(temp, { recursive: false });
  try {
    for (const [relative, content] of [...files.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      if (relative.startsWith('/') || relative.split('/').includes('..')) throw new Error(`Unsafe path ${relative}`);
      const path = join(temp, relative);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content, { flag: 'wx' });
    }
    renameSync(temp, target);
  } catch (error) {
    // Retain a failed build attempt for review; never silently remove evidence.
    throw new Error(`${error.message}. Partial build retained at ${temp}`);
  }
}

export function manifestFor(files) {
  return [...files.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([path, content]) => {
    const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
    return { path, bytes: bytes.length, sha256: sha256(bytes) };
  });
}

export function verifyFiles(root, manifest) {
  const failures = [];
  for (const item of manifest) {
    const path = join(root, item.path);
    if (!existsSync(path)) { failures.push(`${item.path}: missing`); continue; }
    const data = readFileSync(path);
    if (data.length !== item.bytes || sha256(data) !== item.sha256) failures.push(`${item.path}: hash/byte mismatch`);
  }
  return failures;
}
