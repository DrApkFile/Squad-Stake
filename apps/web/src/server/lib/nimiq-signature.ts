import 'server-only';
import { Hash, PublicKey, Signature } from '@nimiq/core';

export function verifySignedMessage(message: string, publicKey: string, signature: string): string | null {
  try {
    // S5: Nimiq Pay signs SHA256(prefix + UTF-8 byte length + UTF-8 message).
    const bytes = new TextEncoder().encode(message);
    const prefix = new TextEncoder().encode(`\x16Nimiq Signed Message:\n${bytes.length}`);
    const digest = Hash.computeSha256(new Uint8Array([...prefix, ...bytes]));
    const key = PublicKey.fromHex(publicKey);
    return key.verify(Signature.fromHex(signature), digest)
      ? key.toAddress().toUserFriendlyAddress() : null;
  } catch {
    return null;
  }
}
