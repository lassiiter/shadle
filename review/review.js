(() => {
  const root = document.getElementById('shadle-month-review');
  const $ = selector => root.querySelector(selector);
  const puzzles = JSON.parse($('#shadle-month-data').textContent);
  const storageKey = 'shadle-bank-101-review-v1';
  const saved = (() => { try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; } })();
  let state = window.openai?.widgetState || saved;
  let reviews = state.modelContent?.reviews || {};
  let selected = Math.min(puzzles.length - 1, Math.max(0, Number(state.privateContent?.selected) || 0));
  const images = new Map();
  const checks = [];
  const select = $('#month-select');
  puzzles.forEach((puzzle, index) => {
    const option = document.createElement('option');
    option.value = index; option.textContent = `${puzzle.id}. ${puzzle.name}`; select.append(option);
  });

  function save() {
    const next = { modelContent: { set: 'puzzle-bank-000-100', reviews }, privateContent: { selected } };
    if (window.openai?.setWidgetState) window.openai.setWidgetState(next).catch(() => {});
    else {
      try { localStorage.setItem(storageKey, JSON.stringify(next)); }
      catch { $('#month-feedback-status').textContent = 'Storage unavailable; download feedback before closing.'; return; }
    }
    $('#month-feedback-status').textContent = 'Review saved.';
  }

  function show(index, remember = false) {
    selected = index; select.value = index;
    const puzzle = puzzles[index], rendered = images.get(puzzle.id);
    $('#month-title').textContent = `${puzzle.id}. ${puzzle.name}`;
    $('#month-level').textContent = `${puzzle.level} · proposed difficulty`;
    $('#month-focus').textContent = puzzle.focus;
    $('#month-idea').textContent = puzzle.idea;
    $('#month-goal').textContent = puzzle.goal;
    $('#month-starter-source').textContent = puzzle.starterSource;
    $('#month-reference-source').textContent = puzzle.source;
    for (const kind of ['target', 'starter']) {
      const img = $(`#month-${kind}`);
      img.alt = `${puzzle.name}: ${kind === 'target' ? 'reference target' : 'initial shader output'}`;
      if (rendered?.[kind]) img.src = rendered[kind]; else img.removeAttribute('src');
    }
    $('#month-hints').replaceChildren();
    puzzle.hints.forEach((hint, hintIndex) => {
      const details = document.createElement('details'), summary = document.createElement('summary'), body = document.createElement('p');
      summary.textContent = `Hint ${hintIndex + 1}: ${hint.title}`; body.textContent = hint.body;
      details.append(summary, body);
      if (hint.code) { const pre = document.createElement('pre'), code = document.createElement('code'); code.textContent = hint.code; pre.append(code); details.append(pre); }
      $('#month-hints').append(details);
    });
    for (const details of root.querySelectorAll('.review-selected > details')) if (!details.classList.contains('review-feedback')) details.open = false;
    $('#month-decision').value = reviews[puzzle.id]?.decision || 'unreviewed';
    $('#month-note').value = reviews[puzzle.id]?.note || '';
    $('#month-prev').disabled = index === 0; $('#month-next').disabled = index === puzzles.length - 1;
    for (const button of $('#month-gallery').querySelectorAll('button')) button.setAttribute('aria-pressed', String(Number(button.dataset.index) === index));
    $('#month-feedback-status').textContent = '';
    if (remember) save();
  }

  select.addEventListener('change', () => show(Number(select.value), true));
  $('#month-prev').addEventListener('click', () => show(selected - 1, true));
  $('#month-next').addEventListener('click', () => show(selected + 1, true));
  function updateReview() {
    reviews[puzzles[selected].id] = { decision: $('#month-decision').value, note: $('#month-note').value.slice(0, 260) };
    save();
  }
  $('#month-decision').addEventListener('change', updateReview);
  $('#month-note').addEventListener('input', updateReview);
  $('#month-export').addEventListener('click', () => {
    updateReview();
    const feedback = puzzles.map(puzzle => ({ id: puzzle.id, name: puzzle.name, ...reviews[puzzle.id] }));
    const url = URL.createObjectURL(new Blob([JSON.stringify(feedback, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'shadle-month-one-feedback.json'; root.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  window.addEventListener('openai:set_globals', event => {
    const incoming = event.detail?.globals?.widgetState;
    if (!incoming) return;
    reviews = incoming.modelContent?.reviews || {};
    show(Math.min(puzzles.length - 1, Math.max(0, Number(incoming.privateContent?.selected) || 0)));
  });

  show(selected);
  const work = document.createElement('canvas'); work.width = 240; work.height = 240;
  const targets = [], duplicateTargets = [], similarShapes = [];
  try {
    const renderer = createRenderer(work);
    try {
      for (const [index, puzzle] of puzzles.entries()) {
        try {
          renderer.render(puzzle.starterSource);
          const starterPixels = renderer.pixels(), starter = work.toDataURL('image/png');
          renderer.render(puzzle.source);
          const targetPixels = renderer.pixels(), target = work.toDataURL('image/png');
          targets.push({ id: puzzle.id, pixels: targetPixels });
          const starterResult = compareImages(starterPixels, targetPixels, SAMPLE_SIZE, SAMPLE_SIZE);
          const colorVaries = targetPixels.some((value, offset) => offset % 4 !== 3 && value !== targetPixels[offset % 4]);
          checks.push({ id: puzzle.id, name: puzzle.name, compiled: true, variedTarget: colorVaries, starterScore: starterResult.score, starterAlreadySolved: starterResult.solved });
          images.set(puzzle.id, { starter, target });
          const button = document.createElement('button'), img = document.createElement('img'), caption = document.createElement('span');
          button.type = 'button'; button.className = 'btn'; button.dataset.index = index; button.setAttribute('aria-label', `${puzzle.id}. ${puzzle.name}: ${puzzle.focus}`);
          img.src = target; img.alt = ''; caption.className = 'review-caption'; caption.textContent = puzzle.id;
          button.append(img, caption); button.addEventListener('click', () => show(index, true)); $('#month-gallery').append(button);
        } catch (error) { checks.push({ id: puzzle.id, name: puzzle.name, compiled: false, error: error.message }); }
      }
    } finally { renderer.dispose(); }
    // Compare every target pair using the game's actual matching rule. Also
    // compare normalized high-contrast channels to catch simple recolors.
    const shapes = targets.map(target => {
      let bestRange = -1, channel = 0, low = 0;
      for (let c = 0; c < 3; c++) {
        let min = 255, max = 0;
        for (let i = c; i < target.pixels.length; i += 4) { min = Math.min(min, target.pixels[i]); max = Math.max(max, target.pixels[i]); }
        if (max - min > bestRange) { bestRange = max - min; channel = c; low = min; }
      }
      const values = Float32Array.from({ length: SAMPLE_SIZE * SAMPLE_SIZE }, (_, i) => (target.pixels[i * 4 + channel] - low) / Math.max(1, bestRange));
      // Recolor comparison applies to one-field images. Independent red/green
      // coordinate ramps are not the same image as a single horizontal ramp.
      let scalar = true;
      for (let c = 0; c < 3; c++) {
        let min = 255, max = 0;
        for (let i = c; i < target.pixels.length; i += 4) { min = Math.min(min, target.pixels[i]); max = Math.max(max, target.pixels[i]); }
        if (max - min < 10) continue;
        let difference = 0, inverted = 0;
        for (let i = 0; i < values.length; i++) {
          const other = (target.pixels[i * 4 + c] - min) / (max - min);
          difference += Math.abs(values[i] - other); inverted += Math.abs(values[i] + other - 1);
        }
        if (Math.min(difference, inverted) / values.length > 0.02) scalar = false;
      }
      return { values, scalar };
    });
    for (let a = 0; a < targets.length; a++) for (let b = a + 1; b < targets.length; b++) {
      if (compareImages(targets[a].pixels, targets[b].pixels).solved) duplicateTargets.push([targets[a].id, targets[b].id]);
      if (!shapes[a].scalar || !shapes[b].scalar) continue;
      let difference = 0, inverted = 0;
      for (let i = 0; i < shapes[a].values.length; i++) { difference += Math.abs(shapes[a].values[i] - shapes[b].values[i]); inverted += Math.abs(shapes[a].values[i] + shapes[b].values[i] - 1); }
      const error = Math.min(difference, inverted) / shapes[a].values.length;
      if (error < 0.015) similarShapes.push({ a: targets[a].id, b: targets[b].id, error });
    }
    const passing = checks.filter(check => check.compiled && check.variedTarget && !check.starterAlreadySolved).length;
    $('#month-render-status').textContent = `${passing} / ${puzzles.length} render checks passed · ${duplicateTargets.length} duplicate targets · ${similarShapes.length} similar-shape pairs`;
    if (passing !== puzzles.length || duplicateTargets.length || similarShapes.length) $('#month-render-status').classList.add('text-destructive');
  } catch (error) { $('#month-render-status').textContent = error.message; $('#month-render-status').classList.add('text-destructive'); }
  $('#month-checks').textContent = JSON.stringify({ puzzles: checks, duplicateTargets, similarShapes }, null, 2);
  show(selected);
})();
