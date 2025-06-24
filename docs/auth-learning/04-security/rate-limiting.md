# レート制限

## 🎯 学習目標

- レート制限の重要性とアルゴリズムを理解する
- ブルートフォース攻撃とDDoS攻撃の対策を学ぶ
- 実装方法とパフォーマンスへの影響を知る
- 実際の攻撃シナリオと防御策を理解する
- バケットリストアプリでの実装を詳細に分析する

## 🚨 レート制限とは

### 📝 基本概念

**レート制限 (Rate Limiting)** は、一定時間内に行える操作の回数を制限することで、サーバーリソースを保護し、悪意のある攻撃を防ぐ仕組みです。

```mermaid
sequenceDiagram
    participant A as 🏴‍☠️ 攻撃者
    participant R as 🛡️ レート制限
    participant S as 🖥️ サーバー

    Note over A,S: 正常なリクエスト
    A->>R: リクエスト 1
    R->>S: 許可
    S-->>A: レスポンス

    Note over A,S: 制限内でのリクエスト
    A->>R: リクエスト 2-5
    R->>S: 許可
    S-->>A: レスポンス

    Note over A,S: 制限を超えたリクエスト
    A->>R: リクエスト 6 (制限超過)
    R-->>A: 429 Too Many Requests 🚫
    
    Note over A,S: 一定時間後
    A->>R: リクエスト (時間経過後)
    R->>S: 許可
    S-->>A: レスポンス

    style R fill:#fff3e0
    style A fill:#ffcdd2
```

### 😱 レート制限が必要な理由

#### 🎯 攻撃対象と被害

```typescript
// レート制限なしの場合の攻撃例
const attackScenarios = {
  // ブルートフォース攻撃
  bruteForce: {
    target: "認証エンドポイント",
    method: "パスワード総当たり",
    impact: "アカウント乗っ取り",
    requestsPerSecond: 1000,
    example: `
      // 1秒間に1000回のログイン試行
      for (let i = 0; i < passwords.length; i++) {
        fetch('/api/login', {
          method: 'POST',
          body: JSON.stringify({
            email: 'victim@example.com',
            password: passwords[i]
          })
        });
      }
    `
  },

  // DDoS攻撃
  ddos: {
    target: "全てのエンドポイント",
    method: "大量リクエスト送信",
    impact: "サービス停止",
    requestsPerSecond: 10000,
    example: `
      // 複数のボットから同時攻撃
      const botIPs = ['1.1.1.1', '2.2.2.2', '3.3.3.3'];
      botIPs.forEach(ip => {
        setInterval(() => {
          fetch('/api/expensive-operation', { 
            headers: { 'X-Forwarded-For': ip }
          });
        }, 1); // 1ミリ秒ごと
      });
    `
  },

  // API乱用
  apiAbuse: {
    target: "データ取得API",
    method: "データスクレイピング",
    impact: "サーバー負荷・帯域圧迫",
    requestsPerSecond: 100,
    example: `
      // 全ユーザーデータの一括取得試行
      for (let userId = 1; userId <= 1000000; userId++) {
        fetch(\`/api/users/\${userId}\`);
      }
    `
  }
};
```

## 🔧 レート制限のアルゴリズム

### 1. 🪣 Token Bucket (トークンバケット)

```typescript
// バケットリストアプリで実装されているアルゴリズム
// app/lib/rate-limit.ts より
export class RateLimit {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(
    private maxAttempts: number,
    private windowMs: number // 時間窓（ミリ秒）
  ) {}

  async checkLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier);

    // 時間窓がリセットされた場合
    if (!userAttempts || now > userAttempts.resetTime) {
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetTime: now + this.windowMs,
      };
    }

    // 制限内の場合
    if (userAttempts.count < this.maxAttempts) {
      userAttempts.count++;
      return {
        allowed: true,
        remaining: this.maxAttempts - userAttempts.count,
        resetTime: userAttempts.resetTime,
      };
    }

    // 制限超過の場合
    return {
      allowed: false,
      remaining: 0,
      resetTime: userAttempts.resetTime,
    };
  }

  // 定期的なクリーンアップ
  startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.attempts.entries()) {
        if (now > value.resetTime) {
          this.attempts.delete(key);
        }
      }
    }, this.windowMs);
  }
}
```

### 2. 🏃 Sliding Window (スライディングウィンドウ)

```typescript
// より精密な制御が可能なアルゴリズム
class SlidingWindowRateLimit {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];

    // 古いリクエストを削除（スライディングウィンドウ）
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.windowMs
    );

    // 制限チェック
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // 新しいリクエストを記録
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  getTimeUntilReset(identifier: string): number {
    const userRequests = this.requests.get(identifier) || [];
    if (userRequests.length === 0) return 0;

    const oldestRequest = Math.min(...userRequests);
    const resetTime = oldestRequest + this.windowMs;
    return Math.max(0, resetTime - Date.now());
  }
}
```

### 3. ⏰ Fixed Window (固定ウィンドウ)

```typescript
// シンプルで効率的だが精度は劣る
class FixedWindowRateLimit {
  private windows: Map<string, { count: number; windowStart: number }> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    
    const userWindow = this.windows.get(identifier);

    // 新しいウィンドウの場合
    if (!userWindow || userWindow.windowStart !== windowStart) {
      this.windows.set(identifier, { count: 1, windowStart });
      return true;
    }

    // 既存ウィンドウ内でのチェック
    if (userWindow.count >= this.maxRequests) {
      return false;
    }

    userWindow.count++;
    return true;
  }
}
```

### 4. 💧 Leaky Bucket (リーキーバケット)

```typescript
// 平滑化されたレート制限
class LeakyBucketRateLimit {
  private buckets: Map<string, { volume: number; lastLeak: number }> = new Map();

  constructor(
    private capacity: number,    // バケットの容量
    private leakRate: number    // 1秒あたりのリーク量
  ) {}

  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      bucket = { volume: 0, lastLeak: now };
      this.buckets.set(identifier, bucket);
    }

    // 時間経過による水漏れを計算
    const timeDiff = (now - bucket.lastLeak) / 1000; // 秒
    const leaked = timeDiff * this.leakRate;
    bucket.volume = Math.max(0, bucket.volume - leaked);
    bucket.lastLeak = now;

    // バケットに余裕があるかチェック
    if (bucket.volume >= this.capacity) {
      return false;
    }

    // リクエストを追加（水を1滴追加）
    bucket.volume += 1;
    return true;
  }
}
```

## 🎯 バケットリストアプリでの実装

### 🔐 認証エンドポイントの保護

```typescript
// app/features/auth/lib/auth-context.tsx より
// 認証試行のレート制限
const authRateLimit = new RateLimit(5, 15 * 60 * 1000); // 15分間で5回まで

const signIn = async (email: string, password: string) => {
  try {
    // レート制限チェック
    const clientIP = getClientIP(); // IP アドレス取得
    const identifier = `auth:${clientIP}:${email}`;
    
    const rateLimitResult = await authRateLimit.checkLimit(identifier);
    
    if (!rateLimitResult.allowed) {
      const waitTime = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000 / 60);
      return { 
        error: { 
          message: `ログイン試行回数が上限に達しました。${waitTime}分後に再試行してください。` 
        } 
      };
    }

    // 実際の認証処理
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    // 成功時はカウンターをリセット（オプション）
    if (!error) {
      authRateLimit.reset(identifier);
    }

    return { error };
  } catch (error) {
    console.error("Unexpected sign in error:", error);
    return { error: { message: "予期しないエラーが発生しました" } };
  }
};
```

### 🛡️ API エンドポイントの保護

```typescript
// API レベルでのレート制限ミドルウェア
class APIRateLimiter {
  private limits: Map<string, RateLimit> = new Map();

  constructor() {
    // エンドポイント別の制限設定
    this.limits.set('auth', new RateLimit(5, 15 * 60 * 1000));      // 認証: 15分で5回
    this.limits.set('api_read', new RateLimit(100, 60 * 1000));     // 読み取り: 1分で100回
    this.limits.set('api_write', new RateLimit(30, 60 * 1000));     // 書き込み: 1分で30回
    this.limits.set('search', new RateLimit(20, 60 * 1000));        // 検索: 1分で20回
  }

  async middleware(req: Request, res: Response, next: NextFunction) {
    const clientIP = this.getClientIP(req);
    const endpoint = this.getEndpointType(req.path);
    const rateLimiter = this.limits.get(endpoint);

    if (!rateLimiter) {
      return next(); // 制限なし
    }

    const identifier = `${endpoint}:${clientIP}`;
    const result = await rateLimiter.checkLimit(identifier);

    // レスポンスヘッダーに制限情報を追加
    res.setHeader('X-RateLimit-Limit', rateLimiter.maxAttempts);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
        retryAfter: retryAfter
      });
    }

    next();
  }

  private getEndpointType(path: string): string {
    if (path.includes('/auth/')) return 'auth';
    if (path.includes('/search')) return 'search';
    if (['POST', 'PUT', 'DELETE'].includes(method)) return 'api_write';
    return 'api_read';
  }

  private getClientIP(req: Request): string {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           'unknown';
  }
}

// 使用例
const app = express();
const rateLimiter = new APIRateLimiter();

app.use('/api', rateLimiter.middleware.bind(rateLimiter));
```

## 🔍 高度なレート制限技術

### 🎯 ユーザーレベル別制限

```typescript
// ユーザーの種類に応じた動的制限
interface UserTier {
  name: string;
  requestsPerMinute: number;
  burstAllowance: number;
  priority: number;
}

const userTiers: Record<string, UserTier> = {
  'free': {
    name: 'フリーユーザー',
    requestsPerMinute: 60,
    burstAllowance: 10,
    priority: 1
  },
  'premium': {
    name: 'プレミアムユーザー',
    requestsPerMinute: 300,
    burstAllowance: 50,
    priority: 2
  },
  'enterprise': {
    name: 'エンタープライズ',
    requestsPerMinute: 1000,
    burstAllowance: 200,
    priority: 3
  }
};

class TierBasedRateLimit {
  private userLimits: Map<string, RateLimit> = new Map();

  async checkLimit(userId: string, userTier: string): Promise<boolean> {
    const tier = userTiers[userTier] || userTiers['free'];
    
    if (!this.userLimits.has(userId)) {
      this.userLimits.set(userId, new RateLimit(
        tier.requestsPerMinute,
        60 * 1000 // 1分
      ));
    }

    const rateLimiter = this.userLimits.get(userId)!;
    const result = await rateLimiter.checkLimit(userId);
    
    return result.allowed;
  }

  // ユーザーのアップグレード時の制限変更
  upgradeUser(userId: string, newTier: string): void {
    const tier = userTiers[newTier];
    this.userLimits.set(userId, new RateLimit(
      tier.requestsPerMinute,
      60 * 1000
    ));
  }
}
```

### 🌍 地理的分散対応

```typescript
// 複数データセンター間でのレート制限同期
class DistributedRateLimit {
  private localCache: Map<string, any> = new Map();
  private redis: RedisClient;

  constructor(redisClient: RedisClient) {
    this.redis = redisClient;
  }

  async checkLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;

    try {
      // Redis で分散カウンターを使用
      const pipeline = this.redis.pipeline();
      pipeline.hincrby(key, 'count', 1);
      pipeline.hset(key, 'window', windowStart);
      pipeline.expire(key, Math.ceil(windowMs / 1000));
      
      const results = await pipeline.exec();
      const currentCount = results[0][1] as number;
      const storedWindow = await this.redis.hget(key, 'window');

      // ウィンドウが変わった場合はリセット
      if (parseInt(storedWindow) !== windowStart) {
        await this.redis.hset(key, 'count', 1);
        await this.redis.hset(key, 'window', windowStart);
        return true;
      }

      return currentCount <= limit;
    } catch (error) {
      // Redis 障害時のフォールバック
      console.warn('Redis unavailable, using local rate limiting:', error);
      return this.localFallback(identifier, limit, windowMs);
    }
  }

  private localFallback(identifier: string, limit: number, windowMs: number): boolean {
    // ローカルキャッシュによるフォールバック
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    
    const cached = this.localCache.get(identifier);
    if (!cached || cached.window !== windowStart) {
      this.localCache.set(identifier, { count: 1, window: windowStart });
      return true;
    }

    cached.count++;
    return cached.count <= limit;
  }
}
```

### ⚡ パフォーマンス最適化

```typescript
// 効率的なレート制限実装
class OptimizedRateLimit {
  private cache: Map<string, { count: number; reset: number }> = new Map();
  private batchOperations: Map<string, number> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(
    private maxRequests: number,
    private windowMs: number,
    private batchIntervalMs: number = 100
  ) {}

  async checkLimit(identifier: string): Promise<boolean> {
    // バッチ処理でパフォーマンス向上
    this.batchOperations.set(identifier, (this.batchOperations.get(identifier) || 0) + 1);
    
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
        this.batchTimer = null;
      }, this.batchIntervalMs);
    }

    // 現在のカウンターをチェック
    const current = this.cache.get(identifier);
    const now = Date.now();

    if (!current || now > current.reset) {
      this.cache.set(identifier, { count: 1, reset: now + this.windowMs });
      return true;
    }

    return current.count < this.maxRequests;
  }

  private processBatch(): void {
    const now = Date.now();
    
    for (const [identifier, increment] of this.batchOperations.entries()) {
      const current = this.cache.get(identifier);
      
      if (!current || now > current.reset) {
        this.cache.set(identifier, { 
          count: increment, 
          reset: now + this.windowMs 
        });
      } else {
        current.count += increment;
      }
    }

    this.batchOperations.clear();
  }

  // メモリ使用量の最適化
  startMemoryOptimization(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now > value.reset) {
          this.cache.delete(key);
        }
      }
    }, this.windowMs);
  }
}
```

## 🚨 実際の攻撃対策

### 🎯 ブルートフォース攻撃対策

```typescript
// 段階的な制限強化
class AdaptiveRateLimit {
  private violations: Map<string, number> = new Map();
  private banList: Map<string, number> = new Map();

  async checkLimit(identifier: string, baseLimit: number): Promise<{ allowed: boolean; reason?: string }> {
    const now = Date.now();
    
    // BANリストのチェック
    const banUntil = this.banList.get(identifier);
    if (banUntil && now < banUntil) {
      const remainingMinutes = Math.ceil((banUntil - now) / 60000);
      return { 
        allowed: false, 
        reason: `一時的にアクセスが制限されています。${remainingMinutes}分後に再試行してください。` 
      };
    }

    // 違反回数に応じた制限調整
    const violations = this.violations.get(identifier) || 0;
    const adjustedLimit = Math.max(1, baseLimit - violations * 2);

    const basicCheck = await this.basicRateLimit.checkLimit(identifier, adjustedLimit);
    
    if (!basicCheck.allowed) {
      // 違反回数を増加
      this.violations.set(identifier, violations + 1);

      // 違反が多い場合は一時BAN
      if (violations >= 5) {
        const banDuration = Math.min(60 * 60 * 1000, violations * 5 * 60 * 1000); // 最大1時間
        this.banList.set(identifier, now + banDuration);
        
        return { 
          allowed: false, 
          reason: `不正なアクセスが検出されたため、一時的にアクセスを制限しています。` 
        };
      }

      return { allowed: false, reason: 'リクエストが多すぎます。' };
    }

    // 成功時は違反回数を減少
    if (violations > 0) {
      this.violations.set(identifier, Math.max(0, violations - 1));
    }

    return { allowed: true };
  }
}
```

### 🤖 ボット検出と対策

```typescript
// ボット検出機能付きレート制限
class BotDetectionRateLimit {
  private behaviorAnalysis: Map<string, UserBehavior> = new Map();

  interface UserBehavior {
    requestIntervals: number[];
    userAgents: Set<string>;
    referers: Set<string>;
    suspiciousPatterns: number;
  }

  async checkLimit(
    identifier: string, 
    request: Request
  ): Promise<{ allowed: boolean; isSuspicious: boolean }> {
    // ユーザー行動の分析
    const behavior = this.analyzeBehavior(identifier, request);
    const isSuspicious = this.detectBotBehavior(behavior);

    // 怪しいユーザーには厳しい制限
    const limit = isSuspicious ? 10 : 100;
    const basicCheck = await this.basicRateLimit.checkLimit(identifier, limit);

    if (isSuspicious) {
      // セキュリティログに記録
      await this.logSuspiciousActivity(identifier, request, behavior);
    }

    return {
      allowed: basicCheck.allowed,
      isSuspicious
    };
  }

  private detectBotBehavior(behavior: UserBehavior): boolean {
    let suspiciousScore = 0;

    // 1. 一定間隔でのリクエスト（ボット特有）
    if (this.hasConstantInterval(behavior.requestIntervals)) {
      suspiciousScore += 30;
    }

    // 2. User-Agent の不自然さ
    if (this.hasInvalidUserAgent(behavior.userAgents)) {
      suspiciousScore += 25;
    }

    // 3. Referer の不自然さ
    if (behavior.referers.size === 0) {
      suspiciousScore += 15;
    }

    // 4. 高頻度リクエスト
    const avgInterval = behavior.requestIntervals.reduce((a, b) => a + b, 0) / behavior.requestIntervals.length;
    if (avgInterval < 100) { // 100ms未満の間隔
      suspiciousScore += 40;
    }

    return suspiciousScore >= 50;
  }

  private hasConstantInterval(intervals: number[]): boolean {
    if (intervals.length < 5) return false;
    
    const variance = this.calculateVariance(intervals);
    return variance < 10; // 分散が小さい = 一定間隔
  }

  private async logSuspiciousActivity(
    identifier: string, 
    request: Request, 
    behavior: UserBehavior
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      identifier,
      ip: request.headers['x-forwarded-for'] || request.connection.remoteAddress,
      userAgent: request.headers['user-agent'],
      referer: request.headers['referer'],
      behavior: {
        avgInterval: behavior.requestIntervals.reduce((a, b) => a + b, 0) / behavior.requestIntervals.length,
        userAgentCount: behavior.userAgents.size,
        refererCount: behavior.referers.size,
        suspiciousPatterns: behavior.suspiciousPatterns
      }
    };

    // セキュリティログまたは外部システムに送信
    console.log('Suspicious activity detected:', logEntry);
  }
}
```

## 📊 レート制限の監視とチューニング

### 📈 メトリクス収集

```typescript
// レート制限の効果測定
class RateLimitMetrics {
  private metrics = {
    totalRequests: 0,
    blockedRequests: 0,
    falsePositives: 0,
    responseTime: [] as number[],
    topBlockedIPs: new Map<string, number>()
  };

  recordRequest(allowed: boolean, responseTime: number, clientIP: string): void {
    this.metrics.totalRequests++;
    this.metrics.responseTime.push(responseTime);

    if (!allowed) {
      this.metrics.blockedRequests++;
      const currentCount = this.metrics.topBlockedIPs.get(clientIP) || 0;
      this.metrics.topBlockedIPs.set(clientIP, currentCount + 1);
    }
  }

  generateReport(): RateLimitReport {
    const blockRate = (this.metrics.blockedRequests / this.metrics.totalRequests) * 100;
    const avgResponseTime = this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length;
    
    return {
      period: new Date().toISOString(),
      totalRequests: this.metrics.totalRequests,
      blockedRequests: this.metrics.blockedRequests,
      blockRate: blockRate.toFixed(2) + '%',
      averageResponseTime: avgResponseTime.toFixed(2) + 'ms',
      topBlockedIPs: Array.from(this.metrics.topBlockedIPs.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      recommendations: this.generateRecommendations(blockRate, avgResponseTime)
    };
  }

  private generateRecommendations(blockRate: number, avgResponseTime: number): string[] {
    const recommendations = [];

    if (blockRate > 20) {
      recommendations.push('ブロック率が高すぎます。制限を緩和することを検討してください。');
    } else if (blockRate < 1) {
      recommendations.push('ブロック率が低すぎます。制限を厳しくすることを検討してください。');
    }

    if (avgResponseTime > 100) {
      recommendations.push('レスポンス時間が遅いです。レート制限処理の最適化が必要です。');
    }

    return recommendations;
  }
}
```

### 🎛️ 動的調整

```typescript
// 負荷に応じた自動調整
class AdaptiveRateLimit {
  private currentLimits: Map<string, number> = new Map();
  private serverMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    responseTime: 0
  };

  async adjustLimits(): Promise<void> {
    // サーバーメトリクスを取得
    await this.updateServerMetrics();

    // 負荷に応じて制限を調整
    const adjustmentFactor = this.calculateAdjustmentFactor();

    for (const [endpoint, baseLimit] of this.baseLimits.entries()) {
      const newLimit = Math.max(1, Math.floor(baseLimit * adjustmentFactor));
      this.currentLimits.set(endpoint, newLimit);
    }

    console.log(`Rate limits adjusted by factor: ${adjustmentFactor}`);
  }

  private calculateAdjustmentFactor(): number {
    let factor = 1.0;

    // CPU 使用率による調整
    if (this.serverMetrics.cpuUsage > 80) {
      factor *= 0.5; // 50% 削減
    } else if (this.serverMetrics.cpuUsage < 30) {
      factor *= 1.2; // 20% 増加
    }

    // メモリ使用率による調整
    if (this.serverMetrics.memoryUsage > 85) {
      factor *= 0.7; // 30% 削減
    }

    // レスポンス時間による調整
    if (this.serverMetrics.responseTime > 1000) {
      factor *= 0.6; // 40% 削減
    }

    return Math.max(0.1, Math.min(2.0, factor)); // 0.1〜2.0 の範囲に制限
  }

  // 5分ごとに自動調整
  startAutoAdjustment(): void {
    setInterval(async () => {
      await this.adjustLimits();
    }, 5 * 60 * 1000);
  }
}
```

## 🎯 重要なポイント

### ✅ レート制限のベストプラクティス

1. **適切な制限値**: ユーザータイプに応じた柔軟な設定
2. **明確なエラーメッセージ**: ユーザーフレンドリーな案内
3. **段階的制限**: 違反に応じた制限強化
4. **監視と調整**: 継続的なパフォーマンス監視
5. **フォールバック**: システム障害時の代替手段

### ❌ よくある実装ミス

```typescript
// ❌ 悪い例
function badRateLimit() {
  // 1. 制限が厳しすぎる
  const rateLimiter = new RateLimit(1, 60 * 1000); // 1分に1回のみ
  
  // 2. エラーメッセージが不親切
  if (!allowed) {
    throw new Error('Rate limit exceeded');
  }
  
  // 3. 全ユーザーに同じ制限
  const oneSize = new RateLimit(10, 60 * 1000);
  
  // 4. メモリリークの原因
  const userCounts = new Map(); // クリーンアップなし
}

// ✅ 良い例
function goodRateLimit() {
  // 1. 合理的な制限値
  const rateLimiter = new RateLimit(100, 60 * 1000); // 1分に100回
  
  // 2. 親切なエラーメッセージ
  if (!allowed) {
    const waitTime = Math.ceil((resetTime - Date.now()) / 1000);
    return {
      error: `リクエストが多すぎます。${waitTime}秒後に再試行してください。`,
      retryAfter: waitTime
    };
  }
  
  // 3. ユーザータイプ別制限
  const limit = userTier === 'premium' ? 1000 : 100;
  
  // 4. 適切なクリーンアップ
  rateLimiter.startCleanup();
}
```

### 🔧 制限値の設定指針

| エンドポイント | 制限値 | 理由 |
|---------------|---------|------|
| **ログイン** | 5回/15分 | ブルートフォース対策 |
| **API読み取り** | 100回/分 | 通常使用に影響なし |
| **API書き込み** | 30回/分 | サーバー負荷軽減 |
| **検索** | 20回/分 | 計算コストが高い |
| **ファイルアップロード** | 10回/時間 | 帯域・ストレージ保護 |

## 🚀 次のステップ

Level 4: セキュリティ対策の学習が完了しました！これで以下の重要なセキュリティ概念を身につけました：

✅ **入力値検証**: すべてのセキュリティの基盤  
✅ **XSS攻撃対策**: クロスサイトスクリプティング防止  
✅ **CSRF攻撃対策**: クロスサイトリクエストフォージェリ防止  
✅ **レート制限**: ブルートフォースとDDoS対策  

次は **[Level 5: 高度なトピック](../05-advanced/README.md)** に進みましょう。

Level 5 では最新の認証認可技術について学習します：

- SSR環境での認証実装
- マイクロサービスアーキテクチャでの認証
- OAuth 2.0とOpenID Connectの詳細
- 最新のセキュリティトレンドと将来展望

基本的なセキュリティ対策を身につけたので、次は実用的な高度な技術を学びましょう！