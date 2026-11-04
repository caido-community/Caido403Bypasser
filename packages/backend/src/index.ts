// eslint-disable-next-line import/order -- must run before yaml is evaluated
import "./polyfills";

import path from "path";

import { registerApi } from "./api";
import { HttpService } from "./services/http";
import { ScansService } from "./services/scans";
import { SettingsService } from "./services/settings";
import { TemplatesService } from "./services/templates";
import type { BackendSDK, Emit } from "./types";
import { getErrorMessage } from "./utils/errors";

export async function init(sdk: BackendSDK) {
  const emit: Emit = sdk.api.send.bind(sdk.api);
  const logError = (message: string) => sdk.console.error(message);

  const templates = new TemplatesService({
    dir: path.join(sdk.meta.path(), "templates"),
    onChange: (list) => emit("templates:changed", list),
    onLoadError: logError,
  });
  const settings = new SettingsService(
    path.join(sdk.meta.path(), "settings.json"),
  );
  const http = new HttpService(sdk);
  const scans = new ScansService({
    getTemplates: () => templates.list(),
    getSettings: () => settings.get(),
    send: (target, raw) => http.send(target, raw),
    loadDetails: (requestId) => http.loadDetails(requestId),
    emit,
    onError: logError,
  });

  registerApi(sdk, { templates, settings, scans, http });
  sdk.events.onProjectChange(() => scans.clear());

  await Promise.all([
    templates.load().catch((error: unknown) => {
      logError(`Failed to load templates: ${getErrorMessage(error)}`);
    }),
    settings.load().catch((error: unknown) => {
      logError(`Failed to load settings: ${getErrorMessage(error)}`);
    }),
  ]);
}
