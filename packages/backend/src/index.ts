import { registerApi } from "./api";
import { ScansService } from "./services/scans";
import { SettingsService } from "./services/settings";
import { TemplatesService } from "./services/templates";
import type { BackendSDK } from "./types";
import { getErrorMessage } from "./utils/errors";

export async function init(sdk: BackendSDK) {
  const templates = new TemplatesService(sdk);
  const settings = new SettingsService(sdk);
  const scans = new ScansService(sdk, templates, settings);

  registerApi(sdk, { templates, settings, scans });
  sdk.events.onProjectChange(() => scans.clear());

  await Promise.all([
    templates.load().catch((error: unknown) => {
      sdk.console.error(`Failed to load templates: ${getErrorMessage(error)}`);
    }),
    settings.load().catch((error: unknown) => {
      sdk.console.error(`Failed to load settings: ${getErrorMessage(error)}`);
    }),
  ]);
}
