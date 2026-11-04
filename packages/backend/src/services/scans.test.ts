import type { Settings, Template } from "shared";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BackendSDK } from "../types";

import { ScansService } from "./scans";
import type { SettingsService } from "./settings";
import type { TemplatesService } from "./templates";

vi.mock("caido:utils", () => ({
  RequestSpecRaw: class {
    setHost() {}
    setTls() {}
    setPort() {}
    setRaw() {}
  },
}));

const target = {
  host: "example.com",
  port: 443,
  isTls: true,
  raw: "GET /admin HTTP/1.1\r\nHost: example.com\r\n\r\n",
};

const template = (id: string, script: string, enabled = true): Template => ({
  id,
  description: "",
  enabled,
  modificationScript: script,
});

const sent = (statusCode = 200) => ({
  request: { getId: () => "1" },
  response: {
    getCode: () => statusCode,
    getRaw: () => ({ toBytes: () => new Uint8Array(10) }),
    getRoundtripTime: () => 5,
  },
});

const setup = ({
  templates = [template("two", "return [input, input];")],
  settings = { templatesDelay: 0, scanTimeout: 60_000 },
  send = vi.fn(() => Promise.resolve(sent())),
}: {
  templates?: Template[];
  settings?: Settings;
  send?: () => Promise<unknown>;
} = {}) => {
  const emit = vi.fn();
  const sdk = {
    api: { send: emit },
    console: { error: vi.fn() },
    requests: {
      send,
      get: () =>
        Promise.resolve({
          request: { getRaw: () => ({ toText: () => "req" }) },
          response: { getRaw: () => ({ toText: () => "resp" }) },
        }),
    },
  } as unknown as BackendSDK;
  const service = new ScansService(
    sdk,
    { list: () => templates } as TemplatesService,
    { get: () => settings } as SettingsService,
  );
  return { service, emit, send };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.useRealTimers();
});

describe("scans service", () => {
  it("sends every request of every enabled template", async () => {
    const { service, send } = setup({
      templates: [
        template("two", "return [input, input];"),
        template("off", "return input;", false),
      ],
    });

    const scan = service.start(target);
    await settle();

    expect(scan).toMatchObject({
      url: "https://example.com/admin",
      status: "Completed",
      sent: 2,
      total: 2,
    });
    expect(send).toHaveBeenCalledTimes(2);
    const results = service.getResults(scan.id);
    expect(results.kind === "Ok" && results.value).toEqual([
      expect.objectContaining({ kind: "Ok", id: 1, templateId: "two" }),
      expect.objectContaining({ kind: "Ok", id: 2, templateId: "two" }),
    ]);
  });

  it("records script and send failures as error results", async () => {
    const { service } = setup({
      templates: [
        template("broken", "throw new Error('nope');"),
        template("ok", "return input;"),
      ],
      send: () => Promise.reject(new Error("Connection refused")),
    });

    const scan = service.start(target);
    await settle();

    const results = service.getResults(scan.id);
    expect(results.kind === "Ok" && results.value).toEqual([
      {
        kind: "Error",
        id: 1,
        templateId: "broken",
        error: "Script failed: nope",
      },
      { kind: "Error", id: 2, templateId: "ok", error: "Connection refused" },
    ]);
    expect(await service.getDetails(scan.id, 2)).toEqual({
      kind: "Ok",
      value: { request: target.raw, response: undefined },
    });
  });

  it("loads details of sent requests", async () => {
    const { service } = setup();
    const scan = service.start(target);
    await settle();

    expect(await service.getDetails(scan.id, 1)).toEqual({
      kind: "Ok",
      value: { request: "req", response: "resp" },
    });
    expect((await service.getDetails(scan.id, 99)).kind).toBe("Error");
  });

  it("stops when the timeout is reached", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { service } = setup({
      templates: [template("many", "return [input, input, input];")],
      settings: { templatesDelay: 0, scanTimeout: 1_000 },
      send: () => {
        vi.setSystemTime(Date.now() + 600);
        return Promise.resolve(sent(403));
      },
    });

    const scan = service.start(target);
    await settle();

    expect(scan).toMatchObject({ status: "TimedOut", sent: 2, total: 3 });
  });

  it("stops sending once cancelled", async () => {
    const { service, send } = setup({
      templates: [template("many", "return [input, input, input];")],
    });

    const scan = service.start(target);
    service.cancel(scan.id);
    await settle();

    expect(scan.status).toBe("Cancelled");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("deletes, clears and reruns scans", async () => {
    const { service, emit } = setup();

    const first = service.start(target);
    const rerun = service.rerun(first.id);
    expect(rerun.kind === "Ok" && rerun.value.id).toBe(2);

    service.remove(first.id);
    expect(emit).toHaveBeenCalledWith("scan:deleted", first.id);
    expect(service.list().map((scan) => scan.id)).toEqual([2]);

    service.clear();
    expect(service.list()).toEqual([]);
    expect(service.cancel(2).kind).toBe("Error");
    await settle();
  });
});
