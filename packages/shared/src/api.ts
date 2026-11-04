import type { Result } from "./result";

export type API = {
  generateRandomString: (length: number) => Result<string>;
};
