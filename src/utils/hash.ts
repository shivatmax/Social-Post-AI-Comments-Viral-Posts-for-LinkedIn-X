/**
 * Stable, fast, non-cryptographic hashing for duplicate detection.
 *
 * We key posts by a hash of (platform + normalized author + normalized text)
 * so the same post scraped twice collapses to one record, and lightly-edited
 * reposts still tend to collide.
 */

/** FNV-1a 32-bit hash, hex encoded. Deterministic across contexts. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Lowercase, collapse whitespace, strip URLs/punctuation noise. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function postFingerprint(
  platform: string,
  authorName: string,
  text: string
): string {
  const basis = `${platform}|${normalizeText(authorName)}|${normalizeText(text).slice(0, 280)}`;
  return fnv1a(basis);
}

/**
 * Jaccard similarity over word sets — cheap "similar post" signal used for
 * the (future-ready) clustering hook and near-duplicate warnings.
 */
export function similarity(a: string, b: string): number {
  const sa = new Set(normalizeText(a).split(' ').filter(Boolean));
  const sb = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return inter / (sa.size + sb.size - inter);
}
