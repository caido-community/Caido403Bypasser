import { runScript } from "shared";
import { describe, expect, it } from "vitest";

import { defaultTemplates } from "./index";

const request =
  "GET /admin/panel?x=1 HTTP/1.1\r\nHost: example.com\r\nUser-Agent: test\r\n\r\n";

describe("default templates", () => {
  it.each(defaultTemplates.map((t) => [t.id, t] as const))(
    "%s produces modified requests",
    (_, template) => {
      const result = runScript(request, template.modificationScript);
      expect(result.kind).toBe("Ok");
      const requests = result.kind === "Ok" ? result.value : [];
      expect(requests.length).toBeGreaterThan(0);
      expect(requests.some((r) => r !== request)).toBe(true);
    },
  );
});
