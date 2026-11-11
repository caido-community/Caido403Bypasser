import { defineStore } from "pinia";
import type { Settings } from "shared";
import { ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import { showResult } from "@/utils/result";

export const useSettingsStore = defineStore("settings", () => {
  const sdk = useSDK();
  const settings = ref<Settings>();

  const initialize = async () => {
    const result = await sdk.backend.getSettings();
    if (showResult(sdk, result)) {
      settings.value = result.value;
    }
  };

  const update = async (input: Settings) => {
    showResult(sdk, await sdk.backend.updateSettings(input));
  };

  return { settings, initialize, update };
});
