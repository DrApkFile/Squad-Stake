// Squad Stake spike S2 v3: find the working param shape for tx history, sample real stakers,
// test getStakerByAddress on them, and compute the corrected "money back by" timeline.
// Usage: node s2-stakers.mjs [optional NQ address of a known staker]
//        NIMIQ_RPC=https://rpc.nimiqwatch.com node s2-stakers.mjs
const RPC = process.env.NIMIQ_RPC ?? 'https://rpc.testnet.nimiqwatch.com'
const CONTRACT = 'NQ77 0000 0000 0000 0000 0000 0000 0000 0001'
let id = 0
async function rpc(method, params) {
  const res = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }), signal: AbortSignal.timeout(15_000) })
  const body = await res.json()
  if (body.error) throw new Error(body.error.message ?? JSON.stringify(body.error))
  return body.result && typeof body.result === 'object' && 'data' in body.result ? body.result.data : body.result
}
const log = (...a) => console.log(...a)
const NIM = l => (Number(l) / 1e5).toLocaleString('en-US', { maximumFractionDigits: 5 })
const h = b => (b / 3600).toFixed(1)
log(`RPC: ${RPC}\n`)

// 1) find a param shape that works for transaction history
const shapes = [
  ['positional 3 (addr, max, null)', a => [a, 50, null]],
  ['positional 1 (addr)', a => [a]],
  ['named {address, max}', a => ({ address: a, max: 50 })],
  ['named {address}', a => ({ address: a })],
  ['compact address, positional 3', a => [a.replace(/ /g, ''), 50, null]],
]
let shape, txs = []
for (const [name, fn] of shapes) {
  try { txs = await rpc('getTransactionsByAddress', fn(CONTRACT)); shape = [name, fn]; log(`TX  ✅ ${name}: ${txs.length} txs`); break }
  catch (e) { log(`TX  ❌ ${name}: ${e.message.slice(0, 50)}`) }
}

// 2) candidate staker addresses
const cands = []
if (process.argv[2]) cands.push(process.argv[2])
for (const t of txs ?? []) for (const a of [t.from, t.to, ...(t.relatedAddresses ?? [])]) if (a && a !== CONTRACT && !cands.includes(a)) cands.push(a)
log(`\nS2  candidate addresses: ${cands.length}`)

// 3) getStakerByAddress on real candidates, two param shapes
let found = []
for (const a of cands.slice(0, 40)) {
  for (const p of [[a], { address: a }]) {
    try { const s = await rpc('getStakerByAddress', p); if (s?.address) { found.push(s); break } } catch (e) { if (!/internal/i.test(e.message)) log(`S2  ${a}: ${e.message.slice(0, 50)}`) }
  }
  if (found.length >= 8) break
}
log(`S2  getStakerByAddress worked for ${found.length} real stakers`)
for (const s of found.slice(0, 5)) log(`S2  ${s.address}: active ${NIM(s.balance)}, inactive ${NIM(s.inactiveBalance)} (from ${s.inactiveFrom ?? '-'}), retired ${NIM(s.retiredBalance)}, delegation ${s.delegation ?? '-'}`)

// 4) corrected timeline: release counts from the election block where inactivation takes effect
const head = await rpc('getBlockNumber', [])
const elect = await rpc('getElectionBlockAfter', [head])
const release = await rpc('getBlockAfterReportingWindow', [elect])
log(`\nS3  inactivate now: effective at ${elect} (~${h(elect - head)} h), retire allowed from ${release} (~${h(release - head)} h from now)`)
const inactive = found.find(s => Number(s.inactiveBalance) > 0 && s.inactiveFrom != null)
if (inactive) {
  const r = await rpc('getBlockAfterReportingWindow', [inactive.inactiveFrom])
  log(`S3  real check: ${inactive.address} inactiveFrom ${inactive.inactiveFrom} → retire from ${r} (${r <= head ? 'releasable now' : `~${h(r - head)} h left`}); inactiveFrom is ${inactive.inactiveFrom % 43200 === 0 ? '' : 'NOT '}an epoch boundary`)
}

// 5) reward arrival
if (shape) for (const s of found.slice(0, 3)) {
  try {
    const list = await rpc('getTransactionsByAddress', shape[1](s.address))
    const inc = list.filter(t => t.to === s.address && t.from !== CONTRACT)
    log(`S4  ${s.address}: ${inc.length}/${list.length} incoming from ${new Set(inc.map(t => t.from)).size} sender(s)`)
  } catch (e) { log(`S4  ${s.address}: ${e.message.slice(0, 50)}`) }
}
log('\nPaste this whole output back. Nothing was signed or sent.')
