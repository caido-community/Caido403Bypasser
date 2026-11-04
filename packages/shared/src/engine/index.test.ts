import { describe, expect, it } from "vitest";

import { helper } from "./helpers";

import { runScript } from "./index";

const request =
  'POST /api/users?id=1 HTTP/1.1\r\nHost: example.com\r\nContent-Type: application/json\r\n\r\n{"a":1}';

describe("helper", () => {
  it("reads the request line and body", () => {
    expect(helper.getMethod(request)).toBe("POST");
    expect(helper.getPath(request)).toBe("/api/users");
    expect(helper.getQuery(request)).toBe("id=1");
    expect(helper.getBody(request)).toBe('{"a":1}');
  });

  it("keeps everything after the first question mark as the query", () => {
    const input = "GET /a?b=1?c HTTP/1.1\r\nHost: x\r\n\r\n";
    expect(helper.getQuery(input)).toBe("b=1?c");
  });

  it("throws on an invalid request line", () => {
    expect(() => helper.getPath("garbage")).toThrow("Invalid request line");
  });

  it("sets path, method and query from a value or a function", () => {
    const updated = helper.setMethod(
      helper.setPath(request, (path) => `${path}.json`),
      "PUT",
    );
    expect(updated.split("\r\n")[0]).toBe("PUT /api/users.json?id=1 HTTP/1.1");
    expect(
      helper.setQuery(request, (query) => `${query}&x=2`).split("\r\n")[0],
    ).toBe("POST /api/users?id=1&x=2 HTTP/1.1");
  });

  it("adds query parameters with and without a value", () => {
    expect(helper.getQuery(helper.addQueryParameter(request, "debug"))).toBe(
      "id=1&debug",
    );
    expect(helper.getQuery(helper.addQueryParameter(request, "a=b"))).toBe(
      "id=1&a=b",
    );
    const noQuery = "GET / HTTP/1.1\r\nHost: x\r\n\r\n";
    expect(helper.getQuery(helper.addQueryParameter(noQuery, "debug"))).toBe(
      "debug",
    );
  });

  it("adds, detects and removes headers case-insensitively", () => {
    const added = helper.addHeader(request, "X-Forwarded-For: 127.0.0.1");
    expect(added).toContain("X-Forwarded-For: 127.0.0.1\r\n");
    expect(helper.hasHeader(added, "x-forwarded-for")).toBe(true);
    expect(helper.hasHeader(request, "X-Forwarded-For")).toBe(false);

    const removed = helper.removeHeader(added, "Content-Type");
    expect(helper.hasHeader(removed, "content-type")).toBe(false);
    expect(helper.hasHeader(removed, "Host")).toBe(true);
  });

  it("does not treat body lines as headers", () => {
    const input = "POST / HTTP/1.1\r\nHost: x\r\n\r\nSecret: value";
    expect(helper.hasHeader(input, "Secret")).toBe(false);
  });

  it("replaces the body", () => {
    expect(helper.getBody(helper.setBody(request, (body) => body + "!"))).toBe(
      '{"a":1}!',
    );
  });

  it("updates a single line", () => {
    const updated = helper.setLine(request, 1, () => "Host: other.com");
    expect(updated.split("\r\n")[1]).toBe("Host: other.com");
  });
});

describe("runScript", () => {
  it("wraps a single request into an array", () => {
    expect(runScript(request, "return input;")).toEqual({
      kind: "Ok",
      value: [request],
    });
  });

  it("returns every request of an array", () => {
    const result = runScript(
      request,
      'return ["A", "B"].map((h) => helper.addHeader(input, `X-${h}: 1`));',
    );
    expect(result.kind === "Ok" && result.value).toHaveLength(2);
  });

  it("allows returning no requests", () => {
    expect(runScript(request, "return [];")).toEqual({ kind: "Ok", value: [] });
  });

  it("reports thrown errors", () => {
    expect(runScript(request, 'throw new Error("boom");')).toEqual({
      kind: "Error",
      error: "boom",
    });
  });

  it("reports syntax errors", () => {
    expect(runScript(request, "return (").kind).toBe("Error");
  });

  it("rejects non-string output", () => {
    expect(runScript(request, "helper.setPath(input, '/x');").kind).toBe(
      "Error",
    );
    expect(runScript(request, "return [input, 1];").kind).toBe("Error");
  });
});
