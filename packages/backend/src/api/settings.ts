import { readFile, writeFile } from "fs/promises";
import * as path from "path";

import { type SDK } from "caido:plugin";
import { type Result, type Settings } from "shared";

import { SettingsStore } from "../stores/settings";

export const getSettings = (sdk: SDK): Result<Settings> => {
  const settingsStore = SettingsStore.get();
  return {
    kind: "Success",
    value: {
      baseDir: sdk.meta.path(),
      ...settingsStore.getSettings(),
    },
  };
};

export const updateSettings = async (
  sdk: SDK,
  newSettings: Settings,
): Promise<Result<Settings>> => {
  if (newSettings.templatesDelay < 0 || newSettings.templatesDelay > 60000) {
    return { kind: "Error", error: "Templates delay must be between 0 and 60000 ms" };
  }
  if (newSettings.scanTimeout < 1000 || newSettings.scanTimeout > 3600000) {
    return { kind: "Error", error: "Scan timeout must be between 1000 and 3600000 ms" };
  }

  const settingsStore = SettingsStore.get();

  settingsStore.updateSettings(newSettings);
  const updatedSettings = settingsStore.getSettings();
  await saveSettingsToFile(sdk, updatedSettings);

  return { kind: "Success", value: updatedSettings };
};

const saveSettingsToFile = async (sdk: SDK, settings: Settings) => {
  const settingsPath = path.join(sdk.meta.path(), "settings.json");
  await writeFile(settingsPath, JSON.stringify(settings, null, 2));
};

export const loadSettingsFromFile = async (sdk: SDK) => {
  const settingsStore = SettingsStore.get();
  const settings = settingsStore.getSettings();

  const settingsPath = path.join(sdk.meta.path(), "settings.json");
  try {
    const _settings = JSON.parse(await readFile(settingsPath, "utf-8"));
    Object.assign(settings, _settings);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && (error as { code: string }).code === "ENOENT") {
      await saveSettingsToFile(sdk, settings);
    } else {
      throw error;
    }
  }
};
