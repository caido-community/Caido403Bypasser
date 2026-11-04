<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";
import Card from "primevue/card";
import InputNumber from "primevue/inputnumber";
import type { Settings } from "shared";

import { PageHeader } from "@/components/PageHeader";
import { useSettingsStore } from "@/stores/settings";

const store = useSettingsStore();

const save = useDebounceFn((settings: Settings) => store.update(settings), 400);

const setField = (field: keyof Settings, value: number | undefined) => {
  if (store.settings !== undefined && value !== undefined) {
    save({ ...store.settings, [field]: value });
  }
};
</script>

<template>
  <div class="h-full flex flex-col gap-1 min-h-0">
    <PageHeader
      title="Settings"
      description="Control how fast scans send requests and when they stop."
    />
    <Card
      class="shrink-0"
      :pt="{ body: { class: 'p-0' }, content: { class: 'p-0' } }"
    >
      <template #content>
        <div class="p-4 space-y-4">
          <div>
            <h3 class="text-md font-semibold">Scan settings</h3>
            <p class="text-sm text-surface-400">
              Changes are saved automatically.
            </p>
          </div>
          <div
            v-if="store.settings !== undefined"
            class="grid gap-x-8 gap-y-4 md:grid-cols-2"
          >
            <div class="space-y-3">
              <div>
                <label for="templates-delay" class="text-sm font-medium block">
                  Delay between requests (ms)
                </label>
                <p class="text-xs text-surface-400 mt-px">
                  Pause after each request, to stay under rate limits.
                </p>
              </div>
              <InputNumber
                input-id="templates-delay"
                :model-value="store.settings.templatesDelay"
                :min="0"
                :max="60000"
                @update:model-value="
                  setField('templatesDelay', $event ?? undefined)
                "
              />
            </div>
            <div class="space-y-3">
              <div>
                <label for="scan-timeout" class="text-sm font-medium block">
                  Scan timeout (ms)
                </label>
                <p class="text-xs text-surface-400 mt-px">
                  Scans running longer than this are stopped.
                </p>
              </div>
              <InputNumber
                input-id="scan-timeout"
                :model-value="store.settings.scanTimeout"
                :min="1000"
                :max="3600000"
                @update:model-value="
                  setField('scanTimeout', $event ?? undefined)
                "
              />
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
