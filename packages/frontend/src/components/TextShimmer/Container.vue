<script setup lang="ts">
const { text } = defineProps<{ text: string }>();
</script>

<template>
  <span class="shimmer" :style="{ '--spread': `${text.length * 2}px` }">
    {{ text }}
  </span>
</template>

<style scoped>
.shimmer {
  display: inline-block;
  color: transparent;
  background-image:
    linear-gradient(
      90deg,
      #0000 calc(50% - var(--spread)),
      #fff,
      #0000 calc(50% + var(--spread))
    ),
    linear-gradient(var(--p-surface-400), var(--p-surface-400));
  background-size:
    250% 100%,
    auto;
  background-repeat: no-repeat, padding-box;
  background-clip: text;
  animation: shimmer 1.5s linear infinite;
}

@keyframes shimmer {
  from {
    background-position: 150% center;
  }
  to {
    background-position: -50% center;
  }
}
</style>
