import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";

import { generateTemplate, validateGenerated } from "./generate";

const testRequest = "GET /admin HTTP/1.1\r\nHost: example.com\r\n\r\n";
const draft = {
  id: "draft",
  description: "",
  enabled: true,
  modificationScript: "return input;",
};

const reply = (template: object) => ({
  content: [{ type: "text" as const, text: JSON.stringify(template) }],
  finishReason: { unified: "stop" as const, raw: "stop" },
  usage: {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  },
  warnings: [],
});

const mockModel = (templates: object[]) => {
  const queue = templates.map(reply);
  return new MockLanguageModelV3({
    doGenerate: () => {
      const next = queue.shift();
      if (next === undefined) {
        throw new Error("No more replies");
      }
      return Promise.resolve(next);
    },
  });
};

const working = {
  id: "add-dot",
  description: "Appends /. to the path",
  modificationScript: 'return helper.setPath(input, (p) => p + "/.");',
};

describe("validateGenerated", () => {
  it("accepts a working template", () => {
    expect(validateGenerated(working, testRequest)).toBeUndefined();
  });

  it("rejects invalid IDs, failing scripts and no-op scripts", () => {
    expect(
      validateGenerated({ ...working, id: "bad id" }, testRequest),
    ).toBeDefined();
    expect(
      validateGenerated(
        { ...working, modificationScript: "throw 1;" },
        testRequest,
      ),
    ).toContain("failed");
    expect(
      validateGenerated(
        { ...working, modificationScript: "return input;" },
        testRequest,
      ),
    ).toContain("modified");
  });
});

describe("generateTemplate", () => {
  it("feeds validation errors back to the model until it succeeds", async () => {
    const model = mockModel([
      { ...working, modificationScript: "return input.foo.bar;" },
      working,
    ]);

    const result = await generateTemplate({
      model,
      prompt: "append /.",
      draft,
      testRequest,
    });

    expect(result).toEqual(working);
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(JSON.stringify(model.doGenerateCalls[1]?.prompt)).toContain(
      "Running the script failed",
    );
  });

  it("gives up after three invalid answers", async () => {
    const broken = { ...working, modificationScript: "return input;" };
    const model = mockModel([broken, broken, broken]);

    await expect(
      generateTemplate({ model, prompt: "x", draft, testRequest }),
    ).rejects.toThrow("after 3 attempts");
  });
});
