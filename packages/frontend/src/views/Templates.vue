<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { computed } from "vue";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { fullHeightCardPt, splitterPanelPt, splitterPt } from "@/components/pt";
import { TemplateActions } from "@/components/Templates/TemplateActions";
import { TemplateEditor } from "@/components/Templates/TemplateEditor";
import { TemplatesTable } from "@/components/Templates/TemplatesTable";
import { useTemplatesStore } from "@/stores/templates";

const store = useTemplatesStore();

const editorKey = computed(() => {
  const { selection } = store;
  return selection.kind === "Existing"
    ? `existing:${selection.id}`
    : selection.kind;
});
</script>

<template>
  <div class="h-full flex flex-col gap-1 min-h-0">
    <PageHeader
      title="Templates"
      description="Each enabled template turns the scanned request into variations that are sent to the target."
    >
      <template #actions>
        <TemplateActions />
      </template>
    </PageHeader>
    <Card
      v-if="store.templates.length === 0 && store.selection.kind === 'None'"
      class="flex-1 min-h-0"
      :pt="fullHeightCardPt"
    >
      <template #content>
        <EmptyState
          icon="fas fa-file-code"
          message="No templates yet. Create one, import some, or restore the defaults."
        >
          <Button
            label="Restore defaults"
            icon="fas fa-undo"
            size="small"
            severity="secondary"
            outlined
            @click="store.reset()"
          />
        </EmptyState>
      </template>
    </Card>
    <Splitter v-else :pt="splitterPt">
      <SplitterPanel :size="35" :min-size="20" :pt="splitterPanelPt">
        <TemplatesTable />
      </SplitterPanel>
      <SplitterPanel :size="65" :min-size="35" :pt="splitterPanelPt">
        <Card v-if="store.selection.kind === 'None'" :pt="fullHeightCardPt">
          <template #content>
            <EmptyState
              icon="fas fa-file-code"
              message="Select a template to edit it, or create a new one."
            />
          </template>
        </Card>
        <TemplateEditor v-else :key="editorKey" />
      </SplitterPanel>
    </Splitter>
  </div>
</template>
