import { z } from 'zod';
import { json } from '../../../src/server/lib/auth-http';
import { nimPrice } from '../../../src/server/lib/price';

export const runtime = 'nodejs';

const query = z.object({ currency: z.string().length(3).regex(/^[A-Za-z]{3}$/) }).strict();

/**
 * PRD §9.11. The price is read here rather than in the browser so one ten-minute cache serves
 * every member and the app sends no traffic to a third party from their device. It needs no
 * session: a NIM price is public, and the request carries nothing about the caller.
 *
 * A failed read answers 503 with a code, and the screen then shows no estimate at all — there
 * is no stale-price fallback and no "approximately zero" (AGENTS.md "Never fabricate").
 */
export async function GET(request: Request) {
  const parsed = query.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  if (!parsed.success) return json({ ok: false, code: 'INVALID_INPUT' }, 400);
  try {
    const result = await nimPrice()(parsed.data.currency.toUpperCase());
    if (!result.ok) return json({ ok: false, code: result.code }, 503);
    return json({ ok: true, price: result.price }, 200);
  } catch {
    return json({ ok: false, code: 'UNAVAILABLE' }, 503);
  }
}
