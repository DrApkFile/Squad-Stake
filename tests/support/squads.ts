import { createHash, randomUUID } from 'node:crypto';
import { createSquadService, type Commitment, type Membership, type Squad, type SquadStore, type TrackedTx }
  from '../../apps/web/src/server/core/squads';
import { createTxTracker } from '../../apps/web/src/server/core/tx-tracker';
import type { CommitRpc } from '../../apps/web/src/server/core/commitments';
import type { ChainTransaction, RpcResult, Staker, StakerState } from '../../apps/web/src/server/core/chain';

export const ADDRESSES = {
  alice: 'NQ21 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V 7V7V',
  bob: 'NQ94 B3PE JCBF 9JSU 5XHG BNVB UNT8 TEUT 4KGD',
  carol: 'NQ38 2JRM 4YDV 1PCB 9CSM 7V3H KQ0E 5NTG XB4L',
} as const;
export const HASHES = {
  create: 'a'.repeat(64), add: 'b'.repeat(64), other: 'c'.repeat(64),
} as const;

export function staker(balance: number, rest: Partial<Staker> = {}): Staker {
  return { address: ADDRESSES.alice, balance, delegation: null, inactiveBalance: 0,
    inactiveFrom: null, retiredBalance: 0, ...rest };
}
export function transaction(rest: Partial<ChainTransaction> = {}): ChainTransaction {
  return { hash: HASHES.create, size: 200, relatedAddresses: [], from: ADDRESSES.alice, fromType: 0,
    to: ADDRESSES.bob, toType: 3, value: 10_000_000, fee: 300, senderData: '', recipientData: '',
    flags: 0, validityStartHeight: 1, proof: '', networkId: 5, executionResult: true,
    blockNumber: 1_000, confirmations: 60, ...rest };
}

/**
 * In-memory SquadStore. `withMemberLock` holds a per-address promise chain, which is how
 * Postgres `SELECT … FOR UPDATE` behaves for the invariant: two commits for the same
 * member run one after the other, so Q03 can be attacked concurrently in a unit test.
 */
export function memoryStore() {
  const squads = new Map<string, Squad & { inviteTokenHash: string }>();
  const memberships = new Map<string, Membership>();
  const trackedTxs = new Map<string, TrackedTx>();
  const locks = new Map<string, Promise<unknown>>();
  const key = (squadId: string, address: string) => `${squadId}|${address}`;
  let lockWaits = 0;

  const store: SquadStore = {
    async insertSquad(squad, organiser) {
      squads.set(squad.id, squad);
      memberships.set(key(organiser.squadId, organiser.address), {
        ...organiser, committedLuna: 0, leftAt: null });
    },
    async getSquad(id) {
      const squad = squads.get(id);
      return squad ? { ...squad } : null;
    },
    async getSquadByInviteHash(hash) {
      for (const squad of squads.values()) if (squad.inviteTokenHash === hash) return { ...squad };
      return null;
    },
    async getMembership(squadId, address) {
      const membership = memberships.get(key(squadId, address));
      return membership ? { ...membership } : null;
    },
    async joinMembership(membership) {
      const existing = memberships.get(key(membership.squadId, membership.address));
      if (existing && existing.leftAt === null) return false;
      memberships.set(key(membership.squadId, membership.address), {
        ...membership, committedLuna: 0, leftAt: null });
      return true;
    },
    async markLeft(squadId, address, at) {
      const membership = memberships.get(key(squadId, address));
      if (!membership || membership.leftAt !== null) return false;
      memberships.set(key(squadId, address), { ...membership, leftAt: at, committedLuna: 0 });
      return true;
    },
    async getSquadByShortId(shortId) {
      for (const squad of squads.values()) if (squad.shortId === shortId) return { ...squad };
      return null;
    },
    async listMembers(squadId) {
      // Insertion order stands in for `ORDER BY joined_at, address`; members who left are
      // included, because PRD §7.4 lists LEFT as a status.
      return [...memberships.values()]
        .filter((membership) => membership.squadId === squadId)
        .map((membership) => ({ ...membership }));
    },
    async squadsForAddress(address) {
      const mine = [...memberships.values()]
        .filter((membership) => membership.address === address && membership.leftAt === null);
      return mine.flatMap((membership) => {
        const squad = squads.get(membership.squadId);
        if (!squad) return [];
        const roster = [...memberships.values()]
          .filter((other) => other.squadId === squad.id && other.leftAt === null);
        return [{
          squad: { ...squad },
          committedLuna: membership.committedLuna,
          memberCount: roster.length,
          squadCommittedLuna: roster.reduce((total, other) => total + other.committedLuna, 0),
        }];
      });
    },
    async latestOpenTrackedTx(squadId, address) {
      const open = [...trackedTxs.values()].filter((tracked) => tracked.squadId === squadId
        && tracked.address === address && (tracked.state === 'SUBMITTED' || tracked.state === 'UNKNOWN'));
      const last = open.at(-1);
      return last ? { ...last } : null;
    },
    async countActiveMembers(squadId) {
      return [...memberships.values()]
        .filter((membership) => membership.squadId === squadId && membership.leftAt === null).length;
    },
    async activeCommitments(address) {
      return [...memberships.values()]
        .filter((membership) => membership.address === address && membership.leftAt === null)
        .map((membership) => ({ squadId: membership.squadId, committedLuna: membership.committedLuna }));
    },
    async withMemberLock(address, run) {
      const previous = locks.get(address);
      if (previous) lockWaits++;
      const result = (async () => {
        await previous?.catch(() => undefined);
        const commitments: Commitment[] = [...memberships.values()]
          .filter((membership) => membership.address === address && membership.leftAt === null
            && ['OPEN', 'SAVING', 'LEAVING', 'SETTLING'].includes(squads.get(membership.squadId)?.state ?? ''))
          .map((membership) => ({ squadId: membership.squadId, committedLuna: membership.committedLuna }));
        return run({
          commitments: async () => commitments,
          setCommitment: async (squadId, committedLuna) => {
            const membership = memberships.get(key(squadId, address));
            if (!membership || membership.leftAt !== null) return false;
            memberships.set(key(squadId, address), { ...membership, committedLuna });
            return true;
          },
        });
      })();
      locks.set(address, result);
      return result;
    },
    async insertTrackedTx(tracked) {
      if (trackedTxs.has(tracked.hash)) return false;
      trackedTxs.set(tracked.hash, { ...tracked });
      return true;
    },
    async getTrackedTx(hash) {
      const tracked = trackedTxs.get(hash);
      return tracked ? { ...tracked } : null;
    },
    async setTrackedTxState(hash, from, to, checkedAt) {
      const tracked = trackedTxs.get(hash);
      if (!tracked || tracked.state !== from) return false;
      trackedTxs.set(hash, { ...tracked, state: to, checkedAt });
      return true;
    },
  };
  return { store, squads, memberships, trackedTxs, lockWaits: () => lockWaits };
}

export function harness(options: { balance?: number | null; transaction?: ChainTransaction | null } = {}) {
  const memory = memoryStore();
  let now = Date.parse('2026-11-06T10:00:00Z');
  let balance = options.balance ?? null;
  let freshReads = 0;
  let cachedReads = 0;
  const rpc: CommitRpc & { getTransactionByHash(hash: string): Promise<RpcResult<ChainTransaction>> } = {
    async getStakerByAddress(address, parameters): Promise<RpcResult<StakerState>> {
      if (parameters?.fresh) freshReads++; else cachedReads++;
      if (balance === null) return { ok: true, data: { status: 'NOT_STAKING' }, metadata: null, readAt: now };
      return { ok: true, data: { status: 'STAKING', staker: staker(balance, { address }) },
        metadata: null, readAt: now };
    },
    async getTransactionByHash() {
      const found = options.transaction;
      if (!found) return { ok: false, code: 'RPC_ERROR', rpcError: { code: -32603, message: 'Internal error' } };
      return { ok: true, data: found, metadata: null, readAt: now };
    },
  };
  const deps = { store: memory.store, now: () => now, uuid: randomUUID,
    shortId: () => 'k3m9p2qr', inviteToken: () => 'f'.repeat(32),
    hash: (value: string) => createHash('sha256').update(value).digest('hex') };
  return {
    ...memory, rpc,
    squads: createSquadService(deps),
    tracker: createTxTracker({ store: memory.store, rpc, now: () => now }),
    commitDeps: { store: memory.store, rpc, now: () => now },
    rows: memory.squads,
    freshReads: () => freshReads,
    cachedReads: () => cachedReads,
    setBalance: (value: number | null) => { balance = value; },
    advance: (milliseconds: number) => { now += milliseconds; },
    at: () => now,
  };
}

/**
 * A squad with a roster, for the squad page and the proof view (PRD §7.4). Per-address active
 * balances and read times are scripted, and any address can be made unreadable, so a failed
 * read is testable without a network.
 */
export function detailHarness(options: { head?: number | null } = {}) {
  const memory = memoryStore();
  const now = Date.parse('2026-11-07T12:00:00Z');
  let head: number | null = options.head ?? 16_040_000;
  const balances = new Map<string, number | null>();
  const unreadable = new Set<string>();
  const readAt = new Map<string, number>();
  let stakerReads = 0;

  const rpc = {
    async getBlockNumber(): Promise<RpcResult<number>> {
      if (head === null) {
        return { ok: false as const, code: 'RPC_ERROR' as const,
          rpcError: { code: -32603, message: 'Internal error' } };
      }
      return { ok: true as const, data: head, metadata: null, readAt: now };
    },
    async getStakerByAddress(address: string): Promise<RpcResult<StakerState>> {
      stakerReads++;
      if (unreadable.has(address)) {
        return { ok: false as const, code: 'TIMEOUT' as const };
      }
      const balance = balances.get(address) ?? null;
      const at = readAt.get(address) ?? now;
      if (balance === null) {
        return { ok: true as const, data: { status: 'NOT_STAKING' }, metadata: null, readAt: at };
      }
      return { ok: true as const,
        data: { status: 'STAKING', staker: staker(balance, { address }) },
        metadata: null, readAt: at };
    },
  };
  return {
    ...memory,
    deps: { store: memory.store, rpc, now: () => now },
    squads: createSquadService({ store: memory.store, now: () => now, uuid: randomUUID,
      shortId: () => 'k3m9p2qr', inviteToken: () => 'f'.repeat(32),
      hash: (value: string) => createHash('sha256').update(value).digest('hex') }),
    setBalance: (address: string, balance: number | null) => { balances.set(address, balance); },
    setReadAt: (address: string, at: number) => { readAt.set(address, at); },
    breakRead: (address: string) => { unreadable.add(address); },
    setHead: (value: number | null) => { head = value; },
    stakerReads: () => stakerReads,
    at: () => now,
  };
}
