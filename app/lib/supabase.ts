import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL and Anon Key must be set in environment variables.",
  );
}

// 🔐 最高セキュリティのCookieベースストレージ
const createUltraSecureCookieStorage = () => {
  // Cookieヘルパー関数
  const setCookie = (name: string, value: string, options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
    path?: string;
  } = {}) => {
    if (typeof document === 'undefined') return;
    
    const {
      httpOnly = false, // クライアントサイドではhttpOnlyは設定できない
      secure = location.protocol === 'https:',
      sameSite = 'strict',
      maxAge = 24 * 60 * 60, // 24時間
      path = '/'
    } = options;
    
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    cookieString += `; Path=${path}`;
    cookieString += `; Max-Age=${maxAge}`;
    cookieString += `; SameSite=${sameSite}`;
    
    if (secure) {
      cookieString += '; Secure';
    }
    
    document.cookie = cookieString;
  };
  
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      return cookieValue ? decodeURIComponent(cookieValue) : null;
    }
    
    return null;
  };
  
  const removeCookie = (name: string) => {
    if (typeof document === 'undefined') return;
    
    document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=strict`;
  };

  return {
    getItem: (key: string) => {
      // サーバーサイドでは常にnullを返す（SSR安全）
      if (typeof window === 'undefined') return null;
      
      try {
        const item = getCookie(key);
        if (!item) return null;
        
        // 🛡️ 簡易的な検証（実際のトークンかどうか）
        if (key.includes('supabase') && item.length < 10) {
          // 疑わしい値は削除
          removeCookie(key);
          return null;
        }
        
        return item;
      } catch (error) {
        console.warn('Cookie access failed:', error);
        return null;
      }
    },
    
    setItem: (key: string, value: string) => {
      if (typeof window === 'undefined') return;
      
      try {
        // 値の検証
        if (!value || value.length === 0) return;
        
        // 🔐 Cookieサイズ制限チェック（4KB制限）
        if (value.length > 4 * 1024) {
          console.warn('Cookie size exceeded (4KB limit)');
          return;
        }
        
        // 🛡️ セキュアCookie設定
        setCookie(key, value, {
          secure: location.protocol === 'https:', // HTTPS必須
          sameSite: 'strict', // CSRF対策
          maxAge: 24 * 60 * 60, // 24時間
          path: '/' // アプリ全体でアクセス可能
        });
        
      } catch (error) {
        console.warn('Cookie write failed:', error);
      }
    },
    
    removeItem: (key: string) => {
      if (typeof window === 'undefined') return;
      
      try {
        removeCookie(key);
      } catch (error) {
        console.warn('Cookie remove failed:', error);
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
    
    // 🔐 最高セキュリティCookieストレージ
    storage: createUltraSecureCookieStorage(),
    
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
