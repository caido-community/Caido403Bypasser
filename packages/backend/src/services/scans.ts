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
  type Settings,
  type Template,
} from "shared";

import type { Emit } from "../types";
import { getErrorMessage } from "../utils/errors";

export type SentRequest = {
  requestId: string;
  statusCode: number;
  length: number;
  roundtripTime: number;
};

type Options = {
  getTemplates: () => Template[];
  getSettings: () => Settings;
  send: (target: ScanTarget, raw: string) => Promise<SentRequest>;
  loadDetails: (requestId: string) => Promise<ResultDetails | undefined>;
  emit: Emit;
  onError: (message: string) => void;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

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

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class ScansService {
  private readonly entries = new Map<number, Entry>();
  private lastId = 0;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(private readonly options: Options) {
    this.sleep = options.sleep ?? defaultSleep;
    this.now = options.now ?? Date.now;
  }

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
        startedAt: this.now(),
        finishedAt: undefined,
        sent: 0,
        total: 0,
      },
      target,
      results: [],
      failedRequests: new Map(),
    };
    this.entries.set(entry.scan.id, entry);
    this.options.emit("scan:updated", entry.scan);

    this.run(entry).catch((error: unknown) => {
      this.options.onError(
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
      this.options.emit("scan:deleted", id);
      return ok(undefined);
    });
  }

  clear() {
    this.entries.clear();
    this.options.emit("scans:cleared");
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

    const details = await this.options.loadDetails(result.requestId);
    return details === undefined
      ? err(`Request ${result.requestId} no longer exists`)
      : ok(details);
  }

  private async run(entry: Entry) {
    const { templatesDelay, scanTimeout } = this.options.getSettings();
    const deadline = entry.scan.startedAt + scanTimeout;
    const requests = this.plan(entry);
    entry.scan.total = requests.length;
    this.options.emit("scan:updated", entry.scan);

    for (const [index, { templateId, raw }] of requests.entries()) {
      if (index > 0 && templatesDelay > 0) {
        await this.sleep(templatesDelay);
      }
      if (!this.isActive(entry)) {
        return;
      }
      if (this.now() >= deadline) {
        this.finish(entry, "TimedOut");
        return;
      }

      const id = entry.results.length + 1;
      try {
        const sent = await this.options.send(entry.target, raw);
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
      this.options.emit("scan:updated", entry.scan);
    }

    if (this.isActive(entry)) {
      this.finish(entry, "Completed");
    }
  }

  private plan(entry: Entry) {
    const requests: { templateId: string; raw: string }[] = [];
    for (const template of this.options.getTemplates()) {
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
    entry.scan.finishedAt = this.now();
    this.options.emit("scan:updated", entry.scan);
  }

  private addResult(entry: Entry, result: ScanResult) {
    entry.results.push(result);
    this.options.emit("result:created", entry.scan.id, result);
  }

  private withEntry<T>(id: number, fn: (entry: Entry) => Result<T>) {
    const entry = this.entries.get(id);
    return entry === undefined ? err<T>(`Scan ${id} not found`) : fn(entry);
  }
}
