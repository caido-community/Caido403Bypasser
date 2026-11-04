import type { ScanStatus } from "shared";

const severities: Record<ScanStatus, string> = {
  Running: "info",
  Completed: "success",
  Cancelled: "secondary",
  TimedOut: "warn",
  Failed: "danger",
};

export const statusSeverity = (status: ScanStatus) => severities[status];

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
