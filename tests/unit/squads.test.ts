import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { commitSuggestion } from '../../apps/web/src/core/commit-suggestion';
import { createSquadInput } from '../../apps/web/src/core/squad-contract';
import { chooseValidator } from '../../apps/web/src/server/core/validator-choice';
import type { Validator } from '../../apps/web/src/server/core/chain';
import { ADDRESSES, harness } from '../support/squads';

const GOAL = Date.parse('2026-12-18T00:00:00Z');
const modeA = { mode: 'A' as const, name: 'Lisbon in April', goalAt: GOAL,
  targetLuna: 1_200_000_000, recipient: ADDRESSES.bob };

test('Q03 Mode A needs a target and a recipient; Mode B must have neither', () => {
  assert.ok(createSquadInput.safeParse(modeA).success);
  assert.ok(createSquadInput.safeParse({ mode: 'B', name: 'Winter buffers', goalAt: GOAL,
    personalTargetLuna: 200_000_000 }).success);
  // A missing recipient, a Mode B recipient and a stray field are all refused.
  for (const input of [
    { mode: 'A', name: 'x', goalAt: GOAL, targetLuna: 1 },
    { mode: 'A', name: 'x', goalAt: GOAL, recipient: ADDRESSES.bob },
    { mode: 'B', name: 'x', goalAt: GOAL, personalTargetLuna: 1, recipient: ADDRESSES.bob },
    { mode: 'B', name: 'x', goalAt: GOAL, personalTargetLuna: 1, committedLuna: 5 },
    { mode: 'A', name: '', goalAt: GOAL, targetLuna: 1, recipient: ADDRESSES.bob },
    { mode: 'A', name: 'x', goalAt: GOAL, targetLuna: 0, recipient: ADDRESSES.bob },
    { mode: 'A', name: 'x', goalAt: GOAL, targetLuna: 1, recipient: 'NQ00 nope' },
  ]) assert.equal(createSquadInput.safeParse(input).success, false, JSON.stringify(input));
});

test('Q03 a goal date under three days ahead is refused and no squad is stored', async () => {
  const h = harness();
  const tooSoon = await h.squads.create(ADDRESSES.alice, { ...modeA, goalAt: h.at() + 2 * 86_400_000 });
  assert.ok(!tooSoon.ok);
  assert.equal(tooSoon.code, 'GOAL_TOO_SOON');
  assert.equal(h.rows.size, 0);

  const exactly = await h.squads.create(ADDRESSES.alice, { ...modeA, goalAt: h.at() + 3 * 86_400_000 });
  assert.ok(exactly.ok);
  assert.equal(h.rows.size, 1);
});

test('Q03 the invite token is looked up by hash; the plaintext is kept only to re-share', async () => {
  const h = harness();
  const created = await h.squads.create(ADDRESSES.alice, modeA);
  assert.ok(created.ok);
  assert.match(created.inviteToken, /^[a-f\d]{32}$/);
  const stored = h.rows.get(created.id);
  assert.ok(stored);
  assert.equal(stored.inviteTokenHash, createHash('sha256').update(created.inviteToken).digest('hex'));
  // Migration 003: the squad page has to be able to show the link again, so the token itself is
  // stored beside its hash. The *lookup* is still by hash (see the join test), and a session
  // token is never treated this way (src/server/migrations/003-invite-token.sql).
  assert.equal(stored.inviteToken, created.inviteToken);
  // The organiser is a member from the start, with no commitment yet.
  assert.equal(h.memberships.get(`${created.id}|${ADDRESSES.alice}`)?.committedLuna, 0);
});

test('Q03 joining needs the real token, is idempotent, and works again after leaving', async () => {
  const h = harness();
  const created = await h.squads.create(ADDRESSES.alice, modeA);
  assert.ok(created.ok);

  const guessed = await h.squads.join(ADDRESSES.bob, created.id, { token: '0'.repeat(32) });
  assert.ok(!guessed.ok);
  assert.equal(guessed.code, 'INVITE_INVALID');

  const joined = await h.squads.join(ADDRESSES.bob, created.id, { token: created.inviteToken });
  assert.ok(joined.ok);
  assert.equal(joined.alreadyMember, false);
  const twice = await h.squads.join(ADDRESSES.bob, created.id, { token: created.inviteToken });
  assert.ok(twice.ok);
  assert.equal(twice.alreadyMember, true);

  // A token for another squad cannot be used on this path.
  const other = await h.squads.create(ADDRESSES.alice, { ...modeA, name: 'Other' });
  assert.ok(other.ok);
  const crossed = await h.squads.join(ADDRESSES.bob, other.id, { token: created.inviteToken });
  assert.ok(!crossed.ok);
  assert.equal(crossed.code, 'INVITE_INVALID');

  assert.ok((await h.squads.leave(ADDRESSES.bob, created.id)).ok);
  const rejoined = await h.squads.join(ADDRESSES.bob, created.id, { token: created.inviteToken });
  assert.ok(rejoined.ok);
  assert.equal(rejoined.alreadyMember, false);
});

test('Q03 leaving removes the commitment and cannot be repeated', async () => {
  const h = harness({ balance: 300_000_000 });
  const created = await h.squads.create(ADDRESSES.alice, modeA);
  assert.ok(created.ok);
  h.memberships.set(`${created.id}|${ADDRESSES.alice}`, {
    squadId: created.id, address: ADDRESSES.alice, personalTargetLuna: null,
    committedLuna: 100_000_000, joinedAt: h.at(), leftAt: null });

  assert.ok((await h.squads.leave(ADDRESSES.alice, created.id)).ok);
  const membership = h.memberships.get(`${created.id}|${ADDRESSES.alice}`);
  assert.equal(membership?.committedLuna, 0);
  assert.equal(membership?.leftAt, h.at());

  const twice = await h.squads.leave(ADDRESSES.alice, created.id);
  assert.ok(!twice.ok);
  assert.equal(twice.code, 'NOT_A_MEMBER');
});

function validator(address: string, rest: Partial<Validator> = {}): Validator {
  return { address, signingKey: '0'.repeat(64), votingKey: '0'.repeat(570),
    rewardAddress: address, signalData: null, balance: 11_000_000_000, numStakers: 2,
    inactivityFlag: null, retired: false, jailedFrom: null, ...rest };
}

test('Q03 §7.7 validator choice skips retired, jailed and inactive, then spreads members', () => {
  const healthy = validator('NQ28 14BK PQR5 2EB3 L744 LT46 AV6G H1PJ N6X0');
  const busy = validator('NQ35 YFBF ES7X R9PS 36R4 11FG 3HQF YL9Q NL2S');
  const validators = [
    validator('NQ77 0000 0000 0000 0000 0000 0000 0000 0001', { retired: true }),
    validator('NQ94 B3PE JCBF 9JSU 5XHG BNVB UNT8 TEUT 4KGD', { jailedFrom: 16_000_000 }),
    validator('NQ21 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V', { inactivityFlag: 15_900_000 }),
    busy, healthy,
  ];
  assert.equal(chooseValidator(validators, new Map([[busy.address, 1]])), healthy.address);
  // With equal member counts the lowest address wins, so the choice is deterministic.
  assert.equal(chooseValidator([healthy, busy], new Map()), healthy.address);
  assert.equal(chooseValidator([busy, healthy], new Map()), healthy.address);
  assert.equal(chooseValidator([validator('NQ77 0000 0000 0000 0000 0000 0000 0000 0001',
    { retired: true })], new Map()), null);
  assert.equal(chooseValidator([], new Map()), null);
});

test('§7.3 the commit sheet suggests an amount, and never invents one (docs/AUDIT.md, M-4)', () => {
  const modeA = { mode: 'A' as const, targetLuna: 1_200_000_000 };
  // A newcomer counts themselves in: three members in the squad means a quarter each.
  assert.deepEqual(commitSuggestion(modeA, 3, false, 0),
    { amountLuna: 300_000_000, basis: 'share' });
  // An existing member divides by the squad as it stands.
  assert.deepEqual(commitSuggestion(modeA, 4, true, 0),
    { amountLuna: 300_000_000, basis: 'share' });
  // Their own commitment outranks the even share: they are changing a number, not inventing one.
  assert.deepEqual(commitSuggestion(modeA, 4, true, 250_000_000),
    { amountLuna: 250_000_000, basis: 'yours' });
  // Rounded down to whole NIM: 12,000 NIM over seven is 1,714.2857…, and nobody wants that
  // offered to them.
  assert.deepEqual(commitSuggestion(modeA, 6, false, 0),
    { amountLuna: 171_400_000, basis: 'share' });

  // Nothing honest to suggest: Mode B has no shared total, a Mode A squad may carry no target,
  // and a share that rounds to zero is not a suggestion. The field then starts empty.
  assert.equal(commitSuggestion({ mode: 'B', targetLuna: null }, 3, false, 0), null);
  assert.equal(commitSuggestion({ mode: 'A', targetLuna: null }, 3, false, 0), null);
  assert.equal(commitSuggestion({ mode: 'A', targetLuna: 50_000 }, 3, false, 0), null);
  // A Mode B member who has committed before still gets their own figure back.
  assert.deepEqual(commitSuggestion({ mode: 'B', targetLuna: null }, 3, true, 40_000_000),
    { amountLuna: 40_000_000, basis: 'yours' });
});
