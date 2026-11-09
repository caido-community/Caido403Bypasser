// With CRLF present the text is wire format, where a bare LF is body content.
export const toCrlf = (raw: string) =>
  raw.includes("\r\n") ? raw : raw.replace(/\n/g, "\r\n");

export const toBinaryString = (text: string) =>
  Array.from(new TextEncoder().encode(text), (byte) =>
    String.fromCharCode(byte),
  ).join("");
