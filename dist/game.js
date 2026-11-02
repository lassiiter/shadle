import { shaderPuzzle } from './puzzles.js';

export const MAX_ATTEMPTS = 6;
export const EPOCH = Date.UTC(2026, 9, 1);
export const SAMPLE_SIZE = 96;
export const STARTER_SOURCE = `precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

void main() {
  // Normalize fragment coordinates.
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution)
         / min(u_resolution.x, u_resolution.y);

  // Compute the output color.
  vec3 color = vec3(uv.x, uv.y, 0.5);

  gl_FragColor = vec4(color, 1.0);
}`;

export function dateKey(date = new Date()) { return date.toISOString().slice(0, 10); }
export function hintProgress(attempts, totalHints, revealed = 0) {
  const unlocked = Math.min(totalHints, attempts.filter(attempt => attempt.solved === false).length);
  const visible = Math.max(0, Math.min(unlocked, Math.floor(Number(revealed) || 0)));
  return { unlocked, revealed: visible, canReveal: visible < unlocked, solved: attempts.some(attempt => attempt.solved) };
}
export function puzzleForDate(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('Invalid puzzle date');
  const date = new Date(key + 'T00:00:00Z');
  const number = Math.floor((date.getTime() - EPOCH) / 86400000) + 1;
  if (!Number.isFinite(number) || dateKey(date) !== key) throw new Error('Invalid puzzle date');
  let seed = Math.floor(date.getTime() / 86400000) ^ 0x51ad1e;
  seed = Math.imul(seed ^ (seed >>> 16), 0x85ebca6b);
  seed = Math.imul(seed ^ (seed >>> 13), 0xc2b2ae35);
  seed = (seed ^ (seed >>> 16)) >>> 0;
  function random() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }
  return { key, number, ...shaderPuzzle(number, random) };
}

const luminance = (data, offset) => (0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2]) / 255;
const percentage = n => Math.round(Math.max(0, Math.min(1, n)) * 100);
export function compareImages(actual, target, width = SAMPLE_SIZE, height = SAMPLE_SIZE) {
  const count = width * height;
  if (width < 2 || height < 2 || actual.length !== count * 4 || target.length !== count * 4) throw new Error('Pixel buffers must have matching RGBA dimensions');
  const lumA = new Float64Array(count), lumB = new Float64Array(count);
  let pixelError = 0;
  for (let i = 0; i < count; i++) {
    const offset = i * 4;
    for (let c = 0; c < 3; c++) {
      const a = actual[offset + c], b = target[offset + c];
      pixelError += Math.abs(a - b) / 255;
    }
    lumA[i] = luminance(actual, offset); lumB[i] = luminance(target, offset);
  }
  pixelError /= count * 3;
  let edgeDifference = 0, edgeEnergyA = 0, edgeEnergyB = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    const ax = lumA[i + 1] - lumA[i - 1], ay = lumA[i + width] - lumA[i - width];
    const bx = lumB[i + 1] - lumB[i - 1], by = lumB[i + width] - lumB[i - width];
    edgeDifference += Math.abs(ax - bx) + Math.abs(ay - by);
    edgeEnergyA += Math.abs(ax) + Math.abs(ay); edgeEnergyB += Math.abs(bx) + Math.abs(by);
  }
  const edgeError = Math.min(1, edgeDifference / Math.max(edgeEnergyA + edgeEnergyB, count * 0.002));
  const solved = pixelError <= 0.008 && edgeError <= 0.08;
  const rawScore = percentage(0.75 * Math.exp(-7.5 * pixelError) + 0.25 * (1 - edgeError));
  const score = solved ? Math.max(98, rawScore) : Math.min(97, rawScore);
  return { score, solved };
}

export function shareText(puzzle, attempts, options = {}) {
  const mode = { daily: 'Daily', practice: 'Practice', debug: 'Debug' }[options.mode] || 'Daily';
  const hintsUsed = Math.max(0, Math.min(3, Math.floor(Number(options.hintsUsed) || 0)));
  return `shadle #${String(puzzle.number).padStart(3, '0')} · ${attempts.some(a => a.solved) ? attempts.length : 'X'}/6\n${mode} puzzle · ${puzzle.key}\n${attempts.map((a, i) => `${i + 1}. ${a.score}% close to target`).join('\n')}\nHints used: ${hintsUsed}${options.url ? '\n\n' + options.url : ''}`;
}
export function statistics(games, today) {
  const finished = Object.entries(games).filter(([, g]) => g?.attempts?.some(a => a.solved) || g?.attempts?.length >= MAX_ATTEMPTS);
  const wins = finished.filter(([, g]) => g.attempts.some(a => a.solved));
  const distribution = Array(6).fill(0);
  wins.forEach(([, g]) => distribution[g.attempts.length - 1]++);
  const winDates = new Set(wins.map(([key]) => key));
  const latest = new Date(today + 'T00:00:00Z');
  if (!winDates.has(dateKey(latest))) latest.setUTCDate(latest.getUTCDate() - 1);
  let currentStreak = 0;
  while (winDates.has(dateKey(latest))) { currentStreak++; latest.setUTCDate(latest.getUTCDate() - 1); }
  let maxStreak = 0, streak = 0, last = 0;
  for (const [key] of [...wins].sort(([a], [b]) => a.localeCompare(b))) {
    const day = new Date(key).getTime() / 86400000;
    streak = day === last + 1 ? streak + 1 : 1;
    maxStreak = Math.max(maxStreak, streak); last = day;
  }
  return { played: finished.length, winRate: finished.length ? Math.round(wins.length / finished.length * 100) : 0, currentStreak, maxStreak, distribution };
}
