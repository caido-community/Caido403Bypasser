import type { Result, ResultDetails } from "shared";
import { computed, ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useScansStore } from "@/stores/scans";

export const useResultDetails = () => {
  const sdk = useSDK();
  const store = useScansStore();
  const state = ref<Result<ResultDetails>>();

  watch(
    () => [store.selectedScanId, store.selectedResultId] as const,
    async ([scanId, resultId]) => {
      state.value = undefined;
      if (scanId === undefined || resultId === undefined) {
        return;
      }

      const result = await sdk.backend.getResultDetails(scanId, resultId);
      if (
        store.selectedScanId === scanId &&
        store.selectedResultId === resultId
      ) {
        state.value = result;
      }
    },
  );

  return {
    details: computed(() =>
      state.value?.kind === "Ok" ? state.value.value : undefined,
    ),
    error: computed(() =>
      state.value?.kind === "Error" ? state.value.error : undefined,
    ),
  };
};
