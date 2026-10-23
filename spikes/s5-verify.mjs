// Spike S5 (laptop): verify a signature from Nimiq Pay exactly as the server will,
// derive the address from the public key, and print it so you can compare it with
// your staker address. Uses Nimiq's official library.
// Usage: node s5-verify.mjs '{"message":"...","publicKey":"...","signature":"..."}'
import { PublicKey, Signature, Hash } from '@nimiq/core'

const input = JSON.parse(process.argv[2] ?? '{}')
for (const k of ['message', 'publicKey', 'signature']) if (typeof input[k] !== 'string') { console.error(`missing ${k}`); process.exit(1) }

// Same digest Nimiq Pay signs (useMiniAppHost.ts sign()):
// SHA-256( "\x16Nimiq Signed Message:\n" + byteLength + messageBytes )
const bytes = new TextEncoder().encode(input.message)
const prefix = new TextEncoder().encode(`\x16Nimiq Signed Message:\n${bytes.length}`)
const hash = Hash.computeSha256(new Uint8Array([...prefix, ...bytes]))

const pub = PublicKey.fromHex(input.publicKey)
const ok = pub.verify(Signature.fromHex(input.signature), hash)
const tampered = pub.verify(Signature.fromHex(input.signature), Hash.computeSha256(new Uint8Array([...prefix, ...bytes, 1])))
console.log(`signature valid:      ${ok}`)
console.log(`tampered rejected:    ${!tampered}`)
console.log(`derived address:      ${pub.toAddress().toUserFriendlyAddress()}`)
console.log('S5 passes if valid = true, tampered rejected = true, and the derived address is the one you staked from.')
