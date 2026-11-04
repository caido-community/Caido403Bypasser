import { RequestSpecRaw } from "caido:utils";
import {
  err,
  ok,
  type Result,
  type ResultDetails,
  runScript,
  type Scan,
  type ScanResult,
  type ScanStatus,
  type ScanTarget,
} from "shared";

import type { BackendSDK } from "../types";
import { encodeRaw, toBinaryString } from "../utils/bytes";
import { getErrorMessage } from "../utils/errors";

import type { SettingsService } from "./settings";
import type { TemplatesService } from "./templates";

type Entry = {
  scan: Scan;
  target: ScanTarget;
  results: ScanResult[];
  failedRequests: Map<number, string>;
};

const toUrl = ({ host, port, isTls, raw }: ScanTarget) => {
  const isDefaultPort = port === (isTls ? 443 : 80);
  const path = raw.split("\r\n")[0]?.split(" ")[1] ?? "";
  return `${isTls ? "https" : "http"}://${host}${isDefaultPort ? "" : `:${port}`}${path}`;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class ScansService {
  private readonly entries = new Map<number, Entry>();
  private lastId = 0;

  constructor(
    private readonly sdk: BackendSDK,
    private readonly templates: TemplatesService,
    private readonly settings: SettingsService,
  ) {}

  list() {
    return [...this.entries.values()].map((entry) => entry.scan);
  }

  start(target: ScanTarget): Scan {
    this.lastId += 1;
    const entry: Entry = {
      scan: {
        id: this.lastId,
        url: toUrl(target),
        host: target.host,
        port: target.port,
        isTls: target.isTls,
        status: "Running",
        startedAt: Date.now(),
        finishedAt: undefined,
        sent: 0,
        total: 0,
      },
      target,
      results: [],
      failedRequests: new Map(),
    };
    this.entries.set(entry.scan.id, entry);
    this.sdk.api.send("scan:updated", entry.scan);

    this.run(entry).catch((error: unknown) => {
      this.sdk.console.error(
        `Scan ${entry.scan.id} failed: ${getErrorMessage(error)}`,
      );
      if (this.isActive(entry)) {
        this.finish(entry, "Failed");
      }
    });
    return entry.scan;
  }

  rerun(id: number) {
    return this.withEntry(id, (entry) => ok(this.start(entry.target)));
  }

  cancel(id: number) {
    return this.withEntry(id, (entry) => {
      if (entry.scan.status === "Running") {
        this.finish(entry, "Cancelled");
      }
      return ok(undefined);
    });
  }

  remove(id: number) {
    return this.withEntry(id, () => {
      this.entries.delete(id);
      this.sdk.api.send("scan:deleted", id);
      return ok(undefined);
    });
  }

  clear() {
    this.entries.clear();
    this.sdk.api.send("scans:cleared");
  }

  getResults(id: number) {
    return this.withEntry(id, (entry) => ok(entry.results));
  }

  async getDetails(
    scanId: number,
    resultId: number,
  ): Promise<Result<ResultDetails>> {
    const entry = this.entries.get(scanId);
    const result = entry?.results.find((r) => r.id === resultId);
    if (entry === undefined || result === undefined) {
      return err(`Result ${resultId} of scan ${scanId} not found`);
    }

    if (result.kind === "Error") {
      return ok({
        request: entry.failedRequests.get(resultId),
        response: undefined,
      });
    }

    const saved = await this.sdk.requests.get(result.requestId);
    return saved === undefined
      ? err(`Request ${result.requestId} no longer exists`)
      : ok({
          request: saved.request.getRaw().toText(),
          response: saved.response?.getRaw().toText(),
        });
  }

  async startFromRequest(requestId: string): Promise<Result<Scan>> {
    const saved = await this.sdk.requests.get(requestId);
    if (saved === undefined) {
      return err(`Request ${requestId} not found`);
    }
    const { request } = saved;
    return ok(
      this.start({
        host: request.getHost(),
        port: request.getPort(),
        isTls: request.getTls(),
        raw: toBinaryString(request.getRaw().toBytes()),
      }),
    );
  }

  private async send(target: ScanTarget, raw: string) {
    const spec = new RequestSpecRaw("http://localhost");
    spec.setHost(target.host);
    spec.setTls(target.isTls);
    spec.setPort(target.port);
    spec.setRaw(encodeRaw(raw));

    const { request, response } = await this.sdk.requests.send(spec);
    return {
      requestId: request.getId(),
      statusCode: response.getCode(),
      length: response.getRaw().toBytes().length,
      roundtripTime: response.getRoundtripTime(),
    };
  }

  private async run(entry: Entry) {
    const { templatesDelay, scanTimeout } = this.settings.get();
    const deadline = entry.scan.startedAt + scanTimeout;
    const requests = this.plan(entry);
    entry.scan.total = requests.length;
    this.sdk.api.send("scan:updated", entry.scan);

    for (const [index, { templateId, raw }] of requests.entries()) {
      if (index > 0 && templatesDelay > 0) {
        await sleep(templatesDelay);
      }
      if (!this.isActive(entry)) {
        return;
      }
      if (Date.now() >= deadline) {
        this.finish(entry, "TimedOut");
        return;
      }

      const id = entry.results.length + 1;
      try {
        const sent = await this.send(entry.target, raw);
        this.addResult(entry, { kind: "Ok", id, templateId, ...sent });
      } catch (error) {
        entry.failedRequests.set(id, raw);
        this.addResult(entry, {
          kind: "Error",
          id,
          templateId,
          error: getErrorMessage(error),
        });
      }
      entry.scan.sent += 1;
      this.sdk.api.send("scan:updated", entry.scan);
    }

    if (this.isActive(entry)) {
      this.finish(entry, "Completed");
    }
  }

  private plan(entry: Entry) {
    const requests: { templateId: string; raw: string }[] = [];
    for (const template of this.templates.list()) {
      if (!template.enabled) {
        continue;
      }

      const output = runScript(entry.target.raw, template.modificationScript);
      if (output.kind === "Error") {
        this.addResult(entry, {
          kind: "Error",
          id: entry.results.length + 1,
          templateId: template.id,
          error: `Script failed: ${output.error}`,
        });
        continue;
      }
      requests.push(
        ...output.value.map((raw) => ({ templateId: template.id, raw })),
      );
    }
    return requests;
  }

  private isActive(entry: Entry) {
    return (
      this.entries.get(entry.scan.id) === entry &&
      entry.scan.status === "Running"
    );
  }

  private finish(entry: Entry, status: ScanStatus) {
    entry.scan.status = status;
    entry.scan.finishedAt = Date.now();
    this.sdk.api.send("scan:updated", entry.scan);
  }

  private addResult(entry: Entry, result: ScanResult) {
    entry.results.push(result);
    this.sdk.api.send("result:created", entry.scan.id, result);
  }

  private withEntry<T>(id: number, fn: (entry: Entry) => Result<T>) {
    const entry = this.entries.get(id);
    return entry === undefined ? err<T>(`Scan ${id} not found`) : fn(entry);
  }
}
