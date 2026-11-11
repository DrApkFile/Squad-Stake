import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createPoolDirectory } from '../../apps/web/src/server/lib/pool-directory';
import { createPriceReader } from '../../apps/web/src/server/lib/price';
import { choosePoolValidator, type PoolFacts } from '../../apps/web/src/server/core/validator-choice';
import { earnedSinceJoining } from '../../apps/web/src/server/core/earned';
import { memberEarned, type EarnedDeps } from '../../apps/web/src/server/core/member-earned';
import { squadDetail } from '../../apps/web/src/server/core/squad-detail';
import { SquadScreen } from '../../packages/ui/SquadScreen';
import { squadPageScenes } from '../../packages/ui/scenes/squad-page';
import { onwardPath, squadPathFrom } from '../../apps/web/src/server/lib/session-page';
import { ADDRESSES, detailHarness } from '../support/squads';
import type { Validator } from '../../apps/web/src/server/core/chain';

const recording = JSON.parse(readFileSync(
  new URL('../fixtures/http/validators-testnet.json', import.meta.url), 'utf8')) as {
    validators: { source: string; body: Record<string, unknown>[] } };

const serve = (body: unknown) => (async () =>
  ({ ok: true, json: async () => body } as unknown as Response)) as unknown as typeof fetch;

function validator(address: string, rest: Partial<Validator> = {}): Validator {
  return { address, signingKey: 'a'.repeat(64), votingKey: 'b'.repeat(64), rewardAddress: address,
    balance: 1, numStakers: 0, retired: false, inactivityFlag: null, jailedFrom: null,
    ...rest } as Validator;
}

test('a hostile validator directory cannot put stake on a validator that pays nothing', async () => {
  // Every shape of "trust me" the directory could send: a payout type the app does not know,
  // a missing one, a fee outside 0–1, an address that is not a Nimiq address. Each entry is
  // dropped, and a dropped entry is not a pool, so the choice refuses it.
  const first = recording.validators.body[0];
  assert.ok(first);
  const hostile = [
    { ...first, payoutType: 'whatever-you-like' },
    { ...first, payoutType: undefined },
    { ...first, fee: 12 },
    { ...first, fee: '0.05' },
    { ...first, address: 'NOT AN ADDRESS' },
    { ...first, name: '' },
    { ...first, payoutAddress: 'nope' },
  ];
  const pools = await createPoolDirectory({
    url: recording.validators.source, fetch: serve(hostile),
  })();
  // Nothing parsed, so the directory itself fails closed rather than offering an empty set
  // that would read as "no pool pays anything".
  assert.deepEqual(pools, { ok: false, code: 'INVALID_RESPONSE' });

  // And a directory that *is* readable but says 'none' never wins, however empty it is.
  const validators = [validator('NQ01 AAAA'), validator('NQ02 BBBB')];
  const says = new Map<string, PoolFacts>([
    ['NQ01 AAAA', { payout: 'none' }], ['NQ02 BBBB', { payout: 'none' }]]);
  assert.equal(choosePoolValidator(validators, says, new Map()), null);
  // A spread count naming an ineligible validator cannot drag the choice onto it either.
  assert.equal(choosePoolValidator(validators, says, new Map([['NQ01 AAAA', -50]])), null);
});

test('a spread count the app did not read cannot send stake to a jailed or retired validator', () => {
  const validators = [
    validator('NQ01 AAAA', { jailedFrom: 1 }), validator('NQ02 BBBB', { retired: true }),
    validator('NQ03 CCCC', { inactivityFlag: 2 }), validator('NQ04 DDDD'),
  ];
  const pools = new Map<string, PoolFacts>(validators.map((entry) =>
    [entry.address, { payout: 'restake' }]));
  // Even with every ineligible one declared empty and the eligible one declared full.
  const counts = new Map([['NQ01 AAAA', 0], ['NQ02 BBBB', 0], ['NQ03 CCCC', 0], ['NQ04 DDDD', 999]]);
  assert.equal(choosePoolValidator(validators, pools, counts), 'NQ04 DDDD');
});

test('a price source cannot make the app show a figure it did not quote', async () => {
  // A lying or broken quote is never shown: no zero, no negative, no string, no NaN, and no
  // stale price kept after a failure (PRD §9.11 "hidden if the price source fails").
  for (const body of [{ 'nimiq-2': { eur: 0 } }, { 'nimiq-2': { eur: -5 } },
    { 'nimiq-2': { eur: 'free' } }, { 'nimiq-2': { eur: null } }, { 'nimiq-2': {} },
    { 'nimiq-3': { eur: 1 } }, [], null, 'EUR 1']) {
    const result = await createPriceReader({ fetch: serve(body) })('EUR');
    assert.equal(result.ok, false, JSON.stringify(body));
  }
  // A good read followed by a bad one does not keep answering with the good one.
  let clock = 1_000;
  let good = true;
  const flaky = (async () => ({
    ok: good, json: async () => ({ 'nimiq-2': { eur: 0.0002 } }),
  } as unknown as Response)) as unknown as typeof fetch;
  const price = createPriceReader({ fetch: flaky, now: () => clock });
  assert.equal((await price('EUR')).ok, true);
  good = false;
  clock += 600_001;
  assert.deepEqual(await price('EUR'), { ok: false, code: 'HTTP_ERROR' });
});

test('earned never publishes another member’s balance, and never guesses its own', async () => {
  // Earned plus the deposits it was measured against is an active balance, so only the viewer's
  // row carries it (briefing/FAILURE_MODES.md "Privacy", the same rule as SHORT.shortBy).
  const h = detailHarness();
  const created = await h.squads.create(ADDRESSES.alice, { mode: 'B', name: 'Winter buffers',
    goalAt: h.at() + 30 * 86_400_000, personalTargetLuna: 100_000_000 });
  assert.ok(created.ok);
  h.commit(created.id, ADDRESSES.alice, 100_000_000);
  h.commit(created.id, ADDRESSES.bob, 100_000_000);
  for (const address of [ADDRESSES.alice, ADDRESSES.bob]) {
    h.setBalance(address, 110_000_000);
    h.setDelegation(address, 'NQ01 POOL');
  }
  const deps: EarnedDeps = {
    pools: async () => new Map([['NQ01 POOL', { payout: 'restake' as const, payoutAddress: null }]]),
    trackedTxsForAddress: async () => [
      { kind: 'create', state: 'INCLUDED_OK', valueLuna: 100_000_000 }],
    incomingFrom: async () => [],
  };
  const result = await squadDetail(created.id, ADDRESSES.alice, { ...h.deps, earned: deps });
  assert.ok(result.ok);
  const you = result.view.members.find((member) => member.isYou);
  const other = result.view.members.find((member) => !member.isYou);
  assert.ok(you && other);
  // 110,000,000 active less the 100,000,000 deposit this app watched land = 10,000,000 earned,
  // which is also exactly why nobody else's row may carry it.
  assert.deepEqual(you.earned,
    { known: true, luna: 10_000_000, basis: { kind: 'restake', depositsLuna: 100_000_000 } });
  assert.equal(other.earned, null, 'another member’s earned growth never leaves the server');
  // Without the earned dependency nobody gets one at all, viewer included.
  const plain = await squadDetail(created.id, ADDRESSES.alice, h.deps);
  assert.ok(plain.ok);
  for (const member of plain.view.members) assert.equal(member.earned, null);

  // A failed chain read is never a measurement of zero.
  assert.deepEqual(await memberEarned({ address: ADDRESSES.alice, joinedAt: 0, stake: null,
    chainRead: false }, deps), { known: false, reason: 'CHAIN_UNAVAILABLE' });
  // A pool that pays into the wallet without publishing its payout address cannot have its
  // payouts "found" among ordinary transfers, however many transfers there are.
  const sneaky: EarnedDeps = { ...deps,
    pools: async () => new Map([['NQ01 POOL', { payout: 'direct' as const, payoutAddress: null }]]),
    incomingFrom: async () => [{ valueLuna: 999_999_999 }] };
  assert.deepEqual(await memberEarned({ address: ADDRESSES.alice, joinedAt: 0,
    stake: { activeLuna: 100_000_000, delegation: 'NQ01 POOL' }, chainRead: true }, sneaky),
  { known: false, reason: 'PAYOUT_ADDRESS_UNKNOWN' });
  // A deposit list the app did not watch to a verdict can never become a measurement.
  assert.equal(earnedSinceJoining({ chainRead: true, stake: { activeLuna: 10 },
    pool: { payout: 'restake', payoutAddress: null },
    txs: [{ kind: 'create', state: 'SUBMITTED', valueLuna: 1 }], payouts: null }).known, false);
});

test('a client-supplied earned figure cannot reach a screen through the view', () => {
  // The wire shape is a code plus figures the server computed; the words are the component's.
  // Rendering a row whose "earned" claims success with no basis is a type error, and a
  // handcrafted reason code falls back to no text rather than printing itself at the member.
  const backed = squadPageScenes.find((scene) => scene.id === 'squad-page-backed');
  assert.ok(backed);
  const members = backed.props.members.map((member) => ({
    ...member,
    earned: { known: false as const, reason: 'SOMETHING_ELSE' as never },
  }));
  const markup = renderToStaticMarkup(createElement(SquadScreen as never,
    { ...backed.props, members } as never));
  assert.doesNotMatch(markup, /SOMETHING_ELSE/);
});

test('a crafted return link can never leave this origin', () => {
  // Both guards turn a query parameter into an `href` on a screen, which is the whole attack:
  // `//evil.example` is a protocol-relative URL a browser follows off-site, and a scheme in
  // an href runs. Each rebuilds this app's own path instead of echoing what it was given.
  for (const hostile of [
    '//evil.example', 'https://evil.example/squads', 'http:/evil.example',
    'javascript:alert(document.cookie)', 'data:text/html,<script>1</script>',
    '/\\evil.example', '\\\\evil.example', '/squads/../../etc/passwd\\',
    ' //evil.example', '', 'squads', undefined,
  ]) {
    const onward = onwardPath(hostile as string | undefined);
    assert.ok(onward === null || (onward.startsWith('/') && !onward.startsWith('//')),
      `onwardPath(${String(hostile)}) = ${String(onward)}`);
    assert.equal(squadPathFrom(hostile as string | undefined), null, String(hostile));
  }
  // What is allowed is a path, and for the back chevron, only a uuid rebuilt into a route.
  assert.equal(onwardPath('/squads/new'), '/squads/new');
  assert.equal(squadPathFrom('0f1d2c3b-4a59-4687-9b0c-1d2e3f405162'),
    '/squads/0f1d2c3b-4a59-4687-9b0c-1d2e3f405162');
  // A uuid-shaped id with anything appended is not a uuid.
  assert.equal(squadPathFrom('0f1d2c3b-4a59-4687-9b0c-1d2e3f405162/../../x'), null);
  assert.equal(squadPathFrom('0F1D2C3B-4A59-4687-9B0C-1D2E3F405162'), null);
});
