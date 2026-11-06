import type { ReleaseRpc, RpcFailure, Validator } from './chain';

export function blocksToMilliseconds(blocks: number): number {
  return blocks * 1000;
}

interface ReleaseInput { inclusionBlock: number; headBlock: number; validator: Pick<Validator, 'jailedFrom'> | null }
type ReleaseResult = RpcFailure | {
  ok: true; releaseBlock: number; remainingBlocks: number; estimatedReleaseAt: number; jailed: boolean;
};

export async function calculateRelease(
  input: ReleaseInput, { rpc, now }: { rpc: ReleaseRpc; now: () => number },
): Promise<ReleaseResult> {
  // PRD §7.5 / S3 v3: b is the inactivation inclusion block, NOT inactiveFrom
  // (which already denotes the effective election block). Never count from now.
  const election = await rpc.getElectionBlockAfter(input.inclusionBlock);
  if (!election.ok) return election;
  const window = await rpc.getBlockAfterReportingWindow(election.data);
  if (!window.ok) return window;
  let releaseBlock = window.data;
  const jailedFrom = input.validator?.jailedFrom;
  const jailed = jailedFrom !== null && jailedFrom !== undefined;
  if (jailed) {
    const jail = await rpc.getBlockAfterJail(jailedFrom);
    if (!jail.ok) return jail;
    releaseBlock = Math.max(releaseBlock, jail.data);
  }
  const remainingBlocks = Math.max(0, releaseBlock - input.headBlock);
  // S1/S3: approximate only; head >= releaseBlock remains the actual permission.
  return { ok: true, releaseBlock, remainingBlocks,
    estimatedReleaseAt: now() + blocksToMilliseconds(remainingBlocks), jailed };
}
