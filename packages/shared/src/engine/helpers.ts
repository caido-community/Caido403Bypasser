import { HttpForge } from "ts-http-forge";

type Update = string | ((current: string) => string);

const CRLF = "\r\n";

const apply = (update: Update, current: string) =>
  typeof update === "function" ? update(current) : update;

const parseRequestLine = (input: string) => {
  const [method = "", target = "", version = ""] = (
    input.split(CRLF)[0] ?? ""
  ).split(" ");
  if (method === "" || target === "" || version === "") {
    throw new Error("Invalid request line");
  }

  const queryIndex = target.indexOf("?");
  return {
    method,
    path: queryIndex === -1 ? target : target.slice(0, queryIndex),
    query: queryIndex === -1 ? "" : target.slice(queryIndex + 1),
  };
};

const getBody = (input: string) => {
  const separator = input.indexOf(CRLF + CRLF);
  return separator === -1 ? "" : input.slice(separator + 4);
};

const headerName = (header: string) => {
  const colon = header.indexOf(":");
  return (colon === -1 ? header : header.slice(0, colon)).trim();
};

export const helper = {
  setLine: (
    input: string,
    lineNumber: number,
    update: (line: string | undefined) => string,
  ) => {
    const lines = input.split(CRLF);
    lines[lineNumber] = update(lines[lineNumber]);
    return lines.join(CRLF);
  },

  setMethod: (input: string, update: Update) =>
    HttpForge.create(input)
      .method(apply(update, parseRequestLine(input).method))
      .build(),

  setPath: (input: string, update: Update) =>
    HttpForge.create(input)
      .path(apply(update, parseRequestLine(input).path))
      .build(),

  setQuery: (input: string, update: Update) =>
    HttpForge.create(input)
      .setQuery(apply(update, parseRequestLine(input).query))
      .build(),

  addQueryParameter: (input: string, param: string) => {
    const equals = param.indexOf("=");
    if (equals === -1) {
      const { query } = parseRequestLine(input);
      return HttpForge.create(input)
        .setQuery(query === "" ? param : `${query}&${param}`)
        .build();
    }

    return HttpForge.create(input)
      .addQueryParam(param.slice(0, equals), param.slice(equals + 1))
      .build();
  },

  setBody: (input: string, update: Update) =>
    HttpForge.create(input)
      .body(apply(update, getBody(input)))
      .build(),

  addHeader: (input: string, header: string) => {
    const colon = header.indexOf(":");
    const value = colon === -1 ? "" : header.slice(colon + 1).trim();
    return HttpForge.create(input).addHeader(headerName(header), value).build();
  },

  removeHeader: (input: string, header: string) =>
    HttpForge.create(input).removeHeader(headerName(header)).build(),

  getMethod: (input: string) => parseRequestLine(input).method,
  getPath: (input: string) => parseRequestLine(input).path,
  getQuery: (input: string) => parseRequestLine(input).query,
  getBody,

  hasHeader: (input: string, header: string) => {
    const name = headerName(header).toLowerCase();
    const headerLines = input
      .split(CRLF + CRLF)[0]
      ?.split(CRLF)
      .slice(1);
    return (headerLines ?? []).some(
      (line) => line.includes(":") && headerName(line).toLowerCase() === name,
    );
  },
};
