import { defineStore } from "pinia";
import type { Scan, ScanResult, ScanSource } from "shared";
import { computed, ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import { getErrorMessage } from "@/utils/errors";
import { showResult } from "@/utils/result";

export const useScansStore = defineStore("scans", () => {
  const sdk = useSDK();
  const scans = ref<Scan[]>([]);
  const selectedScanId = ref<number | undefined>(undefined);
  const results = ref<ScanResult[]>([]);
  const selectedResultId = ref<number | undefined>(undefined);

  const sortedScans = computed(() =>
    [...scans.value].sort((a, b) => b.id - a.id),
  );
  const selectedScan = computed(() =>
    scans.value.find((scan) => scan.id === selectedScanId.value),
  );
  const selectedResult = computed(() =>
    results.value.find((result) => result.id === selectedResultId.value),
  );

  const upsert = (scan: Scan) => {
    const index = scans.value.findIndex((s) => s.id === scan.id);
    if (index === -1) {
      scans.value.push(scan);
    } else {
      scans.value[index] = scan;
    }
  };

  const selectScan = async (id: number | undefined) => {
    selectedScanId.value = id;
    selectedResultId.value = undefined;
    results.value = [];
    if (id === undefined) {
      return;
    }

    const result = await sdk.backend.getScanResults(id);
    if (selectedScanId.value !== id || !showResult(sdk, result)) {
      return;
    }
    const known = new Set(result.value.map((r) => r.id));
    results.value = [
      ...result.value,
      ...results.value.filter((r) => !known.has(r.id)),
    ];
  };

  const forget = (id: number) => {
    scans.value = scans.value.filter((scan) => scan.id !== id);
    if (selectedScanId.value === id) {
      selectScan(undefined);
    }
  };

  const initialize = async () => {
    sdk.backend.onEvent("scan:updated", upsert);
    sdk.backend.onEvent("scan:deleted", forget);
    sdk.backend.onEvent("scans:cleared", () => {
      scans.value = [];
      selectScan(undefined);
    });
    sdk.backend.onEvent("result:created", (scanId, result) => {
      if (scanId === selectedScanId.value) {
        results.value.push(result);
      }
    });

    const result = await sdk.backend.getScans();
    if (showResult(sdk, result)) {
      result.value.forEach(upsert);
    }
  };

  const start = async (source: ScanSource) => {
    const result = await sdk.backend.startScan(source);
    return showResult(sdk, result);
  };

  const rerun = async (id: number) => {
    const result = await sdk.backend.rerunScan(id);
    if (showResult(sdk, result)) {
      await selectScan(result.value.id);
    }
  };

  const cancel = async (id: number) => {
    showResult(sdk, await sdk.backend.cancelScan(id));
  };

  const remove = async (id: number) => {
    showResult(sdk, await sdk.backend.deleteScan(id));
  };

  const clear = async () => {
    showResult(sdk, await sdk.backend.clearScans());
  };

  const sendRawToReplay = async (scan: Scan, resultId: number) => {
    const details = await sdk.backend.getResultDetails(scan.id, resultId);
    if (!showResult(sdk, details)) {
      return false;
    }
    if (details.value.request === undefined) {
      sdk.window.showToast("This result has no request to send", {
        variant: "warning",
      });
      return false;
    }
    await sdk.replay.createSession({
      type: "Raw",
      raw: details.value.request,
      connectionInfo: { host: scan.host, port: scan.port, isTLS: scan.isTls },
    });
    return true;
  };

  const sendToReplay = async (resultId: number) => {
    const scan = selectedScan.value;
    const result = results.value.find((r) => r.id === resultId);
    if (scan === undefined || result === undefined) {
      return;
    }

    try {
      if (result.kind === "Ok") {
        await sdk.replay.createSession({ type: "ID", id: result.requestId });
      } else if (!(await sendRawToReplay(scan, result.id))) {
        return;
      }
      sdk.window.showToast("Sent to Replay", { variant: "success" });
    } catch (error) {
      sdk.window.showToast(
        `Failed to send to Replay: ${getErrorMessage(error)}`,
        { variant: "error" },
      );
    }
  };

  return {
    sortedScans,
    selectedScanId,
    selectedScan,
    results,
    selectedResultId,
    selectedResult,
    initialize,
    selectScan,
    start,
    rerun,
    cancel,
    remove,
    clear,
    sendToReplay,
  };
});
