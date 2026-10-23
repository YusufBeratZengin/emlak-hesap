import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { URL } from 'node:url';

// Pipe in the README command's real output: npm run demo builds and runs it.
// No timestamps, machine-specific paths, remote fonts or rendering dependencies.
const command = 'node examples/rental-yield.mjs';
const output = readFileSync(0, 'utf8').replaceAll('\r\n', '\n').trimEnd();
// Reject empty/failed command output rather than generating a misleading image.
JSON.parse(output);
const lines = [`$ ${command}`, ...output.split('\n')];
const visible = lines.length <= 24 ? lines : [...lines.slice(0, 23), '…'];
const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const width = Math.max(760, 64 + Math.max(...visible.map((line) => line.length)) * 10);
const height = 112 + visible.length * 26;
const rows = visible.map((line, index) =>
  `    <text x="32" y="${100 + index * 26}" fill="${index === 0 ? '#a7f3d0' : '#dbe4f0'}">${escapeXml(line)}</text>`).join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">emlak-hesap terminal demo</title>
  <desc id="description">Real output of ${command}, using fictional amounts in integer kurus. The full text is also in the README.</desc>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="16" fill="#0d1526" stroke="#334155"/>
  <path d="M17 1H${width - 17}Q${width - 1} 1 ${width - 1} 17V56H1V17Q1 1 17 1Z" fill="#1e293b"/>
  <circle cx="28" cy="28" r="6" fill="#fb7185"/>
  <circle cx="50" cy="28" r="6" fill="#fbbf24"/>
  <circle cx="72" cy="28" r="6" fill="#34d399"/>
  <g font-family="ui-monospace, SFMono-Regular, Consolas, monospace" font-size="16">
    <text x="${width - 28}" y="34" text-anchor="end" fill="#cbd5e1">emlak-hesap · fictional scenario · kurus</text>
  </g>
  <g font-family="ui-monospace, SFMono-Regular, Consolas, monospace" font-size="16" xml:space="preserve">
${rows}
  </g>
</svg>
`;
const destination = new URL('../docs/demo.svg', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8') !== svg) {
    console.error('docs/demo.svg is stale. Run npm run demo and include the updated image.');
    process.exitCode = 1;
  } else {
    console.log('Terminal demo matches the real example output.');
  }
} else {
  mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
  writeFileSync(destination, svg);
  console.log(`Generated docs/demo.svg (${visible.length} terminal lines).`);
}
