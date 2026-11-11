<script setup lang="ts">
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
const { details, error } = useResultDetails();

const problem = computed(() => {
  const result = store.selectedResult;
  return result?.kind === "Error" ? result.error : error.value;
});

// Stopping propagation keeps Caido's global Mod+R from also sending its own active request.
const onSendShortcut = () => {
  if (store.selectedResultId !== undefined) {
    store.sendToReplay(store.selectedResultId);
  }
};
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
  <div
    v-else
    class="h-full flex flex-col min-h-0"
    @keydown.ctrl.r.exact.stop.prevent="onSendShortcut"
    @keydown.meta.r.exact.stop.prevent="onSendShortcut"
  >
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
            <EmptyState
              v-else-if="problem !== undefined"
              icon="fas fa-exclamation-triangle"
              :message="problem"
            />
            <EmptyState v-else icon="fas fa-ban" message="No response." />
          </template>
        </Card>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
