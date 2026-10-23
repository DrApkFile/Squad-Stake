import { z } from 'zod';

export const challengeInput = z.object({}).strict();
export const verifyInput = z.object({
  id: z.uuid(),
  publicKey: z.string().regex(/^[a-f\d]{64}$/i),
  signature: z.string().regex(/^[a-f\d]{128}$/i),
}).strict();
export type VerifyInput = z.infer<typeof verifyInput>;
export const challengeResponse = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), id: z.uuid(), message: z.string(), expiresAt: z.number() }).strict(),
  z.object({ ok: z.literal(false), code: z.string() }).strict(),
]);
export const verifyResponse = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), address: z.string(), expiresAt: z.number() }).strict(),
  z.object({ ok: z.literal(false), code: z.string() }).strict(),
]);
