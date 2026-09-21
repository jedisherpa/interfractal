import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Node may resolve the imported module to /private/var while argv retains /var,
// or argv may name a symlink to the file or one of its parent directories.
export function isDirectEntry(metaUrl, argvPath = process.argv[1]) {
  if (!argvPath) return false;
  try {
    return realpathSync(argvPath) === realpathSync(fileURLToPath(metaUrl));
  } catch {
    return false;
  }
}
