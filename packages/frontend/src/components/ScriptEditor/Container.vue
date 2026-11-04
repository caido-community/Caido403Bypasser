<script setup lang="ts">
import { EditorView } from "@codemirror/view";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import { scriptExtensions } from "./extensions";

const model = defineModel<string>({ required: true });

const root = ref<HTMLElement>();
let view: EditorView | undefined;

onMounted(() => {
  view = new EditorView({
    parent: root.value,
    doc: model.value,
    extensions: scriptExtensions((value) => {
      model.value = value;
    }),
  });
});

watch(model, (value) => {
  if (view !== undefined && view.state.doc.toString() !== value) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }
});

onBeforeUnmount(() => view?.destroy());
</script>

<template>
  <div ref="root" class="flex-1 min-h-0 overflow-hidden" />
</template>
