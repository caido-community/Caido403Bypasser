<script setup lang="ts">
import Button from "primevue/button";
import Menu from "primevue/menu";
import { useConfirm } from "primevue/useconfirm";
import { ref } from "vue";

import { useTemplatesStore } from "@/stores/templates";

const store = useTemplatesStore();
const confirm = useConfirm();

const importInput = ref<HTMLInputElement>();
const onImport = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  await store.importFiles(Array.from(input.files ?? []));
  input.value = "";
};

const requireConfirm = (message: string, accept: () => void) =>
  confirm.require({
    header: "Are you sure?",
    message,
    acceptProps: { label: "Confirm", severity: "danger" },
    rejectProps: { label: "Cancel", severity: "secondary", outlined: true },
    accept,
  });

const menu = ref<InstanceType<typeof Menu>>();
const menuItems = [
  {
    label: "Restore defaults",
    icon: "fas fa-undo",
    command: () =>
      requireConfirm(
        "All templates will be replaced with the default templates.",
        () => store.reset(),
      ),
  },
  {
    label: "Delete all",
    icon: "fas fa-trash",
    command: () =>
      requireConfirm("All templates will be deleted.", () => store.clear()),
  },
];
</script>

<template>
  <Button
    label="Import"
    icon="fas fa-file-import"
    severity="secondary"
    outlined
    size="small"
    @click="importInput?.click()"
  />
  <Button
    label="New"
    icon="fas fa-plus"
    size="small"
    @click="store.selection = { kind: 'New' }"
  />
  <Button
    icon="fas fa-ellipsis-v"
    severity="secondary"
    text
    size="small"
    aria-label="More actions"
    @click="menu?.toggle($event)"
  />
  <Menu ref="menu" :model="menuItems" popup />
  <input
    ref="importInput"
    type="file"
    accept=".yaml,.yml"
    multiple
    class="hidden"
    @change="onImport"
  />
</template>
