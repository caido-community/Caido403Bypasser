// shortcut: yaml reads `process.env`, which Caido's runtime lacks; yaml >= 2.7 needs `node:process` instead,
// which caido-dev's bundle can't resolve. Drop this and upgrade yaml once the backend build supports it.
if (!("process" in globalThis)) {
  Object.assign(globalThis, { process: { env: {} } });
}
