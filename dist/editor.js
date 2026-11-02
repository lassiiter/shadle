export function escapeHtml(text) { return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function highlightShader(source) {
  const tokens = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|^[ \t]*#[^\n]*|\b(?:precision|highp|mediump|lowp|uniform|varying|attribute|const|return|if|else|for|while|break|continue|discard|in|out|inout)\b|\b(?:void|float|int|bool|vec[234]|ivec[234]|bvec[234]|mat[234]|sampler2D|samplerCube)\b|\b(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?\b|\b[A-Za-z_]\w*(?=\s*\()/gm;
  let result = '', last = 0;
  for (const match of source.matchAll(tokens)) {
    result += escapeHtml(source.slice(last, match.index));
    const value = match[0];
    const type = /^\//.test(value) ? 'comment' : value.trimStart().startsWith('#') ? 'directive' : /^(void|float|int|bool|[ib]?vec[234]|mat[234]|sampler)/.test(value) ? 'type' : /^[\d.]/.test(value) ? 'number' : /^(precision|highp|mediump|lowp|uniform|varying|attribute|const|return|if|else|for|while|break|continue|discard|in|out|inout)$/.test(value) ? 'keyword' : 'function';
    result += `<span class="token-${type}">${escapeHtml(value)}</span>`; last = match.index + value.length;
  }
  return result + escapeHtml(source.slice(last)) + '\n';
}
export function indentSelection(source, start, end, unindent = false) {
  if (start === end && !unindent) return { source: source.slice(0, start) + '  ' + source.slice(end), start: start + 2, end: start + 2 };
  const lineStart = source.lastIndexOf('\n', start - 1) + 1;
  const selectionEnd = end > start && source[end - 1] === '\n' ? end - 1 : end;
  const lineEnd = source.indexOf('\n', selectionEnd) < 0 ? source.length : source.indexOf('\n', selectionEnd);
  const lines = source.slice(lineStart, lineEnd).split('\n');
  let totalDelta = 0, firstDelta = 0;
  const replacement = lines.map((line, i) => {
    const delta = unindent ? -(line.match(/^ {1,2}|^\t/)?.[0].length || 0) : 2;
    if (i === 0) firstDelta = delta; totalDelta += delta;
    return unindent ? line.slice(-delta) : '  ' + line;
  }).join('\n');
  return { source: source.slice(0, lineStart) + replacement + source.slice(lineEnd), start: Math.max(lineStart, start + firstDelta), end: Math.max(lineStart, end + totalDelta) };
}

export function lineCutRange(source, cursor) {
  const start = cursor === 0 ? 0 : source.lastIndexOf('\n', cursor - 1) + 1;
  const newline = source.indexOf('\n', cursor);
  const end = newline < 0 ? source.length : newline + 1;
  // The final empty line has no following line break to include.
  return { start: start === end && start > 0 ? start - 1 : start, end };
}

export function createEditor({ input, highlight, gutter, onChange }) {
  let escapeTab = false;
  function syncScroll() {
    highlight.style.transform = `translate(${-input.scrollLeft}px, ${-input.scrollTop}px)`;
    gutter.style.transform = `translateY(${-input.scrollTop}px)`;
  }
  function update() {
    highlight.innerHTML = highlightShader(input.value);
    const count = input.value.split('\n').length;
    const lines = input.value.split('\n');
    gutter.replaceChildren(...Array.from({ length: count }, (_, i) => {
      const line = document.createElement('span'); line.textContent = i + 1; line.dataset.line = i + 1;
      if (lines[i].includes('// TODO:') || lines[i - 1]?.includes('// TODO:')) line.className = 'todo-line';
      return line;
    }));
    syncScroll(); onChange?.(input.value);
  }
  input.addEventListener('input', update); input.addEventListener('scroll', syncScroll);
  input.addEventListener('cut', event => {
    if (input.readOnly || input.selectionStart !== input.selectionEnd || !event.clipboardData) return;
    const range = lineCutRange(input.value, input.selectionStart);
    if (range.start === range.end) return;
    event.clipboardData.setData('text/plain', input.value.slice(range.start, range.end));
    event.preventDefault();
    input.setSelectionRange(range.start, range.end);
    // A native editing command preserves Undo when Cut is invoked from a browser menu.
    if (!input.ownerDocument.execCommand?.('delete')) input.setRangeText('', range.start, range.end, 'start');
    update();
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { escapeTab = true; return; }
    if (event.key === 'Tab' && escapeTab) { escapeTab = false; return; }
    escapeTab = false;
    if (input.readOnly || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Tab') {
      event.preventDefault(); const edit = indentSelection(input.value, input.selectionStart, input.selectionEnd, event.shiftKey);
      input.setRangeText(edit.source, 0, input.value.length, 'preserve'); input.setSelectionRange(edit.start, edit.end); update();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const before = input.value.slice(0, input.selectionStart).split('\n').at(-1);
      const indent = before.match(/^[ \t]*/)[0] + (before.trimEnd().endsWith('{') ? '  ' : '');
      input.setRangeText('\n' + indent, input.selectionStart, input.selectionEnd, 'end'); update();
    }
  });
  return {
    get source() { return input.value; },
    setSource(source) { input.value = source; input.scrollTop = 0; input.scrollLeft = 0; update(); },
    setLocked(locked) { input.readOnly = locked; },
    setError(message) {
      gutter.querySelectorAll('.error-line').forEach(line => line.classList.remove('error-line'));
      const line = message?.match(/ERROR:\s*\d+:(\d+)/)?.[1];
      if (line) gutter.querySelector(`[data-line="${Number(line)}"]`)?.classList.add('error-line');
      input.setAttribute('aria-invalid', String(Boolean(message)));
    },
    focus() { input.focus(); },
  };
}
