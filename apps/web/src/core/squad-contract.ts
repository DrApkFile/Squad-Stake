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
  z.object({ status: z.enum(['BACKED', 'RELEASABLE', 'RETIRED', 'NOT_STAKING', 'LEFT',
    // §7.4 also lists these two; they are composed above the chain status in squad-detail.ts
    // from a tracked `remove` and a verified §7.6 payment.
    'WITHDRAWN', 'PAID']) }).strict(),
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
  state: z.enum(['OPEN', 'SAVING', 'LEAVING', 'SETTLING', 'COMPLETED', 'CANCELLED']),
  payments: z.object({
    recipient: addressInput,
    owing: z.number().int().nonnegative(),
    paid: z.number().int().nonnegative(),
    rows: z.array(z.object({
      address: addressInput, hash: hashInput.nullable(),
      verified: z.boolean(), code: z.string().nullable(),
    }).strict()),
  }).strict().nullable(),
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

// --- Goal-day planner and Mode A payment (PRD §7.5, §7.6) ------------------

export const stepState = z.discriminatedUnion('state', [
  z.object({ state: z.enum(['locked', 'available', 'waiting']) }).strict(),
  z.object({ state: z.enum(['pending', 'failed']), hash: hashInput }).strict(),
  z.object({ state: z.literal('done'), hash: hashInput.nullable() }).strict(),
]);
const planBody = z.object({
  squadId: z.uuid(),
  squad: z.object({
    name: z.string(), shortId: z.string(), mode: z.enum(['A', 'B']),
    recipient: addressInput.nullable(), goalAt: z.number().int(),
  }).strict(),
  leaveBy: z.number().int(),
  showFrom: z.number().int(),
  // The viewer's own balances. Nobody else's reach any client (FAILURE_MODES "Privacy").
  stake: z.object({
    activeLuna: z.number().int().nonnegative(), inactiveLuna: z.number().int().nonnegative(),
    retiredLuna: z.number().int().nonnegative(), delegation: addressInput.nullable(),
    readAt: z.number().int(),
  }).strict().nullable(),
  shareLuna: z.number().int().nonnegative(),
  headBlock: z.number().int().nullable(),
  release: z.object({
    releaseBlock: z.number().int(), remainingBlocks: z.number().int(),
    estimatedReleaseAt: z.number().int(), jailed: z.boolean(),
  }).strict().nullable(),
  steps: z.object({
    start: stepState, retire: stepState, withdraw: stepState, pay: stepState.nullable(),
  }).strict(),
  // Readonly so the server's own LeavePlanView can be handed straight to the client
  // component that renders it, with no copy and no widening.
  commitments: z.array(z.object({
    squadId: z.uuid(), name: z.string(), committedLuna: z.number().int().nonnegative(),
  }).strict()).readonly(),
  payment: z.object({ hash: hashInput, verified: z.boolean(), code: z.string().nullable() })
    .strict().nullable(),
  roster: z.object({ paid: z.number().int().nonnegative(), owing: z.number().int().nonnegative() })
    .strict().nullable(),
  chainUnavailable: z.boolean(),
}).strict();

export const planResponse = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), plan: planBody }).strict(), failure,
]);

/** The payer sends only the hash: the recipient, the share and the marker are the server's,
 * read from the squad and the membership, never from the client (PRD §11 "fake payment"). */
export const payInput = z.object({ hash: hashInput }).strict();
export const payResponse = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), paid: z.number().int().nonnegative(),
    owing: z.number().int().nonnegative(), completed: z.boolean() }).strict(),
  failure,
]);
export type StepStateWire = z.infer<typeof stepState>;
export type PlanWire = z.infer<typeof planBody>;
