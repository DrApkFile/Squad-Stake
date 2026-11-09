import assert from 'node:assert/strict';
import test from 'node:test';
import { squadDetail } from '../../apps/web/src/server/core/squad-detail';
import {
  exitStageOf, stageOf, stageTotals,
} from '../../apps/web/src/server/core/squad-stages';
import type { SquadMemberWire } from '../../apps/web/src/core/view-contract';
import { exitBanner, leavingHint, stageLine, stageTotalsOf } from '../../packages/ui/progress';
import { ADDRESSES, detailHarness, staker } from '../support/squads';
import { recorded } from '../support/rpc';

const row = (over: Partial<SquadMemberWire>): SquadMemberWire => ({
  address: ADDRESSES.alice, committedLuna: 100_000_000, status: { status: 'BACKED' },
  readAt: 1, isYou: false, pending: null, earned: null, ...over,
});

/** The recorded testnet release answers, which `detailHarness` serves (see `planHarness`). */
const RELEASE_BLOCK = recorded.window.response.result.data;

test('§7.4 every stage of the exit still counts toward the squad, and only SHORT is missing', () => {
  const totals = stageTotals([
    row({ status: { status: 'BACKED' }, committedLuna: 100 }),
    row({ status: { status: 'UNSTAKING', releaseBlock: null }, committedLuna: 150 }),
    row({ status: { status: 'RELEASABLE' }, committedLuna: 10 }),
    row({ status: { status: 'RETIRED' }, committedLuna: 5 }),
    row({ status: { status: 'WITHDRAWN' }, committedLuna: 20 }),
    row({ status: { status: 'PAID' }, committedLuna: 30 }),
    row({ status: { status: 'SHORT', shortBy: 7 }, committedLuna: 40 }),
    row({ status: { status: 'NOT_STAKING' }, committedLuna: 1 }),
    row({ status: null, committedLuna: 60 }),
    // Someone who left holds no commitment and is off every total.
    row({ status: { status: 'LEFT' }, committedLuna: 0 }),
  ]);
  assert.ok(totals !== null);
  assert.equal(totals.backedLuna, 100);
  assert.equal(totals.leavingLuna, 150);
  assert.equal(totals.readyLuna, 15, 'RELEASABLE and RETIRED are both waiting on a tap');
  assert.equal(totals.withdrawnLuna, 20);
  assert.equal(totals.paidLuna, 30);
  assert.equal(totals.missingLuna, 41, 'SHORT and NOT_STAKING only');
  assert.equal(totals.unreadLuna, 60, 'a failed read is not a missing share');
  assert.equal(totals.coveredLuna, 315, '100 + 150 + 15 + 20 + 30');
});

test('§7.4 the total is null only when nobody could be read at all', () => {
  assert.equal(stageTotals([row({ status: null })]), null);
  assert.equal(stageTotals([]), null);
  assert.equal(stageTotals([row({ status: { status: 'LEFT' } })]), null);
  assert.ok(stageTotals([row({ status: { status: 'SHORT', shortBy: null } })]) !== null);
});

test('§7.4 the squad line names each stage and never reads as "0 backed" while leaving', () => {
  const leaving = stageTotals([
    row({ status: { status: 'BACKED' }, committedLuna: 0 }),
    row({ status: { status: 'UNSTAKING', releaseBlock: null }, committedLuna: 15_000_000 }),
  ]);
  assert.ok(leaving !== null);
  // The reported defect, in words: the page said "0 NIM backed" and nothing else.
  const line = stageLine(leaving, { leavingHint: '(ready in ~14 h)' });
  assert.equal(line, '0 NIM saved · 150 NIM leaving (ready in ~14 h)');

  // A squad where everybody is simply saving stays one short phrase.
  const plain = stageTotals([row({ committedLuna: 15_000_000 })]);
  assert.ok(plain !== null);
  assert.equal(stageLine(plain), '150 NIM saved');
});

test('§7.5 the banner switches to the countdown and offers no second start', () => {
  const now = Date.parse('2026-11-09T12:00:00Z');
  const committedLuna = 15_000_000;
  const release = { releaseBlock: RELEASE_BLOCK, remainingBlocks: 43_200,
    estimatedReleaseAt: now + 14 * 3_600_000 + 12 * 60_000, jailed: false };

  const leaving = exitBanner({ stage: 'leaving', committedLuna, release,
    headBlock: RELEASE_BLOCK - 43_200 }, now);
  assert.ok(leaving !== null);
  assert.equal(leaving.title, 'Your 150 NIM unlocks in about 14 h 12 min');
  assert.equal(leaving.tone, 'UNSTAKING');
  assert.equal(leavingHint({ stage: 'leaving', committedLuna, release,
    headBlock: RELEASE_BLOCK - 43_200 }, now), '(ready in ~14 h 12 min)');

  // The head has reached the release block: the countdown becomes an invitation to finish.
  const ready = exitBanner({ stage: 'leaving', committedLuna, release,
    headBlock: RELEASE_BLOCK }, now);
  assert.equal(ready?.title, 'Your 150 NIM is ready to withdraw');
  assert.equal(ready?.tone, 'READY');

  // A jailed validator releases later, and the banner says so rather than hiding it (Q07).
  const jailed = exitBanner({ stage: 'leaving', committedLuna,
    release: { ...release, jailed: true }, headBlock: RELEASE_BLOCK - 43_200 }, now);
  assert.equal(jailed?.note, 'Your validator is jailed, so the release is later than usual.');

  // No release derived yet: said plainly, never guessed into a time.
  const unknown = exitBanner({ stage: 'leaving', committedLuna, release: null,
    headBlock: 1 }, now);
  assert.equal(unknown?.title, 'Your 150 NIM is on its way out');
  assert.equal(unknown?.note, 'The release time is not known yet.');
  assert.equal(leavingHint({ stage: 'leaving', committedLuna, release: null, headBlock: 1 }, now),
    null);

  // The later stages, and the one state that may still be offered a start.
  assert.equal(exitBanner({ stage: 'withdrawn', committedLuna, release: null, headBlock: 1 }, now)
    ?.title, 'Your 150 NIM is back in your wallet');
  assert.equal(exitBanner({ stage: 'paid', committedLuna, release: null, headBlock: 1 }, now)
    ?.title, 'Your 150 NIM share is paid');
  assert.equal(exitBanner({ stage: 'none', committedLuna, release: null, headBlock: 1 }, now),
    null, 'only this stage leaves the start banner in place');
});

test('§7.4 stage and exit-stage mapping covers every status the wire can carry', () => {
  assert.equal(stageOf(null), 'unread');
  assert.equal(exitStageOf(null), 'none');
  assert.equal(exitStageOf({ status: 'BACKED' }), 'none');
  assert.equal(exitStageOf({ status: 'SHORT', shortBy: null }), 'none');
  assert.equal(exitStageOf({ status: 'NOT_STAKING' }), 'none');
  assert.equal(exitStageOf({ status: 'LEFT' }), 'none');
  assert.equal(exitStageOf({ status: 'UNSTAKING', releaseBlock: null }), 'leaving');
  assert.equal(exitStageOf({ status: 'RELEASABLE' }), 'ready');
  assert.equal(exitStageOf({ status: 'RETIRED' }), 'ready');
  assert.equal(exitStageOf({ status: 'WITHDRAWN' }), 'withdrawn');
  assert.equal(exitStageOf({ status: 'PAID' }), 'paid');
});

test('§7.4 the squad page derives a leaving member’s release from the chain, not inactiveFrom', async () => {
  const h = detailHarness({ head: recorded.head.response.result.data });
  const created = await h.squads.create(ADDRESSES.alice,
    { mode: 'B', name: 'Trip', goalAt: h.at() + 20 * 86_400_000, personalTargetLuna: 150_000_000 });
  assert.ok(created.ok);
  h.commit(created.id, ADDRESSES.alice, 150_000_000);

  // Alice is mid-exit: nothing active, her whole share inactive. `inactiveFrom` here is an
  // effective election block far from the inactivation's own block — the live testnet shape.
  h.setStaker(ADDRESSES.alice, staker(0, { address: ADDRESSES.alice, inactiveBalance: 150_000_000,
    inactiveFrom: 16_251_210, delegation: null }));
  const hash = 'e'.repeat(64);
  await h.store.insertTrackedTx({ hash, address: ADDRESSES.alice, squadId: created.id,
    kind: 'unstake', expected: { valueLuna: 1 }, state: 'SUBMITTED', checkedAt: null });
  h.setTransaction({ hash, blockNumber: 14_819_000, confirmations: 12, executionResult: true,
    size: 273, relatedAddresses: [], from: ADDRESSES.alice, fromType: 0,
    to: ADDRESSES.alice, toType: 3, value: 0, fee: 0, senderData: '', recipientData: '08',
    flags: 0, validityStartHeight: 14_818_990, proof: '', networkId: 5 });

  const result = await squadDetail(created.id, ADDRESSES.alice, h.deps);
  assert.ok(result.ok);
  const view = result.view;

  // The share is leaving, not missing, and the orbit's total still counts it.
  assert.deepEqual(view.stages, { backedLuna: 0, leavingLuna: 150_000_000, readyLuna: 0,
    withdrawnLuna: 0, paidLuna: 0, missingLuna: 0, unreadLuna: 0, coveredLuna: 150_000_000 });
  assert.equal(view.backedLuna, 0, 'PRD §7.4’s own figure is unchanged, and still 0');

  // The release comes from the recorded election/window answers, counted from the
  // inactivation's inclusion block — never from `inactiveFrom` (16,251,210), which would be
  // fed in as an inclusion block and give a different, wrong answer.
  assert.equal(view.yourExit?.stage, 'leaving');
  assert.equal(view.yourExit?.release?.releaseBlock, RELEASE_BLOCK);
  assert.equal(view.yourExit?.committedLuna, 150_000_000);
  assert.notEqual(view.yourExit?.release?.releaseBlock, 16_251_210);

  // The transaction executed and is only 12 deep, so it is confirming, not final, and the
  // row carries the real count instead of a zero.
  const you = view.members.find((member) => member.isYou);
  assert.deepEqual(you?.pending,
    { phase: 'INCLUDED_CONFIRMING', confirmations: 12, requiredConfirmations: 60 });
});

test('§7.4 the UI’s own stage split agrees with the server’s, so fixtures cannot drift', () => {
  // `packages/ui` may never import from the app, so `progress.ts` mirrors `squad-stages.ts`
  // for the fixture scenes and the video. This is the test that keeps the mirror honest.
  const rosters: readonly SquadMemberWire[][] = [
    [row({ status: { status: 'BACKED' }, committedLuna: 100 }),
      row({ status: { status: 'UNSTAKING', releaseBlock: null }, committedLuna: 150 }),
      row({ status: { status: 'RELEASABLE' }, committedLuna: 10 }),
      row({ status: { status: 'RETIRED' }, committedLuna: 5 }),
      row({ status: { status: 'WITHDRAWN' }, committedLuna: 20 }),
      row({ status: { status: 'PAID' }, committedLuna: 30 }),
      row({ status: { status: 'SHORT', shortBy: 7 }, committedLuna: 40 }),
      row({ status: { status: 'NOT_STAKING' }, committedLuna: 1 }),
      row({ status: null, committedLuna: 60 }),
      row({ status: { status: 'LEFT' }, committedLuna: 0 })],
    [row({ status: null })],
    [],
    [row({ status: { status: 'LEFT' } })],
    [row({ status: { status: 'PAID' }, committedLuna: 9 })],
  ];
  for (const roster of rosters) {
    assert.deepEqual(stageTotalsOf(roster), stageTotals(roster), JSON.stringify(roster));
  }
});

test('§7.4 a withdrawal shows on the page load that settles it, not the one after', async () => {
  /**
   * Found against real Postgres on 2026-11-09, after the fix above made WITHDRAWN reachable at
   * all: the member stayed NOT_STAKING for one more page load. `memberRow` reads the tracked
   * rows, *then* the tracker checks the open one and writes the verdict back, so `overlay` was
   * judging the row by the state the request started with. One load behind is still a page
   * contradicting the chain it just read — the same defect as the confirmation count.
   */
  const h = detailHarness({ head: recorded.head.response.result.data });
  const created = await h.squads.create(ADDRESSES.alice,
    { mode: 'B', name: 'Done', goalAt: h.at() + 20 * 86_400_000, personalTargetLuna: 150_000_000 });
  assert.ok(created.ok);
  h.commit(created.id, ADDRESSES.alice, 150_000_000);
  // The stake has left the contract, so there is no staker record to read any more.
  h.setStaker(ADDRESSES.alice, null);

  const hash = 'd'.repeat(64);
  await h.store.insertTrackedTx({ hash, address: ADDRESSES.alice, squadId: created.id,
    kind: 'remove', expected: { valueLuna: 150_000_000 }, state: 'SUBMITTED', checkedAt: null });
  // Executed and far past finality: the tracker will settle it INCLUDED_OK on this very call.
  h.setTransaction({ hash, blockNumber: 14_819_000, confirmations: 96_994, executionResult: true,
    size: 273, relatedAddresses: [], from: ADDRESSES.alice, fromType: 0,
    to: ADDRESSES.alice, toType: 3, value: 150_000_000, fee: 0, senderData: '',
    recipientData: '', flags: 0, validityStartHeight: 14_818_990, proof: '', networkId: 5 });

  const first = await squadDetail(created.id, ADDRESSES.alice, h.deps);
  assert.ok(first.ok);
  assert.deepEqual(first.view.members.find((member) => member.isYou)?.status,
    { status: 'WITHDRAWN' }, 'the first load, not the second');
  assert.equal(first.view.stages?.withdrawnLuna, 150_000_000);
  assert.equal(first.view.stages?.coveredLuna, 150_000_000,
    'a withdrawal still counts toward the squad');
  assert.equal(first.view.stages?.missingLuna, 0, 'and is never counted as a missing share');
});
