import 'server-only';
import { z } from 'zod';
import { hashInput, leaveInput } from '../../core/squad-contract';
import { setCommitment, type CommitDeps } from '../core/commitments';
import type { SquadService } from '../core/squads';
import type { TxTracker } from '../core/tx-tracker';
import { json, parseBody, validOrigin } from './auth-http';

export interface SquadHandlerDeps {
  squads: SquadService;
  tracker: TxTracker;
  commit: CommitDeps;
  origin: string;
  sessionAddress(request: Request): Promise<string | null>;
}

// One place decides how a refusal looks on the wire; the client maps the code through
// the error catalog. Anything unlisted is a server fault, not a client one.
const STATUS: Record<string, number> = {
  INVALID_INPUT: 400, GOAL_TOO_SOON: 400,
  INVITE_INVALID: 404, SQUAD_NOT_FOUND: 404, NOT_TRACKED: 404,
  SQUAD_CLOSED: 409, NOT_A_MEMBER: 409, DUPLICATE_HASH: 409,
  OVER_COMMITTED: 409, NOT_STAKING: 409, TX_NOT_CONFIRMED: 409, TX_FAILED: 409,
  CHAIN_UNAVAILABLE: 503, UNAVAILABLE: 503,
};
const uuid = z.uuid();

export function createSquadHandlers(deps: SquadHandlerDeps) {
  async function guard(request: Request, requireOrigin: boolean) {
    // Browsers omit Origin on same-origin GETs, so only state-changing POSTs demand it.
    if (requireOrigin && !validOrigin(request, deps.origin)) {
      return { ok: false as const, response: json({ ok: false, code: 'AUTH_REFUSED' }, 403) };
    }
    const address = await deps.sessionAddress(request);
    if (!address) return { ok: false as const, response: json({ ok: false, code: 'AUTH_REFUSED' }, 401) };
    return { ok: true as const, address };
  }
  function send(result: { ok: boolean; code?: string }, okStatus = 200) {
    if (result.ok) return json(result, okStatus);
    return json(result, STATUS[result.code ?? ''] ?? 503);
  }
  function wrap<T extends unknown[]>(
    run: (address: string, request: Request, ...rest: T) => Promise<Response>, requireOrigin = true,
  ) {
    return async (request: Request, ...rest: T) => {
      try {
        const session = await guard(request, requireOrigin);
        if (!session.ok) return session.response;
        return await run(session.address, request, ...rest);
      } catch (error) {
        return json({ ok: false, code: error instanceof SyntaxError ? 'INVALID_INPUT' : 'UNAVAILABLE' },
          error instanceof SyntaxError ? 400 : 503);
      }
    };
  }
  const withSquadId = (squadId: string) => uuid.safeParse(squadId).success;

  return {
    create: wrap(async (address, request) =>
      send(await deps.squads.create(address, await parseBody(request)), 201)),

    join: wrap(async (address, request, squadId: string) => {
      if (!withSquadId(squadId)) return json({ ok: false, code: 'INVALID_INPUT' }, 400);
      return send(await deps.squads.join(address, squadId, await parseBody(request)));
    }),

    commit: wrap(async (address, request, squadId: string) => {
      if (!withSquadId(squadId)) return json({ ok: false, code: 'INVALID_INPUT' }, 400);
      return send(await setCommitment(address, squadId, await parseBody(request), deps.commit));
    }),

    leave: wrap(async (address, request, squadId: string) => {
      if (!withSquadId(squadId)) return json({ ok: false, code: 'INVALID_INPUT' }, 400);
      // A strict empty body keeps this from becoming an accidental state carrier.
      if (!leaveInput.safeParse(await parseBody(request)).success) {
        return json({ ok: false, code: 'INVALID_INPUT' }, 400);
      }
      return send(await deps.squads.leave(address, squadId));
    }),

    recordTx: wrap(async (address, request) =>
      send(await deps.tracker.record(address, await parseBody(request)), 201)),

    checkTx: wrap(async (_address, _request, hash: string) => {
      if (!hashInput.safeParse(hash).success) return json({ ok: false, code: 'INVALID_INPUT' }, 400);
      return send(await deps.tracker.check(hash));
    }, false),
  };
}
export type SquadHandlers = ReturnType<typeof createSquadHandlers>;
