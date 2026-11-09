import type { CommandContext, GlobalContext } from "@caido/sdk-frontend";
import { describe, expect, it } from "vitest";

import { getScanSources } from "./scan";

const noPage = (): GlobalContext => ({});

describe("getScanSources", () => {
  it("scans the request being edited as raw CRLF bytes", () => {
    const context = {
      type: "RequestContext",
      request: {
        host: "example.com",
        port: 443,
        isTls: true,
        raw: "GET /é HTTP/1.1\nHost: example.com\n\n",
      },
    } as CommandContext;

    expect(getScanSources(context, noPage)).toEqual([
      {
        kind: "Raw",
        target: {
          host: "example.com",
          port: 443,
          isTls: true,
          raw: "GET /\xc3\xa9 HTTP/1.1\r\nHost: example.com\r\n\r\n",
        },
      },
    ]);
  });

  it("keeps bare LFs of a wire-format request", () => {
    const raw =
      'POST / HTTP/1.1\r\nHost: example.com\r\nContent-Length: 10\r\n\r\n{\n"a": 1\n}';
    const context = {
      type: "RequestContext",
      request: { host: "example.com", port: 443, isTls: true, raw },
    } as CommandContext;

    expect(getScanSources(context, noPage)).toEqual([
      {
        kind: "Raw",
        target: { host: "example.com", port: 443, isTls: true, raw },
      },
    ]);
  });

  it("scans at most 25 selected rows", () => {
    const context = {
      type: "RequestRowContext",
      requests: Array.from({ length: 30 }, (_, i) => ({ id: String(i) })),
    } as CommandContext;

    const sources = getScanSources(context, noPage);
    expect(sources).toHaveLength(25);
    expect(sources[0]).toEqual({ kind: "Request", requestId: "0" });
  });

  it("uses the HTTP History selection from the command palette", () => {
    const context = { type: "BaseContext" } as CommandContext;
    const globalContext = () =>
      ({
        page: {
          kind: "HTTPHistory",
          selection: { kind: "Selected", main: "7", secondary: ["8"] },
        },
      }) as GlobalContext;

    expect(getScanSources(context, globalContext)).toEqual([
      { kind: "Request", requestId: "7" },
      { kind: "Request", requestId: "8" },
    ]);
    expect(getScanSources(context, noPage)).toEqual([]);
  });
});
