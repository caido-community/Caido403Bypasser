<script setup lang="ts">
const { icon, message } = defineProps<{ icon: string; message: string }>();
</script>

<template>
  <div
    class="flex-1 min-h-0 h-full flex flex-col items-center justify-center gap-3 text-sm text-surface-400 text-center p-4"
  >
    <i :class="[icon, 'text-3xl text-surface-500']" />
    <span>{{ message }}</span>
    <slot />
  </div>
</template>
