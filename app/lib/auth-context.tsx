import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  // セキュリティ強化：セッション検証
  const validateSession = useCallback((session: Session | null): boolean => {
    if (!session) return false;
    
    // JWTの有効期限チェック
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      console.warn('Session expired');
      return false;
    }
    
    // ユーザー情報の整合性チェック
    if (!session.user || !session.user.id || !session.user.email) {
      console.warn('Invalid user data in session');
      return false;
    }
    
    return true;
  }, []);

  // セキュリティ強化：アクティビティ追跡
  const updateActivity = useCallback(() => {
    setLastActivity(new Date());
  }, []);

  useEffect(() => {
    // セキュリティ強化：初期セッション取得
    const getInitialSession = async () => {
      try {
        // SSR環境では何もしない
        if (typeof window === 'undefined') {
          setLoading(false);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        // セッション検証
        if (validateSession(session)) {
          setSession(session);
          setUser(session?.user ?? null);
          updateActivity();
        } else {
          // 無効なセッションは削除
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Unexpected error getting session:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    // セキュリティ強化：認証状態変化の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // セッション検証
      if (session && !validateSession(session)) {
        console.warn('Invalid session detected, signing out');
        await supabase.auth.signOut();
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session) {
        updateActivity();
      }

      // セキュリティ強化：特定イベントでの追加チェック
      if (event === 'TOKEN_REFRESHED' && session) {
        // トークン更新時の検証
        if (!validateSession(session)) {
          console.warn('Token refresh resulted in invalid session');
          await supabase.auth.signOut();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [validateSession, updateActivity]);

  // セキュリティ強化：非アクティブ時のセッション管理
  useEffect(() => {
    if (!session || typeof window === 'undefined') return;

    const checkInactivity = () => {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
      const maxInactivity = 30 * 60 * 1000; // 30分

      if (timeSinceLastActivity > maxInactivity) {
        signOut();
      }
    };

    // アクティビティ監視
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      updateActivity();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // 5分ごとにアクティビティチェック
    const inactivityCheck = setInterval(checkInactivity, 5 * 60 * 1000);

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(inactivityCheck);
    };
  }, [session, lastActivity, updateActivity]);

  // セキュリティ強化：サインイン
  const signIn = async (email: string, password: string) => {
    try {
      // 入力検証
      if (!email || !password) {
        return { error: { message: 'メールアドレスとパスワードは必須です' } };
      }

      // メールアドレス形式の基本チェック
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { error: { message: 'メールアドレスの形式が正しくありません' } };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        // エラーのみログ出力
        console.error('Sign in failed:', error.message);
      } else {
        updateActivity();
      }

      return { error };
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { error: { message: '予期しないエラーが発生しました' } };
    }
  };

  // セキュリティ強化：サインアップ
  const signUp = async (email: string, password: string) => {
    try {
      // 入力検証
      if (!email || !password) {
        return { error: { message: 'メールアドレスとパスワードは必須です' } };
      }

      // パスワード強度チェック
      if (password.length < 8) {
        return { error: { message: 'パスワードは8文字以上である必要があります' } };
      }

      // 簡易的なパスワード強度チェック（警告なしで続行）
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        // 弱いパスワードだが、ユーザビリティを考慮して警告なしで続行
      }

      const { error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        // エラーのみログ出力
        console.error('Sign up failed:', error.message);
      }

      return { error };
    } catch (error) {
      console.error('Unexpected sign up error:', error);
      return { error: { message: '予期しないエラーが発生しました' } };
    }
  };

  // セキュリティ強化：サインアウト
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }

      // ローカル状態を即座にクリア
      setUser(null);
      setSession(null);
      setLastActivity(new Date());

      // セキュリティ強化：セッション情報の完全クリア
      if (typeof window !== 'undefined') {
        try {
          // 🔐 Cookie削除（Supabase認証情報）
          document.cookie.split(";").forEach(cookie => {
            const [name] = cookie.split("=");
            if (name.trim().includes('supabase')) {
              document.cookie = `${name.trim()}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=strict`;
            }
          });
          
          // 🛡️ localStorage のフォールバック削除（既存データ対応）
          Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase')) {
              localStorage.removeItem(key);
            }
          });
        } catch (error) {
          console.warn('Failed to clear session data:', error);
        }
      }

    } catch (error) {
      console.error('Unexpected sign out error:', error);
      // エラーが発生してもローカル状態をクリア（セキュリティ優先）
      setUser(null);
      setSession(null);
      setLastActivity(new Date());
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};