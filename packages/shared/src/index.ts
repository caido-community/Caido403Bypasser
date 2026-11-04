import type { DefinePluginPackageSpec } from "@caido/sdk-shared";

import type { API } from "./api";
import type { Events } from "./events";

export { type Result, ok, err } from "./result";
export type { API } from "./api";
export type { Events } from "./events";

export type Spec = DefinePluginPackageSpec<{
  manifestId: "bypasser";
  api: API;
  events: Events;
}>;
