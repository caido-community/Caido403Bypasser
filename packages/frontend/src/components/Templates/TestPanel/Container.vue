<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";

import { useTestPanel } from "./useTestPanel";

import { EmptyState } from "@/components/EmptyState";
import { HttpEditor } from "@/components/HttpEditor";
import { fullHeightCardPt, splitterPanelPt, splitterPt } from "@/components/pt";
import { useTemplatesStore } from "@/stores/templates";

const { script } = defineProps<{ script: string }>();

const store = useTemplatesStore();
const { output, index, requests, current, run } = useTestPanel(() => script);
</script>

<template>
  <Splitter :pt="splitterPt">
    <SplitterPanel :size="50" :min-size="20" :pt="splitterPanelPt">
      <Card :pt="fullHeightCardPt">
        <template #content>
          <div class="flex items-center gap-2 px-3 py-2">
            <h3 class="flex-1 text-sm font-semibold">Test request</h3>
            <Button
              label="Run"
              icon="fas fa-play"
              size="small"
              severity="secondary"
              outlined
              @click="run"
            />
          </div>
          <HttpEditor
            kind="request"
            :content="store.testRequest"
            @change="store.testRequest = $event"
          />
        </template>
      </Card>
    </SplitterPanel>
    <SplitterPanel :size="50" :min-size="20" :pt="splitterPanelPt">
      <Card :pt="fullHeightCardPt">
        <template #content>
          <div class="flex items-center gap-2 px-3 py-2">
            <h3 class="flex-1 text-sm font-semibold">
              Output
              <span
                v-if="requests.length > 0"
                class="font-normal text-surface-400"
              >
                {{ index + 1 }} / {{ requests.length }}
              </span>
            </h3>
            <Button
              icon="fas fa-chevron-left"
              size="small"
              severity="secondary"
              text
              aria-label="Previous request"
              :disabled="index === 0"
              @click="index -= 1"
            />
            <Button
              icon="fas fa-chevron-right"
              size="small"
              severity="secondary"
              text
              aria-label="Next request"
              :disabled="index >= requests.length - 1"
              @click="index += 1"
            />
          </div>
          <div
            v-if="output.kind === 'Error'"
            class="flex-1 min-h-0 p-3 text-sm text-red-400 font-mono whitespace-pre-wrap"
          >
            {{ output.error }}
          </div>
          <HttpEditor
            v-else-if="current !== undefined"
            kind="request"
            :content="current"
          />
          <EmptyState
            v-else
            icon="fas fa-flask"
            :message="
              output.kind === 'Idle'
                ? 'Run the script against the test request to preview its output.'
                : 'The script returned no requests.'
            "
          />
        </template>
      </Card>
    </SplitterPanel>
  </Splitter>
</template>
