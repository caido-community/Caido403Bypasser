import type { Result } from "shared";

import type { FrontendSDK } from "@/types";

export const showResult = <T>(
  sdk: FrontendSDK,
  result: Result<T>,
  successMessage?: string,
): result is Extract<Result<T>, { kind: "Ok" }> => {
  if (result.kind === "Error") {
    sdk.window.showToast(result.error, { variant: "error" });
    return false;
  }
  if (successMessage !== undefined) {
    sdk.window.showToast(successMessage, { variant: "success" });
  }
  return true;
};
