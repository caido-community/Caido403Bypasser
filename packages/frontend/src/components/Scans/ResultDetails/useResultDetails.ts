import type { ResultDetails } from "shared";
import { ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useScansStore } from "@/stores/scans";

export const useResultDetails = () => {
  const sdk = useSDK();
  const store = useScansStore();
  const details = ref<ResultDetails | undefined>(undefined);
  const error = ref<string | undefined>(undefined);

  watch(
    () => [store.selectedScanId, store.selectedResultId] as const,
    async ([scanId, resultId]) => {
      details.value = undefined;
      error.value = undefined;
      if (scanId === undefined || resultId === undefined) {
        return;
      }

      const result = await sdk.backend.getResultDetails(scanId, resultId);
      if (
        store.selectedScanId !== scanId ||
        store.selectedResultId !== resultId
      ) {
        return;
      }
      if (result.kind === "Ok") {
        details.value = result.value;
      } else {
        error.value = result.error;
      }
    },
  );

  return { details, error };
};
