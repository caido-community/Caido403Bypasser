<script setup lang="ts">
import Card from "primevue/card";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputText from "primevue/inputtext";
import ProgressBar from "primevue/progressbar";
import { computed, ref } from "vue";

import { statusCodeClass } from "../status";

import { EmptyState } from "@/components/EmptyState";
import { fullHeightCardPt } from "@/components/pt";
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
  { field: "templateId", label: "Template" },
  { field: "statusCode", label: "Status", width: 90 },
  { field: "length", label: "Length", width: 90 },
  { field: "roundtripTime", label: "Time", width: 90 },
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

const progress = computed(() => {
  const scan = store.selectedScan;
  return scan === undefined || scan.total === 0
    ? 0
    : Math.round((scan.sent / scan.total) * 100);
});
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
        <div class="flex items-center gap-3 p-3">
          <div class="flex-1 min-w-0">
            <h3
              class="text-md font-semibold truncate"
              :title="store.selectedScan.url"
            >
              {{ store.selectedScan.url }}
            </h3>
            <p class="text-xs text-surface-400">
              {{ store.selectedScan.sent }} of {{ store.selectedScan.total }}
              requests sent
            </p>
          </div>
          <IconField>
            <InputIcon class="fas fa-search" />
            <InputText
              v-model="search"
              placeholder="Template or status"
              size="small"
            />
          </IconField>
        </div>
        <ProgressBar
          v-if="store.selectedScan.status === 'Running'"
          :value="progress"
          :show-value="false"
          class="h-1 mx-3 mb-2"
        />
        <VirtualTable
          :rows="rows"
          :columns="columns"
          :row-key="(row) => row.id"
          :selected-key="store.selectedResultId"
          @select="(row) => (store.selectedResultId = row.id)"
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
              message="No results yet."
            />
          </template>
        </VirtualTable>
      </template>
    </template>
  </Card>
</template>
