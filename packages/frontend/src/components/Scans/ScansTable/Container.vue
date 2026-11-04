<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import type { Scan } from "shared";
import { computed, ref } from "vue";

import { statusSeverity } from "../status";

import { EmptyState } from "@/components/EmptyState";
import { fullHeightCardPt } from "@/components/pt";
import { useScansStore } from "@/stores/scans";

const store = useScansStore();
const search = ref("");

const scans = computed(() => {
  const query = search.value.toLowerCase();
  return store.sortedScans.filter((scan) =>
    scan.url.toLowerCase().includes(query),
  );
});

const selection = computed({
  get: () => store.selectedScan,
  set: (scan: Scan | undefined) => store.selectScan(scan?.id),
});

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
</script>

<template>
  <Card :pt="fullHeightCardPt">
    <template #content>
      <div class="flex items-center gap-2 p-3">
        <h3 class="text-md font-semibold flex-1">Scans</h3>
        <IconField>
          <InputIcon class="fas fa-search" />
          <InputText
            v-model="search"
            placeholder="Filter by URL"
            size="small"
          />
        </IconField>
        <Button
          v-tooltip.bottom="'Delete all scans'"
          icon="fas fa-trash"
          severity="danger"
          text
          size="small"
          :disabled="store.sortedScans.length === 0"
          @click="store.clear()"
        />
      </div>
      <DataTable
        v-model:selection="selection"
        :value="scans"
        data-key="id"
        selection-mode="single"
        :meta-key-selection="false"
        striped-rows
        scrollable
        scroll-height="flex"
        size="small"
        :pt="{
          root: { class: 'flex-1 min-h-0 flex flex-col' },
          tableContainer: { class: 'flex-1 min-h-0' },
        }"
      >
        <template #empty>
          <EmptyState
            icon="fas fa-unlock"
            message="Right-click a request and choose “403Bypasser: Scan” to start."
          />
        </template>
        <Column header="Target" class="max-w-0">
          <template #body="{ data }">
            <div class="truncate" :title="data.url">{{ data.url }}</div>
            <div class="text-xs text-surface-400">
              #{{ data.id }} · {{ formatTime(data.startedAt) }}
            </div>
          </template>
        </Column>
        <Column header="Status" class="w-28">
          <template #body="{ data }">
            <div class="flex flex-col items-start gap-1">
              <Tag
                :value="data.status"
                :severity="statusSeverity(data.status)"
              />
              <span
                v-if="data.status === 'Running'"
                class="text-xs text-surface-400"
              >
                {{ data.sent }}/{{ data.total }}
              </span>
            </div>
          </template>
        </Column>
        <Column class="w-20">
          <template #body="{ data }">
            <div class="flex justify-end">
              <Button
                v-if="data.status === 'Running'"
                v-tooltip="'Cancel'"
                icon="fas fa-stop"
                text
                size="small"
                severity="secondary"
                @click.stop="store.cancel(data.id)"
              />
              <Button
                v-else
                v-tooltip="'Run again'"
                icon="fas fa-redo"
                text
                size="small"
                severity="secondary"
                @click.stop="store.rerun(data.id)"
              />
              <Button
                v-tooltip="'Delete'"
                icon="fas fa-trash"
                text
                size="small"
                severity="danger"
                @click.stop="store.remove(data.id)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </template>
  </Card>
</template>
