<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { computed } from "vue";

import { useResultDetails } from "./useResultDetails";

import { EmptyState } from "@/components/EmptyState";
import { HttpEditor } from "@/components/HttpEditor";
import { fullHeightCardPt, splitterPanelPt, splitterPt } from "@/components/pt";
import { useScansStore } from "@/stores/scans";

const store = useScansStore();
const { details, error, sendToReplay } = useResultDetails();

const problem = computed(() => {
  const result = store.selectedResult;
  return result?.kind === "Error" ? result.error : error.value;
});
</script>

<template>
  <Card v-if="store.selectedResult === undefined" :pt="fullHeightCardPt">
    <template #content>
      <EmptyState
        icon="fas fa-exchange-alt"
        message="Select a result to inspect its request and response."
      />
    </template>
  </Card>
  <div v-else class="h-full flex flex-col gap-1 min-h-0">
    <Card
      class="shrink-0"
      :pt="{ body: { class: 'p-0' }, content: { class: 'p-0' } }"
    >
      <template #content>
        <div class="flex items-center gap-3 px-3 py-2 min-w-0">
          <i
            v-if="problem !== undefined"
            class="fas fa-exclamation-triangle text-red-400"
          />
          <span
            class="flex-1 min-w-0 truncate text-sm"
            :class="problem === undefined ? 'text-surface-300' : 'text-red-400'"
            :title="problem"
          >
            {{ problem ?? store.selectedResult.templateId }}
          </span>
          <Button
            label="Send to Replay"
            icon="fas fa-paper-plane"
            size="small"
            severity="secondary"
            outlined
            :disabled="details?.request === undefined"
            @click="sendToReplay"
          />
        </div>
      </template>
    </Card>
    <Splitter :pt="splitterPt">
      <SplitterPanel :size="50" :min-size="20" :pt="splitterPanelPt">
        <Card :pt="fullHeightCardPt">
          <template #content>
            <HttpEditor
              v-if="details?.request !== undefined"
              kind="request"
              :content="details.request"
            />
            <EmptyState v-else icon="fas fa-file" message="No request." />
          </template>
        </Card>
      </SplitterPanel>
      <SplitterPanel :size="50" :min-size="20" :pt="splitterPanelPt">
        <Card :pt="fullHeightCardPt">
          <template #content>
            <HttpEditor
              v-if="details?.response !== undefined"
              kind="response"
              :content="details.response"
            />
            <EmptyState v-else icon="fas fa-ban" message="No response." />
          </template>
        </Card>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
