import { MAX_ATTEMPTS, EPOCH, dateKey, puzzleForDate, compareImages, shareText, statistics, hintProgress } from '../game.js';
import { createRenderer, ShaderError } from '../renderer.js';
import { createEditor, escapeHtml } from '../editor.js';
import { migrateGeneratedShader } from '../puzzles.js';

// Typography previews keep progress in this page only.
const localStorage = { getItem: () => null, setItem: () => {} };
const $ = selector => document.querySelector(selector);
const today = '2026-11-06';
let selectedKey = today, debugMode = false, puzzle = puzzleForDate(today), renderers = [], targetPixels;
let graphicsReady = false, inspectionRenderers = [], toastTimer, previewTimer, audioContext, storeAvailable = true;
const STORAGE_KEY = 'shadle-guided-v3';
let profile;
try {
  const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  profile = { games: parsed.games && typeof parsed.games === 'object' ? parsed.games : {}, practice: parsed.practice && typeof parsed.practice === 'object' ? parsed.practice : {}, sound: parsed.sound === true };
} catch { profile = { games: {}, practice: {}, sound: false }; }
const isDailyPuzzle = () => selectedKey === today && !debugMode;
const progressFor = (key, debug = debugMode) => key === today && !debug ? profile.games : profile.practice;
function readGame(key) {
  const saved = progressFor(key)[key] || {};
  const selectedPuzzle = puzzleForDate(key), starter = selectedPuzzle.starterSource;
  const attempts = [];
  for (const a of Array.isArray(saved.attempts) ? saved.attempts.slice(0, MAX_ATTEMPTS) : []) {
    if (typeof a?.source !== 'string' || !Number.isFinite(a.score) || a.score < 0 || a.score > 100 || typeof a.solved !== 'boolean') break;
    attempts.push({ source: migrateGeneratedShader(a.source, selectedPuzzle), score: a.score, solved: a.solved }); if (a.solved) break;
  }
  return { source: typeof saved.source === 'string' ? migrateGeneratedShader(saved.source, selectedPuzzle) : starter, previewSource: typeof saved.previewSource === 'string' ? migrateGeneratedShader(saved.previewSource, selectedPuzzle) : starter, hintsRevealed: hintProgress(attempts, selectedPuzzle.hints.length, saved.hintsRevealed).revealed, attempts };
}
let game = readGame(selectedKey);
const finished = () => game.attempts.some(a => a.solved) || game.attempts.length >= MAX_ATTEMPTS;
function save() {
  progressFor(selectedKey)[selectedKey] = game;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); }
  catch { if (storeAvailable) toast('Browser storage is unavailable. Keep this tab open to retain your progress.'); storeAvailable = false; }
}
function toast(message) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3600);
}
const editor = createEditor({ input: $('#shader-source'), highlight: $('#code-highlight'), gutter: $('#line-numbers'), onChange(source) {
  const lines = source.split('\n').length;
  game.source = source; $('.editor-window').style.setProperty('--source-lines', lines);
  $('#source-lines').textContent = lines + ' lines · GLSL ES 1.00';
  clearTimeout(previewTimer); save();
  if (graphicsReady && !finished()) {
    $('#editor-status').textContent = 'Draft saved · previewing…'; $('.live-label').textContent = 'PENDING';
    previewTimer = setTimeout(() => preview(), 500);
  }
} });
function showCompilerError(error) {
  const message = error.message || String(error);
  $('#compiler-errors').hidden = false; $('#compiler-log').textContent = message; editor.setError(message);
  $('#editor-status').textContent = 'Compile error · no attempt used'; $('.live-label').textContent = 'LAST VALID';
  $('.output-dot').classList.add('preview-error');
}
function clearCompilerError() {
  $('#compiler-errors').hidden = true; $('#compiler-log').textContent = ''; editor.setError('');
  $('.live-label').textContent = 'LIVE'; $('.output-dot').classList.remove('preview-error');
}
function preview() {
  clearTimeout(previewTimer); if (!graphicsReady) return false;
  try {
    renderers[1].render(game.source); clearCompilerError();
    if (game.previewSource !== game.source) { game.previewSource = game.source; save(); }
    $('#editor-status').textContent = finished() ? 'Puzzle complete' : 'Preview compiled · no attempt used';
    return true;
  } catch (error) {
    showCompilerError(error);
    if (!(error instanceof ShaderError)) { graphicsReady = false; $('#compile-button').disabled = true; }
    return false;
  }
}
function initGraphics() {
  try {
    renderers = [createRenderer($('#target-canvas')), createRenderer($('#output-canvas'))];
    renderers[0].render(puzzle.source); targetPixels = renderers[0].pixels();
    try { renderers[1].render(game.previewSource); }
    catch (error) { if (!(error instanceof ShaderError)) throw error; renderers[1].render(puzzle.starterSource); }
    graphicsReady = true;
  } catch (error) {
    $('#editor-status').textContent = 'Graphics unavailable'; $('#compile-button').disabled = true;
    const note = document.createElement('p'); note.className = 'error-note'; note.textContent = error.message; $('.preview-window').append(note);
  }
}
function showAttempt(index) {
  const attempt = game.attempts[index];
  openModal(`ATTEMPT ${String(index + 1).padStart(2, '0')} / ${attempt.score}% MATCH`, '<div class="modal-content"><h2>Submitted shader</h2><pre class="source-view" id="attempt-source"></pre><button class="compile-button" id="load-attempt">Load into editor <svg><use href="#i-arrow"/></svg></button></div>', 'source-modal');
  $('#attempt-source').textContent = attempt.source;
  $('#load-attempt').disabled = finished();
  $('#load-attempt').addEventListener('click', () => { editor.setSource(attempt.source); preview(); closeModal(); editor.focus(); toast('Submitted shader loaded. Your attempt history is preserved.'); });
}
function renderHistory() {
  const history = $('#attempts'); history.replaceChildren();
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const attempt = game.attempts[i];
    const box = document.createElement(attempt ? 'button' : 'div');
    box.className = 'compile-box' + (attempt ? ' is-submitted' : '') + (attempt?.solved ? ' is-solved' : '');
    const number = document.createElement('span'); number.className = 'compile-box-number'; number.textContent = String(i + 1).padStart(2, '0');
    const score = document.createElement('strong'); score.className = 'compile-box-score'; score.textContent = attempt ? attempt.score + '%' : '—';
    box.append(number, score);
    if (attempt) {
      box.title = `Attempt ${i + 1}: ${attempt.score}% close to target. Click to review the submitted shader.`;
      box.setAttribute('aria-label', box.title); box.addEventListener('click', () => showAttempt(i));
    } else { box.setAttribute('aria-label', `Attempt ${i + 1}: not submitted`); }
    history.append(box);
  }
  $('#attempt-counter').textContent = `${game.attempts.length} / ${MAX_ATTEMPTS}`;
}
function renderEnd() {
  const done = finished(), won = game.attempts.at(-1)?.solved;
  $('#view-result-button').hidden = !done; editor.setLocked(done); $('#reset-button').disabled = done; $('#compile-button').disabled = done || !graphicsReady;
  $('#preview-button').disabled = !graphicsReady;
  $('#compile-label').textContent = done ? won ? 'Target matched' : 'Puzzle complete' : 'Submit shader';
  if (!graphicsReady) $('#editor-status').textContent = 'Graphics unavailable';
  if (!done) return;
  $('#editor-status').textContent = 'Puzzle complete';
  $('#attempts-caption').textContent = won ? 'TARGET MATCHED' : 'ATTEMPT LIMIT REACHED';
}
function renderPuzzle() {
  clearTimeout(previewTimer);
  $('#puzzle-number').textContent = `SHADER PUZZLE #${String(puzzle.number).padStart(3, '0')}`;
  $('#puzzle-date').textContent = new Date(selectedKey + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
  $('#exit-debug-button').hidden = !debugMode;
  $('#attempts-caption').textContent = 'CLOSENESS TO TARGET'; document.title = document.body.dataset.typeName + ' · ' + `shadle #${String(puzzle.number).padStart(3, '0')} — ${puzzle.name}`;
  if (graphicsReady) {
    try {
      renderers[0].render(puzzle.source); targetPixels = renderers[0].pixels();
      try { renderers[1].render(game.previewSource); }
      catch (error) { if (!(error instanceof ShaderError)) throw error; renderers[1].render(puzzle.starterSource); }
    }
    catch (error) { showCompilerError(error); graphicsReady = false; }
  }
  editor.setSource(game.source); preview(); renderHistory(); renderHints(); renderEnd();
}
function loadPuzzle(key, debug = false) {
  const nextPuzzle = puzzleForDate(key);
  save(); selectedKey = key; debugMode = debug; puzzle = nextPuzzle; game = readGame(key); renderPuzzle();
}
$('#next-puzzle-button').addEventListener('click', () => {
  const nextDate = new Date(selectedKey + 'T00:00:00Z');
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  loadPuzzle(dateKey(nextDate), true);
  toast(`Debug puzzle #${String(puzzle.number).padStart(3, '0')}. Daily stats are kept separate.`);
});
$('#exit-debug-button').addEventListener('click', () => { loadPuzzle(today); toast('Back to today’s puzzle.'); });
function submit() {
  if (finished() || !graphicsReady || !preview()) return;
  const last = game.attempts.at(-1);
  if (last?.source === game.source) { toast('Change your shader before submitting again.'); return; }
  let result;
  try { result = { source: game.source, ...compareImages(renderers[1].pixels(), targetPixels) }; }
  catch (error) { showCompilerError(error); return; }
  const previousUnlocked = hintProgress(game.attempts, puzzle.hints.length).unlocked;
  game.attempts.push(result); save(); renderHistory(); renderHints(); renderEnd(); playTone(result.solved ? 'win' : 'compile');
  const remaining = MAX_ATTEMPTS - game.attempts.length;
  if (finished()) showResult();
  else {
    const unlocked = hintProgress(game.attempts, puzzle.hints.length).unlocked;
    toast(`${result.score}% close to target. ${remaining} ${remaining === 1 ? 'submission' : 'submissions'} left.${unlocked > previousUnlocked ? ` Hint ${unlocked} unlocked.` : ''}`);
  }
}
$('#compile-button').addEventListener('click', submit); $('#preview-button').addEventListener('click', preview);
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (!event.repeat) { save(); if (storeAvailable) toast('Shader draft saved locally.'); }
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !$('#modal').open) { event.preventDefault(); if (event.shiftKey) submit(); else preview(); }
}, { capture: true });
$('#reset-button').addEventListener('click', () => {
  if (finished()) return;
  editor.setSource(puzzle.starterSource); preview(); save(); toast('Starter shader restored. Your attempt history and unlocked hints are preserved.');
});

function renderHints() {
  const progress = hintProgress(game.attempts, puzzle.hints.length, game.hintsRevealed);
  game.hintsRevealed = progress.revealed;
  $('#hint-list').replaceChildren();
  puzzle.hints.slice(0, game.hintsRevealed).forEach((hint, i) => {
    const item = document.createElement('li');
    const title = document.createElement('strong'); title.textContent = `${i + 1}. ${hint.title}`;
    const body = document.createElement('p'); body.textContent = hint.body; item.append(title, body);
    if (hint.code) { const code = document.createElement('code'); code.textContent = hint.code; item.append(code); }
    $('#hint-list').append(item);
  });
  const allRevealed = game.hintsRevealed >= puzzle.hints.length;
  $('#hint-count').textContent = `${progress.unlocked} / ${puzzle.hints.length}`;
  $('#open-hints').classList.toggle('has-hint', progress.canReveal);
  $('#open-hints').setAttribute('aria-label', `Hints: ${progress.unlocked} of ${puzzle.hints.length} unlocked${progress.canReveal ? ', new hint available' : ''}`);
  $('#hint-status').textContent = `${progress.unlocked} / ${puzzle.hints.length} UNLOCKED`;
  $('#hint-button').disabled = !progress.canReveal;
  $('#hint-button').textContent = allRevealed ? 'All hints revealed' : progress.canReveal ? `Reveal hint ${game.hintsRevealed + 1} / ${puzzle.hints.length}` : progress.solved ? 'Puzzle solved' : `Submit shader to unlock hint ${game.hintsRevealed + 1}`;
}
$('#hint-button').addEventListener('click', () => {
  const progress = hintProgress(game.attempts, puzzle.hints.length, game.hintsRevealed);
  if (!progress.canReveal) return;
  game.hintsRevealed = progress.revealed + 1; save(); renderHints();
});
function openModal(label, content, extraClass = '') {
  inspectionRenderers.forEach(r => r.dispose()); inspectionRenderers = [];
  const modal = $('#modal'); modal.className = extraClass; $('#modal-label').textContent = label; $('#modal-body').innerHTML = content;
  if (!modal.open) modal.showModal();
}
function closeModal() { $('#modal').close(); }
$('#close-modal').addEventListener('click', closeModal);
$('#modal').addEventListener('click', event => { if (event.target === $('#modal')) { const r = $('#modal').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(); } });
$('#modal').addEventListener('close', () => { inspectionRenderers.forEach(r => r.dispose()); inspectionRenderers = []; });

function showResult() {
  if (!finished()) return;
  const won = game.attempts.at(-1).solved;
  const bestScore = Math.max(...game.attempts.map(attempt => attempt.score));
  const mode = debugMode ? 'debug' : isDailyPuzzle() ? 'daily' : 'practice';
  const hostname = window.location.hostname;
  const localHost = hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.startsWith('127.') || hostname === '[::1]';
  const url = window.location.protocol === 'https:' && !localHost ? window.location.origin : '';
  const text = shareText(puzzle, game.attempts, { mode, hintsUsed: game.hintsRevealed, url });
  const boxes = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    const attempt = game.attempts[i];
    return `<div class="compile-box${attempt ? ' is-submitted' : ''}${attempt?.solved ? ' is-solved' : ''}" aria-label="Attempt ${i + 1}: ${attempt ? attempt.score + '% close to target' : 'not submitted'}"><span class="compile-box-number">${String(i + 1).padStart(2, '0')}</span><strong class="compile-box-score">${attempt ? attempt.score + '%' : '—'}</strong></div>`;
  }).join('');
  openModal('PUZZLE RESULT', `<div class="result-content"><div class="result-heading"><span class="result-icon${won ? ' is-solved' : ''}" aria-hidden="true"><svg viewBox="0 0 24 24">${won ? '<path d="m5 12 4 4L19 6"/>' : '<path d="m7 7 10 10M17 7 7 17"/>'}</svg></span><div><div class="result-mode">${mode.toUpperCase()} RESULT · #${String(puzzle.number).padStart(3, '0')}</div><h2>${won ? 'Puzzle solved' : 'No attempts remaining'}</h2></div></div><p class="result-subtitle">${escapeHtml(puzzle.name)} <span>· ${puzzle.key}</span></p><div class="result-metrics"><div><strong>${game.attempts.length}<small> / ${MAX_ATTEMPTS}</small></strong><span>Attempts</span></div><div><strong>${bestScore}<small>%</small></strong><span>Best match</span></div><div><strong>${game.hintsRevealed}</strong><span>Hints used</span></div></div><div class="result-attempts" aria-label="Result by attempt">${boxes}</div><div class="result-share-heading"><h3>Share your result</h3><span>Scores only. Solution code stays private.</span></div><textarea class="result-share-text" id="result-share-text" readonly aria-label="Shareable result"></textarea><div class="result-share-actions"><button class="compile-button" id="result-share-button">Share result <svg><use href="#i-arrow"/></svg></button><button class="preview-button" id="result-copy-button">Copy result</button></div><p class="result-share-status" id="result-share-status" role="status"></p><div class="result-links"><button class="text-button" id="result-solution-button">View reference solution ↗</button><button class="text-button" id="result-archive-button">Puzzle Archive ↗</button></div></div>`, 'result-modal');
  const sharePreview = $('#result-share-text'), shareStatus = $('#result-share-status');
  const copyButton = $('#result-copy-button'), shareButton = $('#result-share-button');
  sharePreview.value = text;
  async function copyResult() {
    try {
      await navigator.clipboard.writeText(text);
      shareStatus.textContent = 'Result copied to clipboard.';
      copyButton.textContent = 'Copied';
    } catch {
      if (sharePreview.isConnected) { sharePreview.focus(); sharePreview.select(); }
      shareStatus.textContent = 'Select the result text and copy it manually.';
    }
  }
  copyButton.addEventListener('click', copyResult);
  shareButton.addEventListener('click', async () => {
    if (typeof navigator.share === 'function') {
      shareButton.disabled = true;
      shareStatus.textContent = 'Choose an app to share your result.';
      try {
        await navigator.share({ title: `Shadle #${String(puzzle.number).padStart(3, '0')} result`, text });
        shareStatus.textContent = 'Result shared.';
        return;
      } catch (error) {
        if (error.name === 'AbortError') { shareStatus.textContent = 'Sharing canceled.'; return; }
      } finally { shareButton.disabled = false; }
    }
    await copyResult();
  });
  $('#result-solution-button').addEventListener('click', showSolution);
  $('#result-archive-button').addEventListener('click', showArchive);
}
$('#view-result-button').addEventListener('click', showResult);

function showHelp() {
  openModal('HOW TO PLAY', `<div class="modal-content help-content">
    <h2>Match the target.</h2>
    <p class="help-summary">6 attempts · Unlimited previews</p>
    <div class="help-step"><span class="step-number">01</span><div><strong>Edit</strong><p>Start with the TODO in the shader.</p></div></div>
    <div class="help-step"><span class="step-number">02</span><div><strong>Preview</strong><p>Compare your output with the target.</p></div></div>
    <div class="help-step"><span class="step-number">03</span><div><strong>Submit</strong><p>98% or higher solves it.</p></div></div>
    <p class="help-rules">Missed submissions unlock hints.<br>Compile errors don’t use attempts.</p>
    <button class="compile-button" id="help-start">Back to puzzle <svg><use href="#i-arrow"/></svg></button>
  </div>`);
  $('#help-start').addEventListener('click', closeModal);
}
function showReference() {
  openModal('GLSL REFERENCE', `<div class="modal-content"><h2>GLSL Functions &amp; Uniforms</h2><p>Write a complete GLSL ES 1.00 fragment shader with <code>void main()</code> and assign <code>gl_FragColor</code>. Use standard GLSL functions and the uniforms provided below.</p><dl class="glsl-reference"><dt>u_resolution · vec2</dt><dd>Drawing-buffer size in pixels. Declare it as a uniform. Divide gl_FragCoord.xy by it for UV coordinates.</dd><dt>u_time · float</dt><dd>Fixed at 0.0 so both images use the same instant. iResolution (vec3) and iTime (float) are also supplied if declared.</dd><dt>length(p) · distance</dt><dd>Build a circle or ring from the distance to the origin.</dd><dt>step / smoothstep</dt><dd>Turn distances into hard or soft masks.</dd><dt>sin / cos / atan</dt><dd>Build waves, color palettes, rotations, and polar patterns.</dd><dt>fract / floor / mod</dt><dd>Repeat space, create tiles, and alternate cells.</dd><dt>mix(a, b, t)</dt><dd>Blend two colors or fields. Add your own functions freely.</dd></dl><p>Textures and external assets are not supplied. Use procedural GLSL. Tab indents; Shift + Tab unindents. Escape, then Tab moves focus out of the editor.</p></div>`);
}
function showStats() {
  const stats = statistics(profile.games, today), max = Math.max(1, ...stats.distribution);
  openModal('STATISTICS', `<div class="modal-content"><h2>Puzzle Statistics</h2><p>Daily challenge results saved in this browser.</p><div class="stats-grid"><div class="stat-item"><strong>${stats.played}</strong><span>Played</span></div><div class="stat-item"><strong>${stats.winRate}%</strong><span>Win rate</span></div><div class="stat-item"><strong>${stats.currentStreak}</strong><span>Current streak</span></div><div class="stat-item"><strong>${stats.maxStreak}</strong><span>Best streak</span></div></div><div class="distribution-title">SUBMISSION DISTRIBUTION</div>${stats.distribution.map((n, i) => `<div class="distribution-row"><span>${i + 1}</span><div class="distribution-bar" style="width:${Math.max(7, n / max * 94)}%">${n}</div></div>`).join('')}<p>Statistics cover completed daily challenges.</p></div>`);
}
function showArchive() {
  const dates = [], date = new Date(today + 'T00:00:00Z');
  for (let i = 0; i < 8 && date.getTime() >= EPOCH; i++) { dates.push(dateKey(date)); date.setUTCDate(date.getUTCDate() - 1); }
  openModal('PUZZLE ARCHIVE', `<div class="modal-content"><h2>Puzzle Archive</h2><p>A beginner GLSL challenge for each date. Past puzzles are practice and keep separate stats.</p><div class="archive-list">${dates.map(key => { const p = puzzleForDate(key), g = (key === today ? profile.games : profile.practice)[key]; return `<button class="archive-item" data-date="${key}"><strong>#${String(p.number).padStart(3, '0')} · ${p.name}</strong><span>${key === today ? 'TODAY' : g?.attempts?.some(a => a.solved) ? 'SOLVED ✓' : key.slice(5)}</span></button>`; }).join('')}</div></div>`);
  document.querySelectorAll('[data-date]').forEach(button => button.addEventListener('click', () => {
    loadPuzzle(button.dataset.date); closeModal(); window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(selectedKey === today ? 'Back to today’s puzzle.' : 'Practice mode. Daily stats are kept separate.');
  }));
}
function showSolution() {
  if (!finished()) return;
  openModal('REFERENCE SOLUTION', '<div class="modal-content"><h2>Reference Fragment Shader</h2><p>This implementation produces the target image. Equivalent shader implementations are accepted.</p><pre class="source-view" id="solution-source"></pre><div class="solution-actions"><button class="preview-button" id="result-return-button">Back to result</button><button class="compile-button" id="more-signals">Select another puzzle <svg><use href="#i-arrow"/></svg></button></div></div>', 'source-modal');
  $('#solution-source').textContent = puzzle.source; $('#more-signals').addEventListener('click', showArchive); $('#result-return-button').addEventListener('click', showResult);
}
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => ({ help: showHelp, reference: showReference, stats: showStats, archive: showArchive }[button.dataset.action])()));
$('#inspect-button').addEventListener('click', () => {
  if (!graphicsReady) { toast('Graphics are unavailable in this browser.'); return; }
  openModal('SHADER COMPARISON', '<div class="modal-content"><div class="inspect-grid"><div><div class="inspect-label">YOUR LAST COMPILED OUTPUT</div><canvas id="inspect-output" width="720" height="720" aria-label="Enlarged output shader"></canvas></div><div><div class="inspect-label">TARGET</div><canvas id="inspect-target" width="720" height="720" aria-label="Enlarged target shader"></canvas></div></div><p>Compare the target image with your last successfully compiled fragment shader.</p></div>', 'inspect-modal');
  try { inspectionRenderers = [createRenderer($('#inspect-target')), createRenderer($('#inspect-output'))]; inspectionRenderers[0].render(puzzle.source); inspectionRenderers[1].render(renderers[1].source); }
  catch (error) { toast(error.message); }
});
function updateSound() {
  $('#sound-button').innerHTML = `<svg><use href="#i-${profile.sound ? 'sound' : 'mute'}"/></svg>`;
  $('#sound-button').setAttribute('aria-label', `Turn sound ${profile.sound ? 'off' : 'on'}`);
  $('#sound-button').setAttribute('aria-pressed', String(profile.sound)); $('#sound-button').title = `Sound ${profile.sound ? 'on' : 'off'}`;
}
function playTone(type) {
  if (!profile.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); audioContext.resume().catch(() => {});
    (type === 'win' ? [440, 554, 659, 880] : [330, 440]).forEach((frequency, i) => {
      const osc = audioContext.createOscillator(), gain = audioContext.createGain(), start = audioContext.currentTime + i * 0.09;
      osc.frequency.value = frequency; gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(0.045, start + 0.01); gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
      osc.connect(gain); gain.connect(audioContext.destination); osc.start(start); osc.stop(start + 0.15);
    });
  } catch { /* Sound is optional. */ }
}
$('#sound-button').addEventListener('click', () => { profile.sound = !profile.sound; updateSound(); save(); if (profile.sound) playTone('compile'); });
function updateCountdown() {
  const now = new Date(), next = new Date(now); next.setUTCHours(24, 0, 0, 0);
  const seconds = Math.max(0, Math.floor((next - now) / 1000));
  $('#countdown').textContent = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':');
  if (dateKey(now) !== today && !$('#new-day')) {
    const banner = document.createElement('div'); banner.id = 'new-day'; banner.className = 'day-change'; banner.innerHTML = '<span>A new daily puzzle is available.</span><button id="refresh-day">Play today’s puzzle →</button>';
    $('.workspace').before(banner); $('#refresh-day').addEventListener('click', () => window.location.reload());
  }
}
initGraphics();
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
}).catch(() => { $('#type-font-status').textContent = 'Font fallback'; document.body.dataset.fontsReady = 'false'; });
