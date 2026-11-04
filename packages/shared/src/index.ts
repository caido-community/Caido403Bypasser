import type { DefinePluginPackageSpec } from "@caido/sdk-shared";

import type { API } from "./api";
import type { Events } from "./events";

export { type Result, ok, err } from "./result";
export type { API } from "./api";
export type { Events } from "./events";
export { type Template, templateSchema } from "./template";
export { type Settings, settingsSchema } from "./settings";
export {
  type ResultDetails,
  type Scan,
  type ScanResult,
  type ScanSource,
  type ScanStatus,
  type ScanTarget,
  scanSourceSchema,
} from "./scan";
export { runScript } from "./engine";

export type Spec = DefinePluginPackageSpec<{
  manifestId: "bypasser";
  api: API;
  events: Events;
}>;
