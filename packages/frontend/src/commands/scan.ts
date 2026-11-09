import type {
  CommandContext,
  GlobalContext,
  ID,
  Selection,
} from "@caido/sdk-frontend";
import type { ScanSource } from "shared";

import { toBinaryString, toCrlf } from "@/utils/request";

const MAX_REQUESTS = 25;

const selectedIds = (selection: Selection<ID>) =>
  selection.kind === "Selected" ? [selection.main, ...selection.secondary] : [];

const getPageRequestIds = ({ page }: GlobalContext) => {
  switch (page?.kind) {
    case "HTTPHistory":
      return selectedIds(page.selection);
    case "Sitemap":
    case "Automate":
      return selectedIds(page.requestSelection);
    default:
      return [];
  }
};

const fromIds = (ids: string[]): ScanSource[] =>
  ids
    .slice(0, MAX_REQUESTS)
    .map((requestId) => ({ kind: "Request", requestId }));

export const getScanSources = (
  context: CommandContext,
  globalContext: () => GlobalContext,
): ScanSource[] => {
  switch (context.type) {
    case "RequestContext": {
      const { host, port, isTls, raw } = context.request;
      return [
        {
          kind: "Raw",
          target: { host, port, isTls, raw: toBinaryString(toCrlf(raw)) },
        },
      ];
    }
    case "RequestRowContext":
      return fromIds(context.requests.map((request) => request.id));
    case "ResponseContext":
      return fromIds([context.request.id]);
    case "BaseContext":
      return fromIds(getPageRequestIds(globalContext()));
  }
};
