// Database types
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
  Json,
} from "./database";

// Result type system - 関数型プログラミングアプローチ
export type { Result } from "./result";
export {
  isSuccess,
  isFailure,
  success,
  failure,
  getOrElse,
  mapResult,
  mapError,
  flatMapResult,
} from "./result";

// Error types - ドメイン別エラー分類
export type {
  ValidationError,
  DatabaseError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  NetworkError,
  BusinessRuleError,
  ApplicationError,
  BucketListError,
} from "./errors";

export {
  createValidationError,
  createDatabaseError,
  createAuthenticationError,
  createNotFoundError,
  createConflictError,
  createNetworkError,
  createBusinessRuleError,
  createApplicationError,
  isValidationError,
  isDatabaseError,
  isAuthenticationError,
  isNotFoundError,
  isConflictError,
  isNetworkError,
  isBusinessRuleError,
  isApplicationError,
} from "./errors";

// Common application types
export interface ApiError {
  message: string;
  code?: string;
}

export interface LoaderData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface ActionData {
  error?: string;
  success?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}
