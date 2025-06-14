/**
 * Result型 - 関数型プログラミングアプローチによる安全なエラーハンドリング
 * 
 * 成功時は success: true と data を持ち、
 * 失敗時は success: false と error を持つ
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Result型の型ガード - 成功かどうかを判定
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

/**
 * Result型の型ガード - 失敗かどうかを判定
 */
export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

/**
 * 成功Result型を作成するヘルパー関数
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * 失敗Result型を作成するヘルパー関数
 */
export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Result型からデータを安全に取得するヘルパー関数
 * 失敗時はデフォルト値を返す
 */
export function getOrElse<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isSuccess(result) ? result.data : defaultValue;
}

/**
 * Result型のデータを変換するmap関数
 * 成功時のみ変換関数を適用
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  transform: (data: T) => U
): Result<U, E> {
  return isSuccess(result) 
    ? success(transform(result.data))
    : result;
}

/**
 * Result型のエラーを変換するmapError関数
 * 失敗時のみ変換関数を適用
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  transform: (error: E) => F
): Result<T, F> {
  return isFailure(result)
    ? failure(transform(result.error))
    : result;
}

/**
 * Result型をチェーンするflatMap関数
 * 成功時のみ次の処理を実行し、失敗は伝播
 */
export function flatMapResult<T, U, E>(
  result: Result<T, E>,
  transform: (data: T) => Result<U, E>
): Result<U, E> {
  return isSuccess(result) ? transform(result.data) : result;
}