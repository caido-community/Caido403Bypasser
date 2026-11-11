<script setup lang="ts" generic="Row extends object">
import { useVirtualizer } from "@tanstack/vue-virtual";
import { computed, ref } from "vue";

import { nextSort, type Sort, sortRows } from "./sort";
import type { VirtualColumn } from "./types";

type Field = Extract<keyof Row, string>;

const ROW_HEIGHT = 32;

const {
  rows,
  columns,
  rowKey,
  selectedKey = undefined,
} = defineProps<{
  rows: Row[];
  columns: VirtualColumn<Row>[];
  rowKey: (row: Row) => string | number;
  selectedKey?: string | number;
}>();

const emit = defineEmits<{
  select: [row: Row];
  contextmenu: [row: Row, event: MouseEvent];
}>();
defineSlots<{
  cell?: (props: { row: Row; field: Field }) => unknown;
  empty?: () => unknown;
}>();

const sort = ref<Sort<Field>>();
const sortedRows = computed(() => sortRows(rows, sort.value));

const sortIcon = (field: Field) => {
  if (sort.value?.field !== field) {
    return "fas fa-sort text-surface-500";
  }
  return sort.value.direction === "asc" ? "fas fa-sort-up" : "fas fa-sort-down";
};

const scrollParent = ref<HTMLElement>();
const virtualizer = useVirtualizer(
  computed(() => ({
    count: sortedRows.value.length,
    getScrollElement: () => scrollParent.value ?? null,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })),
);

const virtualRows = computed(() =>
  virtualizer.value.getVirtualItems().flatMap((item) => {
    const row = sortedRows.value[item.index];
    return row === undefined ? [] : [{ ...item, row }];
  }),
);

const columnStyle = (column: VirtualColumn<Row>) =>
  column.width === undefined
    ? { flex: "1 1 0", minWidth: "0" }
    : { width: `${column.width}px`, flexShrink: "0" };
</script>

<template>
  <div class="flex flex-1 flex-col min-h-0">
    <div
      class="flex shrink-0 text-surface-0/50 bg-surface-800/50 border-y-2 border-surface-900 text-sm"
    >
      <button
        v-for="column in columns"
        :key="column.field"
        type="button"
        class="flex items-center gap-2 px-3 py-1.5 text-left whitespace-nowrap hover:bg-surface-700/50"
        :style="columnStyle(column)"
        @click="sort = nextSort(sort, column.field)"
      >
        {{ column.label }}
        <i :class="sortIcon(column.field)" class="text-xs" />
      </button>
    </div>

    <div
      v-if="rows.length > 0"
      ref="scrollParent"
      class="flex-1 min-h-0 overflow-y-auto bg-surface-800"
    >
      <div
        class="relative w-full"
        :style="{ height: `${virtualizer.getTotalSize()}px` }"
      >
        <div
          v-for="item in virtualRows"
          :key="rowKey(item.row)"
          class="absolute left-0 top-0 w-full flex items-center cursor-pointer text-sm"
          :class="
            selectedKey === rowKey(item.row)
              ? 'bg-highlight'
              : [
                  item.index % 2 === 0 ? 'bg-surface-800' : 'bg-surface-900',
                  'hover:bg-surface-700/50',
                ]
          "
          :style="{
            height: `${item.size}px`,
            transform: `translateY(${item.start}px)`,
          }"
          @mousedown="emit('select', item.row)"
          @contextmenu.prevent="emit('contextmenu', item.row, $event)"
        >
          <div
            v-for="column in columns"
            :key="column.field"
            class="px-3 truncate"
            :style="columnStyle(column)"
          >
            <slot name="cell" :row="item.row" :field="column.field">
              {{ item.row[column.field] }}
            </slot>
          </div>
        </div>
      </div>
    </div>

    <slot v-else name="empty" />
  </div>
</template>
