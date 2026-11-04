export const toCrlf = (raw: string) => raw.replace(/\r?\n/g, "\r\n");

export const toBinaryString = (text: string) =>
  Array.from(new TextEncoder().encode(text), (byte) =>
    String.fromCharCode(byte),
  ).join("");
