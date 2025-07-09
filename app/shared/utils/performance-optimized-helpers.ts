/**
 * パフォーマンス最適化された関数型ヘルパー
 * メモ化、遅延評価、関数合成パターンを活用
 */

import { useMemo, useCallback, useRef } from 'react';
import type { Result } from '~/shared/types/result';

/**
 * 関数合成用の高階関数（最適化版）
 */
export const pipe = <T>(value: T) => ({
  through: <U>(fn: (value: T) => U) => pipe(fn(value)),
  unwrap: () => value,
});

/**
 * 遅延評価を活用したResult型変換
 */
export const lazyResult = <T, E>(
  computation: () => T,
  errorMapper: (error: unknown) => E
): (() => Result<T, E>) => {
  let cached: Result<T, E> | null = null;
  
  return () => {
    if (cached !== null) {
      return cached;
    }
    
    try {
      const result = computation();
      cached = { success: true, data: result };
      return cached;
    } catch (error) {
      cached = { success: false, error: errorMapper(error) };
      return cached;
    }
  };
};

/**
 * 関数合成パターン（最適化版）
 * 不要な中間結果を避けるためのトランスデューサー
 */
export const compose = <T, U, V>(
  f: (value: U) => V,
  g: (value: T) => U
) => (value: T): V => f(g(value));

/**
 * 配列処理の最適化（transducer pattern）
 */
export const optimizedArrayProcessor = <T, U>(
  items: T[],
  processors: Array<(item: T) => T | U>
): U[] => {
  const result: U[] = [];
  
  outer: for (const item of items) {
    let current: T | U = item;
    
    for (const processor of processors) {
      current = processor(current as T);
      if (current === null || current === undefined) {
        continue outer;
      }
    }
    
    result.push(current as U);
  }
  
  return result;
};

/**
 * React用の最適化されたResult型処理フック
 */
export const useOptimizedResult = <T, E>(
  computation: () => Result<T, E>,
  dependencies: unknown[]
) => {
  const memoizedResult = useMemo(computation, dependencies);
  
  const getValue = useCallback(() => {
    return memoizedResult.success ? memoizedResult.data : null;
  }, [memoizedResult]);
  
  const getError = useCallback(() => {
    return memoizedResult.success ? null : memoizedResult.error;
  }, [memoizedResult]);
  
  return {
    result: memoizedResult,
    getValue,
    getError,
    isSuccess: memoizedResult.success,
    isError: !memoizedResult.success,
  };
};

/**
 * 関数型パターンの最適化されたカリー化
 */
export const optimizedCurry = <A, B, C>(
  fn: (a: A, b: B) => C
) => {
  const cache = new Map<A, (b: B) => C>();
  
  return (a: A) => {
    if (cache.has(a)) {
      return cache.get(a)!;
    }
    
    const curriedFn = (b: B) => fn(a, b);
    cache.set(a, curriedFn);
    return curriedFn;
  };
};

/**
 * 非同期処理のバッチ処理最適化
 */
export const createBatchProcessor = <T, U>(
  processor: (items: T[]) => Promise<U[]>,
  batchSize: number = 10,
  debounceMs: number = 100
) => {
  const queue: T[] = [];
  const resolvers: Array<(result: U) => void> = [];
  const rejectors: Array<(error: unknown) => void> = [];
  let timeoutId: NodeJS.Timeout | null = null;
  
  const processBatch = async () => {
    if (queue.length === 0) return;
    
    const batch = queue.splice(0, batchSize);
    const batchResolvers = resolvers.splice(0, batchSize);
    const batchRejectors = rejectors.splice(0, batchSize);
    
    try {
      const results = await processor(batch);
      results.forEach((result, index) => {
        batchResolvers[index]?.(result);
      });
    } catch (error) {
      batchRejectors.forEach((reject) => reject(error));
    }
    
    // 次のバッチを処理
    if (queue.length > 0) {
      timeoutId = setTimeout(processBatch, debounceMs);
    }
  };
  
  return (item: T): Promise<U> => {
    return new Promise<U>((resolve, reject) => {
      queue.push(item);
      resolvers.push(resolve);
      rejectors.push(reject);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(processBatch, debounceMs);
    });
  };
};

/**
 * メモ化された関数型セレクター
 */
export const createMemoizedSelector = <T, U>(
  selector: (data: T) => U,
  equalityFn: (a: U, b: U) => boolean = (a, b) => a === b
) => {
  const cache = new WeakMap<T, U>();
  let lastInput: T | null = null;
  let lastOutput: U | null = null;
  
  return (data: T): U => {
    if (cache.has(data)) {
      return cache.get(data)!;
    }
    
    const result = selector(data);
    
    if (lastInput && lastOutput && equalityFn(result, lastOutput)) {
      cache.set(data, lastOutput);
      return lastOutput;
    }
    
    cache.set(data, result);
    lastInput = data;
    lastOutput = result;
    return result;
  };
};

/**
 * 関数型パイプライン最適化
 */
export const optimizedPipeline = <T>(...functions: Array<(value: T) => T>) => {
  // 関数を事前に最適化
  const optimizedFunctions = functions.filter(fn => fn != null);
  
  return (initialValue: T): T => {
    let result = initialValue;
    
    for (const fn of optimizedFunctions) {
      result = fn(result);
    }
    
    return result;
  };
};

/**
 * React用の最適化されたコールバック作成
 */
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  dependencies: unknown[]
) => {
  const callbackRef = useRef(callback);
  
  // 依存配列が変わった場合のみ更新
  const memoizedCallback = useMemo(() => {
    callbackRef.current = callback;
    return callbackRef.current;
  }, dependencies);
  
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []);
};

/**
 * 関数型パターンの最適化されたエラーハンドリング
 */
export const createOptimizedErrorHandler = <E>(
  errorTypes: Record<string, (error: unknown) => E>
) => {
  const errorTypeKeys = Object.keys(errorTypes);
  
  return (error: unknown): E => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    for (const typeKey of errorTypeKeys) {
      if (errorMessage.includes(typeKey)) {
        return errorTypes[typeKey](error);
      }
    }
    
    // デフォルトエラー
    return errorTypes.default?.(error) || errorTypes[errorTypeKeys[0]](error);
  };
};

/**
 * 関数型状態管理の最適化
 */
export const createOptimizedStateManager = <T>(initialState: T) => {
  const state = { value: initialState };
  const subscribers = new Set<(newState: T) => void>();
  
  const setState = (newState: T | ((prevState: T) => T)) => {
    const nextState = typeof newState === 'function' 
      ? (newState as (prevState: T) => T)(state.value)
      : newState;
    
    if (state.value !== nextState) {
      state.value = nextState;
      subscribers.forEach(callback => callback(nextState));
    }
  };
  
  const subscribe = (callback: (newState: T) => void) => {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  };
  
  const getState = () => state.value;
  
  return {
    setState,
    subscribe,
    getState,
  };
};