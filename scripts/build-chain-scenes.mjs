import { readFileSync, writeFileSync } from 'node:fs';

// UI-only projection of the testnet recording. Never use this as mainnet demo proof.
const recording = JSON.parse(readFileSync(new URL('../tests/fixtures/rpc/testnet.json', import.meta.url), 'utf8'));
writeFileSync(new URL('../packages/ui/scenes/chain-recording.json', import.meta.url), JSON.stringify({
  source: 'tests/fixtures/rpc/testnet.json', recordedAt: recording.recordedAt,
  headBlock: recording.records.head.response.result.data,
  releaseBlock: recording.records.window.response.result.data,
}, null, 2) + '\n');
