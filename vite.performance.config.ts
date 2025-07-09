/**
 * パフォーマンス最適化のためのVite設定
 */
import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import { bundleAnalyzer } from 'vite-plugin-bundle-analyzer';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    reactRouter(),
    // バンドル分析
    bundleAnalyzer({
      analyzerMode: 'static',
      reportFilename: 'bundle-analyzer-report.html',
      openAnalyzer: false,
    }),
    // Gzip圧縮
    compression({
      algorithm: 'gzip',
      threshold: 1024,
    }),
    // Brotli圧縮
    compression({
      algorithm: 'brotliCompress',
      threshold: 1024,
    }),
  ],
  build: {
    // 最適化設定
    rollupOptions: {
      output: {
        // チャンク分割戦略
        manualChunks: {
          // React関連を別チャンクに
          react: ['react', 'react-dom'],
          // Router関連を別チャンクに
          router: ['@react-router/dev', '@remix-run/react'],
          // UI関連を別チャンクに
          ui: [
            '@radix-ui/react-select',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
            '@radix-ui/react-progress',
            '@radix-ui/react-separator',
            '@radix-ui/react-tabs',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
          ],
          // Supabase関連を別チャンクに
          supabase: ['@supabase/supabase-js'],
          // ユーティリティ関連を別チャンクに
          utils: ['date-fns', 'uuid'],
          // テスト関連は除外
          test: ['vitest', '@testing-library/react', '@testing-library/jest-dom'],
        },
        // ファイル名にハッシュを含める
        chunkFileNames: 'js/[name].[hash].js',
        entryFileNames: 'js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name!.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name].[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name].[hash][extname]`;
          }
          return `assets/[name].[hash][extname]`;
        },
      },
    },
    // 最小化設定
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    // ソースマップ設定
    sourcemap: false,
    // チャンクサイズ警告の閾値
    chunkSizeWarningLimit: 1000,
    // 静的リソース最適化
    assetsInlineLimit: 4096,
    // CSS最適化
    cssCodeSplit: true,
    // 実験的な機能
    reportCompressedSize: false,
    // 最適化レベル
    target: 'esnext',
  },
  // 開発サーバー設定
  server: {
    // HMRを最適化
    hmr: {
      overlay: false,
    },
  },
  // 依存関係の事前バンドル
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@remix-run/react',
      '@supabase/supabase-js',
    ],
    exclude: [
      'vitest',
      '@testing-library/react',
      '@testing-library/jest-dom',
    ],
  },
  // 解決設定
  resolve: {
    alias: {
      // 最適化されたコンポーネントの優先使用
      '~/features/bucket-list/components/bucket-list': '/app/features/bucket-list/components/optimized-bucket-list',
      '~/features/bucket-list/services/bucket-list-service': '/app/features/bucket-list/services/optimized-functional-service',
    },
  },
  // 定数の定義
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },
});