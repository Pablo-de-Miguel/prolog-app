const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const config = require('./config');
const { InputError, runProlog } = require('./runner');

const publicDir = path.join(__dirname, '..', 'public');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function createServer(execute = runProlog) {
  return http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/query') {
      let body = '';
      req.on('data', chunk => { body += chunk; if (body.length > 120_000) req.destroy(); });
      req.on('end', async () => {
        const controller = new AbortController();
        res.on('close', () => { if (!res.writableEnded) controller.abort(); });
        try {
          const input = JSON.parse(body);
          json(res, 200, await execute(input, controller.signal));
        } catch (error) {
          const status = error instanceof SyntaxError || error instanceof InputError ? 400 : error.code === 'TIMEOUT' ? 408 : error.code === 'ABORTED' ? 499 : 422;
          json(res, status, { error: { kind: error.code || 'input', message: error.message, details: error.details } });
        }
      });
      return;
    }
    if (req.method !== 'GET') return json(res, 405, { error: { message: 'Método no permitido.' } });
    const relative = req.url === '/' ? 'index.html' : req.url.slice(1);
    if (!/^[a-zA-Z0-9._-]+$/.test(relative)) return json(res, 404, { error: { message: 'No encontrado.' } });
    try {
      const file = await fs.readFile(path.join(publicDir, relative));
      res.writeHead(200, { 'content-type': types[path.extname(relative)] || 'application/octet-stream' });
      res.end(file);
    } catch { json(res, 404, { error: { message: 'No encontrado.' } }); }
  });
}

if (require.main === module) createServer().listen(config.port, config.host, () => console.log(`Prolog Fácil: http://${config.host}:${config.port}`));
module.exports = { createServer };
