import test from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, puzzleForDate, compareImages, shareText, statistics, STARTER_SOURCE, hintProgress } from '../dist/game.js';
import { migrateGeneratedShader } from '../dist/puzzles.js';

const size = 32;
function image(pixel) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) data.set([...pixel(x, y), 255], (y * size + x) * 4);
  return data;
}
const circle = image((x, y) => Math.hypot(x - 16, y - 16) < 9 ? [80, 240, 150] : [6, 10, 8]);
const compare = (a, b) => compareImages(a, b, size, size);

test('daily puzzles are deterministic guided full shaders with one repair and progressive hints', () => {
  assert.equal(dateKey(new Date('2026-11-01T23:00:00-05:00')), '2026-11-02');
  const first = puzzleForDate('2026-11-01');
  assert.deepEqual(first, puzzleForDate('2026-11-01'));
  assert.equal(first.number, 32); assert.match(first.source, /void main\(\)/); assert.match(first.source, /gl_FragColor/);
  assert.notEqual(first.source, puzzleForDate('2026-11-09').source);
  const week = Array.from({ length: 8 }, (_, i) => puzzleForDate(dateKey(new Date(Date.UTC(2026, 10, i + 1)))));
  assert.equal(new Set(week.map(p => p.technique)).size, 8);
  for (const puzzle of week) {
    assert.match(puzzle.starterSource, /void main\(\)/);
    assert.equal((puzzle.starterSource.match(/\/\/ TODO:/g) || []).length, 1);
    assert.equal(puzzle.repairCount, 1);
    assert.notEqual(puzzle.starterSource, puzzle.source);
    assert.equal(puzzle.hints.length, 3);
    assert.ok(puzzle.source.includes(puzzle.hints[2].code));
  }
  assert.match(STARTER_SOURCE, /uniform vec2 u_resolution/);
  assert.throws(() => puzzleForDate('2026-02-31'), /Invalid/);
});

test('unsuccessful submissions unlock one hint each, up to three', () => {
  assert.deepEqual(hintProgress([], 3), { unlocked: 0, revealed: 0, canReveal: false, solved: false });
  for (let count = 1; count <= 6; count++) {
    const attempts = Array.from({ length: count }, () => ({ solved: false }));
    assert.equal(hintProgress(attempts, 3).unlocked, Math.min(count, 3));
    assert.equal(hintProgress(attempts, 3).canReveal, true);
  }
  assert.deepEqual(hintProgress([{ solved: true }], 3), { unlocked: 0, revealed: 0, canReveal: false, solved: true });
  assert.equal(hintProgress([{ solved: false }, { solved: true }], 3).unlocked, 1);
});

test('recognized legacy starters use descriptive color names without changing comments', () => {
  const puzzle = puzzleForDate('2026-11-03');
  const oldStarter = puzzle.starterSource.replace(/\bshapeColor\b/g, 'ink') + '\n// keep ink in this comment';
  assert.equal(migrateGeneratedShader(oldStarter, puzzle), puzzle.starterSource + '\n// keep ink in this comment');
  const gradient = puzzleForDate('2026-11-02');
  const oldGradient = gradient.starterSource.replace(/\bleftColor\b/g, 'left').replace(/\brightColor\b/g, 'right');
  assert.equal(migrateGeneratedShader(oldGradient, gradient), gradient.starterSource);
});

test('custom shader edits are preserved during terminology updates', () => {
  const puzzle = puzzleForDate('2026-11-03');
  const custom = puzzle.starterSource.replace(/\bshapeColor\b/g, 'ink').replace('0.26, 0.28', '0.30, 0.32');
  assert.equal(migrateGeneratedShader(custom, puzzle), custom);
  assert.equal(migrateGeneratedShader(puzzle.starterSource, puzzle), puzzle.starterSource);
});

test('revealed hints cannot exceed earned hints, including restored older saves', () => {
  const oneAttempt = [{ solved: false }];
  assert.deepEqual(hintProgress(oneAttempt, 3, 1), { unlocked: 1, revealed: 1, canReveal: false, solved: false });
  assert.equal(hintProgress(oneAttempt, 3, 3).revealed, 1);
  assert.equal(hintProgress([], 3, 3).revealed, 0);
  assert.equal(hintProgress(oneAttempt, 3, 'invalid').revealed, 0);
  assert.equal(hintProgress(oneAttempt, 3, -1).revealed, 0);
});
test('matching rendered pixels solve regardless of shader implementation', () => {
  const result = compare(circle, new Uint8Array(circle));
  assert.equal(result.score, 100); assert.equal(result.solved, true);
  assert.deepEqual(result, { score: 100, solved: true });
});
test('blank and unrelated shaders cannot solve a nonblank target', () => {
  for (const wrong of [image(() => [6, 10, 8]), image(() => [255, 0, 0]), image((x, y) => [x * 8, y * 8, 120])]) {
    const result = compare(wrong, circle); assert.equal(result.solved, false); assert.ok(result.score < 98);
  }
});
test('the same palette in a different position fails the overall image match', () => {
  const left = image((x, y) => x >= 4 && x < 12 && y >= 8 && y < 24 ? [100, 240, 150] : [0, 0, 0]);
  const right = image((x, y) => x >= 20 && x < 28 && y >= 8 && y < 24 ? [100, 240, 150] : [0, 0, 0]);
  const result = compare(left, right);
  assert.ok(result.score < 98);
  assert.equal(result.solved, false);
});
test('minor quantization differences are tolerated, larger image changes are not', () => {
  const slight = new Uint8Array(circle); for (let i = 0; i < slight.length; i += 4) slight[i]++;
  assert.equal(compare(slight, circle).solved, true);
  const bright = circle.map((n, i) => i % 4 === 3 ? n : Math.min(255, n + 30));
  assert.equal(compare(bright, circle).solved, false);
  assert.throws(() => compare(new Uint8Array(4), circle), /matching RGBA/);
});
test('share results include one closeness percentage per attempt without source code', () => {
  const puzzle = puzzleForDate('2026-11-01');
  const text = shareText(puzzle, [{ source: puzzle.source, ...compare(circle, circle) }]);
  assert.match(text, /shadle #032 · 1\/6/); assert.match(text, /1\. 100% close to target/); assert.doesNotMatch(text, /gl_FragColor|precision|uniform|color|layout|detail/);
});

test('share results identify puzzle date, mode, and hints without revealing the solution', () => {
  const puzzle = puzzleForDate('2026-11-02');
  const attempts = [{ source: puzzle.source, score: 100, solved: true }];
  const text = shareText(puzzle, attempts, { mode: 'debug', hintsUsed: 2 });
  assert.match(text, /Debug puzzle · 2026-11-02/);
  assert.match(text, /Hints used: 2/);
  assert.doesNotMatch(text, /localhost|127\.0\.0\.1|gl_FragColor|leftColor/);
  assert.match(shareText(puzzle, attempts, { mode: 'practice', url: 'https:\/\/example.com' }), /Practice puzzle/);
  assert.ok(shareText(puzzle, attempts, { url: 'https:\/\/example.com' }).endsWith('https://example.com'));
});

test('unsolved results share all six attempts and identify an unsuccessful result', () => {
  const puzzle = puzzleForDate('2026-11-02');
  const attempts = Array.from({ length: 6 }, (_, i) => ({ score: i * 10, solved: false }));
  const text = shareText(puzzle, attempts, { hintsUsed: 3 });
  assert.match(text, /shadle #033 · X\/6/);
  assert.match(text, /6\. 50% close to target/);
  assert.match(text, /Hints used: 3/);
});
test('daily statistics handle completed games and month-spanning streaks', () => {
  const win = { attempts: [{ solved: true }] }, miss = { attempts: Array.from({ length: 6 }, () => ({ solved: false })) };
  const games = { '2026-10-29': miss, '2026-10-30': win, '2026-10-31': win, '2026-11-01': { attempts: [] } };
  assert.deepEqual(statistics(games, '2026-11-01'), { played: 3, winRate: 67, currentStreak: 2, maxStreak: 2, distribution: [2, 0, 0, 0, 0, 0] });
});
