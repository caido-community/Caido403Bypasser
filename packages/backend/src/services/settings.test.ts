import { mkdtemp, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

import { describe, expect, it } from "vitest";

import { SettingsService } from "./settings";

const tempFile = async () =>
  path.join(await mkdtemp(path.join(tmpdir(), "bypasser-")), "settings.json");

describe("settings service", () => {
  it("uses defaults without a file and persists updates", async () => {
    const file = await tempFile();
    const service = new SettingsService(file);
    await service.load();
    expect(service.get()).toEqual({
      templatesDelay: 100,
      scanTimeout: 300_000,
    });

    await service.update({ templatesDelay: 0, scanTimeout: 1_000 });
    expect(JSON.parse(await readFile(file, "utf-8"))).toEqual({
      templatesDelay: 0,
      scanTimeout: 1_000,
    });
  });

  it("loads saved settings and fills in missing keys", async () => {
    const file = await tempFile();
    await writeFile(file, JSON.stringify({ templatesDelay: 5, baseDir: "/x" }));
    const service = new SettingsService(file);
    await service.load();
    expect(service.get()).toEqual({ templatesDelay: 5, scanTimeout: 300_000 });
  });

  it("rejects out of range values", async () => {
    const service = new SettingsService(await tempFile());
    expect(
      (await service.update({ templatesDelay: -1, scanTimeout: 1_000 })).kind,
    ).toBe("Error");
    expect(
      (await service.update({ templatesDelay: 0, scanTimeout: 10 })).kind,
    ).toBe("Error");
    expect(service.get().templatesDelay).toBe(100);
  });
});
