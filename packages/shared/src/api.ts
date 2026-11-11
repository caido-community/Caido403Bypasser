import type { Result } from "./result";
import type { ResultDetails, Scan, ScanResult, ScanSource } from "./scan";
import type { Settings } from "./settings";
import type { Template } from "./template";

export type API = {
  getTemplates: () => Result<Template[]>;
  saveTemplate: (
    previousId: string | undefined,
    template: Template,
  ) => Promise<Result<Template>>;
  deleteTemplate: (id: string) => Promise<Result<void>>;
  importTemplate: (yaml: string) => Promise<Result<Template>>;
  exportTemplate: (id: string) => Result<string>;
  resetTemplates: () => Promise<Result<void>>;
  deleteAllTemplates: () => Promise<Result<void>>;

  getScans: () => Result<Scan[]>;
  startScan: (source: ScanSource) => Promise<Result<Scan>>;
  rerunScan: (id: number) => Result<Scan>;
  cancelScan: (id: number) => Result<void>;
  deleteScan: (id: number) => Result<void>;
  clearScans: () => Result<void>;
  getScanResults: (id: number) => Result<ScanResult[]>;
  getResultDetails: (
    scanId: number,
    resultId: number,
  ) => Promise<Result<ResultDetails>>;

  getSettings: () => Result<Settings>;
  updateSettings: (settings: Settings) => Promise<Result<Settings>>;
};
