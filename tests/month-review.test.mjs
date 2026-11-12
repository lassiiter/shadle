import test from 'node:test';
import assert from 'node:assert/strict';
import { monthPuzzles } from '../review/month-one.js';
import { dateKey, puzzleForDate, MONTH_START } from '../dist/game.js';

test('the review month has 30 distinct puzzles and learning goals', () => {
  assert.equal(monthPuzzles.length, 30);
  for (const property of ['id', 'name', 'idea', 'source']) assert.equal(new Set(monthPuzzles.map(p => p[property])).size, 30, property);
  assert.deepEqual(monthPuzzles.map(p => p.id), Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, '0')));
});

test('each candidate is repaired by its third hint without changing other shader code', () => {
  for (const p of monthPuzzles) {
    assert.equal((p.starterSource.match(/\/\/ TODO:/g) || []).length, 1, p.name);
    assert.equal(p.hints.length, 3, p.name);
    assert.ok(p.hints.slice(0, 2).every(hint => !hint.code), p.name);
    assert.ok(p.focus && p.idea && p.goal, p.name);
    const repaired = p.starterSource.replace(/^  \/\/ TODO:[^\n]*\n  [^\n]*/m, '  ' + p.hints[2].code);
    assert.equal(repaired, p.source, p.name);
    assert.notEqual(p.starterSource.replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ''), p.source.replace(/\s+/g, ''), p.name);
    assert.doesNotMatch(p.source, /REPAIR|TODO/, p.name);
    assert.match(p.source, /void main\(\)/, p.name);
    assert.match(p.source, /gl_FragColor/, p.name);
  }
});

test('the approved rotation starts at the next daily reset and preserves earlier puzzles', () => {
  assert.equal(dateKey(new Date(MONTH_START)), '2026-11-13');
  assert.equal(puzzleForDate('2026-11-12').name, 'Sine Stripes');
  for (const [index, approved] of monthPuzzles.entries()) {
    const key = dateKey(new Date(MONTH_START + index * 86400000));
    const daily = puzzleForDate(key);
    assert.equal(daily.name, approved.name, key);
    assert.equal(daily.source, approved.source, key);
    assert.equal(daily.starterSource, approved.starterSource, key);
    assert.deepEqual(daily.hints, approved.hints, key);
    assert.equal(daily.repairCount, 1, key);
  }
  assert.equal(puzzleForDate('2026-12-12').name, monthPuzzles[29].name);
  assert.equal(puzzleForDate('2026-12-13').name, monthPuzzles[0].name);
});
