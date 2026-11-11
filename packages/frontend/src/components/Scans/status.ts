import type { ScanStatus } from "shared";

const statusClasses: Record<ScanStatus, string> = {
  Running: "text-surface-300",
  Completed: "text-green-400",
  Cancelled: "text-surface-400",
  TimedOut: "text-orange-400",
  Failed: "text-red-400",
};

export const statusClass = (status: ScanStatus) => statusClasses[status];

export const statusLabel = (status: ScanStatus) =>
  status === "TimedOut" ? "Timed out" : status;

export const statusCodeClass = (code: number | undefined) => {
  if (code === undefined) {
    return "text-red-400";
  }
  if (code < 300) {
    return "text-green-400";
  }
  if (code < 400) {
    return "text-sky-400";
  }
  return code < 500 ? "text-surface-400" : "text-orange-400";
};
