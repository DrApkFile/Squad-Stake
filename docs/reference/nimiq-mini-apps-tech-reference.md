# Nimiq Pay Mini Apps — Complete Technical Reference

A build-oriented reference for the Nimiq Mini Apps Framework: the runtime model, both
injected providers, every method with parameters/returns/confirmation behaviour, host
APIs, EVM/ERC-20 patterns, the local dev loop, error handling, coding rules, and
anti-patterns.

Source: the Nimiq Developer Center `mini-apps` documentation set and the official
`mini-apps` agent skill (`nimiq/developer-center`). Raw markdown of any page is served at
`https://nimiq.dev/raw/<path>.md`.

---

## Table of contents

1. [Runtime model](#1-runtime-model)
2. [Versions and compatibility](#2-versions-and-compatibility)
3. [Project setup](#3-project-setup)
4. [Provider initialization](#4-provider-initialization)
5. [Nimiq Provider API](#5-nimiq-provider-api)
6. [Error handling (`NimiqProviderError`)](#6-error-handling-nimiqprovidererror)
7. [Ethereum Provider API](#7-ethereum-provider-api)
8. [Chains and tokens](#8-chains-and-tokens)
9. [ERC-20 patterns](#9-erc-20-patterns)
10. [Bitcoin Lightning payments](#10-bitcoin-lightning-payments)
11. [Host APIs: language, network, fullscreen, device identifier](#11-host-apis)
12. [Local development and testing](#12-local-development-and-testing)
13. [Backends, external APIs, CORS](#13-backends-external-apis-cors)
14. [Deployment and deeplinks](#14-deployment-and-deeplinks)
15. [Coding rules](#15-coding-rules)
16. [Anti-patterns](#16-anti-patterns)
17. [Gotchas and footguns](#17-gotchas-and-footguns)
18. [Pre-ship technical checklist](#18-pre-ship-technical-checklist)
19. [Reference implementations and links](#19-reference-implementations-and-links)

---

## 1. Runtime model

A mini app is an ordinary web application (HTML/JS/CSS) loaded by the Nimiq Pay mobile app
inside a **WebView**. Nimiq Pay behaves like a specialized embedded browser that injects
wallet providers into the page.

What makes it a *mini app* rather than just a page in a WebView is **provider
integration**: it must use the Nimiq provider, the Ethereum provider, or both for at least
one interaction. Everything else about the stack is free — any framework, any backend, any
external API.

### Components

| Component | Lives in | Responsibility |
|---|---|---|
| Injected provider (`window.ethereum`, Nimiq provider) | WebView, injected by Nimiq Pay | Exposes wallet APIs, forwards requests to the host |
| Host-side API | Nimiq Pay (native) | Receives, validates, shows approval dialogs, executes |
| Mini App SDK (`@nimiq/mini-app-sdk`) | Your bundle | Waits for the Nimiq provider, typed access, Nimiq-native helpers |

### Request lifecycle

1. The mini app calls a provider method (e.g. request accounts, sign a message).
2. The injected provider forwards a message to the Nimiq Pay app.
3. Nimiq Pay validates the request and shows a native confirmation dialog (when required).
4. On approval, Nimiq Pay performs the wallet operation. **Private keys never leave the wallet.**
5. The result returns to the mini app through the provider.

### Security boundary

- Sandboxed WebView: no access to the wallet's internal state or private keys.
- Mini apps can only *request*; the host decides and always involves the user for sensitive actions.
- Native approval dialogs cannot be bypassed or suppressed by the page.
- Wallet-related requests are mediated by Nimiq Pay; other RPC calls go to the configured
  endpoint or the mini app's own RPC.

---

## 2. Versions and compatibility

| Capability | Requirement |
|---|---|
| Nimiq provider via `init()` | `@nimiq/mini-app-sdk` (any) |
| Normalized wallet errors, `NimiqProviderError` export | SDK **0.2.0**+ |
| `getBalance(address)` | SDK **0.2.1**+ **and** a Nimiq Pay version that exposes it |
| Fullscreen helpers (`requestFullscreen`, `exitFullscreen`, `getFullscreen`, `onFullscreenChange`) | SDK **0.2.3**+ |
| `getHostNetwork()` and the `Network` type | SDK **0.2.4**+ |
| Node.js for the dev tooling | **22+** |

Updating the SDK does **not** add host capabilities to an older Nimiq Pay install. For
anything host-dependent, feature-detect at runtime and degrade gracefully:

```ts
const nimiq = await init()

if (typeof nimiq.getBalance !== 'function') {
  // Ask the user to update Nimiq Pay; keep the rest of the UI working.
}
```

---

## 3. Project setup

Any web framework works (Vue, React, Svelte, Angular, Solid, plain HTML…). The official
tutorials use Vite.

```bash
# Vue + TypeScript
npm create vite@latest my-mini-app -- --template vue-ts

# React
npm create vite@latest my-mini-app -- --template react

# Svelte
npm create vite@latest my-mini-app -- --template svelte

cd my-mini-app
npm install
```

Install the SDK (needed only for the Nimiq provider):

```bash
npm install @nimiq/mini-app-sdk     # or pnpm add / yarn add / bun add
```

Install an EVM library if you touch ERC-20 tokens or any contract ABI:

```bash
npm install viem                     # or ethers, or wagmi
```

### Dev server config (required for on-device testing)

The phone must reach your machine over the LAN, so bind to all interfaces:

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: true, // bind 0.0.0.0 so the phone can connect
  },
})
```

Docker + HMR over LAN: the HMR client otherwise advertises container-internal addresses
the phone cannot reach, and HMR fails silently.

```ts
const hmrHost = process.env.VITE_HMR_HOST

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    hmr: hmrHost ? { host: hmrHost, protocol: 'ws', clientPort: 5173 } : undefined,
  },
})
```

```bash
VITE_HMR_HOST=<your-LAN-IP> npm run dev -- --host
```

---

## 4. Provider initialization

### Nimiq provider — always via `init()`

`init()` waits until Nimiq Pay has injected the provider and returns the typed provider.
This is the only supported access path. Accept an optional `timeout`.

```ts
import { init } from '@nimiq/mini-app-sdk'

const nimiq = await init({ timeout: 10_000 })

const [accounts, consensus, blockNumber] = await Promise.all([
  nimiq.listAccounts(),
  nimiq.isConsensusEstablished(),
  nimiq.getBlockNumber(),
])
```

`init()` throws an ordinary `Error` (not a `NimiqProviderError`) when provider injection
times out — which is exactly what happens when the app is opened in a normal browser.
Keep the promise around and reuse it; do not call `init()` per interaction.

Framework-agnostic pattern: initialize once on mount, store the promise, await it inside
handlers.

```ts
// Vue
import { init } from '@nimiq/mini-app-sdk'
import { onMounted, ref } from 'vue'

let nimiqPromise: ReturnType<typeof init> | null = null
const isConnecting = ref(true)
const isReady = ref(false)
const errorMessage = ref<string | null>(null)

onMounted(async () => {
  try {
    nimiqPromise = init({ timeout: 10_000 })
    await nimiqPromise
    isReady.value = true
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    isConnecting.value = false
  }
})

async function onAction() {
  if (!nimiqPromise)
    return
  const nimiq = await nimiqPromise
  // ... use nimiq
}
```

```jsx
// React — guard against double-invoke / unmount with an `ignore` flag
useEffect(() => {
  let ignore = false
  async function connect() {
    try {
      nimiqPromiseRef.current = init({ timeout: 10000 })
      await nimiqPromiseRef.current
      if (!ignore)
        setIsReady(true)
    }
    catch (error) {
      if (!ignore)
        setErrorMessage(error instanceof Error ? error.message : String(error))
    }
    finally {
      if (!ignore)
        setIsConnecting(false)
    }
  }
  connect()
  return () => { ignore = true }
}, [])
```

### Ethereum provider — feature-detect `window.ethereum`

No SDK, no injection wait helper. Standard EIP-1193.

```ts
const provider = window.ethereum
if (!provider) {
  // Not inside Nimiq Pay (or no EVM provider): show a clear message,
  // keep every non-wallet feature usable.
}
```

TypeScript shim when you don't pull in a full EVM library's types:

```ts
interface EthereumProvider {
  request: (args: { method: string, params?: unknown[] | Record<string, unknown> }) => Promise<any>
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}
```

### UI states to implement

Three distinct states, all required:

1. **Connecting** — `init()` pending: "Waiting for Nimiq Pay to initialize the provider…"
2. **Unavailable** — init failed / no `window.ethereum`: "Open this mini app inside Nimiq Pay."
3. **Ready** — enable wallet-dependent controls.

---

## 5. Nimiq Provider API

Accessed through the provider returned by `init()`. **1 NIM = 100,000 Luna**; all amounts
are integers in Luna.

### Method summary

| Method | Parameters | Returns | Confirmation |
|---|---|---|---|
| `listAccounts()` | none | `string[]` (user-friendly addresses) | yes, unless cached |
| `getBalance(address)` | `address: string` | `number` (Luna) | no |
| `sign(message)` | `string` or `{ message: string, isHex?: boolean }` | `{ publicKey: string, signature: string }` (hex) | yes |
| `isConsensusEstablished()` | none | `boolean` | no |
| `getBlockNumber()` | none | `number` | no |
| `sendBasicTransaction({ recipient, value, fee?, validityStartHeight? })` | see below | `string` (tx hash) | yes |
| `sendBasicTransactionWithData({ recipient, value, data, fee?, validityStartHeight? })` | see below | `string` (tx hash) | yes |
| `payLightningInvoice({ invoice })` | `invoice: string` | `{ hash: string, swapId: string }` | yes |
| `sendNewStakerTransaction({ delegation, value, fee?, validityStartHeight? })` | `delegation: string`, `value: number` | `string` | yes |
| `sendStakeTransaction({ value, fee?, validityStartHeight? })` | `value: number` | `string` | yes |
| `sendSetActiveStakeTransaction({ newActiveBalance, fee?, validityStartHeight? })` | `newActiveBalance: number` | `string` | yes |
| `sendUpdateStakerTransaction({ newDelegation, reactivateAllStake?, fee?, validityStartHeight? })` | `newDelegation: string`, `reactivateAllStake?: boolean` | `string` | yes |
| `sendRetireStakeTransaction({ retireStake, fee?, validityStartHeight? })` | `retireStake: number` | `string` | yes |
| `sendRemoveStakeTransaction({ value, fee?, validityStartHeight? })` | `value: number` | `string` | yes |
| `disconnect()` | none | `void` | no |
| `setRPCUrl(rpcUrl)` | `rpcUrl: string` | `void` | no |
| `request(args)` | `{ method: string, params?: unknown[] \| object }` | `unknown` | yes for wallet methods |

Common transaction fields:

- `recipient` (string, required) — Nimiq user-friendly address.
- `value` (number, required) — amount in Luna.
- `fee` (number, optional) — fee in Luna. Omit it: Nimiq Pay picks a fee automatically, using 0 when possible.
- `validityStartHeight` (number, optional) — block height from which the transaction becomes valid.
- `data` (string, required for `sendBasicTransactionWithData`) — **public on-chain** text message.

### Accounts and signing semantics

**Nimiq Pay chooses the account that signs and pays.** `sign()` takes no address and the
transaction methods take no sender. Letting the user pick an address in your UI does not
change the wallet's signer — do not build flows that depend on it.

- `listAccounts()` *shares* addresses. It does **not** prove ownership. Use `sign()` plus
  server-side verification for proof of identity.
- The returned order is not defined as a signer-selection rule.
- The provider **caches** the addresses from `listAccounts()`; later calls return the cache
  without a dialog until `disconnect()` clears it.
- **There is no documented `accountsChanged` event for Nimiq.** Do not copy Ethereum's
  account-change handling and assume it works here.

```ts
const accounts = await nimiq.listAccounts()
const { publicKey, signature } = await nimiq.sign('hello')
// Verify the signature (with publicKey) before treating it as proof of identity.
```

### `getBalance(address)`

Reads the on-chain balance of **any** valid Nimiq address through Nimiq Pay's own client on
its active network. No account approval, no ownership check, no transaction listener, and no
prior `listAccounts()` call. Requires SDK 0.2.1+ and a host that exposes it.

```ts
import { NimiqProviderError, init } from '@nimiq/mini-app-sdk'

const nimiq = await init()

if (typeof nimiq.getBalance !== 'function') {
  console.info('Update Nimiq Pay to look up balances.')
}
else {
  try {
    const balanceLuna = await nimiq.getBalance('NQ07 0000 0000 0000 0000 0000 0000 0000 0000')
    console.log({ balanceLuna, balanceNim: balanceLuna / 100_000 })
  }
  catch (error) {
    if (NimiqProviderError.is(error))
      console.error(error.type, error.message, error.code)
    else
      throw error
  }
}
```

Equivalent generic form on a supported host:

```ts
const balanceLuna = await nimiq.request({
  method: 'getBalance',
  params: { address: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000' },
})
```

Semantics:

- Returns `Promise<number>` in **Luna**. `0` means a *successful* lookup of zero. Failures
  **reject**; they never return `0`.
- It is the balance of the supplied address, not a wallet total.
- Contract balances (HTLC, vesting) are **not necessarily spendable** — their spending
  conditions still apply.
- Errors: `INVALID_REQUEST` (`-32602`) for a missing/invalid address; `NETWORK_ERROR`
  (`-32000`) for unavailable client, no consensus, lookup failure, or a 30-second timeout.
- Uses the native bridge: no external RPC endpoint, and `setRPCUrl()` does not affect it.

### Payments

```ts
const txHash = await nimiq.sendBasicTransaction({
  recipient: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
  value: 100000,            // 1 NIM
  // fee: 1000,             // optional; Nimiq Pay picks automatically, 0 when possible
  // validityStartHeight: 123456,
})

const txHash2 = await nimiq.sendBasicTransactionWithData({
  recipient: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
  value: 100000,
  data: 'order #42',        // public on-chain
})
```

**A returned hash identifies the transaction; it does not prove successful execution or
finality.** Verify on your backend (details, execution result, finality) before granting
access or shipping goods. Use the Nimiq RPC methods for transaction queries.

### Staking

All six staking methods require confirmation and return a tx hash, with the same optional
`fee` / `validityStartHeight` fields:

```ts
await nimiq.sendNewStakerTransaction({ delegation: 'NQ07 …', value: 100000 })
await nimiq.sendStakeTransaction({ value: 100000 })
await nimiq.sendSetActiveStakeTransaction({ newActiveBalance: 100000 })
await nimiq.sendUpdateStakerTransaction({ newDelegation: 'NQ07 …', reactivateAllStake: true })
await nimiq.sendRetireStakeTransaction({ retireStake: 100000 })
await nimiq.sendRemoveStakeTransaction({ value: 100000 })
```

### `disconnect()`

Clears the provider's cached account list and emits a `disconnect` event. The next
`listAccounts()` requests addresses again, possibly opening a dialog.

It does **not** revoke Nimiq Pay permissions and does **not** end your backend session. If
your app has its own session, tear it down yourself.

### `setRPCUrl()` and `request()`

`setRPCUrl(rpcUrl)` sets the external Nimiq JSON-RPC endpoint used by `request()` for
queries that have no dedicated provider method. It does **not** switch the Nimiq Pay
network.

- The endpoint must be on the same network as Nimiq Pay.
- It must allow your mini app's origin via CORS.
- Keep private RPC credentials on your backend, never in the bundle.

```ts
nimiq.setRPCUrl('https://your-nimiq-rpc.example')

const result = await nimiq.request({
  method: 'getTransactionByHash',
  params: ['TRANSACTION_HASH'],
})
```

Routing: wallet methods, `nim_requestAccounts` and `nim_isConsensusEstablished` go to
Nimiq Pay (dialog where applicable); everything else goes to the `setRPCUrl()` endpoint
(no dialog). For RPC queries the return value is the response's `result.data`, with the
JSON-RPC envelope stripped. A TypeScript result type does **not** validate the response at
runtime — validate it yourself.

---

## 6. Error handling (`NimiqProviderError`)

With SDK **0.2.0**+, the provider returned by `init()` **rejects** with a
`NimiqProviderError` for recognized wallet errors. This covers `connect()`,
`listAccounts()`, `sign()`, every `send*Transaction()`, `payLightningInvoice()`, and
`request()` calls for wallet methods including `nim_requestAccounts`.

Not covered (original behaviour preserved): `init()` injection timeout (plain `Error`),
status methods (`isConsensusEstablished()`, `getBlockNumber()`), external RPC queries, and
direct `window.nimiq` access.

`connect()` requests accounts like `listAccounts()` but resolves without returning them.

### Shape

`NimiqProviderError extends Error` with `name: 'NimiqProviderError'`, a string `type`, a
`message`, an optional numeric `code`, and (for Lightning) an optional `data`.

Use `NimiqProviderError.is(error)` — it works across package and host bundle boundaries,
unlike `instanceof`.

```ts
import { NimiqProviderError, init } from '@nimiq/mini-app-sdk'

try {
  const nimiq = await init()
  const accounts = await nimiq.listAccounts()
  console.log(accounts)
}
catch (error) {
  if (!NimiqProviderError.is(error)) {
    console.error(error) // e.g. init() timeout
  }
  else if (error.type === 'PERMISSION_DENIED') {
    console.info('Request canceled by the user.') // normal outcome
  }
  else {
    console.error(error.type, error.message, error.code)
  }
}
```

### Types

| Type | Fallback RPC code | Handling |
|---|---|---|
| `PERMISSION_DENIED` | `4001` | Cancellation is a **normal** outcome. Keep the screen usable and retryable. |
| `UNKNOWN_REQUEST` | `4200` | The host does not support this request — say so. |
| `INVALID_TRANSACTION` | `-32602` | Show the error; check parameters before resending. |
| `INVALID_REQUEST` | `-32602` | Invalid input (e.g. malformed address in `getBalance`). |
| `NETWORK_ERROR` | `-32000` | Connection/submission problem; check payment status before any resend. |
| `INTERNAL_ERROR` | `-32603` | The wallet could not complete the request. |
| `DUPLICATE_PAYMENT` | — | Lightning: already submitted or possibly pending. Do not resubmit. |
| `TRANSACTION_OUTCOME_UNKNOWN` | — | Lightning: submission may have happened. Do not retry the same invoice. |
| `UNKNOWN_ERROR` | any unmapped numeric code | Handle the failure without assuming a cause. |

**Handle unlisted types too.** The SDK preserves an explicit host-supplied `type` and only
applies the mapping above when the host supplies a numeric code and message without a type.
Always keep a default branch.

### Migrating from SDK 0.1.0

- Replace resolved `{ error }` checks with `try` / `catch`.
- Legacy `{ error: { type, message } }` responses are converted to `NimiqProviderError`,
  which may then have **no** `code` — don't switch on `code` alone.
- Successful calls return their success value directly.

### Ethereum-side errors

The Ethereum provider uses EIP-1193 codes — notably `4001` for user rejection and `4902`
for "chain not configured" from `wallet_switchEthereumChain`. Treat cancellation as normal.

---

## 7. Ethereum Provider API

`window.ethereum`, implementing **EIP-1193**, with **EIP-6963** provider discovery. No SDK
required. Because Nimiq Pay is EIP-6963 compatible, discovery libraries (wagmi, RainbowKit,
etc.) detect it automatically — you never announce the provider manually.

### Wallet methods (user confirmation required)

| Method | Parameters | Returns |
|---|---|---|
| `eth_requestAccounts` (alias `requestAccounts`) | none | `string[]` |
| `personal_sign` (alias `signPersonalMessage`) | `data` (plain text or 0x-hex), `address` | `string` hex signature |
| `eth_signTypedData_v4` | `address`, `typedData` (JSON string with `domain`, `types`, `primaryType`, `message`) | `string` hex signature |
| `eth_sendTransaction` | `{ from, to, value?, data?, gas? }` (hex-encoded values) | `string` tx hash |
| `wallet_switchEthereumChain` (alias `switchEthereumChain`) | `{ chainId }` hex | `null`; error `4902` if not configured |
| `wallet_addEthereumChain` (alias `addEthereumChain`) | `{ chainId, chainName, rpcUrls, nativeCurrency?, blockExplorerUrls? }` | `null` |

```js
const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })

const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: ['hello', accounts[0]],
})

const typed = await window.ethereum.request({
  method: 'eth_signTypedData_v4',
  params: [
    accounts[0],
    JSON.stringify({
      domain: { name: 'My App', version: '1', chainId: 137 }, // numeric here, by design
      types: { Message: [{ name: 'content', type: 'string' }] },
      primaryType: 'Message',
      message: { content: 'Hello' },
    }),
  ],
})

const txHash = await window.ethereum.request({
  method: 'eth_sendTransaction',
  params: [{ from: accounts[0], to: '0x…', value: '0x0', data: '0x' }],
})

await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x89' }], // Polygon
})

await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x89',
    chainName: 'Polygon',
    rpcUrls: ['https://polygon-bor-rpc.publicnode.com'],
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorerUrls: ['https://polygonscan.com'],
  }],
})
```

**Signing choice:** prefer `eth_signTypedData_v4` (EIP-712) for anything structured —
permits, order approvals, login challenges — because the user sees a readable breakdown
instead of an opaque hash. Use `personal_sign` only for plain text with no structure worth
showing.

### Read-only methods (no confirmation)

Routed through `rpcCall`: `eth_chainId`, `eth_accounts`, `eth_getBalance`, `eth_call`,
`eth_estimateGas`, `eth_gasPrice`, `eth_getTransactionCount`, `eth_getTransactionReceipt`,
`eth_blockNumber`, `eth_getBlockByNumber`, `eth_getLogs`, `net_version`.

```js
const chainId = await window.ethereum.request({ method: 'eth_chainId' })          // hex
const accounts = await window.ethereum.request({ method: 'eth_accounts' })        // [] if not connected
const balance = await window.ethereum.request({
  method: 'eth_getBalance',
  params: ['0x…', 'latest'],
})
const receipt = await window.ethereum.request({
  method: 'eth_getTransactionReceipt',
  params: ['0x…'],
}) // null until mined
const logs = await window.ethereum.request({ method: 'eth_getLogs', params: [{ fromBlock: 'latest' }] })
const networkId = await window.ethereum.request({ method: 'net_version' })        // decimal
```

### `rpcCall` (host-proxied JSON-RPC)

For methods outside the standard list. Use sparingly; prefer the typed methods.

```js
const response = await window.ethereum.request({
  method: 'rpcCall',
  params: {
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    payload: { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] },
  },
})
```

### Library compatibility

Anything that accepts an EIP-1193 provider works:

- **viem** — `encodeFunctionData`, `formatUnits`, `parseUnits`, custom transport.
- **ethers.js** — `BrowserProvider` wrapping `window.ethereum`, `Contract` with an ERC-20 ABI.
- **wagmi** — `useSendTransaction`, `useReadContract` with the injected/EIP-6963 connector.

---

## 8. Chains and tokens

### Supported EVM chains

| Chain | Chain ID (hex) | Chain ID (decimal) |
|---|---|---|
| Ethereum Mainnet | `0x1` | 1 |
| Polygon | `0x89` | 137 |
| Arbitrum One | `0xa4b1` | 42161 |
| Optimism | `0xa` | 10 |
| Base | `0x2105` | 8453 |
| BNB Smart Chain | `0x38` | 56 |
| Sepolia (testnet) | `0xaa36a7` | 11155111 |

Any EVM chain the RPC provider supports can be added over time via configuration; you can
also add one yourself with `wallet_addEthereumChain`. Sepolia is for development only — do
not ship user-facing flows that transact on it.

Nimiq itself is supported natively (NIM payments, signing, staking, consensus/block state).

### One address across all EVM chains

Nimiq Pay derives the EVM wallet from the user's entropy, and **the same address is used on
every EVM chain**. There is no separate "Polygon address" or "Arbitrum address"; what
changes is the active chain and the token contract you call.

Three layers: **provider** (`window.ethereum`) → **chain** (e.g. Polygon `0x89`) → **token**
(a contract on that chain).

### USDT contract addresses

| Chain | Address | Decimals |
|---|---|---|
| Polygon | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` | 6 |
| Ethereum | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | 6 |
| Arbitrum One | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` | 6 |
| Optimism | `0x94b008aA00579c1307B0EF2c499aD98a8ce58e58` | 6 |

**USDT and USDC use 6 decimals, not 18.** Always use the token's real `decimals`. A balance
of 1 USDT formatted with 18 decimals renders as `0.000000000001`.

Broader token list: `https://github.com/Albermonte/evm-mini-wallet/blob/main/src/utils/well-known-tokens.ts`

---

## 9. ERC-20 patterns

The pattern is always: **switch to the right chain → call the token contract** (`eth_call`
for reads, `eth_sendTransaction` for writes), with ABI encoding done by a library.

### Connect

```js
const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
const userAddress = accounts[0] // valid on every EVM chain
```

### Switch chain

```js
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x89' }],
})
// Handle error 4902 → chain not configured → wallet_addEthereumChain
```

### Read a balance (`balanceOf`)

```ts
import { encodeFunctionData, formatUnits } from 'viem'

const USDT_ADDRESS = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' // Polygon

const data = encodeFunctionData({
  abi: [{
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  }],
  functionName: 'balanceOf',
  args: [userAddress],
})

const rawBalance = await window.ethereum.request({
  method: 'eth_call',
  params: [{ to: USDT_ADDRESS, data }, 'latest'],
})

const balance = formatUnits(BigInt(rawBalance), 6) // USDT: 6 decimals
```

### Send a transfer

```ts
import { encodeFunctionData, parseUnits } from 'viem'

const data = encodeFunctionData({
  abi: [{
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  }],
  functionName: 'transfer',
  args: ['0xRecipient…', parseUnits('10', 6)], // 10 USDT
})

const txHash = await window.ethereum.request({
  method: 'eth_sendTransaction',
  params: [{
    from: userAddress,
    to: USDT_ADDRESS, // the TOKEN CONTRACT, not the recipient
    data,
    value: '0x0',     // no native value: this is a contract call
  }],
})
```

Two things that trip people up:

1. `to` is the **token contract address**. The recipient lives inside `data` as a `transfer`
   argument.
2. `value` is `0x0` because no native token is being moved.

### Gas

Mini-app ERC-20 sends go through `window.ethereum` under **standard EVM gas rules** — there
is no gas abstraction like Nimiq Pay's native USDT sending. **The user must hold the chain's
native token** (POL on Polygon, ETH on Ethereum/Arbitrum/Optimism/Base, BNB on BSC) or the
transaction fails. Check and surface this before letting the user try.

---

## 10. Bitcoin Lightning payments

`payLightningInvoice()` pays a Bitcoin Lightning invoice from the mini app: the user spends
**NIM or USDT (on Polygon)**, and the merchant receives BTC over Lightning via a
self-custodial atomic swap performed by Nimiq Pay.

```ts
import { init } from '@nimiq/mini-app-sdk'

const nimiq = await init()
const { hash, swapId } = await nimiq.payLightningInvoice({ invoice: merchantInvoice })
```

- `invoice` must be a **fixed-amount BOLT11** invoice or a **fixed-amount LNURL**, matching
  the network currently selected in Nimiq Pay.
- Nimiq Pay asks for access to check this wallet's Lightning invoice history, lets the user
  choose the spending asset, shows swap amount and fees, and asks for final approval. The
  mini app does **not** choose the asset and does **not** submit a transaction itself.
- `hash` is the submitted NIM or Polygon transaction; `swapId` identifies the swap.
  **Resolution means submitted, not settled** — keep the payment pending until your merchant
  backend confirms Lightning settlement.

### Duplicates and uncertain outcomes

An invoice cannot be submitted again while an earlier attempt is recorded — including an
invoice resolved from the same LNURL.

```ts
import { NimiqProviderError } from '@nimiq/mini-app-sdk'

try {
  const result = await nimiq.payLightningInvoice({ invoice: merchantInvoice })
  console.log('Payment submitted:', result.hash, result.swapId)
}
catch (error) {
  if (NimiqProviderError.is(error)
    && (error.type === 'DUPLICATE_PAYMENT' || error.type === 'TRANSACTION_OUTCOME_UNKNOWN')) {
    console.warn('Check merchant payment status before another attempt', error.data)
  }
  else {
    throw error
  }
}
```

- `DUPLICATE_PAYMENT` — already submitted or possibly still pending.
- `TRANSACTION_OUTCOME_UNKNOWN` — submission may have occurred. **Never auto-retry the same
  invoice.**
- `error.data` may carry `hash` and `swapId` when known. Duplicate identifiers are disclosed
  only to the same mini app and wallet that made the earlier attempt.
- Other possible types: `PERMISSION_DENIED` (history access, asset choice or approval
  declined), `INVALID_REQUEST` / `INVALID_TRANSACTION` (invoice or quote invalid, expired,
  unusable).

---

## 11. Host APIs

Non-wallet capabilities exposed by Nimiq Pay on `window.nimiqPay`, with SDK helpers for
most. `window.nimiqPay` is `undefined` outside Nimiq Pay — **always use optional chaining**.

### 11.1 User language

`window.nimiqPay.language` — read-only **ISO 639-1** two-letter code, injected **before page
scripts run**, so it is safe to read during initialization. Static for the session; a
language change in Nimiq Pay is picked up the next time the mini app opens.

Nimiq Pay currently supports `en`, `es`, `de`, `fr`, `pt`.

Use it **instead of `navigator.language`**, which reports the device locale and may differ
from the language the user chose in Nimiq Pay.

```js
function getLanguage() {
  const nimiqLang = window.nimiqPay?.language
  if (nimiqLang)
    return nimiqLang

  const deviceLang = navigator.language.split('-')[0] // 'en-US' → 'en'
  if (deviceLang)
    return deviceLang

  return 'en'
}
```

A plain object map is enough for most mini apps — no i18n library needed:

```js
const translations = {
  en: { greeting: 'Hello' },
  es: { greeting: 'Hola' },
  de: { greeting: 'Hallo' },
  fr: { greeting: 'Bonjour' },
  pt: { greeting: 'Olá' },
}

const t = translations[window.nimiqPay?.language]
  ?? translations[navigator.language.split('-')[0]]
  ?? translations.en
```

TypeScript: indexing with an arbitrary string errors, so gate with `in`:

```ts
const nimiqPayLanguage = window.nimiqPay?.language
const browserLanguage = navigator.language.split('-')[0]
const t = (nimiqPayLanguage in translations ? translations[nimiqPayLanguage] : null)
  ?? (browserLanguage in translations ? translations[browserLanguage] : null)
  ?? translations.en
```

For many strings or real pluralization, pass the value as the locale to `vue-i18n`,
`react-i18next`, `svelte-i18n`, etc., with `'en'` as the fallback locale.

### 11.2 Nimiq network

`window.nimiqPay.network` — `'mainnet'` or `'testnet'`, injected before page scripts, static
for the session. Use it to pick endpoints, explorer links or addresses.

```ts
import { getHostNetwork } from '@nimiq/mini-app-sdk'

const network = getHostNetwork() ?? 'mainnet' // SDK 0.2.4+
```

`getHostNetwork()` returns `undefined` outside Nimiq Pay and on Nimiq Pay versions released
before the field existed. Without the SDK, read `window.nimiqPay?.network` directly.

### 11.3 Fullscreen

Native WebView fullscreen — **separate** from the HTML/video Fullscreen API. The page,
cookies and history stay loaded; there is no reload.

```ts
import { exitFullscreen, getFullscreen, onFullscreenChange, requestFullscreen } from '@nimiq/mini-app-sdk' // 0.2.3+
```

| Method | Result |
|---|---|
| `requestFullscreen()` | `Promise<void>` — enters fullscreen |
| `exitFullscreen()` | `Promise<void>` — leaves fullscreen |
| `getFullscreen()` | `Promise<boolean>` — reads the applied native state |
| `onFullscreenChange(listener)` | calls `listener(enabled: boolean)` on changes; returns an unsubscribe function |

Rules:

- Trigger it only from **your own user control** (e.g. a "Go Fullscreen" button). Nimiq Pay
  adds **no** approval prompt, so the control is the consent.
- **Feature-detect** (`host?.requestFullscreen`) before showing the control — unavailable in
  a regular browser or an older Nimiq Pay.
- Users can leave via the native exit button or Android Back; subscribe to changes so your
  UI follows. The subscription gives **no initial value** — call `getFullscreen()` for that.
- Calls can **reject** when the WebView is hidden or the host cannot apply fullscreen. In
  particular `getFullscreen()` does **not** return `false` for a hidden WebView. Handle
  rejection; use change events rather than polling.
- Fullscreen also ends when Nimiq Pay backgrounds/hides/closes the WebView, or the mini app
  navigates to another origin, and it does **not** re-enter automatically on return.

```js
const host = window.nimiqPay
const goButton = document.querySelector('#go-fullscreen')

if (host?.requestFullscreen && goButton) {
  goButton.addEventListener('click', async () => {
    try {
      await host.requestFullscreen()
    }
    catch (error) {
      console.error('Could not enter fullscreen', error)
    }
  })
}

if (host?.onFullscreenChange && host?.getFullscreen) {
  const stopWatching = host.onFullscreenChange(enabled => console.log('Fullscreen:', enabled))
  try {
    console.log('Initially fullscreen:', await host.getFullscreen())
  }
  catch (error) {
    console.error('Could not read fullscreen state', error)
  }
  // Call stopWatching() when this UI is removed.
}
```

### 11.4 Device identifier

A pseudonymous, per-device handle for device-scoped state: leaderboards, anti-spam, save
slots.

```ts
import { requestDeviceIdentifier } from '@nimiq/mini-app-sdk'

try {
  const id = await requestDeviceIdentifier({ reason: 'Leaderboard ranking' })
  // 64-char hex SHA-256, stable for this mini app on this device
}
catch (error) {
  // user denied, reason was empty, or not running inside Nimiq Pay
}
```

| Property | Behaviour |
|---|---|
| Format | 64-character hex string (SHA-256 digest) |
| Scope | one value per **(device, origin)** — different mini apps get different values |
| Stability | stable across Nimiq Pay reinstalls and across user accounts on the device |
| Prompts | first call per origin shows a consent prompt with your `reason` **verbatim**; later calls resolve silently |

The host hashes a host-side device ID with your origin, so two mini apps cannot recognise the
same device by comparing identifiers.

**Do not use it as a user ID or for authentication.** It identifies the device: a shared
device returns the same value to every user, and one user on two devices gets two different
values. For user identity use `listAccounts()` (plus `sign()` and server-side verification).

Rejects when: the user denied the prompt, `reason` is empty, or the app is not running inside
Nimiq Pay.

---

## 12. Local development and testing

### Run and load

```bash
npm run dev -- --host
```

Note the **Network** URL from the terminal, e.g. `http://192.168.1.42:5173`. Then:

1. Phone and dev machine on the **same Wi-Fi network**.
2. Open **Nimiq Pay**.
3. Go to **Mini Apps**.
4. Enter the network URL in the **Custom URL** field: `http://<your-ip>:5173`.

Never use `localhost`: inside the WebView it resolves to the phone, not your machine. If
port 5173 is busy Vite silently picks another (5174, 5175…) — always use the exact URL
printed in the terminal.

### Secure-context APIs over HTTP on LAN

`http://<ip>:5173` is not a secure context, so secure-context-only Web APIs may be missing.
`crypto.randomUUID()` is the classic case: it works on `localhost` in a desktop browser and
fails in the WebView over LAN.

Feature-detect and fall back (e.g. to `crypto.getRandomValues()`), or serve local HTTPS when
the API is unavoidable.

### Testnet (Nimiq only)

Nimiq Pay has a hidden dev menu: open the app menu and **long-press the settings button for
10 seconds**. Three options:

- **Default** — follows the build type (dev builds → testnet, production builds → mainnet)
- **Mainnet** — force mainnet
- **Testnet** — force testnet

Switching **clears transaction history and reloads** the app.

The switch affects **Nimiq provider operations only** (NIM payments, signing, staking). EVM
operations keep running against mainnet chains; add Sepolia or other dev chains with
`wallet_addEthereumChain`.

**Free testnet NIM:** on testnet the empty-state home screen shows a **Get free NIM** button
(also inside the **Top Up** modal) crediting **110,000 testnet NIM per request**. Use it to
exercise real payment, signing and staking flows without real funds.

### Troubleshooting

| Symptom | Check |
|---|---|
| Provider never initializes | Opened inside Nimiq Pay (not a browser)? Phone and machine on the same Wi-Fi? Dev server bound with `--host`? |
| Cannot open the local URL from the phone | Restart with `--host`, use the exact **Network** URL, not `localhost` |
| HMR silently dead (Docker) | Set `VITE_HMR_HOST=<LAN-IP>` and the `hmr` block |
| Missing Web API | Secure-context-only API over HTTP on LAN — feature-detect, add a fallback, or use local HTTPS |
| No Ethereum account returned | The wallet needs at least one Ethereum account available in Nimiq Pay |
| Port mismatch | Vite auto-picked another port; use the printed URL |

### Testing discipline

Test by opening the Network URL **inside Nimiq Pay on a real phone (or emulator)**, not only
in a desktop browser. A desktop browser has no providers and no host APIs, so most of the
app's real behaviour is untested there.

---

## 13. Backends, external APIs, CORS

Mini apps can and should use backends and external APIs. The framework only governs how the
app talks to the **wallet**; the rest of the stack is yours — services, databases, auth,
business logic.

- Call any external API with `fetch()` or your HTTP client of choice.
- **Secrets never ship in the bundle.** Anything in the frontend is visible to anyone who
  opens the app — treat the WebView like any other browser. Route calls that need a secret
  (API keys, signing secrets, private RPC credentials) through your own backend.
- **CORS:** your backend must include the mini app's origin in `Access-Control-Allow-Origin`.
  The origin is the URL Nimiq Pay loaded the app from. A Nimiq JSON-RPC endpoint set with
  `setRPCUrl()` must also allow that origin.
- **Dev-time networking:** if your backend also runs locally, point `fetch` at the dev
  machine's **LAN IP** (e.g. `http://192.168.x.x:3000`), never `localhost`, because
  `localhost` inside the WebView is the phone.
- **Server-side verification:** a transaction hash is not proof of payment. Confirm details,
  execution result and finality on the backend before granting access or delivering goods.
  For Lightning, confirm settlement with the merchant backend.

---

## 14. Deployment and deeplinks

Host the mini app anywhere a web app can live — Vercel, Netlify, Cloudflare Pages, your own
server. Once it is reachable over **HTTPS**, paste the URL into Nimiq Pay's Custom URL field
to load it, or submit it for listing in Nimiq Pay.

Two deeplink formats open a mini app directly inside Nimiq Pay:

```
nimiqpay://miniapp?url=your-app.com
https://nimpay.app/miniapps/open/your-app.com
```

Both open the app with full provider access. If the URL is not in the Nimiq Pay mini app
list, or has never been accessed before, Nimiq Pay shows a warning before proceeding. The
HTTPS form works with any domain.

---

## 15. Coding rules

### Provider access

- Access the Nimiq provider **exclusively** through `init()` from `@nimiq/mini-app-sdk`.
  Never reach for it another way.
- Access the Ethereum provider as `window.ethereum`; no SDK, no manual EIP-6963 announcement.
- Call `init()` **once**, keep the promise, await it in handlers. Wrap it in error handling
  and pass a `timeout` so a non-Nimiq-Pay environment fails fast.
- Feature-detect every host-version-dependent capability (`getBalance`, fullscreen methods,
  `window.nimiqPay` fields) and degrade with a clear message.
- The app must stay usable when no provider is present: show a clear, non-alarming message
  and keep all non-wallet features working.

### Approval dialog UX

- **Never queue confirmation-requiring calls in rapid sequence.** Each one opens a native
  dialog the user must answer; several in a row is confusing. Sequence them behind explicit
  user intent (a button press, a form submit).
- **Never trigger an approval dialog on page load** without user interaction.
- Batch or parallelize **read-only** calls freely (`Promise.all` over `listAccounts` +
  `isConsensusEstablished` + `getBlockNumber`, multicall for token balances).

### Money and amounts

- Nimiq amounts are integers in **Luna**; 1 NIM = 100,000 Luna.
- Omit `fee` unless you have a reason: Nimiq Pay picks one automatically, 0 when possible.
- Use the token's **actual `decimals`** for every parse/format. USDT and USDC are 6.
- Encode ABI calls with a library (viem / ethers / wagmi). **Never hand-encode.**
- For ERC-20 writes, `to` is the token contract and `value` is `0x0`.
- Switch to the correct chain **before** token contract calls, and pair each contract address
  with the right chain — USDT on Polygon is a different contract than USDT on Ethereum.
- Pass `chainId` to `wallet_switchEthereumChain` / `wallet_addEthereumChain` as a **hex
  string** (`'0x89'`, not `137`). Numeric chain IDs inside EIP-712 `domain.chainId` are
  correct and expected.
- Verify payments server-side before granting anything; a hash is submission, not success.

### Signing

- Structured data (permits, order approvals, login challenges) → `eth_signTypedData_v4`.
- Plain unstructured text → `personal_sign`.
- Nimiq `sign()` returns `publicKey` **and** `signature`; verify before treating it as proof
  of identity.
- `listAccounts()` does not prove ownership.

### Errors

- `try` / `catch` every wallet call; identify wallet errors with `NimiqProviderError.is()`.
- Treat user cancellation (`PERMISSION_DENIED`, EIP-1193 `4001`) as a **normal outcome**: a
  calm message, screen still usable, retry possible.
- Catch and surface network/RPC failures and contract-call failures (insufficient balance,
  wrong chain, revert).
- Keep a default branch for unlisted error types; don't switch on `code` alone (legacy
  conversions may lack it).
- Handle `4902` from `wallet_switchEthereumChain` by adding the chain.
- After a timeout or submission error, **check status before resending** — never auto-retry
  a payment, and never retry a Lightning invoice.
- Preserve error details for diagnosis.

### Mobile-first UI (the runtime is a phone)

- Design small-screen first; **375px width minimum**, no desktop-only layouts.
- Touch targets **≥ 44px**.
- **No horizontal scrolling.**
- Text readable without zooming.
- Long values (addresses, signatures) need `overflow-wrap: anywhere` / `word-break:
  break-word` so they don't blow out the layout.
- Test on a device or device emulation, not just a desktop browser.

### Localization and network

- Read `window.nimiqPay?.language` with the three-level fallback; prefer it over
  `navigator.language`.
- Read the network from `getHostNetwork()` / `window.nimiqPay?.network` with a `'mainnet'`
  fallback, and derive endpoints, explorer links and addresses from it.

### Secrets and assets

- No private keys, seed phrases, API keys or credentials in client code or the repo.
- If you use Nimiq logos or brand assets, take them from the Nimiq Design Kit.

---

## 16. Anti-patterns

Do **not**:

- **Access or attempt to access private keys**, seeds, or the wallet's internal state. The
  app runs in a sandbox; all signing happens behind the approval dialog.
- **Bypass, suppress or fake the approval dialog.** Every sensitive action (account access,
  signing, transactions) requires explicit native confirmation.
- **Use third-party payment providers for payments** (Stripe, PayPal, etc.) in place of the
  providers. Wallet operations go through the Nimiq and Ethereum providers. (Native Google
  Pay API payments cannot be triggered from a mini app at all.)
- **Assume you control the Nimiq signer.** There is no address parameter on `sign()` and no
  sender parameter on transactions; a selection in your UI changes nothing.
- **Copy Ethereum's `accountsChanged` handling to Nimiq** — no such documented event exists
  there.
- **Treat a transaction hash as proof of payment** or of finality.
- **Treat `listAccounts()` as proof of address ownership.**
- **Treat the device identifier as a user ID** or as authentication.
- **Expect `disconnect()` to revoke host permissions** or end your backend session.
- **Fire several confirmation-requiring calls back to back**, or open a dialog on page load.
- **Hand-encode ABI calls**, or send an ERC-20 `transfer` with the recipient in `to`.
- **Assume 18 decimals** for USDT/USDC, or reuse one chain's token address on another chain.
- **Pass numeric chain IDs** to `wallet_switchEthereumChain` / `wallet_addEthereumChain`.
- **Assume gas abstraction** for mini-app ERC-20 sends; the user needs the chain's native token.
- **Auto-retry a Lightning invoice** after `DUPLICATE_PAYMENT` or `TRANSACTION_OUTCOME_UNKNOWN`.
- **Poll `getFullscreen()`** instead of subscribing, or assume a hidden WebView reports `false`.
- **Enter fullscreen without a user control.**
- **Use `navigator.language`** as the primary language source inside Nimiq Pay.
- **Rely on secure-context-only Web APIs** without a fallback during LAN development.
- **Use `localhost`** for the mini app URL or for a local backend's `fetch` target.
- **Ship secrets in the frontend bundle.**
- **Ship flows that transact on Sepolia or Nimiq testnet** to real users.
- **Build desktop-first layouts**, or `init()` on every interaction.

---

## 17. Gotchas and footguns

| Area | Gotcha |
|---|---|
| `init()` | Throws a plain `Error` (not `NimiqProviderError`) on injection timeout — i.e. in a normal browser. |
| Error coverage | Status methods, external RPC queries and direct `window.nimiq` access keep their original error behaviour; only wallet methods normalize. |
| `NimiqProviderError.is()` | Use it instead of `instanceof` — it survives package/host bundle boundaries. |
| Error `code` | Can be absent (legacy `{ error: { type, message } }` conversions). Branch on `type` first. |
| `getBalance` | SDK **and** host gated; returns Luna; `0` is a success, failures reject; contract (HTLC/vesting) balances may not be spendable; unaffected by `setRPCUrl()`; 30 s timeout. |
| `listAccounts` | Cached after the first success — later calls open no dialog until `disconnect()`. |
| `disconnect()` | Local cache clear + event only. No permission revocation, no backend logout. |
| `setRPCUrl` | Does not switch network. Endpoint must match the active network and allow your origin via CORS. |
| `request()` RPC results | Envelope stripped to `result.data`; TS types do not validate at runtime. |
| `sendBasicTransactionWithData` | The `data` message is **public on-chain**. |
| EVM address | One address for all EVM chains — do not model per-chain addresses. |
| Chain switch | Error `4902` = not configured → `wallet_addEthereumChain`. |
| `eth_getTransactionReceipt` | Returns `null` until mined. |
| `eth_accounts` | Returns `[]` when not connected — not an error. |
| Decimals | USDT/USDC = 6. Mis-formatting shows 1 USDT as `0.000000000001`. |
| ERC-20 `transfer` | `to` = contract, recipient inside `data`, `value` = `0x0`. |
| Gas | No abstraction in mini apps; native token required on the active chain. |
| Lightning | Fixed-amount BOLT11/LNURL only, must match the active network; resolution = submitted, not settled; identical LNURL-resolved invoices count as duplicates. |
| Fullscreen | Native, not HTML fullscreen; no host prompt; subscription has no initial value; can reject when hidden; ends on background/hide/close/cross-origin nav and does not resume. |
| Device identifier | Per (device, origin); survives reinstalls and account switches; empty `reason` rejects; device ≠ user. |
| `window.nimiqPay` | `undefined` outside Nimiq Pay — optional-chain every read. Language and network are static per session. |
| Language set | `en`, `es`, `de`, `fr`, `pt`. |
| Testnet | Nimiq-only; switching clears tx history and reloads; 110,000 NIM per faucet request. |
| LAN dev | Not a secure context → `crypto.randomUUID()` and friends may be missing. |
| Vite port | Auto-increments when busy; use the printed Network URL. |
| Docker HMR | Needs `VITE_HMR_HOST` + `hmr` block or it dies silently. |
| Deeplinks | Unlisted or never-opened URLs show a warning screen first. |

---

## 18. Pre-ship technical checklist

**Provider integration**

- [ ] At least one provider method is used (`init()` or `window.ethereum`).
- [ ] Nimiq provider: SDK installed, `init()` called (optionally with `timeout`).
- [ ] Ethereum provider: `window.ethereum` accessed directly, no SDK needed.
- [ ] Provider initialization is wrapped in error handling.
- [ ] A clear message shows when the provider is unavailable (opened outside Nimiq Pay).
- [ ] Host-gated capabilities are feature-detected.

**Mobile-first UI**

- [ ] Responsive down to 375px width.
- [ ] Touch targets ≥ 44px.
- [ ] No horizontal scrolling on mobile viewports.
- [ ] No desktop-only components or layouts.
- [ ] Text readable without zooming.

**Security**

- [ ] No attempt to access private keys or wallet internal state.
- [ ] No attempt to bypass or suppress the native approval dialog.
- [ ] No hardcoded keys, seed phrases or credentials in the codebase.
- [ ] All sensitive actions go through a provider.
- [ ] Structured-data signing uses `eth_signTypedData_v4`, not `personal_sign`.
- [ ] Third-party secrets live on a backend, not in the bundle.

**Error handling**

- [ ] User rejection is handled gracefully; the app stays usable.
- [ ] Network and RPC failures are caught and shown.
- [ ] ERC-20 contract failures handled (insufficient balance, wrong chain, revert).
- [ ] A default branch covers unlisted error types.
- [ ] No automatic resend of payments or Lightning invoices.

**Approval dialog UX**

- [ ] Confirmation-requiring calls are not fired in rapid sequence.
- [ ] Each one sits behind explicit user intent.
- [ ] Read-only calls are batched or parallelized.
- [ ] No approval dialog on page load.

**Tokens (if applicable)**

- [ ] Correct contract address for the correct chain.
- [ ] Token decimals handled via the token's real `decimals` (USDT/USDC = 6).
- [ ] The app switches chain before token contract calls.
- [ ] ABI encoding via a library, never manual.
- [ ] Native-token/gas requirement surfaced to the user.

**Chains (if applicable)**

- [ ] Only supported chains used, or added via `wallet_addEthereumChain`.
- [ ] Hex-string chain IDs for switch/add; numeric only inside EIP-712 `domain.chainId`.
- [ ] `4902` handled.

**Dev server and testing**

- [ ] Dev server reachable over the local network.
- [ ] Fallbacks for secure-context-only Web APIs.
- [ ] Tested by opening the Network URL inside Nimiq Pay on a phone, not just a desktop browser.
- [ ] Payment/staking flows exercised on testnet first.

**Localization and host context**

- [ ] `window.nimiqPay?.language` read with a fallback chain.
- [ ] Network-specific values derived from `getHostNetwork()` / `window.nimiqPay?.network`.

**Visual identity**

- [ ] Nimiq logo/brand assets, if used, come from the Nimiq Design Kit.

---

## 19. Reference implementations and links

**Reference implementations**

- `evm-mini-wallet` — full EVM wallet mini app: Vue + viem + wagmi, EIP-6963 connection,
  chain switching, ERC-20 balances via multicall, transfers with gas estimation, well-known
  token list. <https://github.com/Albermonte/evm-mini-wallet>
- `nimiq-mini-app-demo` — demo exercising all supported Nimiq and Ethereum provider methods.
  <https://github.com/Eligioo/nimiq-mini-app-demo>

**Packages**

- `@nimiq/mini-app-sdk` — <https://www.npmjs.com/package/@nimiq/mini-app-sdk> (check release
  notes for breaking changes)
- `viem` — <https://viem.sh> · `ethers.js` — <https://docs.ethers.org> · `wagmi` — <https://wagmi.sh>

**Documentation** (raw markdown via `https://nimiq.dev/raw/<path>.md`)

- Mini Apps overview — `/mini-apps`
- Build Your First Mini App — `/mini-apps/tutorials/mini-app-tutorial`
- Build a Dual-Chain Mini App — `/mini-apps/tutorials/dual-chain-mini-app-tutorial`
- Load a Local Mini App — `/mini-apps/development/load-local-mini-app`
- Using EVM Tokens — `/mini-apps/features/evm-tokens`
- Localization — `/mini-apps/features/localization`
- Fullscreen — `/mini-apps/features/fullscreen`
- Device Identifier — `/mini-apps/features/device-identifier`
- Bitcoin Lightning Payments — `/mini-apps/features/bitcoin-lightning-payments`
- Nimiq Provider API — `/mini-apps/api-reference/nimiq-provider`
- Ethereum Provider API — `/mini-apps/api-reference/ethereum-provider`
- Nimiq RPC methods — `/rpc/methods`
- Nimiq Design Kit — `/design-kit`

**Standards**

- EIP-1193 (provider interface) — <https://eips.ethereum.org/EIPS/eip-1193>
- EIP-6963 (provider discovery) — <https://eips.ethereum.org/EIPS/eip-6963>
- EIP-712 (typed structured data) — <https://eips.ethereum.org/EIPS/eip-712>

**Agent skill** (gives an AI coding tool this framework's context)

```bash
npx skills add nimiq/developer-center --skill mini-apps
npx skills remove mini-apps
```
