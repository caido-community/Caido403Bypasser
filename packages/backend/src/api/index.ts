import { err, ok, type Result, scanSourceSchema } from "shared";
import { z } from "zod";

import type { HttpService } from "../services/http";
import type { ScansService } from "../services/scans";
import type { SettingsService } from "../services/settings";
import type { TemplatesService } from "../services/templates";
import type { BackendSDK } from "../types";
import { getErrorMessage } from "../utils/errors";

type Services = {
  templates: TemplatesService;
  settings: SettingsService;
  scans: ScansService;
  http: HttpService;
};

const guard = async <T>(fn: () => Promise<Result<T>>): Promise<Result<T>> => {
  try {
    return await fn();
  } catch (error) {
    return err(getErrorMessage(error));
  }
};

export const registerApi = (
  sdk: BackendSDK,
  { templates, settings, scans, http }: Services,
) => {
  sdk.api.register("getTemplates", () => ok(templates.list()));
  sdk.api.register("saveTemplate", (_, previousId, template) =>
    guard(() => templates.save(previousId, template)),
  );
  sdk.api.register("deleteTemplate", (_, id) =>
    guard(() => templates.remove(id)),
  );
  sdk.api.register("importTemplate", (_, yaml) =>
    guard(() => templates.importYaml(yaml)),
  );
  sdk.api.register("exportTemplate", (_, id) => templates.exportYaml(id));
  sdk.api.register("resetTemplates", () =>
    guard(async () => ok(await templates.reset())),
  );
  sdk.api.register("deleteAllTemplates", () =>
    guard(async () => ok(await templates.clear())),
  );

  sdk.api.register("getScans", () => ok(scans.list()));
  sdk.api.register("startScan", (_, input) =>
    guard(async () => {
      const source = scanSourceSchema.safeParse(input);
      if (!source.success) {
        return err(z.prettifyError(source.error));
      }
      if (source.data.kind === "Raw") {
        return ok(scans.start(source.data.target));
      }

      const target = await http.loadTarget(source.data.requestId);
      return target === undefined
        ? err(`Request ${source.data.requestId} not found`)
        : ok(scans.start(target));
    }),
  );
  sdk.api.register("rerunScan", (_, id) => scans.rerun(id));
  sdk.api.register("cancelScan", (_, id) => scans.cancel(id));
  sdk.api.register("deleteScan", (_, id) => scans.remove(id));
  sdk.api.register("clearScans", () => ok(scans.clear()));
  sdk.api.register("getScanResults", (_, id) => scans.getResults(id));
  sdk.api.register("getResultDetails", (_, scanId, resultId) =>
    guard(() => scans.getDetails(scanId, resultId)),
  );

  sdk.api.register("getSettings", () => ok(settings.get()));
  sdk.api.register("updateSettings", (_, input) =>
    guard(() => settings.update(input)),
  );
};
