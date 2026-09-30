const path = require('node:path');

module.exports = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3000),
  swipl: process.env.SWIPL_PATH || 'swipl',
  harness: path.join(__dirname, 'prolog', 'runner.pl'),
  maxSourceBytes: 100_000,
  maxQueryBytes: 4_000,
  maxResultsCap: 200,
  timeoutCapMs: 30_000,
};
