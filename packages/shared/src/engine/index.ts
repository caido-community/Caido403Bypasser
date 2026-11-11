import { getErrorMessage } from "../errors";
import { err, ok, type Result } from "../result";

import { helper } from "./helpers";

export const runScript = (input: string, script: string): Result<string[]> => {
  let output: unknown;
  try {
    output = new Function("helper", "input", script)(helper, input);
  } catch (error) {
    return err(getErrorMessage(error));
  }

  const requests: unknown[] = Array.isArray(output) ? output : [output];
  if (
    !requests.every((request): request is string => typeof request === "string")
  ) {
    return err(
      "Script must return a request string or an array of request strings",
    );
  }

  return ok(requests);
};
