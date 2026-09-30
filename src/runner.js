const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const config = require('./config');

class InputError extends Error {}

function validate(input) {
  if (!input || typeof input.source !== 'string' || typeof input.query !== 'string') throw new InputError('Escribe el programa y la consulta.');
  const source = input.source.trim();
  const query = input.query.trim().replace(/\.$/, '');
  if (!source) throw new InputError('El programa está vacío. Añade al menos un hecho o una regla.');
  if (!query) throw new InputError('La consulta está vacía.');
  if (Buffer.byteLength(source) > config.maxSourceBytes || Buffer.byteLength(query) > config.maxQueryBytes) throw new InputError('La entrada es demasiado grande.');
  // Directives execute while a file is loaded; this beginner tool deliberately accepts only clauses.
  if (/(^|\n)\s*:-/m.test(source)) throw new InputError('No se permiten directivas (líneas que empiezan por ":-"). Escribe solo hechos y reglas.');
  const maxResults = Math.min(config.maxResultsCap, Math.max(1, Number.parseInt(input.maxResults, 10) || 20));
  const timeoutMs = Math.min(config.timeoutCapMs, Math.max(100, Number.parseInt(input.timeoutMs, 10) || 3000));
  return { source, query, maxResults, timeoutMs };
}

async function runProlog(rawInput, signal, executable = config.swipl) {
  const input = validate(rawInput);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prolog-facil-'));
  const sourcePath = path.join(dir, 'knowledge.pl');
  await fs.writeFile(sourcePath, input.source, { mode: 0o600 });
  const args = ['-q', '--no-packs', '--no-threads', '-f', config.harness, '--', sourcePath, input.query, String(input.maxResults)];
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: dir, env: { PATH: process.env.PATH || '/usr/bin:/bin', LANG: 'C.UTF-8', HOME: dir }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      fs.rm(dir, { recursive: true, force: true }).finally(() => fn(value));
    };
    const abort = () => { child.kill('SIGKILL'); finish(reject, Object.assign(new Error('Consulta detenida.'), { code: 'ABORTED' })); };
    const timer = setTimeout(() => { child.kill('SIGKILL'); finish(reject, Object.assign(new Error(`La consulta superó ${input.timeoutMs / 1000} s y fue detenida.`), { code: 'TIMEOUT' })); }, input.timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > 1_000_000) abort(); });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => finish(reject, Object.assign(new Error(error.code === 'ENOENT' ? 'No se encontró SWI-Prolog. Instala “swipl” o configura SWIPL_PATH.' : error.message), { code: 'ENGINE' })));
    child.on('close', code => {
      if (settled) return;
      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) finish(reject, Object.assign(new Error(result.error.message || 'Error de Prolog.'), { code: result.error.kind || 'PROLOG', details: result.error.details }));
        else finish(resolve, result);
      } catch {
        finish(reject, Object.assign(new Error(stderr.trim() || `SWI-Prolog terminó con código ${code}.`), { code: 'ENGINE' }));
      }
    });
  });
}

module.exports = { InputError, runProlog, validate };
