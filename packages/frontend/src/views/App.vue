<script setup lang="ts">
import ConfirmDialog from "primevue/confirmdialog";
import MenuBar from "primevue/menubar";
import { onMounted, ref } from "vue";

import { useScansStore } from "@/stores/scans";
import { useSettingsStore } from "@/stores/settings";
import { useTemplatesStore } from "@/stores/templates";
import Scans from "@/views/Scans.vue";
import Settings from "@/views/Settings.vue";
import Templates from "@/views/Templates.vue";

const pages = { Scans, Templates, Settings };
const page = ref<keyof typeof pages>("Scans");

const scansStore = useScansStore();
const templatesStore = useTemplatesStore();
const settingsStore = useSettingsStore();

onMounted(() => {
  scansStore.initialize();
  templatesStore.initialize();
  settingsStore.initialize();
});
</script>

<template>
  <div class="h-full flex flex-col gap-1">
    <MenuBar breakpoint="320px">
      <template #start>
        <div class="flex">
          <div class="px-3 py-2 font-bold text-surface-100">403Bypasser</div>
          <div
            v-for="(_, name) in pages"
            :key="name"
            class="px-3 py-2 cursor-pointer text-surface-300 rounded transition-colors"
            :class="
              page === name ? 'bg-surface-700/60' : 'hover:bg-surface-700/30'
            "
            @mousedown="page = name"
          >
            {{ name }}
          </div>
        </div>
      </template>
    </MenuBar>
    <div class="flex-1 min-h-0">
      <KeepAlive>
        <component :is="pages[page]" />
      </KeepAlive>
    </div>
    <ConfirmDialog />
  </div>
</template>
