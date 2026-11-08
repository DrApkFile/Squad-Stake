import 'server-only';
import { networkConfig } from '../../config/network';
import { createRpcClient, type NimiqRpc } from './rpc';
import { serverEnv } from './env';

let client: NimiqRpc | undefined;
/**
 * One client per server process so its 60 s per-address cache survives between
 * requests (FAILURE_MODES "slow first call"). The cache is an optimisation only:
 * every decision that must be exact reads with `fresh: true`.
 */
export function nimiqRpc(): NimiqRpc {
  client ??= createRpcClient({ url: networkConfig(serverEnv().NIMIQ_NETWORK).rpcUrl });
  return client;
}
