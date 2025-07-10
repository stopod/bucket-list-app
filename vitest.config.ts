import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./test-setup.ts"],
    globals: true,
    // CI環境での設定
    watch: false,
    // テストタイムアウト設定
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "text-summary"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "build/",
        "coverage/",
        ".react-router/",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/__tests__/**",
        "**/test-setup.ts",
        "**/*.config.{ts,js}",
        "**/*.d.ts",
        "**/types.ts", // 型定義ファイル
        "**/index.ts", // エクスポートのみのファイル
        "app/root.tsx", // React Routerのroot
        "app/entry.*.tsx", // エントリーファイル
        ".vscode/**",
        ".claude/**",
        "docs/**",
      ],
      // カバレッジ閾値設定
      thresholds: {
        global: {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80,
        },
      },
      // 重要なファイルを含める
      include: [
        "app/features/**/*.{ts,tsx}",
        "app/shared/**/*.{ts,tsx}",
        "app/components/**/*.{ts,tsx}",
      ],
    },
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./app"),
    },
  },
});
