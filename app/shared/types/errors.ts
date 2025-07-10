/**
 * ドメイン別エラー型定義
 * アプリケーション全体で使用される統一されたエラー分類
 */

/**
 * バリデーションエラー - 入力値の検証失敗時
 */
export interface ValidationError {
  type: "ValidationError";
  field: string;
  message: string;
  code?: string;
}

/**
 * データベースエラー - DB操作失敗時
 */
export interface DatabaseError {
  type: "DatabaseError";
  message: string;
  code?: string;
  operation?: "create" | "read" | "update" | "delete";
}

/**
 * 認証エラー - 認証・認可失敗時
 */
export interface AuthenticationError {
  type: "AuthenticationError";
  message: string;
  reason:
    | "invalid_credentials"
    | "token_expired"
    | "insufficient_permissions"
    | "user_not_found";
}

/**
 * リソース未発見エラー - 要求されたリソースが存在しない時
 */
export interface NotFoundError {
  type: "NotFoundError";
  resource: string;
  id?: string;
  message: string;
}

/**
 * 競合エラー - データの競合状態が発生した時
 */
export interface ConflictError {
  type: "ConflictError";
  resource: string;
  message: string;
  conflictingData?: unknown;
}

/**
 * ネットワークエラー - 通信障害時
 */
export interface NetworkError {
  type: "NetworkError";
  message: string;
  statusCode?: number;
  url?: string;
}

/**
 * ビジネスルールエラー - ビジネスロジック違反時
 */
export interface BusinessRuleError {
  type: "BusinessRuleError";
  rule: string;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * 一般的なアプリケーションエラー - その他の予期しないエラー
 */
export interface ApplicationError {
  type: "ApplicationError";
  message: string;
  cause?: Error;
  context?: Record<string, unknown>;
}

/**
 * バケットリスト機能用の統合エラー型
 */
export type BucketListError =
  | ValidationError
  | DatabaseError
  | AuthenticationError
  | NotFoundError
  | ConflictError
  | NetworkError
  | BusinessRuleError
  | ApplicationError;

/**
 * エラー作成ヘルパー関数群
 */
export const createValidationError = (
  field: string,
  message: string,
  code?: string
): ValidationError => ({
  type: "ValidationError",
  field,
  message,
  code,
});

export const createDatabaseError = (
  message: string,
  operation?: DatabaseError["operation"],
  code?: string
): DatabaseError => ({
  type: "DatabaseError",
  message,
  operation,
  code,
});

export const createAuthenticationError = (
  message: string,
  reason: AuthenticationError["reason"]
): AuthenticationError => ({
  type: "AuthenticationError",
  message,
  reason,
});

export const createNotFoundError = (
  resource: string,
  id?: string,
  message?: string
): NotFoundError => ({
  type: "NotFoundError",
  resource,
  id,
  message: message || `${resource}${id ? ` with id ${id}` : ""} not found`,
});

export const createConflictError = (
  resource: string,
  message: string,
  conflictingData?: unknown
): ConflictError => ({
  type: "ConflictError",
  resource,
  message,
  conflictingData,
});

export const createNetworkError = (
  message: string,
  statusCode?: number,
  url?: string
): NetworkError => ({
  type: "NetworkError",
  message,
  statusCode,
  url,
});

export const createBusinessRuleError = (
  rule: string,
  message: string,
  context?: Record<string, unknown>
): BusinessRuleError => ({
  type: "BusinessRuleError",
  rule,
  message,
  context,
});

export const createApplicationError = (
  message: string,
  cause?: Error,
  context?: Record<string, unknown>
): ApplicationError => ({
  type: "ApplicationError",
  message,
  cause,
  context,
});

/**
 * エラーの型判定ヘルパー関数群
 */
export const isValidationError = (
  error: BucketListError
): error is ValidationError => error.type === "ValidationError";

export const isDatabaseError = (
  error: BucketListError
): error is DatabaseError => error.type === "DatabaseError";

export const isAuthenticationError = (
  error: BucketListError
): error is AuthenticationError => error.type === "AuthenticationError";

export const isNotFoundError = (
  error: BucketListError
): error is NotFoundError => error.type === "NotFoundError";

export const isConflictError = (
  error: BucketListError
): error is ConflictError => error.type === "ConflictError";

export const isNetworkError = (error: BucketListError): error is NetworkError =>
  error.type === "NetworkError";

export const isBusinessRuleError = (
  error: BucketListError
): error is BusinessRuleError => error.type === "BusinessRuleError";

export const isApplicationError = (
  error: BucketListError
): error is ApplicationError => error.type === "ApplicationError";
