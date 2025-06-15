/**
 * Result型のヘルパー関数とユーティリティ
 * より高度なResult操作や変換機能を提供
 */

import type { Result } from "~/shared/types/result";
import { success, failure, isSuccess, isFailure } from "~/shared/types/result";

/**
 * 複数のResult型を組み合わせる関数
 * すべてが成功の場合のみ成功を返し、一つでも失敗があれば最初の失敗を返す
 */
export function combineResults<T1, T2, E>(
  result1: Result<T1, E>,
  result2: Result<T2, E>,
): Result<[T1, T2], E>;

export function combineResults<T1, T2, T3, E>(
  result1: Result<T1, E>,
  result2: Result<T2, E>,
  result3: Result<T3, E>,
): Result<[T1, T2, T3], E>;

export function combineResults<T1, T2, T3, T4, E>(
  result1: Result<T1, E>,
  result2: Result<T2, E>,
  result3: Result<T3, E>,
  result4: Result<T4, E>,
): Result<[T1, T2, T3, T4], E>;

export function combineResults<T, E>(
  ...results: Result<T, E>[]
): Result<T[], E>;

export function combineResults<T, E>(
  ...results: Result<T, E>[]
): Result<T[], E> {
  const data: T[] = [];

  for (const result of results) {
    if (isFailure(result)) {
      return result;
    }
    data.push(result.data);
  }

  return success(data);
}

/**
 * Result型の配列をすべて成功の場合のみ結合する
 * 一つでも失敗があれば失敗を返す
 */
export function collectResults<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const data: T[] = [];

  for (const result of results) {
    if (isFailure(result)) {
      return result;
    }
    data.push(result.data);
  }

  return success(data);
}

/**
 * 非同期関数をResult型でラップする
 * Promise の reject を failure に変換
 */
export async function wrapAsync<T, E = Error>(
  asyncOperation: () => Promise<T>,
  errorMapper?: (error: unknown) => E,
): Promise<Result<T, E>> {
  try {
    const data = await asyncOperation();
    return success(data);
  } catch (error) {
    const mappedError = errorMapper ? errorMapper(error) : (error as E);
    return failure(mappedError);
  }
}

/**
 * Result型に対する条件分岐の簡単な実行
 */
export function matchResult<T, E, U>(
  result: Result<T, E>,
  onSuccess: (data: T) => U,
  onFailure: (error: E) => U,
): U {
  return isSuccess(result) ? onSuccess(result.data) : onFailure(result.error);
}

/**
 * Result型のデータに対してサイドエフェクトを実行
 * 成功時のみ副作用関数を実行し、元のResultを返す
 */
export function tapResult<T, E>(
  result: Result<T, E>,
  onSuccess?: (data: T) => void,
  onFailure?: (error: E) => void,
): Result<T, E> {
  if (isSuccess(result) && onSuccess) {
    onSuccess(result.data);
  } else if (isFailure(result) && onFailure) {
    onFailure(result.error);
  }

  return result;
}

/**
 * 複数のResult操作を順次実行するパイプライン
 */
export function pipeResults<T, U, V, E>(
  initial: Result<T, E>,
  transform1: (data: T) => Result<U, E>,
  transform2: (data: U) => Result<V, E>,
): Result<V, E>;

export function pipeResults<T, U, V, W, E>(
  initial: Result<T, E>,
  transform1: (data: T) => Result<U, E>,
  transform2: (data: U) => Result<V, E>,
  transform3: (data: V) => Result<W, E>,
): Result<W, E>;

export function pipeResults<T, E>(
  initial: Result<T, E>,
  ...transforms: Array<(data: any) => Result<any, E>>
): Result<any, E> {
  return transforms.reduce((acc, transform) => {
    return isSuccess(acc) ? transform(acc.data) : acc;
  }, initial);
}

/**
 * Result型をOption型のような動作にする
 * 成功時はデータを返し、失敗時はnullを返す
 */
export function resultToOption<T, E>(result: Result<T, E>): T | null {
  return isSuccess(result) ? result.data : null;
}

/**
 * Option型からResult型への変換
 * nullまたはundefinedの場合は指定されたエラーでfailureを返す
 */
export function optionToResult<T, E>(
  value: T | null | undefined,
  error: E,
): Result<T, E> {
  return value != null ? success(value) : failure(error);
}

/**
 * Result型のデータを変換し、失敗時はデフォルト値を使用
 */
export function mapOrElse<T, U, E>(
  result: Result<T, E>,
  defaultValue: U,
  transform: (data: T) => U,
): U {
  return isSuccess(result) ? transform(result.data) : defaultValue;
}

/**
 * 条件付きでResult型を変換する
 */
export function transformIf<T, U, E>(
  result: Result<T, E>,
  condition: (data: T) => boolean,
  transform: (data: T) => U,
): Result<T | U, E> {
  if (isSuccess(result) && condition(result.data)) {
    return success(transform(result.data));
  }
  return result;
}

/**
 * Result型配列から成功したもののみを抽出
 */
export function filterSuccesses<T, E>(results: Result<T, E>[]): T[] {
  return results.filter(isSuccess).map((result) => result.data);
}

/**
 * Result型配列から失敗したもののみを抽出
 */
export function filterFailures<T, E>(results: Result<T, E>[]): E[] {
  return results.filter(isFailure).map((result) => result.error);
}
