import type { ResultDetails } from "shared";
import { ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useScansStore } from "@/stores/scans";
import { getErrorMessage } from "@/utils/errors";

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
      if (store.selectedResultId !== resultId) {
        return;
      }
      if (result.kind === "Ok") {
        details.value = result.value;
      } else {
        error.value = result.error;
      }
    },
  );

  const sendToReplay = async () => {
    const scan = store.selectedScan;
    const result = store.selectedResult;
    if (scan === undefined || result === undefined) {
      return;
    }

    try {
      if (result.kind === "Ok") {
        await sdk.replay.createSession({ type: "ID", id: result.requestId });
      } else if (details.value?.request !== undefined) {
        await sdk.replay.createSession({
          type: "Raw",
          raw: details.value.request,
          connectionInfo: {
            host: scan.host,
            port: scan.port,
            isTLS: scan.isTls,
          },
        });
      }
      sdk.window.showToast("Sent to Replay", { variant: "success" });
    } catch (error) {
      sdk.window.showToast(
        `Failed to send to Replay: ${getErrorMessage(error)}`,
        {
          variant: "error",
        },
      );
    }
  };

  return { details, error, sendToReplay };
};
