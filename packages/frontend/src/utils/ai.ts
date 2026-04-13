import { generateText, Output } from "ai";
import { z } from "zod";

import type { FrontendSDK } from "@/types/types";
import { aiSystemPrompt } from "@/constants";

export const ModelProvider = {
  OpenRouter: "openrouter",
  OpenAI: "openai",
  Anthropic: "anthropic",
  Google: "google",
} as const;

export type ModelProvider = (typeof ModelProvider)[keyof typeof ModelProvider];

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
}

export interface ModelGroup {
  label: string;
  provider: ModelProvider;
  models: Model[];
}

const MODEL_GROUPS: ModelGroup[] = [
  {
    label: "OpenAI",
    provider: ModelProvider.OpenAI,
    models: [
      { id: "gpt-5.4", name: "GPT 5.4", provider: ModelProvider.OpenAI },
      {
        id: "gpt-5.4-nano",
        name: "GPT 5.4 Nano",
        provider: ModelProvider.OpenAI,
      },
      {
        id: "gpt-5.3-codex",
        name: "GPT 5.3 Codex",
        provider: ModelProvider.OpenAI,
      },
    ],
  },
  {
    label: "Anthropic",
    provider: ModelProvider.Anthropic,
    models: [
      {
        id: "claude-sonnet-4-6",
        name: "Sonnet 4.6",
        provider: ModelProvider.Anthropic,
      },
      {
        id: "claude-opus-4-6",
        name: "Opus 4.6",
        provider: ModelProvider.Anthropic,
      },
    ],
  },
  {
    label: "Google",
    provider: ModelProvider.Google,
    models: [
      {
        id: "gemini-3.1-pro-preview-customtools",
        name: "Gemini 3.1 Pro",
        provider: ModelProvider.Google,
      },
      {
        id: "gemini-3-flash-preview",
        name: "Gemini 3 Flash",
        provider: ModelProvider.Google,
      },
    ],
  },
  {
    label: "OpenRouter",
    provider: ModelProvider.OpenRouter,
    models: [
      {
        id: "openai/gpt-5.4",
        name: "GPT 5.4",
        provider: ModelProvider.OpenRouter,
      },
      {
        id: "openai/gpt-5.4-nano",
        name: "GPT 5.4 Nano",
        provider: ModelProvider.OpenRouter,
      },
      {
        id: "anthropic/claude-sonnet-4.6",
        name: "Sonnet 4.6",
        provider: ModelProvider.OpenRouter,
      },
      {
        id: "anthropic/claude-opus-4.6",
        name: "Opus 4.6",
        provider: ModelProvider.OpenRouter,
      },
      {
        id: "google/gemini-3-flash-preview",
        name: "Gemini 3 Flash",
        provider: ModelProvider.OpenRouter,
      },
    ],
  },
];

export function isProviderConfigured(
  sdk: FrontendSDK,
  provider: ModelProvider,
): boolean {
  return sdk.ai
    .getUpstreamProviders()
    .some((p) => p.id === provider && p.status === "Ready");
}

export function getAvailableModelGroups(sdk: FrontendSDK): ModelGroup[] {
  return MODEL_GROUPS.filter((g) => isProviderConfigured(sdk, g.provider));
}

const templateOutputSchema = z.object({
  id: z.string(),
  description: z.string(),
  script: z.string(),
});

export async function generateTemplate(
  sdk: FrontendSDK,
  model: Model,
  userPrompt: string,
): Promise<{ id: string; description: string; script: string }> {
  if (!isProviderConfigured(sdk, model.provider)) {
    throw new Error(`Provider "${model.provider}" is not configured`);
  }

  let provider;
  try {
    provider = sdk.ai.createProvider();
  } catch (error) {
    throw new Error(
      `Failed to create AI provider: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const modelKey = `${model.provider}/${model.id}`;
  const languageModel = provider(modelKey, {
    capabilities: {
      reasoning: false,
      structured_output: true,
    },
  });

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
