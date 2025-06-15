import { useState, useCallback } from "react";
import type { Result } from "~/shared/types/result";
import type { BucketListError } from "~/shared/types/errors";
import { isSuccess, isFailure } from "~/shared/types/result";

interface UseResultOperationOptions<T, E = BucketListError> {
  onSuccess?: (data: T) => void;
  onError?: (error: E) => void;
  initialData?: T | null;
}

interface ResultOperationState<T, E = BucketListError> {
  isLoading: boolean;
  error: E | null;
  data: T | null;
}

/**
 * Result型に対応した非同期操作管理Hook
 * Promise<Result<T, E>>を返す関数を安全に実行し、状態を管理する
 */
export function useResultOperation<T, E = BucketListError>(
  options: UseResultOperationOptions<T, E> = {},
) {
  const { onSuccess, onError, initialData = null } = options;

  const [state, setState] = useState<ResultOperationState<T, E>>({
    isLoading: false,
    error: null,
    data: initialData,
  });

  const execute = useCallback(
    async <Args extends any[]>(
      resultFunction: (...args: Args) => Promise<Result<T, E>>,
      ...args: Args
    ): Promise<Result<T, E>> => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const result = await resultFunction(...args);

        if (isSuccess(result)) {
          setState({
            isLoading: false,
            error: null,
            data: result.data,
          });

          if (onSuccess) {
            onSuccess(result.data);
          }
        } else {
          setState({
            isLoading: false,
            error: result.error,
            data: null,
          });

          if (onError) {
            onError(result.error);
          }
        }

        return result;
      } catch (error) {
        // 予期しないエラー（ネットワークエラーなど）
        const unexpectedError = error as E;

        setState({
          isLoading: false,
          error: unexpectedError,
          data: null,
        });

        if (onError) {
          onError(unexpectedError);
        }

        return { success: false, error: unexpectedError } as Result<T, E>;
      }
    },
    [onSuccess, onError],
  );

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: initialData,
    });
  }, [initialData]);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    clearError,
    isSuccess: !state.isLoading && !state.error && state.data !== null,
    isError: !state.isLoading && !!state.error,
    hasData: state.data !== null,
  };
}

/**
 * 複数のResult操作を並列実行するためのHook
 */
export function useParallelResultOperations<T, E = BucketListError>(
  options: UseResultOperationOptions<T[], E> = {},
) {
  const { onSuccess, onError } = options;

  const [state, setState] = useState<ResultOperationState<T[], E>>({
    isLoading: false,
    error: null,
    data: null,
  });

  const executeAll = useCallback(
    async <Args extends any[]>(
      resultFunctions: Array<(...args: Args) => Promise<Result<T, E>>>,
      ...args: Args
    ): Promise<Result<T[], E>> => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const results = await Promise.all(
          resultFunctions.map((fn) => fn(...args)),
        );

        // すべての結果をチェック
        const successData: T[] = [];
        for (const result of results) {
          if (isFailure(result)) {
            setState({
              isLoading: false,
              error: result.error,
              data: null,
            });

            if (onError) {
              onError(result.error);
            }

            return result;
          }
          successData.push(result.data);
        }

        setState({
          isLoading: false,
          error: null,
          data: successData,
        });

        if (onSuccess) {
          onSuccess(successData);
        }

        return { success: true, data: successData } as Result<T[], E>;
      } catch (error) {
        const unexpectedError = error as E;

        setState({
          isLoading: false,
          error: unexpectedError,
          data: null,
        });

        if (onError) {
          onError(unexpectedError);
        }

        return { success: false, error: unexpectedError } as Result<T[], E>;
      }
    },
    [onSuccess, onError],
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
    executeAll,
    reset,
    isSuccess: !state.isLoading && !state.error && state.data !== null,
    isError: !state.isLoading && !!state.error,
  };
}

/**
 * Result型対応のフォーム送信Hook
 */
export function useResultFormSubmission<T, FormData, E = BucketListError>(
  options: UseResultOperationOptions<T, E> & {
    resetOnSuccess?: boolean;
  } = {},
) {
  const { resetOnSuccess = false, ...resultOptions } = options;

  const resultOperation = useResultOperation<T, E>({
    ...resultOptions,
    onSuccess: (data) => {
      if (resultOptions.onSuccess) {
        resultOptions.onSuccess(data);
      }
    },
  });

  const submitForm = useCallback(
    async (
      submitFunction: (formData: FormData) => Promise<Result<T, E>>,
      formData: FormData,
    ): Promise<Result<T, E>> => {
      const result = await resultOperation.execute(submitFunction, formData);

      if (resetOnSuccess && isSuccess(result)) {
        // フォームリセットのロジックは呼び出し側で実装
      }

      return result;
    },
    [resultOperation, resetOnSuccess],
  );

  return {
    ...resultOperation,
    submitForm,
    isSubmitting: resultOperation.isLoading,
  };
}
