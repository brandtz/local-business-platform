import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: [
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
      "src/**/*.integration.test.ts",
      "apps/**/*.test.ts",
      "apps/**/*.spec.ts",
      "packages/**/*.test.ts",
      "packages/**/*.spec.ts",
      "apps/**/*.integration.test.ts",
      "packages/**/*.integration.test.ts"
    ],
    exclude: ["dist/**", "coverage/**", "node_modules/**"]
  }
});
