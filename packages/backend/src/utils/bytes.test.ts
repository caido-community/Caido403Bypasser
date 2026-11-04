import { describe, expect, it } from "vitest";

import { decodeRaw, encodeRaw, toBinaryString } from "./bytes";

describe("bytes", () => {
  it("round-trips every byte value", () => {
    const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(encodeRaw(toBinaryString(bytes))).toEqual(bytes);
  });

  it("encodes characters above U+00FF as UTF-8", () => {
    expect([...encodeRaw("／")]).toEqual([0xef, 0xbc, 0x8f]);
    expect([...encodeRaw("ā")]).toEqual([0xc4, 0x81]);
    expect([...encodeRaw("😀")]).toEqual([0xf0, 0x9f, 0x98, 0x80]);
  });

  it("decodes binary strings as UTF-8 text", () => {
    const raw = toBinaryString(new TextEncoder().encode("GET /café"));
    expect(decodeRaw(raw)).toBe("GET /café");
  });
});
