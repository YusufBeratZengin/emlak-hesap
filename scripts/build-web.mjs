import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('web/dist', { recursive: true });
await build({
  entryPoints: ['web/src/main.ts'],
  outfile: 'web/dist/app.js',
  bundle: true,
  minify: true,
  sourcemap: true,
  format: 'esm',
  target: ['es2022'],
  legalComments: 'none',
});
await Promise.all(['index.html', 'styles.css', 'favicon.svg'].map((file) =>
  copyFile(`web/${file}`, `web/dist/${file}`)));
console.log('Static calculator built in web/dist (relative assets, no remote resources).');
