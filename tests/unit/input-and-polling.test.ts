import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAddress, normalizeAddress } from '../../apps/web/src/core/nimiq-address';
import { addressInput } from '../../apps/web/src/core/squad-contract';
import { TX_POLL_ATTEMPTS, TX_POLL_INTERVAL_MS } from '../../apps/web/src/config/constants';
import { followTracked, type Read } from '../../apps/web/src/hooks/use-tx-poll';
import { strings, LANGS } from '../../packages/ui/i18n';
import { ADDRESSES } from '../support/squads';

test('§7.2 a recipient address is accepted however it was pasted', () => {
  const canonical = ADDRESSES.bob;
  const compact = canonical.replace(/ /gu, '');
  // Every one of these is the same address. Where it was copied from decides the shape, so
  // refusing any of them would be our bug, not the member's (docs/AUDIT.md, F-1).
  for (const typed of [
    canonical,
    compact,
    compact.toLowerCase(),
    `  ${canonical}\n`,
    canonical.replace(/ /gu, '  '),
    canonical.toLowerCase(),
  ]) {
    assert.equal(normalizeAddress(typed), canonical, `normalising ${JSON.stringify(typed)}`);
    assert.ok(isAddress(typed), `accepting ${JSON.stringify(typed)}`);
    // The normalised form is exactly what the wire contract wants, so the route cannot
    // disagree with the screen about what a valid address looks like.
    assert.ok(addressInput.safeParse(normalizeAddress(typed)).success);
  }
});

test('§7.2 a recipient that is not an address is refused, and nothing is invented', () => {
  const nonsense = [
    '', '   ', 'alice', 'NQ21', ADDRESSES.bob.slice(0, -1), `${ADDRESSES.bob} 0000`,
    // I, O, W and Z are not in Nimiq's alphabet, so this is 36 characters of the wrong kind.
    'NQ21 IOWZ IOWZ IOWZ IOWZ IOWZ IOWZ IOWZ IOWZ',
    '0x7f2c3c1bbd4e7a0d8f6b5a4c3e2d1f0a9b8c7d6e',
  ];
  for (const typed of nonsense) {
    assert.equal(isAddress(typed), false, `refusing ${JSON.stringify(typed)}`);
    // An input it cannot normalise comes back trimmed and upper-cased — never padded,
    // truncated or completed into something that would pass.
    assert.equal(normalizeAddress(typed), typed.trim().toUpperCase());
  }
  // The refusal has words of its own in every language, so the member is told which field
  // was wrong instead of getting the route's generic INVALID_INPUT.
  for (const lang of LANGS) {
    const words = strings(lang).create;
    assert.ok(words.recipientInvalid.length > 0 && words.recipientInvalidNext.length > 0);
  }
});

const confirming = { state: 'SUBMITTED', confirmations: 3, requiredConfirmations: 60 } as const;
const final = { state: 'INCLUDED_OK', confirmations: 61, requiredConfirmations: 60 } as const;

/** Drives the loop with scripted reads and a wait that only counts. */
async function run(reads: readonly Read[]) {
  const waits: number[] = [];
  const progress: unknown[] = [];
  let asked = 0;
  const verdict = await followTracked(
    async () => reads[Math.min(asked++, reads.length - 1)] ?? { ok: false, code: 'NOT_TRACKED' },
    'a'.repeat(64),
    (tracked) => progress.push(tracked),
    async (ms) => { waits.push(ms); },
  );
  return { verdict, asked, waits, progress };
}

test('§9.9 a failed status read costs an attempt, and the window still reaches a verdict', async () => {
  // UNAVAILABLE is the route handler itself failing — a database hiccup says nothing about
  // the transaction, so it must not end the window (docs/AUDIT.md, m-1).
  const run1 = await run([
    { ok: false, code: 'UNAVAILABLE' },
    { ok: false, code: 'UNAVAILABLE' },
    { ok: true, tracked: confirming },
    { ok: true, tracked: final },
  ]);
  assert.deepEqual(run1.verdict, final);
  assert.equal(run1.asked, 4);
  assert.deepEqual(run1.waits, [TX_POLL_INTERVAL_MS, TX_POLL_INTERVAL_MS, TX_POLL_INTERVAL_MS]);
  // Only the read that came back is reported to the screen; a refusal is never progress.
  assert.deepEqual(run1.progress, [confirming]);

  // And a run of nothing but that refusal spends the window rather than ending early, then
  // gives up with no verdict — which is what puts the manual re-check on the screen.
  const run2 = await run([{ ok: false, code: 'UNAVAILABLE' }]);
  assert.equal(run2.verdict, null);
  assert.equal(run2.asked, TX_POLL_ATTEMPTS);
});

test('§9.9 a refusal about the transaction ends the window instead of repeating for two minutes', async () => {
  for (const code of ['NOT_TRACKED', 'INVALID_INPUT', 'AUTH_REFUSED']) {
    const answered = await run([{ ok: false, code }]);
    // These say the same thing in five seconds, so asking 24 times only delays the screen.
    assert.equal(answered.verdict, null, code);
    assert.equal(answered.asked, 1, code);
    assert.deepEqual(answered.waits, [], code);
  }
});

test('§9.9 an included-but-failed transaction is a verdict, and elapsed time never is', async () => {
  const failed = { state: 'INCLUDED_FAILED', confirmations: 2, requiredConfirmations: 60 };
  const one = await run([{ ok: true, tracked: failed }]);
  assert.deepEqual(one.verdict, failed);
  assert.equal(one.asked, 1);

  // An unknown verdict for the whole window is not failure: the loop stops with null and the
  // transaction stays unjudged (PRD Q10).
  const unknown = { state: 'UNKNOWN', confirmations: null, requiredConfirmations: 60 };
  const waited = await run([{ ok: true, tracked: unknown }]);
  assert.equal(waited.verdict, null);
  assert.equal(waited.asked, TX_POLL_ATTEMPTS);
  assert.equal(waited.progress.length, TX_POLL_ATTEMPTS);
});
