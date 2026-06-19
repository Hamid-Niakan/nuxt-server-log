export function parseStackTrace(stack?: string, depth: number = 10): string[] {
  if (!stack) return [];
  return stack
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("at "))
    .slice(0, depth);
}

export function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, val) => {
      if (typeof val === "bigint") return val.toString();
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      return val;
    });
  } catch (err) {
    return JSON.stringify({
      logError: "Failed to serialize log entry",
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

export function redactQueryString(
  search: string,
  redactKeys: string[],
): string {
  if (!search || redactKeys.length === 0) return search;
  const params = new URLSearchParams(search);
  const lowered = redactKeys.map((key) => key.toLowerCase());
  let changed = false;
  for (const key of [...params.keys()]) {
    if (lowered.includes(key.toLowerCase())) {
      params.set(key, "[REDACTED]");
      changed = true;
    }
  }
  return changed ? `?${params.toString()}` : search;
}
