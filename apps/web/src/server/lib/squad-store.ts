import 'server-only';
import { z } from 'zod';
import { txKind, txState } from '../../core/squad-contract';
import { ACTIVE_SQUAD_STATES, type Commitment, type Membership, type Squad, type SquadStore } from '../core/squads';
import { db } from './db';

// postgres.js returns bigint columns as strings; luna must survive as a safe integer.
const luna = z.union([z.number(), z.string().regex(/^\d+$/)]).transform(Number)
  .refine(Number.isSafeInteger, 'luna must be a safe integer');
const squadRow = z.object({
  id: z.uuid(), short_id: z.string(), name: z.string(), mode: z.enum(['A', 'B']),
  target_luna: luna.nullable(), recipient: z.string().nullable(), goal_at: z.date(),
  organiser: z.string(), state: z.enum(['OPEN', 'SAVING', 'LEAVING', 'SETTLING', 'COMPLETED', 'CANCELLED']),
  // Null for squads created before migration 003; their page says the link cannot be
  // recovered rather than inventing one.
  invite_token: z.string().nullable(),
}).strict();
const membershipRow = z.object({
  squad_id: z.uuid(), address: z.string(), personal_target_luna: luna.nullable(),
  committed_luna: luna, left_at: z.date().nullable(),
}).strict();
const trackedRow = z.object({
  hash: z.string(), address: z.string(), squad_id: z.uuid(), kind: txKind,
  expected: z.object({ valueLuna: luna }).strict(), state: txState, checked_at: z.date().nullable(),
}).strict();
const commitmentRow = z.object({ squad_id: z.uuid(), committed_luna: luna }).strict();
const summaryRow = squadRow.extend({
  committed_luna: luna, member_count: z.number().int(), squad_committed_luna: luna,
}).strict();

const toSquad = (row: unknown): Squad => {
  const parsed = squadRow.parse(row);
  return { id: parsed.id, shortId: parsed.short_id, name: parsed.name, mode: parsed.mode,
    targetLuna: parsed.target_luna, recipient: parsed.recipient, goalAt: parsed.goal_at.getTime(),
    organiser: parsed.organiser, state: parsed.state, inviteToken: parsed.invite_token };
};
const toMembership = (row: unknown): Membership => {
  const parsed = membershipRow.parse(row);
  return { squadId: parsed.squad_id, address: parsed.address,
    personalTargetLuna: parsed.personal_target_luna, committedLuna: parsed.committed_luna,
    leftAt: parsed.left_at?.getTime() ?? null };
};
export const squadStore: SquadStore = {
  async insertSquad(squad, organiser) {
    await db().begin(async (tx) => {
      await tx`INSERT INTO squads (id, short_id, name, mode, target_luna, recipient, goal_at,
        organiser, invite_token_hash, invite_token, state) VALUES (${squad.id}, ${squad.shortId},
        ${squad.name}, ${squad.mode}, ${squad.targetLuna}, ${squad.recipient},
        ${new Date(squad.goalAt)}, ${squad.organiser},
        ${Buffer.from(squad.inviteTokenHash, 'hex')}, ${squad.inviteToken}, ${squad.state})`;
      await tx`INSERT INTO memberships (squad_id, address, personal_target_luna)
        VALUES (${organiser.squadId}, ${organiser.address}, ${organiser.personalTargetLuna})`;
    });
  },
  async getSquad(id) {
    const rows = await db()`SELECT id, short_id, name, mode, target_luna, recipient, goal_at,
      organiser, state, invite_token FROM squads WHERE id = ${id}`;
    return rows[0] ? toSquad(rows[0]) : null;
  },
  async getSquadByInviteHash(inviteTokenHash) {
    const rows = await db()`SELECT id, short_id, name, mode, target_luna, recipient, goal_at,
      organiser, state, invite_token FROM squads WHERE invite_token_hash = ${Buffer.from(inviteTokenHash, 'hex')}`;
    return rows[0] ? toSquad(rows[0]) : null;
  },
  async getSquadByShortId(shortId) {
    const rows = await db()`SELECT id, short_id, name, mode, target_luna, recipient, goal_at,
      organiser, state, invite_token FROM squads WHERE short_id = ${shortId}`;
    return rows[0] ? toSquad(rows[0]) : null;
  },
  async getMembership(squadId, address) {
    const rows = await db()`SELECT squad_id, address, personal_target_luna, committed_luna, left_at
      FROM memberships WHERE squad_id = ${squadId} AND address = ${address}`;
    return rows[0] ? toMembership(rows[0]) : null;
  },
  async joinMembership(membership) {
    // A re-join clears left_at and starts from zero: leaving removed the commitment (§7.8).
    const rows = await db()`INSERT INTO memberships (squad_id, address, personal_target_luna)
      VALUES (${membership.squadId}, ${membership.address}, ${membership.personalTargetLuna})
      ON CONFLICT (squad_id, address) DO UPDATE SET left_at = NULL, committed_luna = 0,
        personal_target_luna = ${membership.personalTargetLuna}
      WHERE memberships.left_at IS NOT NULL RETURNING address`;
    return rows.length === 1;
  },
  async markLeft(squadId, address, at) {
    const rows = await db()`UPDATE memberships SET left_at = ${new Date(at)}, committed_luna = 0
      WHERE squad_id = ${squadId} AND address = ${address} AND left_at IS NULL RETURNING address`;
    return rows.length === 1;
  },
  async countActiveMembers(squadId) {
    const rows = await db()`SELECT count(*)::int AS members FROM memberships
      WHERE squad_id = ${squadId} AND left_at IS NULL`;
    return z.object({ members: z.number().int() }).strict().parse(rows[0]).members;
  },
  async activeCommitments(address) {
    const rows = await db()`SELECT m.squad_id, m.committed_luna FROM memberships m
      JOIN squads s ON s.id = m.squad_id WHERE m.address = ${address} AND m.left_at IS NULL
        AND s.state = ANY(${[...ACTIVE_SQUAD_STATES]})`;
    return rows.map((row) => {
      const parsed = commitmentRow.parse(row);
      return { squadId: parsed.squad_id, committedLuna: parsed.committed_luna };
    });
  },
  async listMembers(squadId) {
    // Ordered so the roster and the orbit are stable between reads: joiners after the
    // organiser, and a deterministic tie-break on address.
    const rows = await db()`SELECT squad_id, address, personal_target_luna, committed_luna, left_at
      FROM memberships WHERE squad_id = ${squadId} ORDER BY joined_at ASC, address ASC`;
    return rows.map(toMembership);
  },
  async squadsForAddress(address) {
    // One query: the squad, the viewer's commitment, and the squad's active-member count and
    // committed sum. Subqueries rather than a GROUP BY so the squad columns stay single-valued.
    const rows = await db()`SELECT s.id, s.short_id, s.name, s.mode, s.target_luna, s.recipient,
        s.goal_at, s.organiser, s.state, s.invite_token, m.committed_luna,
        (SELECT count(*)::int FROM memberships a
           WHERE a.squad_id = s.id AND a.left_at IS NULL) AS member_count,
        (SELECT coalesce(sum(a.committed_luna), 0)::bigint FROM memberships a
           WHERE a.squad_id = s.id AND a.left_at IS NULL) AS squad_committed_luna
      FROM memberships m JOIN squads s ON s.id = m.squad_id
      WHERE m.address = ${address} AND m.left_at IS NULL
        AND s.state = ANY(${[...ACTIVE_SQUAD_STATES]})
      ORDER BY s.goal_at ASC, s.id ASC`;
    return rows.map((row) => {
      const parsed = summaryRow.parse(row);
      return {
        squad: toSquad({
          id: parsed.id, short_id: parsed.short_id, name: parsed.name, mode: parsed.mode,
          target_luna: parsed.target_luna, recipient: parsed.recipient, goal_at: parsed.goal_at,
          organiser: parsed.organiser, state: parsed.state, invite_token: parsed.invite_token,
        }),
        committedLuna: parsed.committed_luna,
        memberCount: parsed.member_count,
        squadCommittedLuna: parsed.squad_committed_luna,
      };
    });
  },
  async latestOpenTrackedTx(squadId, address) {
    // Only non-terminal states: a verdict is already reflected in the commitment itself.
    const rows = await db()`SELECT hash, address, squad_id, kind, expected, state, checked_at
      FROM tracked_txs WHERE squad_id = ${squadId} AND address = ${address}
        AND state IN ('SUBMITTED', 'UNKNOWN') ORDER BY created_at DESC LIMIT 1`;
    if (!rows[0]) return null;
    const parsed = trackedRow.parse(rows[0]);
    return { hash: parsed.hash, address: parsed.address, squadId: parsed.squad_id, kind: parsed.kind,
      expected: parsed.expected, state: parsed.state, checkedAt: parsed.checked_at?.getTime() ?? null };
  },
  async withMemberLock(address, run) {
    // Wrapped in an object because postgres.js unwraps an array result from begin().
    const outcome = await db().begin(async (tx) => {
      // FOR UPDATE on this member's active rows: a concurrent commit for the same member
      // waits here, so two requests cannot both read the same free balance (Q03).
      // Survives Neon's PgBouncer in transaction mode: that mode pins one server connection
      // for the whole BEGIN … COMMIT, so these row locks outlive each statement (db-config.ts).
      const locked = await tx`SELECT m.squad_id, m.committed_luna FROM memberships m
        JOIN squads s ON s.id = m.squad_id WHERE m.address = ${address} AND m.left_at IS NULL
          AND s.state = ANY(${[...ACTIVE_SQUAD_STATES]}) FOR UPDATE OF m`;
      const commitments: Commitment[] = locked.map((row) => {
        const parsed = commitmentRow.parse(row);
        return { squadId: parsed.squad_id, committedLuna: parsed.committed_luna };
      });
      return { value: await run({
        commitments: async () => commitments,
        setCommitment: async (squadId, committedLuna) => {
          const rows = await tx`UPDATE memberships SET committed_luna = ${committedLuna}
            WHERE squad_id = ${squadId} AND address = ${address} AND left_at IS NULL RETURNING address`;
          return rows.length === 1;
        },
      }) };
    });
    return outcome.value;
  },
  async insertTrackedTx(transaction) {
    const rows = await db()`INSERT INTO tracked_txs (hash, address, squad_id, kind, expected, state)
      VALUES (${transaction.hash}, ${transaction.address}, ${transaction.squadId}, ${transaction.kind},
        ${db().json(transaction.expected)}, ${transaction.state})
      ON CONFLICT (hash) DO NOTHING RETURNING hash`;
    return rows.length === 1;
  },
  async getTrackedTx(hash) {
    const rows = await db()`SELECT hash, address, squad_id, kind, expected, state, checked_at
      FROM tracked_txs WHERE hash = ${hash}`;
    if (!rows[0]) return null;
    const parsed = trackedRow.parse(rows[0]);
    return { hash: parsed.hash, address: parsed.address, squadId: parsed.squad_id, kind: parsed.kind,
      expected: parsed.expected, state: parsed.state, checkedAt: parsed.checked_at?.getTime() ?? null };
  },
  async setTrackedTxState(hash, from, to, checkedAt) {
    // Conditional update: 0 rows means someone else moved it first (FAILURE_MODES).
    const rows = await db()`UPDATE tracked_txs SET state = ${to}, checked_at = ${new Date(checkedAt)}
      WHERE hash = ${hash} AND state = ${from} RETURNING hash`;
    return rows.length === 1;
  },
};
