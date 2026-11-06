import { json } from '../../../src/server/lib/auth-http';
import { squadHandlers } from '../../../src/server/lib/squads';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try { return await squadHandlers().recordTx(request); }
  catch { return json({ ok: false, code: 'UNAVAILABLE' }, 503); }
}
