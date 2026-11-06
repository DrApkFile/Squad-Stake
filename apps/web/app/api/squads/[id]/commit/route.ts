import { json } from '../../../../../src/server/lib/auth-http';
import { squadHandlers } from '../../../../../src/server/lib/squads';

export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return await squadHandlers().commit(request, (await params).id); }
  catch { return json({ ok: false, code: 'UNAVAILABLE' }, 503); }
}
