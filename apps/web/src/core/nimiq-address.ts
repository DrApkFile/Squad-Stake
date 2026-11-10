import { addressInput } from './squad-contract';

/**
 * A Nimiq address the member typed or pasted, normalised to the one form the wire contract
 * accepts: `NQxx XXXX XXXX XXXX XXXX XXXX XXXX XXXX XXXX`.
 *
 * Why this exists: Mode A asks the creator for a **recipient address**, and that is the only
 * free-text field in the app where a paste can be in a different shape to the one the schema
 * wants. The same address is written with single spaces (`NQ35 YFBF …`), with none at all
 * (`NQ35YFBF…`), in lower case, or with a stray newline on the end, depending on where it was
 * copied from. All of those are the same address, so refusing them is a bug in us rather than a
 * mistake by the member — and `createSquadInput` would refuse them as `INVALID_INPUT`, which
 * tells the member nothing about which field was wrong (docs/AUDIT.md, F-1).
 *
 * Pure, and deliberately **not** a validator: an input that is not an address comes back
 * unchanged (trimmed and upper-cased) so the caller's own check refuses it and can say which
 * field it was. Nothing here ever invents the missing part of an address.
 */
const BODY = /^NQ(\d{2})([0-9A-HJ-NP-VXY]{32})$/;

export function normalizeAddress(input: string): string {
  const compact = input.replace(/\s+/gu, '').toUpperCase();
  const parts = BODY.exec(compact);
  if (parts === null) return input.trim().toUpperCase();
  const [, checksum, body] = parts;
  const groups = (body ?? '').match(/.{4}/gu) ?? [];
  return `NQ${checksum} ${groups.join(' ')}`;
}

/** True when the normalised form is what the wire contract accepts. */
export const isAddress = (input: string): boolean =>
  addressInput.safeParse(normalizeAddress(input)).success;
