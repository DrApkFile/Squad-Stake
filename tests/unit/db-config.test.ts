import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrationUrl, poolOptions, sslFor } from '../../apps/web/src/server/lib/db-config';

// No credentials in these URLs on purpose: the gate's secret scan rejects a
// postgres:// URL that carries a password for a non-local host.
const POOLED = 'postgresql://squad_stake@ep-demo-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const DIRECT = 'postgresql://squad_stake@ep-demo.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const LOCAL = 'postgresql://squad_stake@localhost:5432/squad_stake';

test('Q03 the pooled client never uses named prepared statements, which PgBouncer transaction mode cannot keep', () => {
  const options = poolOptions(POOLED);
  assert.equal(options.prepare, false);
  // The member lock needs a bounded pool and a short connect timeout, unchanged by pooling.
  assert.equal(options.max, 3);
  assert.equal(options.connect_timeout, 5);
});

test('every remote database is reached over verified TLS; only loopback may be plaintext', () => {
  for (const url of [POOLED, DIRECT]) assert.equal(sslFor(url), 'verify-full');
  assert.equal(poolOptions(POOLED).ssl, 'verify-full');
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    assert.equal(sslFor(`postgresql://squad_stake@${host}:5432/squad_stake`), false);
  }
  assert.equal(poolOptions(LOCAL).ssl, false);
});

test('migrations prefer the unpooled endpoint and fall back to DATABASE_URL', () => {
  assert.equal(migrationUrl({ DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: DIRECT }), DIRECT);
  assert.equal(migrationUrl({ DATABASE_URL: POOLED }), POOLED);
  // An unset Vercel variable arrives as an empty string, and a blank one is not a choice.
  assert.equal(migrationUrl({ DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: '' }), POOLED);
  assert.equal(migrationUrl({ DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: '  ' }), POOLED);
});

test('a missing or non-postgres connection URL fails closed instead of connecting', () => {
  for (const env of [{}, { DATABASE_URL: '' }, { DATABASE_URL: 'mysql://localhost/db' },
    { DATABASE_URL: 'not a url' }, { DATABASE_URL_UNPOOLED: 'http://localhost:5432', DATABASE_URL: LOCAL }]) {
    assert.throws(() => migrationUrl(env), JSON.stringify(env));
  }
  assert.throws(() => sslFor('mysql://localhost/db'));
});
