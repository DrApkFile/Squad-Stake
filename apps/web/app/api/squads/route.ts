import { json } from '../../../src/server/lib/auth-http';
import { squadHandlers } from '../../../src/server/lib/squads';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try { return await squadHandlers().create(request); }
  catch { return json({ ok: false, code: 'UNAVAILABLE' }, 503); }
}
/** Screen 3. No chain read: these are the commitments on record. */
export async function GET(request: Request) {
  try { return await squadHandlers().list(request); }
  catch { return json({ ok: false, code: 'UNAVAILABLE' }, 503); }
}
