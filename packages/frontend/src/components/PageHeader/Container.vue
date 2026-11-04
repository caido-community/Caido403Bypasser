<script setup lang="ts">
import Card from "primevue/card";

const { title, description } = defineProps<{
  title: string;
  description: string;
}>();
</script>

<template>
  <Card
    class="shrink-0"
    :pt="{ body: { class: 'p-0' }, content: { class: 'p-0' } }"
  >
    <template #content>
      <div class="flex items-center justify-between gap-4 p-4 min-w-0">
        <div class="space-y-0.5 min-w-0 shrink">
          <h2 class="text-lg font-semibold leading-tight">{{ title }}</h2>
          <p class="text-sm text-surface-400">{{ description }}</p>
        </div>
        <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
          <slot name="actions" />
        </div>
      </div>
    </template>
  </Card>
</template>
