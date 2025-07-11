import { useCallback } from "react";
import {
  useOperationState,
  useParallelOperationState,
} from "./use-operation-base";

interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  throwOnError?: boolean;
  initialData?: T | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAsyncOperation<T = any>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
) {
  const { throwOnError = false, onSuccess, onError, initialData } = options;

  // BaseOperationOptionsに適合するようにエラーハンドリングを調整
  const { state, actions } = useOperationState<T, string>({
    onSuccess,
    onError: onError
      ? (errorMessage: string) => {
          onError(new Error(errorMessage));
        }
      : undefined,
    initialData,
  });

  const execute = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (...args: any[]) => {
      actions.setLoading();

      try {
        const result = await asyncFunction(...args);
        actions.setSuccess(result);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        actions.setError(errorMessage);

        if (throwOnError) {
          throw error;
        }

        return null;
      }
    },
    [asyncFunction, actions, throwOnError]
  );

  const { reset } = actions;

  // 従来のuseAsyncOperationの動作を保持（hasExecutedを考慮しない）
  const asyncDerivedState = {
    isSuccess: !state.isLoading && !state.error,
    isError: !state.isLoading && !!state.error,
    hasData: state.data !== null,
  };

  return {
    ...state,
    ...asyncDerivedState,
    execute,
    reset,
  };
}

// 複数の非同期操作を並列実行するためのフック
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useParallelAsyncOperations<T = any>(
  operations: Array<() => Promise<T>>,
  options: UseAsyncOperationOptions<T[]> = {}
) {
  const { throwOnError = false, onSuccess, onError } = options;

  const { state, actions } = useParallelOperationState<T, string>({
    onSuccess,
    onError: onError
      ? (errorMessage: string) => {
          onError(new Error(errorMessage));
        }
      : undefined,
  });

  const executeAll = useCallback(async () => {
    actions.setLoading();

    try {
      const results = await Promise.all(operations.map((op) => op()));
      actions.setSuccess(results);
      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      actions.setError(errorMessage);

      if (throwOnError) {
        throw error;
      }

      return null;
    }
  }, [operations, actions, throwOnError]);

  const { reset } = actions;

  // 従来のuseParallelAsyncOperationsの動作を保持（hasExecutedを考慮しない）
  const asyncDerivedState = {
    isSuccess: !state.isLoading && !state.error,
    isError: !state.isLoading && !!state.error,
  };

  return {
    ...state,
    ...asyncDerivedState,
    executeAll,
    reset,
  };
}

// フォーム送信に特化したフック
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFormSubmission<T = any>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submitFunction: (formData: any) => Promise<T>,
  options: UseAsyncOperationOptions<T> & {
    resetFormOnSuccess?: boolean;
    redirectOnSuccess?: string;
  } = {}
) {
  const {
    resetFormOnSuccess = false,
    redirectOnSuccess,
    ...asyncOptions
  } = options;

  const asyncOperation = useAsyncOperation(submitFunction, {
    ...asyncOptions,
    onSuccess: (result) => {
      if (asyncOptions.onSuccess) {
        asyncOptions.onSuccess(result);
      }

      if (resetFormOnSuccess) {
        // フォームリセットのロジックは呼び出し側で実装
      }

      if (redirectOnSuccess) {
        // リダイレクトのロジックは呼び出し側で実装
      }
    },
  });

  return {
    ...asyncOperation,
    submitForm: asyncOperation.execute,
    isSubmitting: asyncOperation.isLoading,
  };
}
