import { useState, useCallback } from "react";

/**
 * 非同期操作の基本状態インターフェース
 */
export interface OperationState<T, E> {
  isLoading: boolean;
  error: E | null;
  data: T | null;
  hasExecuted: boolean;
}

/**
 * 基本的な非同期操作オプション
 */
export interface BaseOperationOptions<T, E> {
  onSuccess?: (data: T) => void;
  onError?: (error: E) => void;
  initialData?: T | null;
}

/**
 * 非同期操作の共通状態管理Hook
 * すべてのasync operationの基底として機能
 */
export function useOperationState<T, E>(
  options: BaseOperationOptions<T, E> = {}
) {
  const { onSuccess, onError, initialData = null } = options;

  const [state, setState] = useState<OperationState<T, E>>({
    isLoading: false,
    error: null,
    data: initialData,
    hasExecuted: false,
  });

  // 状態更新の共通メソッド
  const setLoading = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));
  }, []);

  const setSuccess = useCallback(
    (data: T) => {
      setState({
        isLoading: false,
        error: null,
        data,
        hasExecuted: true,
      });

      if (onSuccess) {
        onSuccess(data);
      }
    },
    [onSuccess]
  );

  const setError = useCallback(
    (error: E) => {
      setState({
        isLoading: false,
        error,
        data: null,
        hasExecuted: true,
      });

      if (onError) {
        onError(error);
      }
    },
    [onError]
  );

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: initialData,
      hasExecuted: false,
    });
  }, [initialData]);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  // 派生状態の計算
  const derivedState = {
    isSuccess:
      !state.isLoading &&
      !state.error &&
      state.hasExecuted &&
      state.data !== null,
    isError: !state.isLoading && !!state.error,
    hasData: state.data !== null,
  };

  return {
    state,
    derivedState,
    actions: {
      setLoading,
      setSuccess,
      setError,
      reset,
      clearError,
    },
  };
}

/**
 * 並列操作用の共通状態管理Hook
 */
export function useParallelOperationState<T, E>(
  options: BaseOperationOptions<T[], E> = {}
) {
  const { onSuccess, onError } = options;

  const [state, setState] = useState<OperationState<T[], E>>({
    isLoading: false,
    error: null,
    data: null,
    hasExecuted: false,
  });

  const setLoading = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));
  }, []);

  const setSuccess = useCallback(
    (data: T[]) => {
      setState({
        isLoading: false,
        error: null,
        data,
        hasExecuted: true,
      });

      if (onSuccess) {
        onSuccess(data);
      }
    },
    [onSuccess]
  );

  const setError = useCallback(
    (error: E) => {
      setState({
        isLoading: false,
        error,
        data: null,
        hasExecuted: true,
      });

      if (onError) {
        onError(error);
      }
    },
    [onError]
  );

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: null,
      hasExecuted: false,
    });
  }, []);

  const derivedState = {
    isSuccess:
      !state.isLoading &&
      !state.error &&
      state.hasExecuted &&
      state.data !== null,
    isError: !state.isLoading && !!state.error,
  };

  return {
    state,
    derivedState,
    actions: {
      setLoading,
      setSuccess,
      setError,
      reset,
    },
  };
}
