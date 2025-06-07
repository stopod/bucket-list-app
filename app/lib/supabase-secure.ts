import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL and Anon Key must be set in environment variables.",
  );
}

// よりセキュアな設定でSupabaseクライアントを作成
export const supabaseSecure = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // セッション永続化の設定
    persistSession: true,
    
    // 自動トークンリフレッシュ
    autoRefreshToken: true,
    
    // URLからセッション検出（OAuth用）
    detectSessionInUrl: true,
    
    // セッション保存方法の設定
    storage: {
      getItem: (key: string) => {
        // 開発環境でのデバッグ用
        if (import.meta.env.DEV) {
          return localStorage.getItem(key);
        }
        
        // 本番環境では、より安全な方法を検討
        // 例：暗号化してlocalStorageに保存
        return localStorage.getItem(key);
      },
      setItem: (key: string, value: string) => {
        // 開発環境でのデバッグ用
        if (import.meta.env.DEV) {
          localStorage.setItem(key, value);
          return;
        }
        
        // 本番環境では、より安全な方法を検討
        localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key);
      },
    },
    
    // セキュリティ強化オプション
    flowType: 'pkce', // PKCE（Proof Key for Code Exchange）を使用
  },
  
  // データベース接続のセキュリティ設定
  db: {
    schema: 'public'
  },
  
  // グローバル設定
  global: {
    headers: {
      'X-Client-Info': 'bucket-list-app',
    },
  },
});

// SSR対応のストレージ実装
export const createSecureCookieStorage = () => {
  return {
    getItem: (key: string) => {
      // サーバーサイド環境では null を返す
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return null;
      }
      
      try {
        const name = key + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        
        for (let i = 0; i < ca.length; i++) {
          let c = ca[i];
          while (c.charAt(0) === ' ') {
            c = c.substring(1);
          }
          if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
          }
        }
        return null;
      } catch (error) {
        console.error('Error reading cookie:', error);
        return null;
      }
    },
    
    setItem: (key: string, value: string) => {
      // サーバーサイド環境では何もしない
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
      }
      
      try {
        // クライアントサイドでCookieを設定
        const expires = new Date();
        expires.setTime(expires.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7日
        
        const isSecure = window.location.protocol === 'https:';
        document.cookie = `${key}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict${
          isSecure ? '; Secure' : ''
        }`;
      } catch (error) {
        console.error('Error setting cookie:', error);
      }
    },
    
    removeItem: (key: string) => {
      // サーバーサイド環境では何もしない
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
      }
      
      try {
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      } catch (error) {
        console.error('Error removing cookie:', error);
      }
    },
  };
};

// SSR対応のLocalStorageラッパー
export const createSSRSafeStorage = () => {
  return {
    getItem: (key: string) => {
      // サーバーサイド環境では null を返す
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return null;
      }
      
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
      }
    },
    
    setItem: (key: string, value: string) => {
      // サーバーサイド環境では何もしない
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    },
    
    removeItem: (key: string) => {
      // サーバーサイド環境では何もしない
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Error removing from localStorage:', error);
      }
    },
  };
};

// セキュリティ強化のためのヘルパー関数
export const createEncryptedStorage = () => {
  // 注意: これは簡易的な例です。本番環境では適切な暗号化ライブラリを使用してください
  const encrypt = (text: string): string => {
    // 実際の実装では、Web Crypto APIやサードパーティライブラリを使用
    return btoa(text); // 単純なBase64エンコード（デモ用）
  };
  
  const decrypt = (encryptedText: string): string => {
    try {
      return atob(encryptedText); // Base64デコード（デモ用）
    } catch {
      return '';
    }
  };
  
  return {
    getItem: (key: string) => {
      const encrypted = localStorage.getItem(key);
      return encrypted ? decrypt(encrypted) : null;
    },
    
    setItem: (key: string, value: string) => {
      const encrypted = encrypt(value);
      localStorage.setItem(key, encrypted);
    },
    
    removeItem: (key: string) => {
      localStorage.removeItem(key);
    },
  };
};

// セキュリティ設定の検証
export const validateSecuritySettings = () => {
  const checks = {
    https: window.location.protocol === 'https:',
    localStorage: typeof(Storage) !== "undefined",
    webCrypto: typeof(crypto) !== "undefined" && typeof(crypto.subtle) !== "undefined",
  };
  
  if (!checks.https && import.meta.env.PROD) {
    console.warn('⚠️ HTTPS を使用していません。本番環境では必須です。');
  }
  
  if (!checks.localStorage) {
    console.error('❌ LocalStorage がサポートされていません。');
  }
  
  if (!checks.webCrypto) {
    console.warn('⚠️ Web Crypto API がサポートされていません。暗号化機能が制限されます。');
  }
  
  return checks;
};

// 本番環境での推奨設定
export const getProductionSupabaseClient = () => {
  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      
      // 本番環境ではCookieストレージを使用
      storage: import.meta.env.PROD 
        ? createSecureCookieStorage()
        : undefined,
    },
    
    global: {
      headers: {
        'X-Client-Info': 'bucket-list-app',
        // CSPヘッダーなどのセキュリティヘッダーを追加
      },
    },
  });
};