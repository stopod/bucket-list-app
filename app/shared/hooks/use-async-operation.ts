import { useState, useCallback } from "react";

interface UseAsyncOperationOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  throwOnError?: boolean;
}

interface AsyncOperationState {
  isLoading: boolean;
  error: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAsyncOperation<T = any>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOperationOptions = {}
) {
  const { onSuccess, onError, throwOnError = false } = options;

  const [state, setState] = useState<AsyncOperationState>({
    isLoading: false,
    error: null,
    data: null,
  });

  const execute = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (...args: any[]) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const result = await asyncFunction(...args);

        setState({
          isLoading: false,
          error: null,
          data: result,
        });

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        setState({
          isLoading: false,
          error: errorMessage,
          data: null,
        });

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }

        if (throwOnError) {
          throw error;
        }

        return null;
      }
    },
    [asyncFunction, onSuccess, onError, throwOnError]
  );

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isSuccess: !state.isLoading && !state.error,
    isError: !state.isLoading && !!state.error,
  };
}

// 複数の非同期操作を並列実行するためのフック
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useParallelAsyncOperations<T = any>(
  operations: Array<() => Promise<T>>,
  options: UseAsyncOperationOptions = {}
) {
  const { onSuccess, onError, throwOnError = false } = options;

  const [state, setState] = useState<AsyncOperationState>({
    isLoading: false,
    error: null,
    data: null,
  });

  const executeAll = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const results = await Promise.all(operations.map((op) => op()));

      setState({
        isLoading: false,
        error: null,
        data: results,
      });

      if (onSuccess) {
        onSuccess(results);
      }

      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      setState({
        isLoading: false,
        error: errorMessage,
        data: null,
      });

      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }

      if (throwOnError) {
        throw error;
      }

      return null;
    }
  }, [operations, onSuccess, onError, throwOnError]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: null,
    });
  }, []);

  return {
    ...state,
    executeAll,
    reset,
    isSuccess: !state.isLoading && !state.error,
    isError: !state.isLoading && !!state.error,
  };
}

// フォーム送信に特化したフック
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFormSubmission<T = any>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submitFunction: (formData: any) => Promise<T>,
  options: UseAsyncOperationOptions & {
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
