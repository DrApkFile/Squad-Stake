import assert from 'node:assert/strict';
import { test } from 'node:test';
import { squadStore } from '../../apps/web/src/server/lib/squad-store';

test('§9.5/§9.10 an id that cannot be a uuid is a missing squad, not a database error', async () => {
  // `squads.id` is a uuid column, and both `/squads/<id>` and the public `/proof/<id>` take
  // their id straight from the URL. Postgres answers a non-uuid with "invalid input syntax
  // for type uuid", which Next rendered as a 500 on the one page meant to be shared with
  // strangers (docs/AUDIT.md, F-3, reproduced against PostgreSQL 18.6 on 2026-11-09).
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    // No database is configured, so anything that reaches `db()` throws. These do not: the
    // guard answers before the query, which is the whole point of it.
    assert.equal(await squadStore.getSquad('nosuchid'), null);
    assert.equal(await squadStore.getSquad('cbnkj8dn-typo'), null);
    assert.equal(await squadStore.getSquad(''), null);
    assert.equal(await squadStore.getSquad('897f507f160e4a3a9c65e8d97d3a5f33'), null);
    // A well-formed id is still looked up — the guard refuses shapes, never squads. With no
    // database configured that attempt is what fails, which proves the query was reached.
    await assert.rejects(squadStore.getSquad('897f507f-160e-4a3a-9c65-e8d97d3a5f33'));
  } finally {
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  }
});
