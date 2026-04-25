// Single console wrapper. SPEC §15: no console.log in committed code.
// Use log.debug / log.info / log.warn / log.error throughout.

const isDev = typeof process !== "undefined" && process.env.NODE_ENV !== "production";

function fmt(scope: string, level: string, args: unknown[]): unknown[] {
  return [`[kin:${scope}] ${level}`, ...args];
}

export const log = {
  debug(scope: string, ...args: unknown[]) {
    if (!isDev) return;

    console.debug(...fmt(scope, "debug", args));
  },
  info(scope: string, ...args: unknown[]) {

    console.info(...fmt(scope, "info", args));
  },
  warn(scope: string, ...args: unknown[]) {

    console.warn(...fmt(scope, "warn", args));
  },
  error(scope: string, ...args: unknown[]) {

    console.error(...fmt(scope, "error", args));
  },
};
