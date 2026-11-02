try {
  const response = await fetch('./variants.json');
  if (!response.ok) throw new Error('Previews unavailable');
  const variants = await response.json();
  const requested = Number(new URLSearchParams(location.search).get('option'));
  const index = Number.isInteger(requested) && requested >= 1 && requested <= variants.length ? requested - 1 : 0;
  location.replace('./' + variants[index].file);
} catch {
  document.querySelector('#preview-status').textContent = 'Choose a full-screen preview below.';
}
