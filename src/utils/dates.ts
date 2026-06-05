/**
 * Date helpers. Feeds rarely expose machine timestamps, so we parse the human
 * labels ("2h", "3 days ago", "1w") into an approximate age in hours.
 */

/** Parse a relative-time label into hours-ago. Returns null if unparseable. */
export function parseRelativeAgeHours(label: string | null): number | null {
  if (!label) return null;
  const s = label.toLowerCase().trim();

  // "now", "just now"
  if (/\b(now|just now|moments?)\b/.test(s)) return 0;

  // Compact LinkedIn/X forms: "2h", "30m", "1d", "3w", "5mo", "1y", "45s"
  const compact = s.match(/(\d+)\s*(s|m|h|d|w|mo|y)\b/);
  if (compact) {
    const n = parseInt(compact[1], 10);
    return n * unitToHours(compact[2]);
  }

  // Verbose: "2 hours ago", "3 days ago", "an hour ago"
  const verbose = s.match(
    /\b(\d+|a|an)\s+(second|minute|hour|day|week|month|year)s?\b/
  );
  if (verbose) {
    const n = verbose[1] === 'a' || verbose[1] === 'an' ? 1 : parseInt(verbose[1], 10);
    return n * unitToHours(verbose[2]);
  }
  return null;
}

function unitToHours(unit: string): number {
  switch (unit) {
    case 's':
    case 'second':
      return 1 / 3600;
    case 'm':
    case 'minute':
      return 1 / 60;
    case 'h':
    case 'hour':
      return 1;
    case 'd':
    case 'day':
      return 24;
    case 'w':
    case 'week':
      return 24 * 7;
    case 'mo':
    case 'month':
      return 24 * 30;
    case 'y':
    case 'year':
      return 24 * 365;
    default:
      return 1;
  }
}

/** Human "time ago" from epoch ms. */
export function timeAgo(epochMs: number): string {
  const seconds = Math.max(1, Math.floor((Date.now() - epochMs) / 1000));
  const table: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.345, 'week'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ];
  let value = seconds;
  let unit = 'second';
  for (const [step, name] of table) {
    if (value < step) {
      unit = name;
      break;
    }
    value = value / step;
    unit = name;
  }
  const rounded = Math.floor(value);
  return `${rounded} ${unit}${rounded === 1 ? '' : 's'} ago`;
}

export function isToday(epochMs: number): boolean {
  const d = new Date(epochMs);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
