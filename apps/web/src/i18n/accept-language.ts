/**
 * The browser's language preferences, in order, from an `Accept-Language` header
 * (RFC 9110 §12.5.4: a comma-separated list of ranges, each with an optional `;q=` weight,
 * highest weight first, `q=0` meaning "not acceptable").
 *
 * Pure and dependency-free so it can be tested without a request, and so the server render
 * and the client agree on what the browser asked for.
 */
export function acceptLanguages(header: string | null | undefined): readonly string[] {
  if (typeof header !== 'string' || header.trim() === '') return [];
  return header
    .split(',')
    .map((part) => {
      const [tag = '', ...parameters] = part.trim().split(';');
      const weight = parameters
        .map((parameter) => /^\s*q=([0-9.]+)\s*$/i.exec(parameter))
        .find((match) => match !== null);
      const quality = weight === null || weight === undefined ? 1 : Number(weight[1]);
      return { tag: tag.trim(), quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((entry) => entry.tag !== '' && entry.tag !== '*' && entry.quality > 0)
    // A stable sort keeps the header's own order among equal weights, which is what a
    // browser means by listing them in that order.
    .sort((left, right) => right.quality - left.quality)
    .map((entry) => entry.tag);
}
