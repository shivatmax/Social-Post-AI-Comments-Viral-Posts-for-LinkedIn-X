/**
 * Tiny leveled, namespaced logger used across all extension contexts
 * (background, content, side panel). Prefixes every line so you can tell which
 * surface a log came from in the console.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Flip to 'debug' while developing; 'info' keeps production consoles quiet.
const MIN_LEVEL: LogLevel = 'debug';

const STYLES: Record<LogLevel, string> = {
  debug: 'color:#9ca3af',
  info: 'color:#6366f1',
  warn: 'color:#d97706',
  error: 'color:#dc2626',
};

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  child: (sub: string) => Logger;
}

function emit(level: LogLevel, namespace: string, args: unknown[]) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
  const tag = `%c[social-post:${namespace}]`;
  // eslint-disable-next-line no-console
  const fn = console[level] ?? console.log;
  fn(tag, STYLES[level], ...args);
}

export function createLogger(namespace: string): Logger {
  return {
    debug: (...a) => emit('debug', namespace, a),
    info: (...a) => emit('info', namespace, a),
    warn: (...a) => emit('warn', namespace, a),
    error: (...a) => emit('error', namespace, a),
    child: (sub) => createLogger(`${namespace}:${sub}`),
  };
}
