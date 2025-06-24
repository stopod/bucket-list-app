# Level 2 実習: 認証実装

## 🎯 学習目標

- ログイン/ログアウト機能の詳細実装を理解する
- パスワードセキュリティの実装を体験する
- セッション管理とJWT処理を実装する
- エラーハンドリングとユーザー体験を改善する

## ⏱️ 想定時間

- **基本課題**: 45分
- **発展課題**: 45分
- **合計**: 1.5時間

## 📋 事前準備

```bash
# Level 1 の内容を理解していることを確認
# 開発サーバーが起動していることを確認
npm run dev

# テスト環境の準備
npm test
```

---

## 🔍 課題 2-1: ログイン機能の強化

### 📝 目標
現在のログイン機能にバリデーション、ローディング状態、エラー表示を追加して、より実用的なものにする。

### 🔧 手順

#### ステップ 1: ログインフォームの改良
```typescript
// app/features/auth/components/enhanced-login-form.tsx を作成

import { useState } from 'react';
import { useAuth } from '~/features/auth/lib/auth-context';
import { validateEmail, validatePassword } from '~/utils/validation';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function EnhancedLoginForm() {
  const { signIn } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // TODO: リアルタイムバリデーション機能を実装
  const validateField = (name: keyof LoginFormData, value: string): string | undefined => {
    switch (name) {
      case 'email':
        // ヒント: validateEmail 関数を使用
        return undefined; // TODO: 実装してください
      
      case 'password':
        // ヒント: validatePassword 関数を使用
        return undefined; // TODO: 実装してください
      
      default:
        return undefined;
    }
  };

  // TODO: フォーム送信処理を実装
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    const newErrors: LoginFormErrors = {};
    // TODO: 全フィールドのバリデーションを実行

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // ログイン処理
    setIsLoading(true);
    setErrors({});
    
    try {
      // TODO: signIn を呼び出し、エラーハンドリングを実装
    } catch (error) {
      // TODO: エラー処理を実装
    } finally {
      setIsLoading(false);
    }
  };

  // TODO: 入力変更ハンドラを実装
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // フォームデータ更新
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // リアルタイムバリデーション
    const error = validateField(name as keyof LoginFormData, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* メールアドレス入力 */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          メールアドレス
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.email ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      {/* パスワード入力 */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          パスワード
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
            errors.password ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={isLoading}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password}</p>
        )}
      </div>

      {/* 全般エラー表示 */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{errors.general}</p>
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ログイン中...
          </div>
        ) : (
          'ログイン'
        )}
      </button>
    </form>
  );
}
```

#### ステップ 2: バリデーション関数の実装
```typescript
// app/utils/validation.ts を作成

/**
 * メールアドレスのバリデーション
 */
export function validateEmail(email: string): string | undefined {
  if (!email) {
    return 'メールアドレスは必須です';
  }

  // TODO: メールアドレスの形式チェックを実装
  // ヒント: 正規表現を使用
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // TODO: 実装してください
  return undefined;
}

/**
 * パスワードのバリデーション
 */
export function validatePassword(password: string): string | undefined {
  if (!password) {
    return 'パスワードは必須です';
  }

  // TODO: パスワード強度チェックを実装
  // 要件: 8文字以上、英数字含む
  
  return undefined;
}

/**
 * 汎用的なバリデーション関数
 */
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | undefined;
}

export function validateField(value: string, rules: ValidationRule): string | undefined {
  // TODO: 汎用バリデーション関数を実装
  // ヒント: 各ルールを順番にチェック
  
  return undefined;
}
```

#### ステップ 3: エラーハンドリングの強化
```typescript
// app/utils/auth-errors.ts を作成

/**
 * 認証エラーのタイプ定義
 */
export type AuthErrorType = 
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'too_many_requests'
  | 'network_error'
  | 'unknown_error';

export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: string;
}

/**
 * Supabase エラーを分かりやすいメッセージに変換
 */
export function parseAuthError(error: any): AuthError {
  if (!error) {
    return {
      type: 'unknown_error',
      message: '不明なエラーが発生しました'
    };
  }

  // TODO: エラーメッセージの解析と変換を実装
  switch (error.message) {
    case 'Invalid login credentials':
      return {
        type: 'invalid_credentials',
        message: 'メールアドレスまたはパスワードが正しくありません'
      };
    
    case 'Email not confirmed':
      return {
        type: 'email_not_confirmed', 
        message: 'メールアドレスの確認が完了していません'
      };
    
    // TODO: 他のエラーケースも追加
    
    default:
      return {
        type: 'unknown_error',
        message: 'ログインに失敗しました。しばらく経ってから再度お試しください。',
        details: error.message
      };
  }
}
```

### ✅ 確認ポイント
- [ ] リアルタイムバリデーションが動作する
- [ ] ローディング状態が適切に表示される
- [ ] エラーメッセージが分かりやすい
- [ ] フォームの入力体験が向上した

---

## 🔍 課題 2-2: パスワードセキュリティの実装

### 📝 目標
パスワード強度チェック、表示/非表示切り替え、パスワード忘れ機能を実装する。

### 🔧 手順

#### ステップ 1: パスワード強度チェッカー
```typescript
// app/components/password-strength-meter.tsx を作成

interface PasswordStrength {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const feedback: string[] = [];

  // TODO: パスワード強度の計算を実装
  // チェック項目:
  // - 長さ (8文字以上で +20点)
  // - 小文字 (+10点)
  // - 大文字 (+10点)  
  // - 数字 (+10点)
  // - 特殊文字 (+15点)
  // - 12文字以上 (+10点)
  // - 一般的なパスワードでない (+25点)

  // 長さチェック
  if (password.length >= 8) {
    score += 20;
  } else {
    feedback.push('8文字以上にしてください');
  }

  // TODO: 他のチェック項目を実装

  // レベル判定
  let level: PasswordStrength['level'];
  if (score >= 80) level = 'strong';
  else if (score >= 60) level = 'good';
  else if (score >= 40) level = 'fair';
  else level = 'weak';

  return { score, level, feedback };
}

interface PasswordStrengthMeterProps {
  password: string;
  showFeedback?: boolean;
}

export function PasswordStrengthMeter({ password, showFeedback = true }: PasswordStrengthMeterProps) {
  const strength = calculatePasswordStrength(password);

  const getColorClass = () => {
    switch (strength.level) {
      case 'weak': return 'bg-red-500';
      case 'fair': return 'bg-yellow-500';
      case 'good': return 'bg-blue-500';
      case 'strong': return 'bg-green-500';
    }
  };

  const getLevelText = () => {
    switch (strength.level) {
      case 'weak': return '弱い';
      case 'fair': return '普通';
      case 'good': return '良い';
      case 'strong': return '強い';
    }
  };

  if (!password) return null;

  return (
    <div className="mt-2">
      {/* 強度バー */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getColorClass()}`}
            style={{ width: `${strength.score}%` }}
          />
        </div>
        <span className="text-sm font-medium">{getLevelText()}</span>
      </div>

      {/* フィードバック */}
      {showFeedback && strength.feedback.length > 0 && (
        <ul className="mt-1 text-xs text-gray-600">
          {strength.feedback.map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

#### ステップ 2: パスワード表示切り替え
```typescript
// app/components/password-input.tsx を作成

import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface PasswordInputProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  showStrengthMeter?: boolean;
  className?: string;
  error?: string;
}

export function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = 'パスワード',
  disabled = false,
  showStrengthMeter = false,
  className = '',
  error
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <div>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${className}`}
        />
        
        {/* 表示切り替えボタン */}
        <button
          type="button"
          onClick={togglePasswordVisibility}
          disabled={disabled}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? (
            <EyeSlashIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* パスワード強度メーター */}
      {showStrengthMeter && (
        <PasswordStrengthMeter password={value} />
      )}
    </div>
  );
}
```

#### ステップ 3: パスワードリセット機能
```typescript
// app/features/auth/components/password-reset-form.tsx を作成

import { useState } from 'react';
import { supabase } from '~/lib/supabase';
import { validateEmail } from '~/utils/validation';

export function PasswordResetForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Supabase のパスワードリセット機能を実装
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (resetError) {
        throw resetError;
      }

      setIsSuccess(true);
    } catch (error: any) {
      setError('パスワードリセットメールの送信に失敗しました');
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <h3 className="text-lg font-medium text-green-800 mb-2">
          メールを送信しました
        </h3>
        <p className="text-sm text-green-700">
          パスワードリセット用のリンクを {email} に送信しました。
          メールをご確認ください。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">
          メールアドレス
        </label>
        <input
          type="email"
          id="reset-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="your@email.com"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !email}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            送信中...
          </div>
        ) : (
          'パスワードリセットメールを送信'
        )}
      </button>
    </form>
  );
}
```

### ✅ 確認ポイント
- [ ] パスワード強度が視覚的に分かる
- [ ] パスワードの表示/非表示が切り替えられる
- [ ] パスワードリセット機能が動作する
- [ ] エラーハンドリングが適切

---

## 🔍 課題 2-3: セッション管理の改善

### 📝 目標
セッションの有効期限管理、自動更新、複数タブでの同期を実装する。

### 🔧 手順

#### ステップ 1: セッション有効期限の監視
```typescript
// app/features/auth/hooks/use-session-monitor.ts を作成

import { useEffect, useRef } from 'react';
import { useAuth } from '~/features/auth/lib/auth-context';

interface SessionMonitorOptions {
  checkInterval?: number; // チェック間隔（ミリ秒）
  warningThreshold?: number; // 警告を出すまでの残り時間（ミリ秒）
  onSessionExpiring?: () => void; // 期限間近の警告
  onSessionExpired?: () => void; // 期限切れ時の処理
}

export function useSessionMonitor(options: SessionMonitorOptions = {}) {
  const {
    checkInterval = 60000, // 1分ごと
    warningThreshold = 300000, // 5分前に警告
    onSessionExpiring,
    onSessionExpired
  } = options;

  const { user, signOut } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      // ログアウト状態では監視停止
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      hasWarnedRef.current = false;
      return;
    }

    // セッション監視開始
    intervalRef.current = setInterval(async () => {
      try {
        // TODO: セッションの有効性をチェック
        const sessionInfo = await checkSessionValidity();
        
        if (!sessionInfo.isValid) {
          // セッション期限切れ
          onSessionExpired?.();
          await signOut();
          return;
        }

        // 期限間近の警告
        const timeUntilExpiry = sessionInfo.expiresAt - Date.now();
        if (timeUntilExpiry <= warningThreshold && !hasWarnedRef.current) {
          hasWarnedRef.current = true;
          onSessionExpiring?.();
        }

        // 警告状態のリセット
        if (timeUntilExpiry > warningThreshold) {
          hasWarnedRef.current = false;
        }

      } catch (error) {
        console.error('Session check error:', error);
      }
    }, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, checkInterval, warningThreshold, onSessionExpiring, onSessionExpired, signOut]);

  // TODO: セッション有効性チェック関数を実装
  const checkSessionValidity = async () => {
    // ヒント: supabase.auth.getSession() を使用
    return {
      isValid: true,
      expiresAt: Date.now() + 3600000 // 1時間後
    };
  };
}
```

#### ステップ 2: セッション延長機能
```typescript
// app/features/auth/hooks/use-session-refresh.ts を作成

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '~/lib/supabase';

interface SessionRefreshOptions {
  refreshThreshold?: number; // 自動更新する残り時間（ミリ秒）
  onRefreshSuccess?: () => void;
  onRefreshError?: (error: Error) => void;
}

export function useSessionRefresh(options: SessionRefreshOptions = {}) {
  const {
    refreshThreshold = 600000, // 10分前に自動更新
    onRefreshSuccess,
    onRefreshError
  } = options;

  const refreshInProgressRef = useRef(false);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (refreshInProgressRef.current) {
      return false; // 既に更新中
    }

    refreshInProgressRef.current = true;

    try {
      // TODO: セッションの更新を実装
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      if (data.session) {
        onRefreshSuccess?.();
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Session refresh error:', error);
      onRefreshError?.(error);
      return false;
    } finally {
      refreshInProgressRef.current = false;
    }
  }, [onRefreshSuccess, onRefreshError]);

  // 手動でのセッション更新
  const manualRefresh = useCallback(async () => {
    return await refreshSession();
  }, [refreshSession]);

  // 自動更新の設定
  useEffect(() => {
    const checkAndRefresh = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const expiresAt = session.expires_at! * 1000; // Unix timestamp to milliseconds
          const timeUntilExpiry = expiresAt - Date.now();
          
          if (timeUntilExpiry <= refreshThreshold) {
            await refreshSession();
          }
        }
      } catch (error) {
        console.error('Auto refresh check error:', error);
      }
    };

    // 定期チェック
    const interval = setInterval(checkAndRefresh, 300000); // 5分ごと

    return () => clearInterval(interval);
  }, [refreshThreshold, refreshSession]);

  return { refreshSession: manualRefresh };
}
```

#### ステップ 3: タブ間での認証同期
```typescript
// app/features/auth/hooks/use-auth-sync.ts を作成

import { useEffect } from 'react';
import { useAuth } from '~/features/auth/lib/auth-context';

export function useAuthSync() {
  const { user, signOut } = useAuth();

  useEffect(() => {
    // 他のタブからのメッセージを監視
    const handleStorageChange = (e: StorageEvent) => {
      // TODO: ストレージ変更イベントの処理を実装
      if (e.key === 'auth_event') {
        const eventData = e.newValue ? JSON.parse(e.newValue) : null;
        
        switch (eventData?.type) {
          case 'SIGN_OUT':
            // 他のタブでログアウトされた場合
            if (user) {
              signOut();
            }
            break;
          
          case 'SIGN_IN':
            // 他のタブでログインされた場合
            if (!user && eventData.user) {
              // ページリロードして最新状態を取得
              window.location.reload();
            }
            break;
        }
      }
    };

    // BroadcastChannel API を使用したタブ間通信
    const channel = new BroadcastChannel('auth_channel');
    
    const handleBroadcastMessage = (event: MessageEvent) => {
      // TODO: BroadcastChannel メッセージの処理を実装
      switch (event.data.type) {
        case 'AUTH_STATE_CHANGED':
          // 認証状態の変更を他のタブに通知
          break;
      }
    };

    // イベントリスナーの設定
    window.addEventListener('storage', handleStorageChange);
    channel.addEventListener('message', handleBroadcastMessage);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      channel.removeEventListener('message', handleBroadcastMessage);
      channel.close();
    };
  }, [user, signOut]);

  // 認証イベントの送信
  const broadcastAuthEvent = (type: string, data?: any) => {
    // localStorage イベント
    localStorage.setItem('auth_event', JSON.stringify({
      type,
      data,
      timestamp: Date.now()
    }));
    
    // BroadcastChannel
    const channel = new BroadcastChannel('auth_channel');
    channel.postMessage({ type, data });
    channel.close();
  };

  return { broadcastAuthEvent };
}
```

### ✅ 確認ポイント
- [ ] セッション有効期限の監視ができる
- [ ] 期限間近での警告が表示される
- [ ] セッションの自動更新が動作する
- [ ] 複数タブでの認証状態が同期する

---

## 🚀 発展課題

### 💡 課題 2-4: JWT トークンの管理強化

#### 📝 目標
JWTトークンの安全な保存、自動更新、検証機能を実装する。

#### 🔧 実装要件
```typescript
// app/utils/jwt-manager.ts を作成

export class JWTManager {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_KEY = 'refresh_token';

  // TODO: 以下の機能を実装
  
  /**
   * トークンの安全な保存
   */
  static setTokens(accessToken: string, refreshToken?: string): void {
    // ヒント: セキュリティを考慮した保存方法
  }

  /**
   * トークンの取得
   */
  static getAccessToken(): string | null {
    // ヒント: 有効期限もチェック
  }

  /**
   * トークンの有効性確認
   */
  static isTokenValid(token: string): boolean {
    // ヒント: JWTのペイロードをデコードして期限確認
  }

  /**
   * トークンの自動更新
   */
  static async refreshTokenIfNeeded(): Promise<boolean> {
    // ヒント: 期限が近い場合のみ更新
  }

  /**
   * 全トークンのクリア
   */
  static clearTokens(): void {
    // ヒント: セキュアなクリア方法
  }
}
```

### 💡 課題 2-5: ログイン履歴の実装

#### 📝 目標
ユーザーのログイン履歴を記録・表示する機能を実装する。

#### 🔧 実装要件
```typescript
// データベーステーブル設計
/*
CREATE TABLE login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  location_info JSONB,
  login_method VARCHAR(50) -- 'password', 'oauth', etc.
);
*/

// app/features/auth/services/login-history.ts を作成
export class LoginHistoryService {
  // TODO: ログイン履歴の記録機能
  static async recordLogin(userId: string, request: Request): Promise<void> {}
  
  // TODO: ログイン履歴の取得機能
  static async getLoginHistory(userId: string, limit = 10): Promise<LoginHistory[]> {}
  
  // TODO: 不審なログインの検知
  static async detectSuspiciousLogin(userId: string, currentLogin: LoginInfo): Promise<boolean> {}
}
```

### ✅ 発展課題の確認ポイント
- [ ] JWTトークンが安全に管理されている
- [ ] トークンの自動更新が機能する
- [ ] ログイン履歴が適切に記録される
- [ ] 不審なログインを検知できる

---

## 🎯 Level 2 完了チェック

### 📋 理解度確認

以下の質問にすべて答えられれば Level 2 完了です：

1. **ログインフォームのバリデーションはなぜ重要ですか？**
   - [あなたの理解]

2. **パスワード強度チェックはどのような基準で実装しましたか？**
   - [実装した基準]

3. **セッションの有効期限管理はどのように実装しましたか？**
   - [実装方法]

4. **JWTトークンの自動更新はなぜ必要ですか？**
   - [理由と実装]

5. **複数タブでの認証状態同期はどうやって実現しましたか？**
   - [実装方法]

### 🎉 次のステップ

Level 2 が完了したら、**[Level 3 実習: 認可実装](./level-3-exercises.md)** に進みましょう！

Level 3 では権限制御とルート保護の実装を詳しく学習します。