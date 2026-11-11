import { Buffer } from "buffer";

export const toBinaryString = (bytes: Uint8Array) => {
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte);
  }
  return text;
};

// Binary string: chars up to U+00FF are raw bytes (e.g. "\x85"), anything above is sent as UTF-8.
export const encodeRaw = (raw: string) => {
  const bytes: number[] = [];
  for (const char of raw) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0xff) {
      bytes.push(code);
    } else if (code <= 0x7ff) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code <= 0xffff) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
};

// Caido's runtime has no TextDecoder.
export const decodeRaw = (raw: string) =>
  Buffer.from(encodeRaw(raw)).toString("utf8");
