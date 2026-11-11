import { readdir } from "fs/promises";
import path from "path";

// Caido's fs has no existsSync and its errors carry no `code`, so check presence via readdir.
export const exists = async (file: string) =>
  (await readdir(path.dirname(file))).includes(path.basename(file));
