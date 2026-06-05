/** Small display formatters. */

/** 1234 -> "1.2K", 1500000 -> "1.5M". */
export function compactNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
}

/** Parse engagement strings like "1.2K", "3,456", "1.1M reactions". */
export function parseCount(raw: string | null | undefined): number {
  if (!raw) return 0;
  const m = raw.replace(/,/g, '').match(/([\d.]+)\s*([km])?/i);
  if (!m) return 0;
  const value = parseFloat(m[1]);
  if (Number.isNaN(value)) return 0;
  const suffix = (m[2] || '').toLowerCase();
  if (suffix === 'k') return Math.round(value * 1000);
  if (suffix === 'm') return Math.round(value * 1_000_000);
  return Math.round(value);
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
