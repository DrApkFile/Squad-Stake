import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createPriceReader, PRICE_CACHE_MS } from '../../apps/web/src/server/lib/price';
import { fiatLine, fiatNote, fiatValue } from '../../packages/ui/fiat';

const recording = JSON.parse(readFileSync(
  new URL('../fixtures/http/coingecko-nim.json', import.meta.url), 'utf8')) as {
    source: string; body: { 'nimiq-2': Record<string, number> } };

function answer(body: unknown, ok = true) {
  let calls = 0;
  const urls: string[] = [];
  const fetcher = (async (url: string) => {
    calls++; urls.push(String(url));
    return { ok, json: async () => body } as unknown as Response;
  }) as unknown as typeof fetch;
  return { fetcher, calls: () => calls, urls };
}

test('§9.11 the recorded CoinGecko answer is read as units per NIM, and cached ten minutes', async () => {
  let clock = 5_000_000;
  const http = answer(recording.body);
  const price = createPriceReader({ fetch: http.fetcher, now: () => clock, base: 'https://price.test' });
  const first = await price('EUR');
  assert.ok(first.ok);
  assert.equal(first.price.perNim, recording.body['nimiq-2'].eur);
  assert.equal(first.price.currency, 'EUR');
  assert.equal(first.price.readAt, clock);
  assert.equal(first.price.source, 'coingecko');
  // `nimiq-2` is NIM's id; `nimiq` is the pre-2018 asset, so the id is part of the contract.
  assert.match(http.urls[0] ?? '', /ids=nimiq-2&vs_currencies=eur$/);

  clock += PRICE_CACHE_MS - 1;
  assert.ok((await price('EUR')).ok);
  assert.equal(http.calls(), 1);
  clock += 2;
  assert.ok((await price('EUR')).ok);
  assert.equal(http.calls(), 2);
  // A different currency is a different price, never the cached one re-labelled.
  assert.deepEqual(await price('USD'), { ok: false, code: 'NO_QUOTE' });
});

test('§9.11 a currency nobody quotes, or a broken source, means no estimate at all', async () => {
  // GMD is one of Nimiq Pay's four currencies and CoinGecko does not quote NIM in it.
  assert.deepEqual(
    await createPriceReader({ fetch: answer({ 'nimiq-2': { eur: 1 } }).fetcher })('GMD'),
    { ok: false, code: 'NO_QUOTE' });
  assert.deepEqual(await createPriceReader({ fetch: answer({}).fetcher })('EUR'),
    { ok: false, code: 'INVALID_RESPONSE' });
  // A price that is not a positive number is not a price.
  for (const bad of [{ 'nimiq-2': { eur: 0 } }, { 'nimiq-2': { eur: -1 } },
    { 'nimiq-2': { eur: '0.1' } }, { 'nimiq-2': null }]) {
    assert.deepEqual(await createPriceReader({ fetch: answer(bad).fetcher })('EUR'),
      { ok: false, code: 'INVALID_RESPONSE' }, JSON.stringify(bad));
  }
  assert.deepEqual(await createPriceReader({ fetch: answer(recording.body, false).fetcher })('EUR'),
    { ok: false, code: 'HTTP_ERROR' });
  assert.deepEqual(await createPriceReader({
    fetch: (async () => { throw new Error('offline'); }) as unknown as typeof fetch,
  })('EUR'), { ok: false, code: 'NETWORK_ERROR' });
  // Nothing that is not an ISO 4217 code ever reaches the network.
  const http = answer(recording.body);
  const price = createPriceReader({ fetch: http.fetcher });
  for (const bad of ['', 'EURO', 'e u', '€', '../usd']) {
    assert.deepEqual(await price(bad), { ok: false, code: 'NO_QUOTE' }, bad);
  }
  assert.equal(http.calls(), 0);
});

test('§9.11 every fiat figure on screen says "≈" and "estimate", and names its age', () => {
  const rate = { currency: 'EUR', perNim: 0.0004, readAt: 1_000_000, source: 'coingecko' };
  // 1,200,000,000 luna = 12,000 NIM → 4.80 EUR at this made-up rate.
  assert.equal(fiatValue(1_200_000_000, rate), 4.8);
  const line = fiatLine(1_200_000_000, rate, 'en');
  assert.match(line, /^≈ /);
  assert.match(line, /estimate/);
  assert.match(line, /EUR/);
  // Under a cent is "< 0.01", not a rounded zero.
  assert.match(fiatLine(1_000, rate, 'en'), /0[.,]01/);
  assert.match(fiatNote(rate, rate.readAt + 4 * 60_000, 'en'), /CoinGecko/);
  assert.match(fiatNote(rate, rate.readAt + 4 * 60_000, 'en'), /4 min/);
  assert.match(fiatNote(rate, rate.readAt, 'en'), /just now/);
  // German groups and decimates the other way round; the estimate still says so.
  assert.match(fiatLine(1_200_000_000, rate, 'de'), /4,80/);
});
