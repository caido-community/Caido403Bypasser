import {
  generateText,
  type LanguageModel,
  type ModelMessage,
  Output,
} from "ai";
import { runScript, type Template, templateSchema } from "shared";
import { z } from "zod";

import { scriptHelp } from "@/constants";

const MAX_ATTEMPTS = 3;

const outputSchema = z.object({
  id: z.string().describe("Kebab-case template ID matching ^[a-zA-Z0-9-]+$"),
  description: z.string().describe("One short sentence on what it does"),
  modificationScript: z
    .string()
    .describe("JavaScript function body that ends with a return statement"),
});

export type GeneratedTemplate = z.infer<typeof outputSchema>;

const systemPrompt = `You write templates for 403Bypasser, a Caido plugin that tries to bypass 403 Forbidden responses by sending many variations of a request.
A template is a JavaScript function body that receives the original request and returns modified requests.

${scriptHelp}

Notes:
- Helpers never mutate their argument; always use the returned value.
- Requests use CRLF line endings. Characters up to \\xFF are sent as raw bytes.
- Prefer returning an array that covers many variations of the technique.
- Keep the script short and readable.

Example:
const suffixes = [".json", "/", "/.", "..;/"];
return suffixes.map((suffix) => helper.setPath(input, (path) => path + suffix));`;

export const validateGenerated = (
  generated: GeneratedTemplate,
  testRequest: string,
): string | undefined => {
  const parsed = templateSchema.safeParse({ ...generated, enabled: true });
  if (!parsed.success) {
    return z.prettifyError(parsed.error);
  }

  const result = runScript(testRequest, generated.modificationScript);
  if (result.kind === "Error") {
    return `Running the script failed: ${result.error}`;
  }
  if (!result.value.some((request) => request !== testRequest)) {
    return "The script did not return any modified request.";
  }
  return undefined;
};

type Options = {
  model: LanguageModel;
  prompt: string;
  draft: Template;
  testRequest: string;
  abortSignal?: AbortSignal;
};

export const generateTemplate = async ({
  model,
  prompt,
  draft,
  testRequest,
  abortSignal,
}: Options): Promise<GeneratedTemplate> => {
  const messages: ModelMessage[] = [
    {
      role: "user",
      content: `Current template (refine it if the request asks for changes, otherwise replace it):
${JSON.stringify({ id: draft.id, description: draft.description, modificationScript: draft.modificationScript })}

Test request:
${testRequest}

Request: ${prompt}`,
    },
  ];

  for (let attempt = 1; ; attempt++) {
    const { output } = await generateText({
      model,
      system: systemPrompt,
      messages,
      output: Output.object({ schema: outputSchema }),
      abortSignal,
    });

    const problem = validateGenerated(output, testRequest);
    if (problem === undefined) {
      return output;
    }
    if (attempt === MAX_ATTEMPTS) {
      throw new Error(
        `The model did not produce a working template after ${MAX_ATTEMPTS} attempts: ${problem}`,
      );
    }

    messages.push(
      { role: "assistant", content: JSON.stringify(output) },
      {
        role: "user",
        content: `The template is invalid: ${problem}\nFix it and return the complete template again.`,
      },
    );
  }
};
