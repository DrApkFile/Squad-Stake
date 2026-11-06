import 'server-only';
import { z } from 'zod';

export const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const blockNumber = integer.max(0xffff_ffff);
export const addressSchema = z.string().regex(/^NQ\d{2}(?: [A-Z0-9]{4}){8}$/);
export const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const hex = z.string().regex(/^(?:[a-f0-9]{2})*$/);
export const chainMetadataSchema = z.object({ blockNumber, blockHash: hashSchema }).strict();
export const stakerSchema = z.object({
  address: addressSchema, balance: integer, delegation: addressSchema.nullable(),
  inactiveBalance: integer, inactiveFrom: blockNumber.nullable(), retiredBalance: integer,
}).strict();

/* Confirmed from rpc-interface/src/types.rs (read 2026-10-23):
 * https://github.com/nimiq/core-rs-albatross/blob/master/rpc-interface/src/types.rs#L954-L967
 * #[derive(Clone, Debug, Serialize, Deserialize)]
 * #[serde(rename_all = "camelCase")]
 * pub struct Validator {
 *     pub address: Address,
 *     pub signing_key: Ed25519PublicKey,
 *     pub voting_key: CompressedPublicKey,
 *     pub reward_address: Address,
 *     pub signal_data: Option<Blake2bHash>,
 *     pub balance: Coin,
 *     pub num_stakers: u64,
 *     pub inactivity_flag: Option<u32>,
 *     pub retired: bool,
 *     pub jailed_from: Option<u32>,
 * }
 * The wire names are inactivityFlag and jailedFrom, not inactiveFrom/isJailed.
 */
export const validatorSchema = z.object({
  address: addressSchema, signingKey: hex.length(64), votingKey: hex.length(570),
  rewardAddress: addressSchema, signalData: hashSchema.nullable(), balance: integer,
  numStakers: integer, inactivityFlag: blockNumber.nullable(), retired: z.boolean(),
  jailedFrom: blockNumber.nullable(),
}).strict();

// ExecutedTransaction flattens Transaction; executionResult must survive parsing (NimJar, S7).
export const transactionSchema = z.object({
  hash: hashSchema, blockNumber: blockNumber.optional(), timestamp: integer.optional(),
  confirmations: blockNumber.optional(), size: integer, relatedAddresses: z.array(addressSchema),
  from: addressSchema, fromType: integer.max(255), to: addressSchema, toType: integer.max(255),
  value: integer, fee: integer, senderData: hex, recipientData: hex, flags: integer.max(255),
  validityStartHeight: blockNumber, proof: hex, networkId: integer.max(255), executionResult: z.boolean(),
}).strict();

/* blockchain.rs (read 2026-11-06):
 * https://github.com/nimiq/core-rs-albatross/blob/master/rpc-interface/src/blockchain.rs#L116-L121
 * async fn get_transactions_by_address(
 *     &self,
 *     address: Address,
 *     max: Option<u16>,
 *     start_at: Option<Blake2bHash>,
 * ) -> RPCResult<Vec<ExecutedTransaction>, (), Self::Error>;
 * `max` is a u16 defaulting to 500; the result carries no chain metadata.
 */
export const transactionCount = z.number().int().min(1).max(0xffff);
export const transactionsSchema = z.array(transactionSchema);

export type Staker = z.infer<typeof stakerSchema>;
export type Validator = z.infer<typeof validatorSchema>;
export type ChainTransaction = z.infer<typeof transactionSchema>;
export type ChainTransactions = z.infer<typeof transactionsSchema>;
export type ChainMetadata = z.infer<typeof chainMetadataSchema>;
