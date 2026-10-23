import 'server-only';
import postgres from 'postgres';
import { serverEnv } from './env';

let database: ReturnType<typeof postgres> | undefined;
export function db() {
  database ??= postgres(serverEnv().DATABASE_URL, { max: 3, idle_timeout: 20, connect_timeout: 5 });
  return database;
}
