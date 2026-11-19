import test from 'node:test';
import assert from 'node:assert/strict';
import { monthPuzzles } from '../review/month-one.js';
import { dateKey, puzzleForDate, EPOCH, profileForSequence, shareText } from '../dist/game.js';

test('the bank contains 101 distinct puzzles numbered 000 through 100', () => {
  assert.equal(monthPuzzles.length, 101);
  for (const property of ['id', 'name', 'idea', 'source', 'starterSource']) assert.equal(new Set(monthPuzzles.map(p => p[property])).size, 101, property);
  assert.equal(new Set(monthPuzzles.map(p => p.hints[2].code.replace(/\s+/g, ''))).size, 101, 'repair statements');
  assert.deepEqual(monthPuzzles.map(p => p.id), Array.from({ length: 101 }, (_, i) => String(i).padStart(3, '0')));
});

test('every puzzle is repaired by its third hint without changing other shader code', () => {
  for (const p of monthPuzzles) {
    assert.equal((p.starterSource.match(/\/\/ TODO:/g) || []).length, 1, p.name);
    assert.equal(p.hints.length, 3, p.name);
    assert.ok(p.hints.slice(0, 2).every(hint => !hint.code && hint.body), p.name);
    assert.ok(p.focus && p.idea && p.goal, p.name);
    const repaired = p.starterSource.replace(/^  \/\/ TODO:[^\n]*\n  [^\n]*/m, '  ' + p.hints[2].code);
    assert.equal(repaired, p.source, p.name);
    assert.notEqual(p.starterSource.replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ''), p.source.replace(/\s+/g, ''), p.name);
    assert.doesNotMatch(p.source, /REPAIR|TODO|__PUZZLE_PAINT__/, p.name);
    assert.match(p.source, /void main\(\)/, p.name);
    assert.match(p.source, /gl_FragColor/, p.name);
  }
});

test('the sequence starts at zero, releases all entries in order, and wraps after 100', () => {
  assert.equal(dateKey(new Date(EPOCH)), '2026-11-19');
  for (const [index, approved] of monthPuzzles.entries()) {
    const key = dateKey(new Date(EPOCH + index * 86400000));
    const daily = puzzleForDate(key);
    assert.equal(daily.number, index, key);
    assert.equal(daily.id, approved.id, key);
    assert.equal(daily.source, approved.source, key);
    assert.equal(daily.starterSource, approved.starterSource, key);
    assert.deepEqual(daily.hints, approved.hints, key);
    assert.equal(daily.repairCount, 1, key);
  }
  assert.equal(puzzleForDate(dateKey(new Date(EPOCH + 100 * 86400000))).number, 100);
  const nextCycle = puzzleForDate(dateKey(new Date(EPOCH + 101 * 86400000)));
  assert.equal(nextCycle.number, 0);
  assert.equal(nextCycle.source, monthPuzzles[0].source);
  assert.match(shareText(puzzleForDate('2026-11-19'), []), /^shadle #000 /);
});

test('pre-reset daily puzzles retain their original numbers and content', () => {
  assert.equal(puzzleForDate('2026-11-12').name, 'Sine Stripes');
  assert.equal(puzzleForDate('2026-11-13').number, 44);
  for (let index = 0; index < 6; index++) assert.equal(puzzleForDate(dateKey(new Date(Date.UTC(2026, 10, 13 + index)))).source, monthPuzzles[index].source);
});

test('save migration preserves earlier progress and rejects obsolete reset-day shaders', () => {
  const legacy = { games: { '2026-11-18': { source: 'old draft' }, '2026-11-19': { source: 'different puzzle' } }, practice: { '2026-11-17': { source: 'practice' }, '2026-11-20': { source: 'future debug' } }, sound: true };
  const migrated = profileForSequence(legacy, true);
  assert.deepEqual(Object.keys(migrated.games), ['2026-11-18']);
  assert.deepEqual(Object.keys(migrated.practice), ['2026-11-17']);
  assert.equal(migrated.sound, true);
  assert.equal(legacy.games['2026-11-19'].source, 'different puzzle');
  const current = { ...migrated, games: { ...migrated.games, '2026-11-19': { source: 'new draft' } } };
  assert.deepEqual(profileForSequence(current), current);
  assert.deepEqual(profileForSequence(null, true), { games: {}, practice: {}, sound: false });
});
