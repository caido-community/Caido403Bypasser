<script setup lang="ts">
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputText from "primevue/inputtext";

const model = defineModel<string>({ required: true });
const { placeholder } = defineProps<{ placeholder: string }>();
</script>

<template>
  <IconField>
    <InputIcon class="fas fa-search" />
    <InputText v-model="model" :placeholder="placeholder" size="small" />
  </IconField>
</template>
