import type { AIUpstreamModel } from "@caido/sdk-frontend";
import { useStorage } from "@vueuse/core";
import type { Template } from "shared";
import { computed, onBeforeUnmount, ref } from "vue";

import { type GeneratedTemplate, generateTemplate } from "@/ai/generate";
import { useSDK } from "@/plugins/sdk";
import { useTemplatesStore } from "@/stores/templates";
import { getErrorMessage } from "@/utils/errors";
import { toCrlf } from "@/utils/request";

export const useAIGenerate = (
  draft: () => Template,
  onGenerated: (template: GeneratedTemplate) => void,
) => {
  const sdk = useSDK();
  const store = useTemplatesStore();

  const models = ref<AIUpstreamModel[]>(sdk.ai.getUpstreamModels());
  const listener = sdk.ai.onUpstreamModelsChange((updated) => {
    models.value = updated;
  });

  const modelGroups = computed(() =>
    sdk.ai
      .getUpstreamProviders()
      .map((provider) => ({
        label: provider.id,
        models: models.value.filter((m) => m.providerId === provider.id),
      }))
      .filter((group) => group.models.length > 0),
  );

  const storedModelId = useStorage("bypasser:ai-model", "");
  const selectedModelId = computed({
    get: () =>
      models.value.find((m) => m.modelId === storedModelId.value)?.modelId ??
      models.value[0]?.modelId,
    set: (modelId) => {
      storedModelId.value = modelId ?? "";
    },
  });

  const prompt = ref("");
  let controller: AbortController | undefined;
  const isGenerating = ref(false);

  const cancel = () => controller?.abort();

  const generate = async () => {
    const modelId = selectedModelId.value;
    if (modelId === undefined || prompt.value.trim() === "") {
      return false;
    }

    controller = new AbortController();
    isGenerating.value = true;
    try {
      onGenerated(
        await generateTemplate({
          model: sdk.ai.createProvider()(modelId),
          prompt: prompt.value,
          draft: draft(),
          testRequest: toCrlf(store.testRequest),
          abortSignal: controller.signal,
        }),
      );
      sdk.window.showToast("Template generated", { variant: "success" });
      return true;
    } catch (error) {
      if (!controller.signal.aborted) {
        sdk.window.showToast(
          `AI generation failed: ${getErrorMessage(error)}`,
          {
            variant: "error",
          },
        );
      }
      return false;
    } finally {
      isGenerating.value = false;
    }
  };

  onBeforeUnmount(() => {
    listener.stop();
    cancel();
  });

  return {
    modelGroups,
    selectedModelId,
    prompt,
    isGenerating,
    generate,
    cancel,
  };
};
