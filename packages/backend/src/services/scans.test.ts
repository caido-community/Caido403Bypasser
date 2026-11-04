import type { Settings, Template } from "shared";
import { describe, expect, it, vi } from "vitest";

import { ScansService, type SentRequest } from "./scans";

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

const setup = ({
  templates = [template("two", "return [input, input];")],
  settings = { templatesDelay: 0, scanTimeout: 60_000 },
  send = vi.fn((): Promise<SentRequest> =>
    Promise.resolve({
      requestId: "1",
      statusCode: 200,
      length: 10,
      roundtripTime: 5,
    }),
  ),
  now = () => 0,
}: {
  templates?: Template[];
  settings?: Settings;
  send?: () => Promise<SentRequest>;
  now?: () => number;
} = {}) => {
  const emit = vi.fn();
  const service = new ScansService({
    getTemplates: () => templates,
    getSettings: () => settings,
    send,
    loadDetails: () => Promise.resolve({ request: "req", response: "resp" }),
    emit,
    onError: vi.fn(),
    sleep: () => Promise.resolve(),
    now,
  });
  return { service, emit, send };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

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
    let time = 0;
    const { service } = setup({
      templates: [template("many", "return [input, input, input];")],
      settings: { templatesDelay: 0, scanTimeout: 1_000 },
      send: () => {
        time += 600;
        return Promise.resolve({
          requestId: "1",
          statusCode: 403,
          length: 0,
          roundtripTime: 600,
        });
      },
      now: () => time,
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
