const examples = [
  { name: 'Familia', hint: '¿Quién es abuelo de quién?', source: 'progenitor(ana, bea).\nprogenitor(bea, carlos).\nprogenitor(ana, diego).\n\nabuelo(X, Z) :- progenitor(X, Y), progenitor(Y, Z).', query: 'abuelo(Quien, Nieto)' },
  { name: 'Colores', hint: 'Varias respuestas', source: 'color(rojo).\ncolor(verde).\ncolor(azul).', query: 'color(Cual)' },
  { name: 'Recursión', hint: 'Busca rutas', source: 'enlace(a, b).\nenlace(b, c).\nenlace(c, d).\n\nruta(X, Y) :- enlace(X, Y).\nruta(X, Y) :- enlace(X, Z), ruta(Z, Y).', query: 'ruta(a, Destino)' }
];
const $ = id => document.getElementById(id);
let controller;

function choose(example) { $('source').value = example.source; $('query').value = example.query; $('results').innerHTML = ''; $('status').textContent = `Ejemplo «${example.name}» preparado. Ya puedes ejecutarlo.`; }
examples.forEach((example, index) => { const button = document.createElement('button'); button.className = 'example'; button.innerHTML = `<strong>${example.name}</strong><small>${example.hint}</small>`; button.onclick = () => choose(example); $('examples').append(button); if (!index) choose(example); });

$('file').onchange = async event => { const file = event.target.files[0]; if (!file) return; if (file.size > 100000) return showError('El archivo supera el límite de 100 KB.'); $('source').value = await file.text(); $('status').textContent = `Archivo «${file.name}» cargado.`; };
function showError(message, details) { $('status').className = 'error'; $('status').innerHTML = `<strong>No se pudo ejecutar.</strong><br>${escapeHtml(message)}${details ? `<details><summary>Detalle técnico</summary><code>${escapeHtml(details)}</code></details>` : ''}`; }
function escapeHtml(value) { const node = document.createElement('span'); node.textContent = value; return node.innerHTML; }

$('run').onclick = async () => {
  controller = new AbortController(); $('run').disabled = true; $('stop').disabled = false; $('results').innerHTML = ''; $('status').className = 'loading'; $('status').textContent = 'Consultando SWI-Prolog…';
  try {
    const response = await fetch('/api/query', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ source: $('source').value, query: $('query').value, maxResults: $('limit').value, timeoutMs: Number($('timeout').value) * 1000 }) });
    const data = await response.json(); if (!response.ok) throw Object.assign(new Error(data.error.message), { details: data.error.details });
    $('status').className = data.solutions.length ? 'success' : 'empty'; $('status').textContent = data.solutions.length ? `${data.solutions.length} solución${data.solutions.length === 1 ? '' : 'es'}${data.limited ? ' (se alcanzó el límite)' : ''}` : 'No hay soluciones para esta consulta.';
    data.solutions.forEach((solution, i) => { const card = document.createElement('article'); card.innerHTML = `<b>Solución ${i + 1}</b>`; const entries = Object.entries(solution); if (!entries.length) card.innerHTML += '<p>Verdadero ✓</p>'; entries.forEach(([key, value]) => { const row = document.createElement('p'); row.innerHTML = `<code>${escapeHtml(key)}</code><span>=</span><strong>${escapeHtml(value)}</strong>`; card.append(row); }); $('results').append(card); });
  } catch (error) { if (error.name === 'AbortError') showError('La consulta fue detenida.'); else showError(error.message, error.details); }
  finally { $('run').disabled = false; $('stop').disabled = true; controller = null; }
};
$('stop').onclick = () => controller?.abort();
