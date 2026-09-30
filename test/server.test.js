const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../src/server');

test('la API entrega resultados JSON', async t => {
  const server = createServer(async () => ({ solutions: [{ X: 'uno' }], limited: false }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/query`, { method: 'POST', body: JSON.stringify({ source: 'a.', query: 'a' }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { solutions: [{ X: 'uno' }], limited: false });
});
