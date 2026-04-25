// Tiny UUID helper. crypto.randomUUID is supported on all modern browsers
// and Node 22+ — the only environments Kin runs on.

export function v4(): string {
  return crypto.randomUUID();
}
