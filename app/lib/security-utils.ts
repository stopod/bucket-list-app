// セキュリティユーティリティ

// CSP（Content Security Policy）設定
export const setupCSP = () => {
  if (typeof document === "undefined") {
    return;
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // React開発のため一時的に unsafe-inline を許可
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  // 既存のCSPメタタグを削除
  const existingCSP = document.querySelector(
    'meta[http-equiv="Content-Security-Policy"]'
  );
  if (existingCSP) {
    existingCSP.remove();
  }

  // 新しいCSPメタタグを追加
  const meta = document.createElement("meta");
  meta.httpEquiv = "Content-Security-Policy";
  meta.content = csp;
  document.head.appendChild(meta);
};

// セキュリティヘッダーのクライアントサイド検証
export const validateSecurityHeaders = () => {
  if (typeof window === "undefined") {
    return { isSecure: true, issues: [] };
  }

  const issues: string[] = [];

  // HTTPS確認
  if (location.protocol !== "https:" && import.meta.env.PROD) {
    issues.push("HTTPS が使用されていません");
  }

  // Secure Context確認
  if (!window.isSecureContext && import.meta.env.PROD) {
    issues.push("Secure Context ではありません");
  }

  // Web Crypto API確認
  if (!window.crypto?.subtle) {
    issues.push("Web Crypto API が利用できません");
  }

  // Mixed Content確認
  if (import.meta.env.PROD && location.protocol === "https:") {
    // 検証ロジックを追加可能
  }

  return {
    isSecure: issues.length === 0,
    issues,
    recommendations:
      issues.length > 0
        ? [
            "HTTPS を有効にしてください",
            "セキュアな環境でアプリケーションを実行してください",
            "モダンブラウザを使用してください",
          ]
        : [],
  };
};

// セキュリティ警告の表示（重要な警告のみ）
export const showSecurityWarnings = () => {
  const validation = validateSecurityHeaders();

  if (!validation.isSecure && import.meta.env.DEV) {
    // 開発環境でのみ重要なセキュリティ警告を表示
    validation.issues.forEach((issue) => {
      if (issue.includes("HTTPS") || issue.includes("Secure Context")) {
        console.warn("セキュリティ警告:", issue);
      }
    });
  }
};

// XSS対策：文字列のサニタイズ
export const sanitizeString = (str: string): string => {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return str.replace(/[&<>"'/]/g, (s) => map[s]);
};

// 入力検証ユーティリティ
export const validators = {
  email: (email: string): boolean => {
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  },

  password: (
    password: string
  ): { valid: boolean; score: number; feedback: string[] } => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push("8文字以上である必要があります");
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("小文字を含める必要があります");
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("大文字を含める必要があります");
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push("数字を含める必要があります");
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push("特殊文字を含めることを推奨します");
    }

    return {
      valid: score >= 3,
      score,
      feedback,
    };
  },

  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
};

// レート制限（簡易版）
class RateLimit {
  private attempts: Map<string, number[]> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // 古い試行を削除
    const recentAttempts = attempts.filter(
      (time) => now - time < this.windowMs
    );

    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);

    return true;
  }

  getRemainingTime(key: string): number {
    const attempts = this.attempts.get(key) || [];
    if (attempts.length === 0) {
      return 0;
    }

    const oldestAttempt = Math.min(...attempts);
    const timeToReset = this.windowMs - (Date.now() - oldestAttempt);

    return Math.max(0, timeToReset);
  }
}

// グローバルレート制限インスタンス
export const authRateLimit = new RateLimit(5, 15 * 60 * 1000); // 15分間で5回まで

// セキュリティ初期化
export const initializeSecurity = () => {
  if (typeof window === "undefined") {
    return;
  }

  // CSP設定
  setupCSP();

  // セキュリティ検証（重要な警告のみ）
  showSecurityWarnings();
};
