import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { monthPuzzles } from '../review/month-one.js';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'artifacts/puzzle-review');
await mkdir(output, { recursive: true });
const [markup, css, runtime, rendererSource, gameSource] = await Promise.all([
  readFile(resolve(root, 'review/review-fragment.html'), 'utf8'),
  readFile(resolve(root, 'review/review.css'), 'utf8'),
  readFile(resolve(root, 'review/review.js'), 'utf8'),
  readFile(resolve(root, 'dist/renderer.js'), 'utf8'),
  readFile(resolve(root, 'dist/game.js'), 'utf8'),
]);
// Use the game's actual renderer and comparison rule in both review surfaces.
const renderer = rendererSource.replace(/^import[^\n]*\n/, '').replaceAll('export ', '');
const comparisonStart = gameSource.indexOf('const luminance =');
const comparisonEnd = gameSource.indexOf('export function shareText');
if (comparisonStart < 0 || comparisonEnd < comparisonStart) throw new Error('Could not locate the game comparison implementation.');
const comparison = gameSource.slice(comparisonStart, comparisonEnd).replaceAll('export ', '');
const data = JSON.stringify(monthPuzzles).replaceAll('<', '\\u003c');
const fragment = `<style>\n${css}</style>\n${markup.replace('__PUZZLE_DATA__', data)}\n<script>\n(() => {\nconst SAMPLE_SIZE = 96;\n${renderer}\n${comparison}\n${runtime}\n})();\n</script>\n`;
const standalone = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Shadle · 30 shader puzzles</title>
<style>
:root { color-scheme:light dark; --font-size-base:16px; --background:#f5f4ec; --foreground:#272a24; --muted-foreground:#62675a; --border:#c7cbbe; --primary:#334b32; --primary-foreground:#fff; --destructive:#a02625; }
* { box-sizing:border-box; } body { margin:0; padding:32px 20px 48px; color:var(--foreground); background:var(--background); font:var(--font-size-base)/1.5 system-ui,sans-serif; }
main { max-width:960px; margin:auto; } h1,h2,h3,p { margin:0; } h2 { font-size:24px; } h3 { font-size:20px; } h2,h3 { font-weight:500; }
.viz-row,.viz-controls { display:flex; align-items:center; flex-wrap:wrap; gap:12px; } .form-label { display:grid; gap:6px; } .text-small { font-size:12px; } .text-destructive { color:var(--destructive); }
.btn,.form-select,.form-control { font:inherit; border:1px solid var(--border); border-radius:5px; background:var(--background); color:var(--foreground); padding:8px 12px; max-width:100%; }
.btn { cursor:pointer; } .btn:disabled { opacity:.45; cursor:default; } .btn[aria-pressed="true"] { background:var(--primary); color:var(--primary-foreground); } .form-control { width:100%; resize:vertical; }
summary { cursor:pointer; padding:4px 0; } pre { font:13px/1.6 ui-monospace,monospace; } .draft-note { margin-bottom:24px; color:var(--muted-foreground); }
@media(prefers-color-scheme:dark) { :root { --background:#181d19; --foreground:#e4eadf; --muted-foreground:#adb6a7; --border:#4b5648; --primary:#d9e99f; --primary-foreground:#1e2a16; --destructive:#ffaca5; } }
@media(pointer:coarse) { .btn,.form-select { min-height:44px; } }
</style></head><body><main><p class="draft-note">Approved puzzle bank · Daily rotation starts November 13, 2026 (UTC) · Difficulty labels are proposed.</p>
${fragment}
</main></body></html>`;

let markdown = `# Shadle: 30 shader puzzles\n\nApproved puzzle bank. The daily rotation starts November 13, 2026 (UTC), preserving puzzles from earlier dates. Numbers are bank IDs; difficulty labels are proposed.\n\nEach puzzle has one missing expression or condition, a distinct learning goal, two conceptual hints, and a third hint with corrected code. Reference implementations are examples; equivalent rendered output is valid.\n\n| ID | Puzzle | GLSL focus | Intended level |\n| --- | --- | --- | --- |\n`;
for (const p of monthPuzzles) markdown += `| ${p.id} | ${p.name} | ${p.focus} | ${p.level} |\n`;
for (const p of monthPuzzles) {
  markdown += `\n## ${p.id}. ${p.name}\n\n**GLSL focus:** ${p.focus}  \n**New idea:** ${p.idea}  \n**Proposed difficulty:** ${p.level}\n\n**Goal:** ${p.goal}\n\n### Starter\n\n\x60\x60\x60glsl\n${p.starterSource}\n\x60\x60\x60\n\n### Hints\n`;
  p.hints.forEach((hint, index) => { markdown += `\n${index + 1}. **${hint.title}.** ${hint.body}\n`; if (hint.code) markdown += `\n\x60\x60\x60glsl\n${hint.code}\n\x60\x60\x60\n`; });
  markdown += `\n<details>\n<summary>Full reference shader</summary>\n\n\x60\x60\x60glsl\n${p.source}\n\x60\x60\x60\n\n</details>\n`;
}
await Promise.all([
  writeFile(resolve(output, 'index.html'), standalone),
  writeFile(resolve(output, 'month-one-review.md'), markdown),
  writeFile(resolve(output, 'month-one-puzzles.json'), JSON.stringify(monthPuzzles, null, 2) + '\n'),
]);
const inlineFlag = process.argv.indexOf('--inline-output');
if (inlineFlag !== -1) {
  if (!process.argv[inlineFlag + 1]) throw new Error('--inline-output requires a path.');
  const inlineOutput = resolve(process.argv[inlineFlag + 1]);
  await mkdir(dirname(inlineOutput), { recursive: true });
  await writeFile(inlineOutput, fragment);
  console.log(`Inline review: ${inlineOutput}`);
}
console.log(`Built ${monthPuzzles.length} puzzles in ${output}`);
