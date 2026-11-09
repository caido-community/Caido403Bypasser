<script setup lang="ts">
import Card from "primevue/card";
import ContextMenu from "primevue/contextmenu";
import { computed, ref } from "vue";

import { statusClass, statusCodeClass, statusLabel } from "../status";

import { EmptyState } from "@/components/EmptyState";
import { fullHeightCardPt } from "@/components/pt";
import { SearchInput } from "@/components/SearchInput";
import { TextShimmer } from "@/components/TextShimmer";
import { type VirtualColumn, VirtualTable } from "@/components/VirtualTable";
import { useScansStore } from "@/stores/scans";

type Row = {
  id: number;
  templateId: string;
  statusCode: number | undefined;
  length: number | undefined;
  roundtripTime: number | undefined;
  error: string | undefined;
};

const columns: VirtualColumn<Row>[] = [
  { field: "id", label: "#", width: 70 },
  { field: "templateId", label: "Template", width: 260 },
  { field: "statusCode", label: "Status", width: 90 },
  { field: "length", label: "Length", width: 90 },
  { field: "roundtripTime", label: "Time" },
];

const store = useScansStore();
const search = ref("");

const rows = computed<Row[]>(() => {
  const query = search.value.toLowerCase();
  return store.results
    .map((result) =>
      result.kind === "Ok"
        ? { ...result, error: undefined }
        : {
            id: result.id,
            templateId: result.templateId,
            statusCode: undefined,
            length: undefined,
            roundtripTime: undefined,
            error: result.error,
          },
    )
    .filter(
      (row) =>
        query === "" ||
        row.templateId.toLowerCase().includes(query) ||
        String(row.statusCode ?? "error").startsWith(query),
    );
});

const menu = ref<InstanceType<typeof ContextMenu>>();
const menuItems = [
  {
    label: "Send to Replay",
    icon: "fas fa-paper-plane",
    command: () => {
      if (store.selectedResultId !== undefined) {
        store.sendToReplay(store.selectedResultId);
      }
    },
  },
];

const onContextMenu = (row: Row, event: MouseEvent) => {
  store.selectedResultId = row.id;
  menu.value?.show(event);
};
</script>

<template>
  <Card :pt="fullHeightCardPt">
    <template #content>
      <EmptyState
        v-if="store.selectedScan === undefined"
        icon="fas fa-list"
        message="Select a scan to see its results."
      />
      <template v-else>
        <div class="flex items-center gap-3 h-16 px-3 shrink-0">
          <div class="flex-1 min-w-0">
            <h3
              class="text-md font-semibold truncate"
              :title="store.selectedScan.url"
            >
              {{ store.selectedScan.url }}
            </h3>
            <p class="text-xs">
              <TextShimmer
                v-if="store.selectedScan.status === 'Running'"
                :text="`Scanning · ${store.selectedScan.sent} of ${store.selectedScan.total} requests sent`"
              />
              <template v-else>
                <span :class="statusClass(store.selectedScan.status)">
                  {{ statusLabel(store.selectedScan.status) }}
                </span>
                <span class="text-surface-400">
                  · {{ store.selectedScan.sent }} of
                  {{ store.selectedScan.total }} requests sent
                </span>
              </template>
            </p>
          </div>
          <SearchInput v-model="search" placeholder="Template or status" />
        </div>
        <VirtualTable
          :rows="rows"
          :columns="columns"
          :row-key="(row) => row.id"
          :selected-key="store.selectedResultId"
          @select="(row) => (store.selectedResultId = row.id)"
          @contextmenu="onContextMenu"
        >
          <template #cell="{ row, field }">
            <span
              v-if="field === 'statusCode'"
              :class="statusCodeClass(row.statusCode)"
              :title="row.error"
            >
              {{ row.statusCode ?? "Error" }}
            </span>
            <template v-else-if="field === 'roundtripTime'">
              {{
                row.roundtripTime === undefined ? "" : `${row.roundtripTime} ms`
              }}
            </template>
            <template v-else>{{ row[field] }}</template>
          </template>
          <template #empty>
            <EmptyState
              icon="fas fa-hourglass-half"
              :message="
                store.results.length === 0
                  ? 'No results yet.'
                  : 'No results match the filter.'
              "
            />
          </template>
        </VirtualTable>
        <ContextMenu ref="menu" :model="menuItems" />
      </template>
    </template>
  </Card>
</template>
