import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    maxWorkers: 1,
    sequence: { concurrent: false },
    env: {
      DW_DB_PATH: ":memory:",
      LLM_PROVIDER: "mock",
    },
    include: ["src/**/*.test.ts", "evals/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
