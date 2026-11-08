/**
 * Every value that differs between mainnet and testnet, in one place, keyed by the one
 * variable that decides which chain this deployment is on: `NEXT_PUBLIC_NIMIQ_NETWORK`
 * (README "Deploy" runs a mainnet copy and a testnet copy of this same repo from two
 * Vercel projects, each with its own value here and its own Neon branch).
 *
 * Nothing in the app may hardcode a network: a testnet URL left in a mainnet build would
 * show a member the wrong chain's answer and call it proof. This module is safe to import
 * from client and server code alike — it reads only the public variable and no secrets.
 */
export const NETWORKS = ['mainnet', 'testnet'] as const;
export type NimiqNetwork = (typeof NETWORKS)[number];

export interface NetworkConfig {
  /** The public RPC node every chain read goes through, and the one the proof view prints
   * so a reader can repeat the call themselves (briefing/PROOF_PLAN.md). */
  rpcUrl: string;
  /** Explorer base for a transaction hash, used for links the member can check. */
  explorerBase: string;
  /**
   * Nimiq's own Validators API (PRD §7.7). Both hosts are the ones its README names:
   * github.com/nimiq/validators-api README lines 22–23 and 111–117 ("Mainnet", "Testnet",
   * `/api/v1/validators`), read 2026-11-08.
   */
  validatorsApi: string;
}

const CONFIG: Record<NimiqNetwork, NetworkConfig> = {
  mainnet: {
    rpcUrl: 'https://rpc.nimiqwatch.com',
    explorerBase: 'https://nimiq.watch/#',
    validatorsApi: 'https://validators-api-main.je-cf9.workers.dev/api/v1/validators',
  },
  testnet: {
    rpcUrl: 'https://rpc.testnet.nimiqwatch.com',
    explorerBase: 'https://test.nimiq.watch/#',
    validatorsApi: 'https://validators-api-test.je-cf9.workers.dev/api/v1/validators',
  },
};

export const isNetwork = (value: unknown): value is NimiqNetwork =>
  typeof value === 'string' && (NETWORKS as readonly string[]).includes(value);

/** Defaults to testnet, so an unset or misspelt variable can never point at mainnet
 * (the same rule as `serverEnv()`). */
export function networkConfig(network: string | undefined): NetworkConfig {
  return CONFIG[isNetwork(network) ? network : 'testnet'];
}
