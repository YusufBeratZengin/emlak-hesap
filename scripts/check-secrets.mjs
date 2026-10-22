import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

// Never print a matching value: diagnostics contain filenames only.
const patchMode = process.argv.includes('--patch');
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /\bsk-[A-Za-z0-9_-]{24,}\b/,
  /(?:api[_-]?key|password|secret|token)["']?\s*[:=]\s*["'][^"'\s]{12,}["']/i,
];
const excluded = new Set(['.git', 'node_modules', 'dist', 'coverage', 'is', 'veri']);
const forbidden = (path) => /(^|\/)\.env|\.(pem|key|p12|pfx)$/i.test(path);
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink() || excluded.has(entry.name)) return [];
    return entry.isDirectory() ? files(path) : [relative('.', path).replaceAll('\\', '/')];
  });
}
const candidates = new Map();
if (patchMode) {
  let path = '';
  for (const line of readFileSync(0, 'utf8').split('\n')) {
    if (line.startsWith('+++ b/')) {
      path = line.slice(6);
      candidates.set(path, '');
    } else if (line.startsWith('+') && path) {
      candidates.set(path, candidates.get(path) + line.slice(1) + '\n');
    }
  }
} else {
  for (const path of files('.')) candidates.set(path, forbidden(path) ? '' : readFileSync(path, 'utf8'));
}
const rejected = [...candidates].filter(([path, content]) =>
  forbidden(path) || patterns.some((pattern) => pattern.test(content))).map(([path]) => path);
if (rejected.length) {
  console.error(`Potential secret material in: ${rejected.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed (${candidates.size} files).`);
}
