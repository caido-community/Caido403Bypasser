import { defineStore } from "pinia";
import type { Settings } from "shared";
import { ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import { showResult } from "@/utils/result";

export const useSettingsStore = defineStore("settings", () => {
  const sdk = useSDK();
  const settings = ref<Settings | undefined>(undefined);

  const initialize = async () => {
    const result = await sdk.backend.getSettings();
    if (showResult(sdk, result)) {
      settings.value = result.value;
    }
  };

  const update = async (input: Settings) => {
    const result = await sdk.backend.updateSettings(input);
    if (showResult(sdk, result)) {
      settings.value = result.value;
    }
  };

  return { settings, initialize, update };
});
