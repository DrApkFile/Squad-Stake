import assert from 'node:assert/strict';
import { test } from 'node:test';
import { squadDetail, squadProof } from '../../apps/web/src/server/core/squad-detail';
import { leaveBy } from '../../apps/web/src/core/leave-by';
import { ADDRESSES, detailHarness } from '../support/squads';

const modeA = {
  mode: 'A' as const, name: 'Lisbon in April', targetLuna: 1_200_000_000,
  recipient: ADDRESSES.bob, goalAt: Date.parse('2026-12-18T00:00:00Z'),
};

/** A squad of three with commitments set, so each test only scripts the chain. */
async function squadOfThree() {
  const h = detailHarness();
  const created = await h.squads.create(ADDRESSES.alice, modeA);
  assert.ok(created.ok);
  for (const address of [ADDRESSES.bob, ADDRESSES.carol]) {
    const joined = await h.squads.join(address, created.id, { token: 'f'.repeat(32) });
    assert.ok(joined.ok);
  }
  const commitments: Record<string, number> = {
    [ADDRESSES.alice]: 400_000_000, [ADDRESSES.bob]: 300_000_000, [ADDRESSES.carol]: 200_000_000,
  };
  for (const [address, committedLuna] of Object.entries(commitments)) {
    await h.store.withMemberLock(address, (locked) => locked.setCommitment(created.id, committedLuna));
  }
  return { h, id: created.id, commitments };
}

test('Q04 §7.4 the squad total is the sum of backed commitments, not of what members promised', async () => {
  const { h, id } = await squadOfThree();
  h.setBalance(ADDRESSES.alice, 400_000_000);   // exactly backed
  h.setBalance(ADDRESSES.bob, 100_000_000);     // short
  h.setBalance(ADDRESSES.carol, 900_000_000);   // backed with room to spare
  const result = await squadDetail(id, ADDRESSES.alice, h.deps);
  assert.ok(result.ok);
  const { view } = result;
  assert.equal(view.committedLuna, 900_000_000);
  assert.equal(view.backedLuna, 600_000_000);   // alice + carol only
  assert.equal(view.memberCount, 3);
  assert.equal(view.chainUnavailable, false);
  assert.equal(view.leaveBy, leaveBy(modeA.goalAt));
  assert.deepEqual(view.members.map((member) => member.status?.status),
    ['BACKED', 'SHORT', 'BACKED']);
  assert.deepEqual(view.members.map((member) => member.isYou), [true, false, false]);
  // Every row carries the instant of its own read; nothing is shown without one.
  for (const member of view.members) assert.equal(member.readAt, h.at());
});

test('Q04 the age shown is the oldest read behind the page, and a failed read says so', async () => {
  const { h, id } = await squadOfThree();
  h.setBalance(ADDRESSES.alice, 400_000_000);
  h.setBalance(ADDRESSES.bob, 300_000_000);
  h.setBalance(ADDRESSES.carol, 200_000_000);
  h.setReadAt(ADDRESSES.bob, h.at() - 45_000);
  const fresh = await squadDetail(id, ADDRESSES.alice, h.deps);
  assert.ok(fresh.ok);
  assert.equal(fresh.view.readAt, h.at() - 45_000);

  // One unreadable member: no guessed status, no silent exclusion from the total.
  h.breakRead(ADDRESSES.carol);
  const partial = await squadDetail(id, ADDRESSES.alice, h.deps);
  assert.ok(partial.ok);
  const carol = partial.view.members.find((member) => member.address === ADDRESSES.carol);
  assert.equal(carol?.status, null);
  assert.equal(carol?.readAt, null);
  assert.equal(partial.view.chainUnavailable, true);
  assert.equal(partial.view.backedLuna, 700_000_000);

  // Head unreadable: nothing is derived at all, and the page must not claim a reading.
  h.setHead(null);
  const blind = await squadDetail(id, ADDRESSES.alice, h.deps);
  assert.ok(blind.ok);
  assert.equal(blind.view.readAt, null);
  assert.equal(blind.view.backedLuna, null);
  assert.equal(blind.view.chainUnavailable, true);
  assert.deepEqual(blind.view.members.map((member) => member.status), [null, null, null]);
  assert.equal(blind.view.committedLuna, 900_000_000);  // our own record still stands
});

test('Q10 a member with an open transaction shows pending, and a member who left shows LEFT', async () => {
  const { h, id } = await squadOfThree();
  h.setBalance(ADDRESSES.alice, 400_000_000);
  h.setBalance(ADDRESSES.bob, 300_000_000);
  h.setBalance(ADDRESSES.carol, 200_000_000);
  await h.store.insertTrackedTx({ hash: 'd'.repeat(64), address: ADDRESSES.bob, squadId: id,
    kind: 'add', expected: { valueLuna: 100_000_000 }, state: 'SUBMITTED', checkedAt: null });
  const left = await h.squads.leave(ADDRESSES.carol, id);
  assert.ok(left.ok);

  const result = await squadDetail(id, ADDRESSES.alice, h.deps);
  assert.ok(result.ok);
  const bob = result.view.members.find((member) => member.address === ADDRESSES.bob);
  // The hash was never on this chain, so the tracker's read fails and the row says so. It is
  // UNKNOWN, not "0 of 60": a count nobody read is never printed as a digit, and no elapsed
  // time turns an unreadable transaction into a failure (Q10, pending-view.ts).
  assert.deepEqual(bob?.pending,
    { phase: 'UNKNOWN', confirmations: null, requiredConfirmations: 60 });
  const carol = result.view.members.find((member) => member.address === ADDRESSES.carol);
  assert.deepEqual(carol?.status, { status: 'LEFT' });
  assert.equal(carol?.committedLuna, 0);
  assert.equal(carol?.pending, null);
  // Someone who left is off the roster count and off both totals.
  assert.equal(result.view.memberCount, 2);
  assert.equal(result.view.committedLuna, 700_000_000);
  assert.equal(result.view.backedLuna, 700_000_000);
});

test('§9.5 a non-member is refused the squad page; §9.10 the proof view is public and tokenless', async () => {
  const { h, id } = await squadOfThree();
  h.setBalance(ADDRESSES.alice, 400_000_000);
  h.setBalance(ADDRESSES.bob, 300_000_000);
  h.setBalance(ADDRESSES.carol, 200_000_000);
  const stranger = 'NQ77 2JRM 4YDV 1PCB 9CSM 7V3H KQ0E 5NTG XB4L';
  const refused = await squadDetail(id, stranger, h.deps);
  assert.deepEqual(refused, { ok: false, code: 'NOT_A_MEMBER' });
  assert.deepEqual(await squadDetail('00000000-0000-4000-8000-000000000000', ADDRESSES.alice, h.deps),
    { ok: false, code: 'SQUAD_NOT_FOUND' });

  const member = await squadDetail(id, ADDRESSES.alice, h.deps);
  assert.ok(member.ok);
  assert.equal(member.view.inviteToken, 'f'.repeat(32));

  // The proof view takes the short id, has no viewer and hands out no invite link.
  const proof = await squadProof('k3m9p2qr', h.deps);
  assert.ok(proof.ok);
  assert.equal(proof.view.inviteToken, null);
  assert.equal(proof.view.youAreMember, false);
  assert.equal(proof.view.members.every((row) => row.isYou === false), true);
  assert.equal(proof.view.backedLuna, 900_000_000);
  assert.deepEqual(await squadProof('zzzzzzzz', h.deps), { ok: false, code: 'SQUAD_NOT_FOUND' });
});

test('Q06 an unstaking member keeps an unknown release instead of an invented one', async () => {
  const { h, id } = await squadOfThree();
  h.setBalance(ADDRESSES.alice, 400_000_000);
  h.setBalance(ADDRESSES.bob, 300_000_000);
  h.setBalance(ADDRESSES.carol, 200_000_000);
  const result = await squadDetail(id, ADDRESSES.alice, h.deps);
  assert.ok(result.ok);
  for (const member of result.view.members) {
    // No row may carry a release block: this page never feeds `inactiveFrom` to the release
    // math (docs/PROGRESS.md, 2026-11-06). The planner does that from the inactivation tx.
    if (member.status?.status === 'UNSTAKING') assert.equal(member.status.releaseBlock, null);
  }
  assert.equal(h.stakerReads(), 3);  // one read per active member, no second pass
});
