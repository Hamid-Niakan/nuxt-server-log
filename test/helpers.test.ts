import { describe, it, expect } from "vitest";
import {
  parseStackTrace,
  safeStringify,
  redactQueryString,
} from "../src/runtime/server/utils/helpers";

// `describe` groups related tests. Each `it` is one test case.
describe("parseStackTrace", () => {
  it("returns an empty array when there is no stack", () => {
    expect(parseStackTrace(undefined)).toEqual([]);
  });

  it("keeps only trimmed 'at' lines", () => {
    const stack = [
      "Error: boom", // header line — should be dropped
      "    at foo (file.ts:1:1)", // kept (and trimmed)
      "    at bar (file.ts:2:2)",
    ].join("\n");

    expect(parseStackTrace(stack)).toEqual([
      "at foo (file.ts:1:1)",
      "at bar (file.ts:2:2)",
    ]);
  });

  it("respects the depth limit", () => {
    const stack = Array.from(
      { length: 20 },
      (_, i) => `    at frame${i} (file.ts:${i}:0)`,
    ).join("\n");

    expect(parseStackTrace(stack, 3)).toHaveLength(3);
  });
});

describe("safeStringify", () => {
  it("serializes a normal object to valid JSON", () => {
    const out = safeStringify({ a: 1, b: "two" });
    expect(JSON.parse(out)).toEqual({ a: 1, b: "two" });
  });

  it("does not throw on circular references", () => {
    const obj: Record<string, unknown> = { name: "loop" };
    obj.self = obj; // circular — would make JSON.stringify throw

    // `expect(fn).not.toThrow()` asserts the function runs without error.
    expect(() => safeStringify(obj)).not.toThrow();
    expect(safeStringify(obj)).toContain("[Circular]");
  });

  it("converts BigInt to a string instead of throwing", () => {
    const out = safeStringify({ big: 10n });
    expect(JSON.parse(out)).toEqual({ big: "10" });
  });
});

describe("redactQueryString", () => {
  it("returns the input unchanged when there are no keys to redact", () => {
    expect(redactQueryString("?token=abc", [])).toBe("?token=abc");
  });

  it("redacts matching keys (case-insensitive) and keeps the rest", () => {
    const result = redactQueryString("?Token=secret&page=2", ["token"]);
    const params = new URLSearchParams(result);

    expect(params.get("Token")).toBe("[REDACTED]");
    expect(params.get("page")).toBe("2");
  });

  it("returns the original string when nothing matched", () => {
    expect(redactQueryString("?page=2", ["token"])).toBe("?page=2");
  });
});
