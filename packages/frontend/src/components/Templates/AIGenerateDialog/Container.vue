<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import type { Template } from "shared";
import { ref } from "vue";

import { useAIGenerate } from "./useAIGenerate";

import type { GeneratedTemplate } from "@/ai/generate";

const { draft } = defineProps<{ draft: Template }>();
const emit = defineEmits<{ generated: [template: GeneratedTemplate] }>();

const visible = ref(false);
const { modelGroups, selectedModelId, prompt, isGenerating, generate, cancel } =
  useAIGenerate(
    () => draft,
    (template) => emit("generated", template),
  );

const onGenerate = async () => {
  if (await generate()) {
    visible.value = false;
    prompt.value = "";
  }
};
</script>

<template>
  <Button
    label="AI"
    icon="fas fa-magic"
    size="small"
    severity="secondary"
    outlined
    :loading="isGenerating"
    @click="visible = true"
  />
  <Dialog
    v-model:visible="visible"
    header="Generate with AI"
    modal
    class="w-[36rem]"
    @hide="cancel"
  >
    <div v-if="modelGroups.length > 0" class="flex flex-col gap-3">
      <p class="text-sm text-surface-400">
        Describe a new bypass technique, or how to change the current template.
        The result is checked against the test request and retried if it fails.
      </p>
      <Select
        v-model="selectedModelId"
        :options="modelGroups"
        option-group-label="label"
        option-group-children="models"
        option-label="displayName"
        option-value="modelId"
        placeholder="Select a model"
        aria-label="Model"
      />
      <Textarea
        v-model="prompt"
        rows="6"
        placeholder="e.g. Add ;foo=bar path parameters to every path segment"
        aria-label="Prompt"
        auto-resize
        @keydown.ctrl.enter="onGenerate"
        @keydown.meta.enter="onGenerate"
      />
      <div class="flex justify-end gap-2">
        <Button
          v-if="isGenerating"
          label="Cancel"
          severity="secondary"
          outlined
          @click="cancel"
        />
        <Button
          label="Generate"
          icon="fas fa-magic"
          :loading="isGenerating"
          :disabled="selectedModelId === undefined || prompt.trim() === ''"
          @click="onGenerate"
        />
      </div>
    </div>
    <p v-else class="text-sm text-surface-400">
      No AI models available. Configure a provider in Caido under Settings → AI.
    </p>
  </Dialog>
</template>
