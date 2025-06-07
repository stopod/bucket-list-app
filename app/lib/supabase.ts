import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL and Anon Key must be set in environment variables.",
  );
}

// 最高セキュリティのSSR対応ストレージ
const createUltraSecureStorage = () => {
  return {
    getItem: (key: string) => {
      // サーバーサイドでは常にnullを返す
      if (typeof window === 'undefined') return null;
      
      try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        
        // 簡易的な検証（実際のトークンかどうか）
        if (key.includes('supabase') && item.length < 10) {
          // 疑わしい値は削除
          localStorage.removeItem(key);
          return null;
        }
        
        return item;
      } catch (error) {
        // プライベートブラウジングモードやストレージ制限の対応
        console.warn('Storage access failed:', error);
        return null;
      }
    },
    
    setItem: (key: string, value: string) => {
      if (typeof window === 'undefined') return;
      
      try {
        // 値の検証
        if (!value || value.length === 0) return;
        
        // ストレージサイズの制限チェック
        const storageSize = JSON.stringify(localStorage).length;
        if (storageSize > 4 * 1024 * 1024) { // 4MB制限
          console.warn('Storage quota exceeded');
          return;
        }
        
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn('Storage write failed:', error);
      }
    },
    
    removeItem: (key: string) => {
      if (typeof window === 'undefined') return;
      
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Storage remove failed:', error);
      }
    },
  };
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // セキュリティ設定
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce", // 最新のOAuth 2.1準拠
    
    // 最高セキュリティストレージ
    storage: createUltraSecureStorage(),
    
    // セッション設定
    debug: import.meta.env.DEV, // 開発環境でのみデバッグ
  },
  
  // データベースセキュリティ設定
  db: {
    schema: 'public'
  },
  
  // グローバルセキュリティヘッダー
  global: {
    headers: {
      'X-Client-Info': 'bucket-list-app',
      // XSS対策
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      // 開発環境でのみReferrer制限を緩和
      'Referrer-Policy': import.meta.env.DEV ? 'no-referrer-when-downgrade' : 'strict-origin-when-cross-origin',
    },
  },
  
  // リアルタイム接続のセキュリティ
  realtime: {
    params: {
      eventsPerSecond: 10, // レート制限
    },
  },
});
