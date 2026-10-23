import 'server-only';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:/.test(value)),
  APP_ORIGIN: z.url().refine((value) => new URL(value).origin === value),
}).strict();
export function serverEnv() {
  const result = schema.parse({ DATABASE_URL: process.env.DATABASE_URL, APP_ORIGIN: process.env.APP_ORIGIN });
  if (process.env.NODE_ENV === 'production' && !result.APP_ORIGIN.startsWith('https://')) {
    throw new Error('APP_ORIGIN must use HTTPS in production');
  }
  return result;
}
