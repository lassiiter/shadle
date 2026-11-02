import test from 'node:test';
import assert from 'node:assert/strict';
import { highlightShader, indentSelection, lineCutRange } from '../dist/editor.js';

test('highlighting treats shader text as text, including hostile-looking comments', () => {
  const html = highlightShader('if (x < 1.0) {\n// <img src=x onerror="boom()">\n}');
  assert.match(html, /token-keyword/); assert.match(html, /token-comment/);
  assert.ok(!html.includes('<img')); assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('x &lt;'));
});
test('tab indents a cursor and multi-line selections without losing text', () => {
  assert.deepEqual(indentSelection('abc', 1, 1), { source: 'a  bc', start: 3, end: 3 });
  assert.deepEqual(indentSelection('a\nb\nc', 0, 4), { source: '  a\n  b\nc', start: 2, end: 8 });
});
test('shift-tab unindents selected lines and preserves unindented lines', () => {
  assert.deepEqual(indentSelection('  a\n b\nc', 0, 7, true), { source: 'a\nb\nc', start: 0, end: 4 });
  assert.deepEqual(indentSelection('abc', 1, 1, true), { source: 'abc', start: 1, end: 1 });
});

test('line cutting selects the current line including its following newline', () => {
  const source = 'first\n  middle\nlast';
  assert.deepEqual(lineCutRange(source, 0), { start: 0, end: 6 });
  assert.deepEqual(lineCutRange(source, 5), { start: 0, end: 6 });
  assert.deepEqual(lineCutRange(source, 6), { start: 6, end: 15 });
  assert.deepEqual(lineCutRange(source, 10), { start: 6, end: 15 });
  assert.deepEqual(lineCutRange(source, 14), { start: 6, end: 15 });
});

test('line cutting preserves the preceding newline for a final nonempty line', () => {
  assert.deepEqual(lineCutRange('first\nlast', 10), { start: 6, end: 10 });
  assert.deepEqual(lineCutRange('only line', 4), { start: 0, end: 9 });
});

test('line cutting handles blank first, middle, and final lines and an empty editor', () => {
  assert.deepEqual(lineCutRange('\nlast', 0), { start: 0, end: 1 });
  assert.deepEqual(lineCutRange('first\n\nlast', 6), { start: 6, end: 7 });
  assert.deepEqual(lineCutRange('first\n', 6), { start: 5, end: 6 });
  assert.deepEqual(lineCutRange('', 0), { start: 0, end: 0 });
});
