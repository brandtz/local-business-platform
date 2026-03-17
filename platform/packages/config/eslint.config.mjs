import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const privateWorkspaceImportPatterns = [
  {
    group: ["@platform/*/src/*", "**/packages/*/src/*", "**/apps/*/src/*"],
    message: "Import from workspace public entrypoints only. Do not reach into another workspace's src directory."
  }
];

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/*.tsbuildinfo"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      "no-console": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: privateWorkspaceImportPatterns
        }
      ]
    }
  }
);
