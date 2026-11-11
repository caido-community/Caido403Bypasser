import type { Scan, ScanResult } from "./scan";
import type { Template } from "./template";

export type Events = {
  "templates:changed": (templates: Template[]) => void;
  "scan:updated": (scan: Scan) => void;
  "scan:deleted": (id: number) => void;
  "scans:cleared": () => void;
  "result:created": (scanId: number, result: ScanResult) => void;
};
