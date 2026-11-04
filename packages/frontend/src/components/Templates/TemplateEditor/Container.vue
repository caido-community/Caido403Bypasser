<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";

import { AIGenerateDialog } from "../AIGenerateDialog";
import { TestPanel } from "../TestPanel";

import { useTemplateEditor } from "./useTemplateEditor";

import { fullHeightCardPt, splitterPanelPt, splitterPt } from "@/components/pt";
import { ScriptEditor } from "@/components/ScriptEditor";

const { draft, isNew, isDirty, isSaving, save, applyGenerated } =
  useTemplateEditor();
</script>

<template>
  <Splitter layout="vertical" :pt="splitterPt">
    <SplitterPanel :size="55" :min-size="25" :pt="splitterPanelPt">
      <Card :pt="fullHeightCardPt">
        <template #content>
          <div class="flex items-end gap-3 p-3">
            <label class="flex flex-col gap-1 w-56">
              <span class="text-xs text-surface-400">ID</span>
              <InputText v-model="draft.id" size="small" class="font-mono" />
            </label>
            <label class="flex flex-col gap-1 flex-1 min-w-0">
              <span class="text-xs text-surface-400">Description</span>
              <InputText v-model="draft.description" size="small" />
            </label>
            <AIGenerateDialog :draft="draft" @generated="applyGenerated" />
            <Button
              :label="isNew ? 'Create' : 'Save'"
              icon="fas fa-save"
              size="small"
              :loading="isSaving"
              :disabled="!isDirty"
              @click="save"
            />
          </div>
          <div class="flex-1 min-h-0 flex flex-col border-t border-surface-700">
            <ScriptEditor v-model="draft.modificationScript" />
          </div>
        </template>
      </Card>
    </SplitterPanel>
    <SplitterPanel :size="45" :min-size="20" :pt="splitterPanelPt">
      <TestPanel :script="draft.modificationScript" />
    </SplitterPanel>
  </Splitter>
</template>
