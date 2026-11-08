import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  createPoolDirectory, POOL_CACHE_MS,
} from '../../apps/web/src/server/lib/pool-directory';
import {
  chooseValidator, choosePoolValidator, type PoolFacts,
} from '../../apps/web/src/server/core/validator-choice';
import type { Validator } from '../../apps/web/src/server/core/chain';

const recording = JSON.parse(readFileSync(
  new URL('../fixtures/http/validators-testnet.json', import.meta.url), 'utf8')) as {
    validators: { source: string; body: unknown[] } };
const BODY = recording.validators.body;

function answer(body: unknown, status = 200) {
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    return { ok: status === 200, json: async () => body } as unknown as Response;
  }) as unknown as typeof fetch;
  return { fetcher, calls: () => calls };
}

function validator(address: string, rest: Partial<Validator> = {}): Validator {
  return { address, signingKey: 'a'.repeat(64), votingKey: 'b'.repeat(64),
    rewardAddress: address, balance: 100_000_000_000, numStakers: 1, retired: false,
    inactivityFlag: null, jailedFrom: null, ...rest } as Validator;
}

test('§7.7 the pool directory parses Nimiq’s own payload, fields and all', async () => {
  const http = answer(BODY);
  const pools = createPoolDirectory({ url: recording.validators.source, fetch: http.fetcher });
  const first = await pools();
  assert.ok(first.ok);
  assert.equal(first.pools.size, BODY.length);
  // Every value of upstream PayoutType is understood, a fee is a fraction of 1, and the
  // schedule's upstream default ('') becomes null rather than an empty line on screen.
  const payouts = new Set([...first.pools.values()].map((pool) => pool.payout));
  assert.ok(payouts.has('restake') && payouts.has('direct'));
  for (const pool of first.pools.values()) {
    assert.ok(pool.feeFraction === null || (pool.feeFraction >= 0 && pool.feeFraction <= 1));
    assert.notEqual(pool.payoutSchedule, '');
    // The one field that would make a direct pool's earnings measurable is not published.
    assert.equal(pool.payoutAddress, null);
  }
});

test('§7.7 the directory is cached for ten minutes and a failure is never cached', async () => {
  let clock = 1_000_000;
  const http = answer(BODY);
  const pools = createPoolDirectory({
    url: 'https://example.invalid/validators', fetch: http.fetcher, now: () => clock,
  });
  assert.ok((await pools()).ok);
  clock += POOL_CACHE_MS - 1;
  assert.ok((await pools()).ok);
  assert.equal(http.calls(), 1, 'inside the window the cache answers');
  clock += 2;
  assert.ok((await pools()).ok);
  assert.equal(http.calls(), 2, 'past ten minutes it reads again');
  // `fresh` bypasses the cache, like the RPC client's.
  assert.ok((await pools(true)).ok);
  assert.equal(http.calls(), 3);

  const broken = createPoolDirectory({
    url: 'https://example.invalid/validators',
    fetch: (async () => { throw new Error('offline'); }) as unknown as typeof fetch,
  });
  assert.deepEqual(await broken(), { ok: false, code: 'NETWORK_ERROR' });
});

test('§7.7 an unusable directory answer fails closed instead of emptying the pool list', async () => {
  const url = 'https://example.invalid/validators';
  for (const body of [{}, 'nope', [], [{ name: 'x' }]]) {
    const result = await createPoolDirectory({ url, fetch: answer(body).fetcher })();
    assert.deepEqual(result, { ok: false, code: 'INVALID_RESPONSE' }, JSON.stringify(body));
  }
  const http = answer(BODY, 500);
  assert.deepEqual(await createPoolDirectory({ url, fetch: http.fetcher })(),
    { ok: false, code: 'HTTP_ERROR' });
});

test('§7.7 only a validator that pays its stakers is chosen, and members are spread', () => {
  const validators = [
    validator('NQ01 AAAA'), validator('NQ02 BBBB'), validator('NQ03 CCCC'),
    validator('NQ04 DDDD'), validator('NQ05 EEEE', { jailedFrom: 100 }),
    validator('NQ06 FFFF', { retired: true }), validator('NQ07 GGGG', { inactivityFlag: 7 }),
  ];
  const pools = new Map<string, PoolFacts>([
    ['NQ01 AAAA', { payout: 'none' }],      // keeps the rewards: ineligible
    ['NQ02 BBBB', { payout: 'restake' }],
    ['NQ03 CCCC', { payout: 'direct' }],
    ['NQ05 EEEE', { payout: 'restake' }],   // jailed anyway
    ['NQ06 FFFF', { payout: 'restake' }],   // retired anyway
    ['NQ07 GGGG', { payout: 'restake' }],   // inactivity flag anyway
    // NQ04 is not in Nimiq's data at all, so it is not a pool as far as we know.
  ]);
  // Nothing staked anywhere yet: the tie breaks on address, so the first paying pool wins.
  assert.equal(choosePoolValidator(validators, pools, new Map()), 'NQ02 BBBB');
  // Two members already on BBBB sends the next one to the other paying pool.
  assert.equal(choosePoolValidator(validators, pools, new Map([['NQ02 BBBB', 2]])), 'NQ03 CCCC');
  // Equal counts fall back to the address, so two members in the same minute agree.
  assert.equal(
    choosePoolValidator(validators, pools, new Map([['NQ02 BBBB', 1], ['NQ03 CCCC', 1]])),
    'NQ02 BBBB',
  );
  // Nothing eligible is null, never "send it anywhere".
  assert.equal(choosePoolValidator(validators, new Map([['NQ01 AAAA', { payout: 'none' }]]),
    new Map()), null);
  assert.equal(choosePoolValidator([], pools, new Map()), null);
});

test('§7.7 the fallback rule still refuses jailed, retired and flagged validators', () => {
  const validators = [
    validator('NQ09 ZZZZ', { jailedFrom: 10 }), validator('NQ08 YYYY', { retired: true }),
    validator('NQ07 XXXX', { inactivityFlag: 1 }), validator('NQ06 WWWW'),
  ];
  // No pool data at all: the chain-only rule picks the one validator a new staker may join.
  assert.equal(chooseValidator(validators, new Map()), 'NQ06 WWWW');
  assert.equal(chooseValidator(validators.slice(0, 3), new Map()), null);
  // And it never consults a pool, so it cannot claim a fee or a payout type.
  assert.equal(chooseValidator([validator('NQ01 AAAA')], new Map([['NQ01 AAAA', 9]])), 'NQ01 AAAA');
});
