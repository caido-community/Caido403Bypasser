<script setup lang="ts">
import Button from "primevue/button";
import { ref } from "vue";

import { useTemplatesStore } from "@/stores/templates";
import { useDangerConfirm } from "@/utils/confirm";

const store = useTemplatesStore();
const requireConfirm = useDangerConfirm();

const importInput = ref<HTMLInputElement>();
const onImport = async () => {
  const input = importInput.value;
  if (input === undefined) {
    return;
  }
  await store.importFiles(Array.from(input.files ?? []));
  input.value = "";
};

const onRestore = () =>
  requireConfirm(
    "All templates will be replaced with the default templates.",
    () => store.reset(),
  );

const onDeleteAll = () =>
  requireConfirm("All templates will be deleted.", () => store.clear());
</script>

<template>
  <Button
    label="Restore defaults"
    icon="fas fa-undo"
    severity="secondary"
    outlined
    size="small"
    @click="onRestore"
  />
  <Button
    label="Delete all"
    icon="fas fa-trash"
    severity="danger"
    outlined
    size="small"
    :disabled="store.templates.length === 0"
    @click="onDeleteAll"
  />
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
  <input
    ref="importInput"
    type="file"
    accept=".yaml,.yml"
    multiple
    class="hidden"
    @change="onImport"
  />
</template>
