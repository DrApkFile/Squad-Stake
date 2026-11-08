import assert from 'node:assert/strict';
import { test } from 'node:test';
import { squadDetailResponse } from '../../apps/web/src/core/squad-contract';
import { squadDetail, squadProof } from '../../apps/web/src/server/core/squad-detail';
import { ADDRESSES, detailHarness } from '../support/squads';

const modeA = {
  mode: 'A' as const, name: 'Lisbon in April', targetLuna: 1_200_000_000,
  recipient: ADDRESSES.bob, goalAt: Date.parse('2026-12-18T00:00:00Z'),
};
/** Distinct, non-colliding figures, so finding one in the payload can only mean a leak. */
const BOB_BALANCE = 123_456_789;
const BOB_COMMITTED = 300_000_000;
const BOB_SHORT_BY = BOB_COMMITTED - BOB_BALANCE;      // 176,543,211
const ALICE_BALANCE = 587_654_321;

async function squadWithAShortMember() {
  const h = detailHarness();
  const created = await h.squads.create(ADDRESSES.alice, modeA);
  assert.ok(created.ok);
  assert.ok((await h.squads.join(ADDRESSES.bob, created.id, { token: 'f'.repeat(32) })).ok);
  await h.store.withMemberLock(ADDRESSES.alice,
    (locked) => locked.setCommitment(created.id, 400_000_000));
  await h.store.withMemberLock(ADDRESSES.bob,
    (locked) => locked.setCommitment(created.id, BOB_COMMITTED));
  h.setBalance(ADDRESSES.alice, ALICE_BALANCE);
  h.setBalance(ADDRESSES.bob, BOB_BALANCE);
  return { h, id: created.id };
}

test('a squad page never carries another member’s balance, free amount or shortfall', async () => {
  const { h, id } = await squadWithAShortMember();
  const result = await squadDetail(id, ADDRESSES.alice, h.deps);
  assert.ok(result.ok);
  // Exactly what the route handler writes to the wire.
  const payload = JSON.stringify(squadDetailResponse.parse(JSON.parse(JSON.stringify(result))));

  // A balance would let a squad-mate read a wallet; a shortfall is a balance minus a number
  // they already know (briefing/FAILURE_MODES.md, "Privacy").
  assert.doesNotMatch(payload, new RegExp(String(BOB_BALANCE)));
  assert.doesNotMatch(payload, new RegExp(String(BOB_SHORT_BY)));
  assert.doesNotMatch(payload, new RegExp(String(ALICE_BALANCE)));
  assert.doesNotMatch(payload, /activeBalance|freeLuna|otherCommitments|inactiveBalance|retiredBalance/);
  // The status word itself is shared: that is the product.
  const bob = result.view.members.find((member) => member.address === ADDRESSES.bob);
  assert.deepEqual(bob?.status, { status: 'SHORT', shortBy: null });
  assert.equal(bob?.committedLuna, BOB_COMMITTED);
});

test('the member themselves still sees their own shortfall, and only their own', async () => {
  const { h, id } = await squadWithAShortMember();
  const result = await squadDetail(id, ADDRESSES.bob, h.deps);
  assert.ok(result.ok);
  const mine = result.view.members.find((member) => member.isYou);
  assert.deepEqual(mine?.status, { status: 'SHORT', shortBy: BOB_SHORT_BY });
  // Alice is backed, so there is nothing to mask; her balance is still absent.
  const payload = JSON.stringify(result.view);
  assert.doesNotMatch(payload, new RegExp(String(ALICE_BALANCE)));
  assert.equal(result.view.members.filter((member) => member.isYou).length, 1);
});

test('the public proof view masks every shortfall, including the one a session would unmask', async () => {
  const { h } = await squadWithAShortMember();
  const proof = await squadProof('k3m9p2qr', h.deps);
  assert.ok(proof.ok);
  const payload = JSON.stringify(proof.view);
  assert.doesNotMatch(payload, new RegExp(String(BOB_SHORT_BY)));
  assert.doesNotMatch(payload, new RegExp(String(BOB_BALANCE)));
  assert.doesNotMatch(payload, new RegExp(String(ALICE_BALANCE)));
  // No invite token: a proof link must not become a join link.
  assert.equal(proof.view.inviteToken, null);
  assert.doesNotMatch(payload, /f{32}/);
  for (const member of proof.view.members) {
    if (member.status?.status === 'SHORT') assert.equal(member.status.shortBy, null);
  }
});

test('the wire schema refuses a response that carries a balance at all', () => {
  const view = {
    squadId: '00000000-0000-4000-8000-000000000000',
    squad: { name: 'x', shortId: 'k3m9p2qr', mode: 'A' as const, targetLuna: 1, recipient: null, goalAt: 1 },
    members: [{ address: ADDRESSES.alice, committedLuna: 1, status: { status: 'BACKED' as const },
      readAt: 1, isYou: true, pending: null, activeBalanceLuna: 999 }],
    memberCount: 1, committedLuna: 1, backedLuna: 1, readAt: 1, leaveBy: 1,
    chainUnavailable: false, inviteToken: null, youAreMember: true,
  };
  // `.strict()` everywhere: an added field fails closed instead of reaching a screen.
  assert.equal(squadDetailResponse.safeParse({ ok: true, view }).success, false);
});
