import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "packages/frontend/src"),
      shared: path.resolve(__dirname, "packages/shared/src/index.ts"),
    },
  },
  test: {
    include: ["packages/*/src/**/*.test.ts"],
  },
});
