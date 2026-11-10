import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createSquadService, type Membership } from '../../apps/web/src/server/core/squads';
import { createSquadHandlers } from '../../apps/web/src/server/lib/squad-http';
import { ADDRESSES, harness } from '../support/squads';

const GOAL = Date.parse('2026-12-18T00:00:00Z');
const HASH = 'a'.repeat(64);

/** The handlers, with one signed-in caller. `sessionAddress` is the only thing a request
 * decides here, so the Request itself can stay a bare GET. */
function handlers(h: ReturnType<typeof harness>, caller: string) {
  return createSquadHandlers({
    squads: h.squads, tracker: h.tracker, store: h.store,
    commit: h.commitDeps, origin: 'https://squad-stake.test',
    sessionAddress: async () => caller,
  });
}
const get = () => new Request('https://squad-stake.test/api/tx/' + HASH);

test('n-2 the status of a transaction is only ever the caller\'s own', async () => {
  const h = harness({ balance: 50_000_000_000 });
  const made = await h.squads.create(ADDRESSES.alice, {
    mode: 'B', name: 'Winter buffer', goalAt: GOAL, personalTargetLuna: 200_000_000,
  });
  assert.ok(made.ok);
  await h.store.insertTrackedTx({
    hash: HASH, address: ADDRESSES.alice, squadId: made.id, kind: 'create',
    expected: { valueLuna: 200_000_000 }, state: 'SUBMITTED', checkedAt: null,
  });

  // Bob is signed in and is not the sender: the row is not his, so as far as this app is
  // concerned the hash is not tracked — the same answer an invented hash gets.
  const stranger = await handlers(h, ADDRESSES.bob).checkTx(get(), HASH);
  assert.equal(stranger.status, 404);
  assert.deepEqual(await stranger.json(), { ok: false, code: 'NOT_TRACKED' });

  const unknown = await handlers(h, ADDRESSES.alice).checkTx(get(), 'b'.repeat(64));
  assert.equal(unknown.status, 404);

  // Alice gets a verdict, from the tracker rather than from the row.
  const own = await handlers(h, ADDRESSES.alice).checkTx(get(), HASH);
  const body = await own.json() as { ok: boolean; state?: string };
  assert.equal(own.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.state, 'UNKNOWN'); // no transaction is readable in this harness

  // A malformed hash never reaches the store at all.
  const bad = await handlers(h, ADDRESSES.alice).checkTx(get(), 'not-a-hash');
  assert.equal(bad.status, 400);
  assert.deepEqual(await bad.json(), { ok: false, code: 'INVALID_INPUT' });
});

test('n-1/n-4 a leave that writes no row is never reported as success', async () => {
  const h = harness();
  const made = await h.squads.create(ADDRESSES.alice, {
    mode: 'B', name: 'Winter buffer', goalAt: GOAL, personalTargetLuna: 200_000_000,
  });
  assert.ok(made.ok);

  // Someone else's request got there first: `markLeft` matches no row.
  assert.equal(await h.store.markLeft(made.id, ADDRESSES.alice, h.at()), true);
  const second = await h.squads.leave(ADDRESSES.alice, made.id);
  assert.ok(!second.ok);
  // The pre-read catches this case; the verdict is what catches a race the read cannot see.
  assert.equal(second.code, 'NOT_A_MEMBER');

  // A row that is present and current, but whose conditional update matches nothing: the
  // only shape in which the discarded boolean mattered.
  const blocked = {
    ...h.store,
    markLeft: async () => false,
  };
  const service = createSquadService({
    store: blocked, now: h.at, uuid: () => 'x', shortId: () => 'x', inviteToken: () => 'x',
    hash: (value: string) => value,
  });
  const rejoined = await h.store.joinMembership({
    squadId: made.id, address: ADDRESSES.alice, personalTargetLuna: null });
  assert.equal(rejoined, true);
  const result = await service.leave(ADDRESSES.alice, made.id);
  assert.ok(!result.ok);
  assert.equal(result.code, 'LEAVE_BLOCKED');
  // And the membership is still there, which is what makes the refusal honest.
  const membership = await h.store.getMembership(made.id, ADDRESSES.alice);
  assert.equal(membership?.leftAt, null);
});

test('n-4 a join whose write loses a race re-reads instead of guessing', async () => {
  const h = harness();
  const made = await h.squads.create(ADDRESSES.alice, {
    mode: 'B', name: 'Winter buffer', goalAt: GOAL, personalTargetLuna: 200_000_000,
  });
  assert.ok(made.ok && made.inviteToken);
  const token = made.inviteToken;

  // The service sees "not a member" when it reads, and "no row changed" when it writes. That
  // can only be a join that landed in between, so the answer comes from a second read.
  function racing(afterWrite: () => Promise<Membership | null>) {
    let written = false;
    return createSquadService({
      store: {
        ...h.store,
        async getMembership() {
          return written ? afterWrite() : null;
        },
        async joinMembership() {
          written = true;
          return false;
        },
      },
      now: h.at, uuid: randomUUID, shortId: () => 'k3m9p2qr', inviteToken: () => token,
      hash: (value: string) => createHash('sha256').update(value).digest('hex'),
    });
  }

  // The other request made bob a member: that is the same success it got, so bob is told he
  // is already in — not that the join failed, and not that this request created it.
  const current = await racing(async () =>
    ({ squadId: made.id, address: ADDRESSES.bob, personalTargetLuna: null,
      committedLuna: 0, joinedAt: h.at(), leftAt: null }))
    .join(ADDRESSES.bob, made.id, { token });
  assert.deepEqual(current, { ok: true, id: made.id, alreadyMember: true });

  // Nothing to account for the write having matched no row: refuse rather than report a
  // membership that is not there.
  const nothing = await racing(async () => null).join(ADDRESSES.bob, made.id, { token });
  assert.ok(!nothing.ok);
  assert.equal(nothing.code, 'UNAVAILABLE');

  const left = await racing(async () =>
    ({ squadId: made.id, address: ADDRESSES.bob, personalTargetLuna: null,
      committedLuna: 0, joinedAt: h.at(), leftAt: h.at() }))
    .join(ADDRESSES.bob, made.id, { token });
  assert.ok(!left.ok);
  assert.equal(left.code, 'UNAVAILABLE');
});
