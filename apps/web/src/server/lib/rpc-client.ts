import 'server-only';
import { createRpcClient, type NimiqRpc } from './rpc';
import { serverEnv } from './env';

const ENDPOINTS = {
  mainnet: 'https://rpc.nimiqwatch.com',
  testnet: 'https://rpc.testnet.nimiqwatch.com',
} as const;

let client: NimiqRpc | undefined;
/**
 * One client per server process so its 60 s per-address cache survives between
 * requests (FAILURE_MODES "slow first call"). The cache is an optimisation only:
 * every decision that must be exact reads with `fresh: true`.
 */
export function nimiqRpc(): NimiqRpc {
  client ??= createRpcClient({ url: ENDPOINTS[serverEnv().NIMIQ_NETWORK] });
  return client;
}
