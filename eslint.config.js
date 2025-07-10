import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import json from "@eslint/json";

export default [
  // JavaScript/TypeScript基本設定
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },

  // JavaScript推奨設定
  js.configs.recommended,

  // TypeScript設定
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-function": "warn",
    },
  },

  // React設定
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      react: pluginReact,
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // React 17+で不要
      "react/prop-types": "off", // TypeScriptを使用するため
      "react/display-name": "warn",
      "react/jsx-uses-react": "off", // React 17+で不要
      "react/jsx-uses-vars": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-key": "error",
      "react/no-unescaped-entities": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // JSON設定を簡素化（問題回避）
  {
    files: ["**/tsconfig*.json"],
    plugins: {
      json,
    },
    language: "json/jsonc",
  },

  // テストファイル用設定
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/test-setup.ts"],
    languageOptions: {
      globals: {
        ...globals.jest,
        vi: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "react/display-name": "off",
    },
  },

  // グローバル除外設定
  {
    ignores: [
      "node_modules/**",
      "build/**",
      "coverage/**",
      ".react-router/**",
      "**/*.d.ts",
      "**/*.css",
      ".claude/**",
      "docs/**",
      "*.config.{js,ts}",
      "vite.config.ts",
      "react-router.config.ts",
      "vitest.config.ts",
      "components.json",
      "package.json",
      "package-lock.json",
      ".prettierrc",
      ".prettierignore",
    ],
  },

  // 一般的なコーディング規約
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-script-url": "error",
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always"],
      "curly": "error",
      "no-unused-vars": "off", // TypeScriptルールを使用
    },
  },
];