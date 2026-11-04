<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import ContextMenu from "primevue/contextmenu";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputText from "primevue/inputtext";
import type { MenuItem } from "primevue/menuitem";
import type { Scan } from "shared";
import { computed, ref } from "vue";

import { statusClass, statusLabel } from "../status";

import { EmptyState } from "@/components/EmptyState";
import { fullHeightCardPt } from "@/components/pt";
import { TextShimmer } from "@/components/TextShimmer";
import { type VirtualColumn, VirtualTable } from "@/components/VirtualTable";
import { useScansStore } from "@/stores/scans";

const columns: VirtualColumn<Scan>[] = [
  { field: "id", label: "#", width: 60 },
  { field: "url", label: "Target" },
  { field: "status", label: "Status", width: 120 },
];

const store = useScansStore();
const search = ref("");

const scans = computed(() => {
  const query = search.value.toLowerCase();
  return store.sortedScans.filter((scan) =>
    scan.url.toLowerCase().includes(query),
  );
});

const menu = ref<InstanceType<typeof ContextMenu>>();
const menuItems = ref<MenuItem[]>([]);

const onSelect = (scan: Scan) => {
  if (scan.id !== store.selectedScanId) {
    store.selectScan(scan.id);
  }
};

const onContextMenu = (scan: Scan, event: MouseEvent) => {
  menuItems.value = [
    scan.status === "Running"
      ? {
          label: "Cancel",
          icon: "fas fa-stop",
          command: () => store.cancel(scan.id),
        }
      : {
          label: "Run again",
          icon: "fas fa-redo",
          command: () => store.rerun(scan.id),
        },
    {
      label: "Delete",
      icon: "fas fa-trash",
      command: () => store.remove(scan.id),
    },
  ];
  menu.value?.show(event);
};

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
      <div class="flex items-center gap-2 h-16 px-3 shrink-0">
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
      <VirtualTable
        :rows="scans"
        :columns="columns"
        :row-key="(scan) => scan.id"
        :selected-key="store.selectedScanId"
        @select="onSelect"
        @contextmenu="onContextMenu"
      >
        <template #cell="{ row, field }">
          <span
            v-if="field === 'url'"
            :title="`${row.url}\nStarted ${formatTime(row.startedAt)}`"
          >
            {{ row.url }}
          </span>
          <TextShimmer
            v-else-if="field === 'status' && row.status === 'Running'"
            :text="`${row.sent}/${row.total}`"
          />
          <span v-else-if="field === 'status'" :class="statusClass(row.status)">
            {{ statusLabel(row.status) }}
          </span>
          <template v-else>{{ row[field] }}</template>
        </template>
        <template #empty>
          <EmptyState
            icon="fas fa-unlock"
            message="Right-click a request and choose “403Bypasser: Scan” to start."
          />
        </template>
      </VirtualTable>
      <ContextMenu ref="menu" :model="menuItems" />
    </template>
  </Card>
</template>
