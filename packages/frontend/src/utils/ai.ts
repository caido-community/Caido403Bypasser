import type {
  AIUpstreamModel,
  AIUpstreamProvider,
  AIUpstreamProviderKind,
} from "@caido/sdk-frontend";
import { generateText, Output } from "ai";
import { z } from "zod";

import type { FrontendSDK } from "@/types/types";
import { aiSystemPrompt } from "@/constants";

export type ModelGroup = {
  label: string;
  provider: string;
  models: AIUpstreamModel[];
};

const PROVIDER_LABELS: Partial<Record<AIUpstreamProviderKind, string>> = {
  ANTHROPIC: "Anthropic",
  BEDROCK: "Bedrock",
  CHATGPT: "ChatGPT",
  GEMINI: "Gemini",
  OPENAI: "OpenAI",
  OPENROUTER: "OpenRouter",
  XAI: "xAI",
};

function getProviderLabel(provider: AIUpstreamProvider) {
  if (provider.kind === "XAI" && provider.auth === "OAUTH") {
    return "Grok";
  }
  return PROVIDER_LABELS[provider.kind] ?? provider.id;
}

export function getModelKey(model: AIUpstreamModel) {
  return JSON.stringify([model.providerId, model.id]);
}

export function getModelGroups(sdk: FrontendSDK): ModelGroup[] {
  const models = sdk.ai.getUpstreamModels();
  const groups = sdk.ai
    .getUpstreamProviders()
    .map((provider) => ({
      label: getProviderLabel(provider),
      provider: provider.id,
      models: models.filter((model) => model.providerId === provider.id),
    }))
    .filter((group) => group.models.length > 0);
  return groups.map((group) => ({
    ...group,
    label: groups.some(
      (other) => other !== group && other.label === group.label,
    )
      ? `${group.label} (${group.provider})`
      : group.label,
  }));
}

const templateOutputSchema = z.object({
  id: z.string(),
  description: z.string(),
  script: z.string(),
});

export async function generateTemplate(
  sdk: FrontendSDK,
  model: AIUpstreamModel,
  userPrompt: string,
): Promise<{ id: string; description: string; script: string }> {
  const isAvailable = getModelGroups(sdk).some((group) =>
    group.models.some((m) => getModelKey(m) === getModelKey(model)),
  );
  if (!isAvailable) {
    throw new Error(`Model "${model.modelId}" is no longer available`);
  }

  let provider;
  try {
    provider = sdk.ai.createProvider();
  } catch (error) {
    throw new Error(
      `Failed to create AI provider: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const languageModel = provider(model.modelId);

  let result;
  try {
    result = await generateText({
      model: languageModel,
      system: aiSystemPrompt,
      prompt: userPrompt,
      output: Output.object({
        schema: templateOutputSchema,
      }),
    });
  } catch (error) {
    throw new Error(
      `AI generation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const output = templateOutputSchema.safeParse(result.output);
  if (!output.success) {
    throw new Error(`Invalid AI response: ${output.error.message}`);
  }

  return {
    id: output.data.id,
    description: output.data.description,
    script: output.data.script,
  };
}
