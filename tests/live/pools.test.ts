import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRpcClient } from '../../apps/web/src/server/lib/rpc';
import { createPoolDirectory } from '../../apps/web/src/server/lib/pool-directory';
import { createPriceReader } from '../../apps/web/src/server/lib/price';
import { networkConfig } from '../../apps/web/src/config/network';
import { choosePoolValidator, chooseValidator } from '../../apps/web/src/server/core/validator-choice';

/**
 * PRD §7.7 and §9.11 against the live services, on testnet. Reads only: nothing is signed,
 * sent or stored. Skipped without LIVE_RPC=1, like the RPC live test.
 */
test('§7.7 the live Validators API decides the pool, and §9.11 the live price quotes NIM', {
  skip: process.env.LIVE_RPC !== '1', timeout: 40_000,
}, async () => {
  const config = networkConfig('testnet');
  const pools = await createPoolDirectory({ url: config.validatorsApi })();
  assert.ok(pools.ok, JSON.stringify(pools));
  assert.ok(pools.pools.size > 0);
  // Every field the sheet shows before an approval, as the live payload gives it.
  for (const pool of pools.pools.values()) {
    assert.ok(['restake', 'direct', 'none'].includes(pool.payout), pool.address);
    assert.ok(pool.feeFraction === null || (pool.feeFraction >= 0 && pool.feeFraction <= 1));
  }
  // The claim this app makes in writing: no pool publishes a payout address, so "earned since
  // joining" cannot be measured for a direct pool (src/server/core/earned.ts).
  const withPayoutAddress = [...pools.pools.values()].filter((pool) => pool.payoutAddress !== null);

  const rpc = createRpcClient({ url: config.rpcUrl });
  const validators = await rpc.getActiveValidators();
  assert.ok(validators.ok, JSON.stringify(validators));
  const chosen = choosePoolValidator(validators.data, pools.pools, new Map());
  assert.ok(chosen, 'at least one active validator must run a pool that pays stakers');
  const pool = pools.pools.get(chosen);
  assert.ok(pool && pool.payout !== 'none');
  // The spread is real: ten members already on the choice send the next one elsewhere.
  const next = choosePoolValidator(validators.data, pools.pools, new Map([[chosen, 10]]));
  assert.ok(next && next !== chosen, 'the spread must move the next member off a full pool');
  // And the fallback rule, which runs when this API is unreachable, still answers.
  const fallback = chooseValidator(validators.data, new Map());
  assert.ok(fallback);

  const price = await createPriceReader()('EUR');
  assert.ok(price.ok, JSON.stringify(price));
  assert.ok(price.price.perNim > 0);
  assert.equal(price.price.source, 'coingecko');
  // GMD is one of Nimiq Pay's four currencies; CoinGecko does not quote NIM in it, and the
  // app then shows no estimate rather than substituting another currency.
  const gmd = await createPriceReader()('GMD');
  console.log(JSON.stringify({
    poolsListed: pools.pools.size,
    payoutTypes: [...new Set([...pools.pools.values()].map((entry) => entry.payout))],
    poolsPublishingAPayoutAddress: withPayoutAddress.length,
    activeValidators: validators.data.length,
    chosen, chosenName: pool.name, chosenFee: pool.feeFraction, chosenPayout: pool.payout,
    nextWhenFull: next, fallbackChoice: fallback,
    eurPerNim: price.price.perNim, gmd: gmd.ok ? 'quoted' : gmd.code,
  }));
});
