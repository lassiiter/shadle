(() => {
  const root = document.getElementById('shadle-month-review');
  const $ = selector => root.querySelector(selector);
  const puzzles = JSON.parse($('#shadle-month-data').textContent);
  const storageKey = 'shadle-month-one-review-v1';
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
    const next = { modelContent: { set: 'month-one-candidates', reviews }, privateContent: { selected } };
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
  try {
    const renderer = createRenderer(work);
    try {
      for (const [index, puzzle] of puzzles.entries()) {
        try {
          renderer.render(puzzle.starterSource);
          const starterPixels = renderer.pixels(), starter = work.toDataURL('image/png');
          renderer.render(puzzle.source);
          const targetPixels = renderer.pixels(), target = work.toDataURL('image/png');
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
    const passing = checks.filter(check => check.compiled && check.variedTarget && !check.starterAlreadySolved).length;
    $('#month-render-status').textContent = `${passing} / ${puzzles.length} render checks passed`;
    if (passing !== puzzles.length) $('#month-render-status').classList.add('text-destructive');
  } catch (error) { $('#month-render-status').textContent = error.message; $('#month-render-status').classList.add('text-destructive'); }
  $('#month-checks').textContent = JSON.stringify(checks, null, 2);
  show(selected);
})();
