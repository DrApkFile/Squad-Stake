import { json } from '../../../../src/server/lib/auth-http';
import { squadHandlers } from '../../../../src/server/lib/squads';

export const runtime = 'nodejs';
/**
 * Screen 10's data, public on purpose (ARCHITECTURE "GET /api/proof/:id"): anyone handed a
 * squad's short id can re-check every member's commitment and chain-derived status without a
 * session. No balances and no invite token cross this boundary.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return await squadHandlers().proof(request, (await params).id); }
  catch { return json({ ok: false, code: 'UNAVAILABLE' }, 503); }
}
