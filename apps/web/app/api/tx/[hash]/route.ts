import { json } from '../../../../src/server/lib/auth-http';
import { squadHandlers } from '../../../../src/server/lib/squads';

export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ hash: string }> }) {
  try { return await squadHandlers().checkTx(request, (await params).hash); }
  catch { return json({ ok: false, code: 'UNAVAILABLE' }, 503); }
}
