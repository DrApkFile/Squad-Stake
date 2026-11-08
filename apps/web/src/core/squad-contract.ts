import { z } from 'zod';

// The one wire contract for squads, shared by the client and the route handlers, in the
// shape of auth-contract.ts. The address pattern repeats rpc-schemas.ts because that module
// is server-only and this one is imported by client code.
export const addressInput = z.string().regex(/^NQ\d{2}(?: [0-9A-HJ-NP-VXY]{4}){8}$/);
export const hashInput = z.string().regex(/^[a-f\d]{64}$/i);
export const inviteTokenInput = z.string().regex(/^[a-f\d]{32}$/i);
export const lunaInput = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const squadName = z.string().trim().min(1).max(60);
export const txKind = z.enum(['create', 'add', 'unstake', 'retire', 'remove', 'pay']);
export const txState = z.enum(['SUBMITTED', 'INCLUDED_OK', 'INCLUDED_FAILED', 'UNKNOWN']);

export const createSquadInput = z.discriminatedUnion('mode', [
  // Mode A fixes the total target and the recipient at creation (PRD §4).
  z.object({ mode: z.literal('A'), name: squadName, goalAt: z.number().int().positive(),
    targetLuna: lunaInput, recipient: addressInput }).strict(),
  // Mode B has no recipient and no shared total; the organiser sets their own target.
  z.object({ mode: z.literal('B'), name: squadName, goalAt: z.number().int().positive(),
    personalTargetLuna: lunaInput }).strict(),
]);
export const joinSquadInput = z.object({
  token: inviteTokenInput, personalTargetLuna: lunaInput.optional(),
}).strict();
export const commitInput = z.object({
  amountLuna: lunaInput, txHash: hashInput.nullable().default(null),
}).strict();
export const leaveInput = z.object({}).strict();
export const recordTxInput = z.object({
  hash: hashInput, kind: txKind, squadId: z.uuid(), valueLuna: lunaInput,
}).strict();

export type CreateSquadInput = z.infer<typeof createSquadInput>;
export type JoinSquadInput = z.infer<typeof joinSquadInput>;
export type CommitInput = z.infer<typeof commitInput>;
export type RecordTxInput = z.infer<typeof recordTxInput>;
export type TxKind = z.infer<typeof txKind>;
export type TxState = z.infer<typeof txState>;

const failure = z.object({ ok: z.literal(false), code: z.string() }).strict();
export const createSquadResponse = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), id: z.uuid(), shortId: z.string(), inviteToken: inviteTokenInput }).strict(),
  failure,
]);
export const joinSquadResponse = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), id: z.uuid(), alreadyMember: z.boolean() }).strict(),
  failure,
]);
export const commitResponse = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), committedLuna: z.number().int(), freeLuna: z.number().int(),
    readAt: z.number().int() }).strict(),
  z.object({ ok: z.literal(false), code: z.string(), freeLuna: z.number().int().nullable().default(null),
    shortfallLuna: z.number().int().nullable().default(null) }).strict(),
]);
export const leaveResponse = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), left: z.literal(true) }).strict(), failure,
]);
export const trackedTxResponse = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), hash: hashInput, state: txState,
    confirmations: z.number().int().nullable().default(null),
    requiredConfirmations: z.number().int() }).strict(),
  failure,
]);

// --- Read responses (screens 3, 5 and 10) ---------------------------------
const memberStatusBody = z.union([
  z.object({ status: z.enum(['BACKED', 'RELEASABLE', 'RETIRED', 'NOT_STAKING', 'LEFT']) }).strict(),
  z.object({ status: z.literal('SHORT'), shortBy: z.number().int().nullable() }).strict(),
  z.object({ status: z.literal('UNSTAKING'), releaseBlock: z.number().int().nullable() }).strict(),
]);
const squadMemberBody = z.object({
  address: addressInput,
  committedLuna: z.number().int().nonnegative(),
  status: memberStatusBody.nullable(),
  readAt: z.number().int().nullable(),
  isYou: z.boolean(),
  pending: z.object({
    confirmations: z.number().int().nullable(),
    requiredConfirmations: z.number().int(),
  }).strict().nullable(),
}).strict();
const squadViewBody = z.object({
  squadId: z.uuid(),
  squad: z.object({
    name: z.string(), shortId: z.string(), mode: z.enum(['A', 'B']),
    targetLuna: z.number().int().nullable(), recipient: addressInput.nullable(),
    goalAt: z.number().int(),
  }).strict(),
  members: z.array(squadMemberBody),
  memberCount: z.number().int().nonnegative(),
  committedLuna: z.number().int().nonnegative(),
  backedLuna: z.number().int().nonnegative().nullable(),
  readAt: z.number().int().nullable(),
  leaveBy: z.number().int(),
  chainUnavailable: z.boolean(),
  inviteToken: inviteTokenInput.nullable(),
  youAreMember: z.boolean(),
}).strict();

export const squadDetailResponse = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), view: squadViewBody }).strict(),
  failure,
]);
/** The public proof route answers with the same shape, minus anything viewer-specific. */
export const proofResponse = squadDetailResponse;

export const mySquadsResponse = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    squads: z.array(z.object({
      id: z.uuid(),
      shortId: z.string(),
      name: z.string(),
      mode: z.enum(['A', 'B']),
      goalAt: z.number().int(),
      targetLuna: z.number().int().nullable(),
      committedLuna: z.number().int().nonnegative(),
      squadCommittedLuna: z.number().int().nonnegative(),
      memberCount: z.number().int().nonnegative(),
      members: z.array(addressInput),
    }).strict()),
  }).strict(),
  failure,
]);
