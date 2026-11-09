<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import ToggleSwitch from "primevue/toggleswitch";
import type { Template } from "shared";
import { computed, ref } from "vue";

import { EmptyState } from "@/components/EmptyState";
import { fullHeightCardPt } from "@/components/pt";
import { SearchInput } from "@/components/SearchInput";
import { useTemplatesStore } from "@/stores/templates";
import { useDangerConfirm } from "@/utils/confirm";

const store = useTemplatesStore();
const requireConfirm = useDangerConfirm();
const search = ref("");

const templates = computed(() => {
  const query = search.value.toLowerCase();
  return store.templates.filter(
    (t) =>
      t.id.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query),
  );
});

const enabledCount = computed(
  () => store.templates.filter((t) => t.enabled).length,
);

const selection = computed({
  get: () => store.selected,
  set: (template: Template | undefined) => {
    store.selection =
      template === undefined
        ? { kind: "None" }
        : { kind: "Existing", id: template.id };
  },
});

const onDelete = (template: Template) =>
  requireConfirm(
    `Template ${template.id} will be deleted.`,
    () => store.remove(template.id),
    "Delete",
  );
</script>

<template>
  <Card :pt="fullHeightCardPt">
    <template #content>
      <div class="flex items-center gap-2 h-16 px-3 shrink-0">
        <div class="flex-1 min-w-0">
          <h3 class="text-md font-semibold">Library</h3>
          <p class="text-xs text-surface-400">
            {{ enabledCount }} of {{ store.templates.length }} enabled
          </p>
        </div>
        <SearchInput v-model="search" placeholder="Filter" />
      </div>
      <DataTable
        v-model:selection="selection"
        :value="templates"
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
            icon="fas fa-file-code"
            :message="
              store.templates.length === 0
                ? 'No templates. Create one or restore the defaults.'
                : 'No templates match the filter.'
            "
          />
        </template>
        <Column class="w-16">
          <template #body="{ data }">
            <div class="flex items-center">
              <ToggleSwitch
                :model-value="data.enabled"
                :aria-label="`Enable ${data.id}`"
                @click.stop
                @update:model-value="store.toggle(data)"
              />
            </div>
          </template>
        </Column>
        <Column header="Template" class="max-w-0">
          <template #body="{ data }">
            <div class="truncate" :title="data.id">{{ data.id }}</div>
            <div
              class="truncate text-xs text-surface-400"
              :title="data.description"
            >
              {{ data.description }}
            </div>
          </template>
        </Column>
        <Column class="w-20">
          <template #body="{ data }">
            <div class="flex justify-end">
              <Button
                v-tooltip="'Export'"
                icon="fas fa-download"
                text
                size="small"
                severity="secondary"
                @click.stop="store.exportTemplate(data.id)"
              />
              <Button
                v-tooltip="'Delete'"
                icon="fas fa-trash"
                text
                size="small"
                severity="danger"
                @click.stop="onDelete(data)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </template>
  </Card>
</template>
