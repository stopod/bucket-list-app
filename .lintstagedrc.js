export default {
  // TypeScript・JavaScript ファイルの処理
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],

  // JSON ファイルの処理
  "*.json": ["prettier --write"],

  // CSS・SCSS ファイルの処理
  "*.{css,scss}": ["prettier --write"],

  // Markdownファイルの処理
  "*.md": ["prettier --write"],

  // TypeScript型チェック（変更されたファイルのみ）
  "*.{ts,tsx}": () => "npm run typecheck",
};
