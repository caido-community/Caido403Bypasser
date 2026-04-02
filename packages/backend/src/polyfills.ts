declare const process: unknown;

if (typeof process === "undefined") {
  (globalThis as unknown as Record<string, unknown>).process = { env: {} };
}
