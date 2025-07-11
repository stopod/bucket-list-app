import { useCallback } from "react";
import type { Result } from "~/shared/types/result";
import type { BucketListError } from "~/shared/types/errors";
import { isSuccess, isFailure } from "~/shared/types/result";
import {
  useOperationState,
  useParallelOperationState,
  type BaseOperationOptions,
} from "./use-operation-base";

type UseResultOperationOptions<T, E = BucketListError> = BaseOperationOptions<
  T,
  E
>;

/**
 * Result型に対応した非同期操作管理Hook
 * Promise<Result<T, E>>を返す関数を安全に実行し、状態を管理する
 */
export function useResultOperation<T, E = BucketListError>(
  options: UseResultOperationOptions<T, E> = {}
) {
  const { state, derivedState, actions } = useOperationState<T, E>(options);

  const execute = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async <Args extends any[]>(
      resultFunction: (...args: Args) => Promise<Result<T, E>>,
      ...args: Args
    ): Promise<Result<T, E>> => {
      actions.setLoading();

      try {
        const result = await resultFunction(...args);

        if (isSuccess(result)) {
          actions.setSuccess(result.data);
        } else {
          actions.setError(result.error);
        }

        return result;
      } catch (error) {
        // 予期しないエラー（ネットワークエラーなど）
        const unexpectedError = error as E;
        actions.setError(unexpectedError);
        return { success: false, error: unexpectedError } as Result<T, E>;
      }
    },
    [actions]
  );

  const { reset, clearError } = actions;

  return {
    ...state,
    ...derivedState,
    execute,
    reset,
    clearError,
  };
}

/**
 * 複数のResult操作を並列実行するためのHook
 */
export function useParallelResultOperations<T, E = BucketListError>(
  options: UseResultOperationOptions<T[], E> = {}
) {
  const { state, derivedState, actions } = useParallelOperationState<T, E>(
    options
  );

  const executeAll = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async <Args extends any[]>(
      resultFunctions: Array<(...args: Args) => Promise<Result<T, E>>>,
      ...args: Args
    ): Promise<Result<T[], E>> => {
      actions.setLoading();

      try {
        const results = await Promise.all(
          resultFunctions.map((fn) => fn(...args))
        );

        // すべての結果をチェック
        const successData: T[] = [];
        for (const result of results) {
          if (isFailure(result)) {
            actions.setError(result.error);
            return result;
          }
          successData.push(result.data);
        }

        actions.setSuccess(successData);
        return { success: true, data: successData } as Result<T[], E>;
      } catch (error) {
        const unexpectedError = error as E;
        actions.setError(unexpectedError);
        return { success: false, error: unexpectedError } as Result<T[], E>;
      }
    },
    [actions]
  );

  const { reset } = actions;

  return {
    ...state,
    ...derivedState,
    executeAll,
    reset,
  };
}

/**
 * Result型対応のフォーム送信Hook
 */
export function useResultFormSubmission<T, FormData, E = BucketListError>(
  options: UseResultOperationOptions<T, E> & {
    resetOnSuccess?: boolean;
  } = {}
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
      formData: FormData
    ): Promise<Result<T, E>> => {
      const result = await resultOperation.execute(submitFunction, formData);

      if (resetOnSuccess && isSuccess(result)) {
        // フォームリセットのロジックは呼び出し側で実装
      }

      return result;
    },
    [resultOperation, resetOnSuccess]
  );

  return {
    ...resultOperation,
    submitForm,
    isSubmitting: resultOperation.isLoading,
  };
}
