import type { SDK } from "caido:plugin";
import type { Result } from "shared";
import { ok } from "shared";

export function generateRandomString(sdk: SDK, length: number): Result<string> {
  const value = Math.random()
    .toString(36)
    .substring(2, length + 2);
  sdk.console.log(`Generating random string: ${value}`);
  return ok(value);
}
