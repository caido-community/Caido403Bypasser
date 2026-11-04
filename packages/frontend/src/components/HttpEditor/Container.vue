<script setup lang="ts">
import { ref } from "vue";

import { useHttpEditor } from "./useHttpEditor";

const { kind, content } = defineProps<{
  kind: "request" | "response";
  content: string;
}>();
const emit = defineEmits<{ change: [content: string] }>();

const root = ref<HTMLElement>();
useHttpEditor({
  root,
  kind: () => kind,
  content: () => content,
  onChange: (value) => emit("change", value),
});
</script>

<template>
  <div ref="root" class="flex-1 min-h-0 overflow-hidden" />
</template>
