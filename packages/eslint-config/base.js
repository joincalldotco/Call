import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import onlyWarn from "eslint-plugin-only-warn";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/**
 * A shared ESLint configuration for the repository.
 * @type {import("eslint").Linter.Config}
 */
export default {
  ...js.configs.recommended,
  ...tseslint.configs.recommended,
  plugins: {
    turbo: turboPlugin,
    onlyWarn,
  },
  rules: {
    "turbo/no-undeclared-env-vars": "warn",
  },
  ignores: ["dist/**"],
};

export const extendsConfig = [
  "plugin:turbo/recommended",
  "plugin:only-warn/recommended",
  "plugin:@typescript-eslint/recommended",
  "prettier",
];
