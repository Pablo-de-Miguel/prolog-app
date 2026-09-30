const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { runProlog, validate, InputError } = require('../src/runner');
const fake = path.join(__dirname, 'support', 'fake-swipl');

test('valida y limita las opciones', () => {
  assert.deepEqual(validate({ source: 'a.', query: 'a.', maxResults: 999, timeoutMs: 999999 }), { source: 'a.', query: 'a', maxResults: 200, timeoutMs: 30000 });
  assert.throws(() => validate({ source: ':- shell(x).', query: 'a' }), InputError);
  assert.throws(() => validate({ source: '', query: 'a' }), /vacío/);
});
test('devuelve una solución con sus variables', async () => assert.deepEqual((await runProlog({ source: 'color(rojo).', query: 'one(X)' }, null, fake)).solutions, [{ X: 'rojo' }]));
test('devuelve varias soluciones', async () => assert.equal((await runProlog({ source: 'color(rojo).', query: 'many(X)' }, null, fake)).solutions.length, 3));
test('representa una consulta sin solución', async () => assert.deepEqual((await runProlog({ source: 'color(rojo).', query: 'none(X)' }, null, fake)).solutions, []));
test('explica un error de sintaxis', async () => assert.rejects(runProlog({ source: 'color(rojo).', query: 'syntax(X)' }, null, fake), e => e.code === 'syntax' && /sintaxis/.test(e.message)));
test('detiene una consulta que no termina', async () => {
  const started = Date.now();
  await assert.rejects(runProlog({ source: 'bucle :- bucle.', query: 'hang', timeoutMs: 100 }, null, fake), e => e.code === 'TIMEOUT');
  assert.ok(Date.now() - started < 1500);
});
test('permite cancelar una consulta', async () => {
  const controller = new AbortController();
  const pending = runProlog({ source: 'bucle :- bucle.', query: 'hang', timeoutMs: 5000 }, controller.signal, fake);
  setTimeout(() => controller.abort(), 30);
  await assert.rejects(pending, e => e.code === 'ABORTED');
});
