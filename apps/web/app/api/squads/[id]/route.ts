import { json } from '../../../../src/server/lib/auth-http';
import { squadHandlers } from '../../../../src/server/lib/squads';

export const runtime = 'nodejs';
/** PRD §7.4: every member's commitment, chain-derived status and the time of that read. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return await squadHandlers().detail(request, (await params).id); }
  catch { return json({ ok: false, code: 'UNAVAILABLE' }, 503); }
}
