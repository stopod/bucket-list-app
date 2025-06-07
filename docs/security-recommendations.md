# 認証セキュリティ 推奨事項

## 現在の実装 vs セキュア実装

### 現在の実装（LocalStorage）

```typescript
// 現在の設定
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**セキュリティレベル: 🔒 基本**
- JWTがLocalStorageに平文保存
- XSS攻撃に脆弱
- CSRFには強い

### 推奨実装（HttpOnly Cookie + 暗号化）

```typescript
// セキュア実装
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',  // PKCE使用
    storage: createSecureCookieStorage(),  // Cookie使用
  }
});
```

**セキュリティレベル: 🔐 高セキュリティ**
- JWTがHttpOnly Cookieに保存
- XSS攻撃から保護
- CSRF対策も実装可能

## セキュリティ脅威と対策

### 1. XSS (Cross-Site Scripting) 攻撃

**脅威:**
```javascript
// 悪意のあるスクリプトが実行された場合
const token = localStorage.getItem('supabase.auth.token');
// トークンが盗まれる可能性
```

**対策:**
1. **HttpOnly Cookie使用**
```javascript
// JavaScriptからアクセス不可
Set-Cookie: auth-token=xxx; HttpOnly; Secure; SameSite=Strict
```

2. **Content Security Policy (CSP)**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline'">
```

3. **入力検証・エスケープ**
```typescript
// ユーザー入力の適切な処理
const sanitizedInput = DOMPurify.sanitize(userInput);
```

### 2. CSRF (Cross-Site Request Forgery) 攻撃

**脅威:**
```html
<!-- 悪意のあるサイトから -->
<img src="https://yourdomain.com/api/delete-account" />
```

**対策:**
1. **SameSite Cookie**
```javascript
Set-Cookie: auth-token=xxx; SameSite=Strict
```

2. **CSRFトークン**
```typescript
// リクエスト時にCSRFトークンを含める
headers: {
  'X-CSRF-Token': csrfToken
}
```

### 3. セッションハイジャック

**脅威:**
- ネットワーク盗聴
- セッション固定攻撃

**対策:**
1. **HTTPS強制**
```typescript
if (location.protocol !== 'https:' && import.meta.env.PROD) {
  location.replace(`https:${location.href.substring(location.protocol.length)}`);
}
```

2. **セッションローテーション**
```typescript
// ログイン後にセッションIDを更新
await supabase.auth.refreshSession();
```

## 実装段階別推奨事項

### Phase 1: 基本セキュリティ（現在）
```typescript
// ✅ 実装済み
- JWTベース認証
- HTTPS使用（本番環境）
- Row Level Security (RLS)
- 入力検証

// 🔄 改善可能
- XSS対策強化
- セッション管理改善
```

### Phase 2: 中級セキュリティ
```typescript
// 🎯 次の実装目標
export const supabase = createClient(url, key, {
  auth: {
    flowType: 'pkce',  // PKCE認証フロー
    storage: createEncryptedStorage(),  // 暗号化ストレージ
  }
});

// CSP実装
const cspMeta = document.createElement('meta');
cspMeta.httpEquiv = 'Content-Security-Policy';
cspMeta.content = "default-src 'self'; script-src 'self'";
```

### Phase 3: 高セキュリティ
```typescript
// 🚀 将来の実装
- HttpOnly Cookie + サーバーサイド管理
- 多要素認証 (MFA)
- デバイス認証
- 異常検知・監査ログ
- セッション管理の完全サーバーサイド化
```

## 具体的な実装手順

### 1. 暗号化ストレージの実装

```typescript
// app/lib/encrypted-storage.ts
import { webcrypto } from 'crypto';

class EncryptedStorage {
  private key: CryptoKey | null = null;

  async init() {
    // キー生成（実際は安全な方法で管理）
    this.key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async setItem(key: string, value: string) {
    if (!this.key) throw new Error('Storage not initialized');
    
    const encoded = new TextEncoder().encode(value);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key,
      encoded
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    localStorage.setItem(key, btoa(String.fromCharCode(...combined)));
  }

  async getItem(key: string): Promise<string | null> {
    if (!this.key) throw new Error('Storage not initialized');
    
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    try {
      const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.key,
        encrypted
      );
      
      return new TextDecoder().decode(decrypted);
    } catch {
      return null;
    }
  }

  removeItem(key: string) {
    localStorage.removeItem(key);
  }
}

export const encryptedStorage = new EncryptedStorage();
```

### 2. セキュリティヘッダーの設定

```typescript
// app/lib/security-headers.ts
export const setSecurityHeaders = () => {
  // CSP設定
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // 必要に応じて調整
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  // メタタグでCSP設定
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = csp;
  document.head.appendChild(meta);
};

// セキュリティ検証
export const validateSecurity = () => {
  const issues: string[] = [];

  // HTTPS確認
  if (location.protocol !== 'https:' && import.meta.env.PROD) {
    issues.push('HTTPS が使用されていません');
  }

  // Secure Context確認
  if (!window.isSecureContext) {
    issues.push('Secure Context ではありません');
  }

  // Web Crypto API確認
  if (!window.crypto?.subtle) {
    issues.push('Web Crypto API が利用できません');
  }

  return {
    isSecure: issues.length === 0,
    issues
  };
};
```

### 3. 監査ログの実装

```typescript
// app/lib/audit-log.ts
interface AuditEvent {
  event: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  userAgent: string;
  ipAddress?: string;
}

class AuditLogger {
  private logs: AuditEvent[] = [];

  log(event: string, metadata?: Record<string, any>) {
    const auditEvent: AuditEvent = {
      event,
      userId: this.getCurrentUserId(),
      metadata,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
    };

    this.logs.push(auditEvent);
    
    // Supabaseに送信
    this.sendToSupabase(auditEvent);
  }

  private getCurrentUserId(): string | undefined {
    // 現在のユーザーIDを取得
    return undefined; // 実装に依存
  }

  private async sendToSupabase(event: AuditEvent) {
    try {
      await supabase.from('audit_logs').insert(event);
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}

export const auditLogger = new AuditLogger();

// 使用例
auditLogger.log('user_login', { method: 'email' });
auditLogger.log('sensitive_data_access', { resource: 'user_profile' });
```

## 移行戦略

### 段階的実装アプローチ

1. **Week 1-2: 基盤強化**
   - 暗号化ストレージ実装
   - セキュリティヘッダー設定
   - 監査ログ基盤構築

2. **Week 3-4: Cookie移行**
   - Cookie認証の実装
   - サーバーサイド設定
   - 既存ユーザーの移行

3. **Week 5-6: 追加セキュリティ**
   - MFA実装
   - 異常検知
   - セキュリティテスト

### 互換性維持

```typescript
// 段階的移行のための互換レイヤー
export const createCompatibleAuth = () => {
  const useNewAuth = localStorage.getItem('use-new-auth') === 'true';
  
  return useNewAuth 
    ? getProductionSupabaseClient()
    : supabase; // 既存クライアント
};
```

## 結論

**現在の実装（LocalStorage）:**
- 🟡 中程度のセキュリティ
- 🟢 実装が簡単
- 🔴 XSS に脆弱

**推奨実装（HttpOnly Cookie + 暗号化）:**
- 🟢 高いセキュリティ
- 🟡 実装が複雑
- 🟢 XSS から保護

**次のステップ:**
1. 暗号化ストレージの実装
2. セキュリティヘッダーの設定
3. 段階的にCookie認証へ移行

セキュリティは段階的に改善していくことが重要です。現在の実装も基本的なセキュリティは確保されているので、優先度と開発リソースに応じて改善していくことをお勧めします。