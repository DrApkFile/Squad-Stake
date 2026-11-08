import { json } from '../../../../src/server/lib/auth-http';
import { squadHandlers } from '../../../../src/server/lib/squads';

export const runtime = 'nodejs';
/** PRD §7.5: leave-by, the member's own stake, the release estimate and the jail warning. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return await squadHandlers().plan(request, (await params).id); }
  catch { return json({ ok: false, code: 'UNAVAILABLE' }, 503); }
}
