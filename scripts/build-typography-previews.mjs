import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist/typography');
await mkdir(out, { recursive: true });

const variants = [
  { slug: '01-original-larger', name: 'Original, larger', ui: 'Space Grotesk', mono: 'DM Mono', labels: 'DM Mono', uiSize: 14, codeSize: 13, leading: 24, labelSize: 9, headingSize: 20, weight: 500, description: 'The familiar pairing with larger code and clearer small text.' },
  { slug: '02-grotesk-bold', name: 'Grotesk bold', ui: 'Space Grotesk', mono: 'DM Mono', labels: 'Space Grotesk', uiSize: 14, codeSize: 12, leading: 23, labelSize: 10, headingSize: 21, weight: 600, description: 'Brings the logotype’s own family into labels, headings, and controls.' },
  { slug: '03-soft-geometry', name: 'Soft geometry', ui: 'Manrope', mono: 'IBM Plex Mono', labels: 'Manrope', uiSize: 15, codeSize: 13, leading: 24, labelSize: 10, headingSize: 21, weight: 600, description: 'Rounder interface text with a precise, slightly mechanical code face.' },
  { slug: '04-open-and-airy', name: 'Open and airy', ui: 'DM Sans', mono: 'DM Mono', labels: 'DM Sans', uiSize: 15, codeSize: 13, leading: 25, labelSize: 10, headingSize: 22, weight: 600, description: 'An easygoing sans with generous line spacing and familiar code.' },
  { slug: '05-geometric-tech', name: 'Geometric tech', ui: 'Sora', mono: 'Geist Mono', labels: 'Sora', uiSize: 13, codeSize: 12, leading: 23, labelSize: 9, headingSize: 20, weight: 600, description: 'Compact geometric lettering with a sharper technical character.' },
  { slug: '06-rounded-editor', name: 'Rounded editor', ui: 'Plus Jakarta Sans', mono: 'JetBrains Mono', labels: 'Plus Jakarta Sans', uiSize: 14, codeSize: 13, leading: 24, labelSize: 9, headingSize: 21, weight: 600, description: 'Friendly interface shapes paired with a recognizable programming font.' },
  { slug: '07-clean-and-compact', name: 'Clean and compact', ui: 'Inter', mono: 'IBM Plex Mono', labels: 'Inter', uiSize: 13, codeSize: 12, leading: 22, labelSize: 9, headingSize: 19, weight: 600, description: 'A restrained, dense layout with a clear hierarchy and quieter headings.' },
  { slug: '08-roomy-workshop', name: 'Roomy workshop', ui: 'Work Sans', mono: 'Source Code Pro', labels: 'Work Sans', uiSize: 15, codeSize: 14, leading: 26, labelSize: 10, headingSize: 22, weight: 600, description: 'Larger editor text and relaxed spacing for a comfortable working view.' },
  { slug: '09-monospace-character', name: 'Monospace character', ui: 'Space Grotesk', mono: 'Space Mono', labels: 'Space Mono', uiSize: 14, codeSize: 12, leading: 24, labelSize: 9, headingSize: 20, weight: 600, description: 'Keeps the geometric interface and adds distinctive, retro monospace detail.' },
  { slug: '10-big-and-clear', name: 'Big and clear', ui: 'Atkinson Hyperlegible', mono: 'Fira Mono', labels: 'Atkinson Hyperlegible', uiSize: 16, codeSize: 14, leading: 26, labelSize: 11, headingSize: 23, weight: 700, description: 'The largest type scale, with open letterforms and strongly defined characters.' },
].map((v, i) => ({ ...v, number: String(i + 1).padStart(2, '0'), file: `${v.slug}.html` }));

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const [html, css, app] = await Promise.all([
  readFile(resolve(root, 'dist/index.html'), 'utf8'),
  readFile(resolve(root, 'dist/styles.css'), 'utf8'),
  readFile(resolve(root, 'dist/app.js'), 'utf8'),
]);

await writeFile(resolve(out, 'base.css'), css.replace(/^@import[^\n]+\n/, ''));
await writeFile(resolve(out, 'variants.json'), JSON.stringify(variants, null, 2) + '\n');

const previewApp = app
  .replaceAll("from './", "from '../")
  .replace("const $ = selector", "// Typography previews keep progress in this page only.\nconst localStorage = { getItem: () => null, setItem: () => {} };\nconst $ = selector")
  .replace('const today = dateKey();', "const today = '2026-11-06';")
  .replace("document.title = `shadle #", "document.title = document.body.dataset.typeName + ' · ' + `shadle #")
  .replace('initGraphics(); renderPuzzle(); updateSound(); updateCountdown(); setInterval(updateCountdown, 1000);', `initGraphics();
if (graphicsReady) {
  game.attempts = [{ source: puzzle.starterSource, ...compareImages(renderers[1].pixels(), targetPixels) }];
  game.hintsRevealed = 1;
}
renderPuzzle(); updateSound(); $('#countdown').textContent = '08:24:16';
const faceNames = [document.body.dataset.uiFont, document.body.dataset.codeFont, 'Space Grotesk'];
Promise.all(faceNames.map(name => document.fonts.load('400 14px "' + name + '"'))).then(async faces => {
  await document.fonts.ready;
  const loaded = faces.every(matches => matches.length > 0) && faceNames.every(name => document.fonts.check('400 14px "' + name + '"'));
  $('#type-font-status').textContent = loaded ? 'Fonts ready' : 'Font fallback';
  document.body.dataset.fontsReady = String(loaded);
}).catch(() => { $('#type-font-status').textContent = 'Font fallback'; document.body.dataset.fontsReady = 'false'; });`);
if (previewApp === app || !previewApp.includes("const today = '2026-11-06'")) throw new Error('Preview source transformation failed');
await writeFile(resolve(out, 'preview-app.js'), previewApp);

for (const v of variants) {
  const variables = `:root{--sans:'${v.ui}',Arial,sans-serif;--mono:'${v.mono}','Courier New',monospace;--label-font:'${v.labels}',monospace;--type-ui:${v.uiSize}px;--type-code:${v.codeSize}px;--type-leading:${v.leading}px;--type-label:${v.labelSize}px;--type-heading:${v.headingSize}px;--type-weight:${v.weight}}`;
  const next = variants[Number(v.number) % variants.length];
  const reviewBar = `<aside class="type-review" aria-label="Typography preview"><span class="type-option" title="${escape(v.ui)} + ${escape(v.mono)} · UI ${v.uiSize} / Code ${v.codeSize} / Labels ${v.labelSize}px"><strong>${v.number} / ${variants.length}</strong><span>${escape(v.name)}</span></span><a class="type-next" href="./${next.file}" aria-label="Next typography preview: ${escape(next.name)}">Next →</a><small class="sr-only" id="type-font-status" role="status">Loading fonts…</small></aside>`;
  const page = html
    .replace('<title>shadle — a daily shader puzzle</title>', `<title>${v.number} ${escape(v.name)} · Shadle typography</title>`)
    .replace('<link rel="stylesheet" href="./typography.css">', '')
    .replace('href="./favicon.svg"', 'href="../favicon.svg"')
    .replace('<a class="brand" href="./"', '<a class="brand" href="../"')
    .replace('<link rel="stylesheet" href="./styles.css">', `<link rel="stylesheet" href="./fonts/fonts.css"><link rel="stylesheet" href="./base.css"><link rel="stylesheet" href="./preview.css"><style>${variables}</style>`)
    .replace('<body>', `<body data-type-name="${escape(v.number + ' ' + v.name)}" data-ui-font="${escape(v.ui)}" data-code-font="${escape(v.mono)}">${reviewBar}`)
    .replace('src="./app.js"', 'src="./preview-app.js"');
  await writeFile(resolve(out, v.file), page);
}

const links = variants.map(v => `<li><a href="./${v.file}">${v.number} · ${escape(v.name)}</a></li>`).join('');
const gallery = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shadle · 10 typography previews</title><link rel="icon" href="../favicon.svg"><link rel="stylesheet" href="./fonts/fonts.css"><link rel="stylesheet" href="./gallery.css"></head>
<body><main class="preview-launcher"><a class="gallery-brand" href="../">shadle<span>.</span></a><h1>Typography previews</h1><p id="preview-status" role="status">Opening full-screen preview…</p><noscript><p>Choose a preview below. Each has a Next button.</p></noscript><ol>${links}</ol></main><script type="module" src="./gallery.js"></script></body></html>`;
await writeFile(resolve(out, 'index.html'), gallery);
console.log(`Created ${variants.length} HTML previews and the comparison gallery in ${out}`);
