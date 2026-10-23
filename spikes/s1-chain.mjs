// Squad Stake spikes S1–S4 v2 (read-only, no wallet, no money).
// S1  latency over 6 warm calls + which RPC methods the public node allows
// S2  read real staker records (sampled from recent staking-contract transactions)
// S3  "money back by": how long from inactivating now until stake can be retired
// S4  how stakers receive rewards (incoming payouts vs none)
// Usage: node s1-chain.mjs   |   NIMIQ_RPC=https://rpc.nimiqwatch.com node s1-chain.mjs
const RPC = process.env.NIMIQ_RPC ?? 'https://rpc.testnet.nimiqwatch.com'
const STAKING_CONTRACT = 'NQ77 0000 0000 0000 0000 0000 0000 0000 0001'
let id = 0

async function rpc(method, params = []) {
  const t0 = performance.now()
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
    signal: AbortSignal.timeout(15_000),
  })
  const body = await res.json()
  const ms = Math.round(performance.now() - t0)
  if (body.error) { const e = new Error(body.error.message ?? JSON.stringify(body.error)); e.ms = ms; throw e }
  const data = body.result && typeof body.result === 'object' && 'data' in body.result ? body.result.data : body.result
  return { data, ms }
}
const log = (...a) => console.log(...a)
const NIM = luna => (Number(luna) / 1e5).toLocaleString('en-US', { maximumFractionDigits: 5 })
const hours = blocks => (blocks / 3600).toFixed(1) // 1 block ≈ 1 s

log(`RPC: ${RPC}\n`)

// ---- S1a latency
const times = []
let head
for (let i = 0; i < 6; i++) { const r = await rpc('getBlockNumber'); times.push(r.ms); head = r.data }
log(`S1  getBlockNumber x6 (ms): ${times.join(', ')}  -> first ${times[0]}, warm median ${[...times.slice(1)].sort((a, b) => a - b)[2]}`)

// ---- S2 sample stakers from recent staking-contract transactions
let candidates = []
try {
  const r = await rpc('getTransactionsByAddress', [STAKING_CONTRACT, 100])
  for (const t of r.data ?? []) for (const a of t.relatedAddresses ?? []) {
    if (a !== STAKING_CONTRACT && !candidates.includes(a)) candidates.push(a)
  }
  log(`S2  staking-contract txs: ${(r.data ?? []).length}, related addresses: ${candidates.length} (${r.ms} ms)`)
} catch (e) { log(`S2  getTransactionsByAddress(staking contract): ${e.message}`) }

const stakers = []
for (const a of candidates.slice(0, 40)) {
  try { const r = await rpc('getStakerByAddress', [a]); if (r.data?.address) stakers.push({ ...r.data, ms: r.ms }) } catch { /* not a staker */ }
  if (stakers.length >= 10) break
}
log(`S2  staker records read: ${stakers.length}`)
if (stakers[0]) log(`S2  fields: ${Object.keys(stakers[0]).filter(k => k !== 'ms').join(', ')}; getStakerByAddress ms: ${stakers.map(s => s.ms).join(', ')}`)
for (const s of stakers.slice(0, 5)) log(`S2  ${s.address}: active ${NIM(s.balance)}, inactive ${NIM(s.inactiveBalance)} (from ${s.inactiveFrom ?? '-'}), retired ${NIM(s.retiredBalance)}, delegation ${s.delegation ?? '-'}`)

// ---- S1b which methods are allowed (decides architecture)
const someAddr = stakers[0]?.address ?? STAKING_CONTRACT
const probes = [
  ['getStakerByAddress', [someAddr]], ['getAccountByAddress', [someAddr]],
  ['getTransactionsByAddress', [someAddr, 5]], ['getValidatorByAddress', [stakers[0]?.delegation ?? someAddr]],
  ['getElectionBlockAfter', [head]], ['getBlockAfterCollateralLockup', [head]],
  ['getBlockAfterReportingWindow', [head]], ['getBlockAfterJail', [head]], ['getEpochNumber', []],
]
log('\nS1  method availability:')
for (const [m, p] of probes) {
  try { const r = await rpc(m, p); log(`    ✅ ${m} (${r.ms} ms)`) } catch (e) { log(`    ❌ ${m}: ${e.message.slice(0, 60)}`) }
}

// ---- S3 timeline if someone inactivates stake right now
try {
  const elect = (await rpc('getElectionBlockAfter', [head])).data
  let release
  try { release = (await rpc('getBlockAfterCollateralLockup', [head])).data } catch { release = (await rpc('getBlockAfterReportingWindow', [head])).data }
  log(`\nS3  inactivate now (block ${head}): takes effect at ${elect} (~${hours(elect - head)} h), retire allowed from ${release} (~${hours(release - head)} h from now)`)
  const inactive = stakers.find(s => Number(s.inactiveBalance) > 0 && s.inactiveFrom != null)
  if (inactive) {
    let r2; try { r2 = (await rpc('getBlockAfterCollateralLockup', [inactive.inactiveFrom])).data } catch { r2 = (await rpc('getBlockAfterReportingWindow', [inactive.inactiveFrom])).data }
    log(`S3  real staker ${inactive.address}: inactive from ${inactive.inactiveFrom}, retire allowed from ${r2} (${r2 <= head ? 'already releasable' : `~${hours(r2 - head)} h left`})`)
  }
} catch (e) { log(`S3  ${e.message}`) }

// ---- S4 reward arrival
log('')
for (const st of stakers.slice(0, 4)) {
  try {
    const r = await rpc('getTransactionsByAddress', [st.address, 30])
    const list = r.data ?? []
    const incoming = list.filter(t => t.to === st.address && t.from !== st.address && t.from !== STAKING_CONTRACT)
    const senders = [...new Set(incoming.map(t => t.from))]
    log(`S4  ${st.address}: ${incoming.length}/${list.length} recent incoming from ${senders.length} sender(s)${senders[0] ? `, e.g. ${senders[0]}` : ''}; delegation ${st.delegation ?? '-'}`)
  } catch (e) { log(`S4  ${st.address}: ${e.message.slice(0, 60)}`) }
}
log('\nPaste this whole output back. Nothing was signed or sent.')
