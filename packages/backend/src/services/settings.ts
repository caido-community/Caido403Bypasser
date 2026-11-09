import { readFile, writeFile } from "fs/promises";
import path from "path";

import { err, ok, type Result, type Settings, settingsSchema } from "shared";
import { z } from "zod";

import type { BackendSDK } from "../types";
import { exists } from "../utils/fs";

const defaultSettings: Settings = {
  templatesDelay: 100,
  scanTimeout: 30 * 60 * 1000,
};

export class SettingsService {
  private settings = defaultSettings;
  private readonly file: string;

  constructor(sdk: BackendSDK) {
    this.file = path.join(sdk.meta.path(), "settings.json");
  }

  get() {
    return this.settings;
  }

  async load() {
    const { file } = this;
    if (!(await exists(file))) {
      return;
    }

    const parsed = settingsSchema.safeParse({
      ...defaultSettings,
      ...JSON.parse(await readFile(file, "utf-8")),
    });
    if (!parsed.success) {
      throw new Error(`Invalid settings: ${z.prettifyError(parsed.error)}`);
    }
    this.settings = parsed.data;
  }

  async update(input: unknown): Promise<Result<Settings>> {
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      return err(z.prettifyError(parsed.error));
    }

    await writeFile(this.file, JSON.stringify(parsed.data, undefined, 2));
    this.settings = parsed.data;
    return ok(this.settings);
  }
}
