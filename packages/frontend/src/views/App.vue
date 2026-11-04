<script setup lang="ts">
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { ref } from "vue";

import { useSDK } from "@/plugins/sdk";

// Retrieve the SDK instance to interact with the backend
const sdk = useSDK();

const myVar = ref("Hello World");

// Call the backend to generate a random string
const onGenerateClick = async () => {
  const result = await sdk.backend.generateRandomString(10);
  if (result.kind === "Ok") {
    myVar.value = result.value;
  } else {
    sdk.window.showToast(result.error, { variant: "error" });
  }
};
</script>

<template>
  <div class="h-full flex justify-center items-center">
    <div class="flex flex-col gap-1">
      <Button label="Generate random string" @click="onGenerateClick" />
      <InputText :model-value="myVar" readonly />
    </div>
  </div>
</template>
