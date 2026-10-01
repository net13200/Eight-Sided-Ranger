/**
 * Turns the artifact build (vite build --mode artifact) into one HTML file
 * for a private claude.ai playtest page: script, styles and the splash font
 * inlined, and no document skeleton (the host adds its own).
 *
 *   npx vite build --mode artifact && node tools/inline-artifact.mjs out.html
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const dir = 'dist-artifact';
const out = process.argv[2] ?? 'eight-sided-ranger-playtest.html';
let html = readFileSync(`${dir}/index.html`, 'utf8');
const asset = (p) => readFileSync(`${dir}/${p.replace(/^\.\//, '')}`);

html = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, (_, src) => {
  const js = asset(src)
    .toString()
    .replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
html = html.replace(
  /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
  (_, href) => `<style>${asset(href)}</style>`,
);
html = html.replace(
  /url\('\.\/fonts\/([^']+)'\)/g,
  (_, f) => `url('data:font/woff2;base64,${asset(`fonts/${f}`).toString('base64')}')`,
);
if (/src="\.\/|href="\.\/assets/.test(html)) throw new Error('an asset was not inlined');
html = html
  .replace(/<!doctype html>\s*/i, '')
  .replace(/<\/?html[^>]*>\s*/g, '')
  .replace(/<\/?head>\s*/g, '')
  .replace(/<\/?body>\s*/g, '')
  .replace(/\s*<meta charset="UTF-8" \/>/, '')
  .replace(/\s*<meta\s+name="viewport"[^>]*\/>/, '');
// The title first, so the host finds it.
const title = html.match(/<title>[^<]*<\/title>/)[0];
html = `${title}\n${html.replace(title, '')}`;
writeFileSync(out, html);
console.log(
  `${out}: ${(html.length / 1024).toFixed(0)} KB (${readdirSync(`${dir}/assets`).length} assets inlined)`,
);
