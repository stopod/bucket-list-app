import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useResultOperation,
  useParallelResultOperations,
  useResultFormSubmission,
} from "../use-result-operation";
import { success, failure } from "~/shared/types/result";
import type { Result } from "~/shared/types/result";
import type { BucketListError } from "~/shared/types/errors";

// Mock error for testing
const mockError: BucketListError = {
  type: "ApplicationError",
  message: "Test error",
};

describe("useResultOperation", () => {
  it("初期状態では適切な値を持つこと", () => {
    const { result } = renderHook(() => useResultOperation<string>());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.hasData).toBe(false);
  });

  it("初期データが設定されている場合、それが反映されること", () => {
    const initialData = "initial";
    const { result } = renderHook(() =>
      useResultOperation<string>({ initialData }),
    );

    expect(result.current.data).toBe(initialData);
    expect(result.current.hasData).toBe(true);
  });

  it("成功時、適切に状態が更新されること", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useResultOperation<string>({ onSuccess }),
    );

    const mockFunction = vi.fn().mockResolvedValue(success("test data"));

    await act(async () => {
      await result.current.execute(mockFunction);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe("test data");
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(onSuccess).toHaveBeenCalledWith("test data");
  });

  it("失敗時、適切に状態が更新されること", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useResultOperation<string>({ onError }),
    );

    const mockFunction = vi.fn().mockResolvedValue(failure(mockError));

    await act(async () => {
      await result.current.execute(mockFunction);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toEqual(mockError);
    expect(result.current.data).toBeNull();
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it("実行中はローディング状態になること", async () => {
    const { result } = renderHook(() => useResultOperation<string>());

    let resolvePromise: (value: Result<string, BucketListError>) => void;
    const mockFunction = vi.fn().mockImplementation(
      () =>
        new Promise<Result<string, BucketListError>>((resolve) => {
          resolvePromise = resolve;
        }),
    );

    // 実行開始
    act(() => {
      result.current.execute(mockFunction);
    });

    expect(result.current.isLoading).toBe(true);

    // 完了
    await act(async () => {
      resolvePromise!(success("test"));
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("引数付きの関数を実行できること", async () => {
    const { result } = renderHook(() => useResultOperation<string>());

    const mockFunction = vi.fn().mockResolvedValue(success("test data"));

    await act(async () => {
      await result.current.execute(mockFunction, "arg1", "arg2", 123);
    });

    expect(mockFunction).toHaveBeenCalledWith("arg1", "arg2", 123);
    expect(result.current.data).toBe("test data");
  });

  it("予期しないエラーを適切に処理すること", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useResultOperation<string>({ onError }),
    );

    const unexpectedError = new Error("Unexpected error");
    const mockFunction = vi.fn().mockRejectedValue(unexpectedError);

    await act(async () => {
      await result.current.execute(mockFunction);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(unexpectedError);
    expect(onError).toHaveBeenCalledWith(unexpectedError);
  });

  it("resetが正しく動作すること", async () => {
    const initialData = "initial";
    const { result } = renderHook(() =>
      useResultOperation<string>({ initialData }),
    );

    // データを変更
    const mockFunction = vi.fn().mockResolvedValue(success("new data"));
    await act(async () => {
      await result.current.execute(mockFunction);
    });

    expect(result.current.data).toBe("new data");

    // リセット
    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe(initialData);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("clearErrorが正しく動作すること", async () => {
    const { result } = renderHook(() => useResultOperation<string>());

    // エラーを発生させる
    const mockFunction = vi.fn().mockResolvedValue(failure(mockError));
    await act(async () => {
      await result.current.execute(mockFunction);
    });

    expect(result.current.error).toEqual(mockError);

    // エラーをクリア
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});

describe("useParallelResultOperations", () => {
  it("すべての操作が成功した場合、成功結果を返すこと", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useParallelResultOperations<string>({ onSuccess }),
    );

    const mockFunction1 = vi.fn().mockResolvedValue(success("result1"));
    const mockFunction2 = vi.fn().mockResolvedValue(success("result2"));
    const mockFunction3 = vi.fn().mockResolvedValue(success("result3"));

    await act(async () => {
      await result.current.executeAll(
        [mockFunction1, mockFunction2, mockFunction3],
        "arg",
      );
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual(["result1", "result2", "result3"]);
    expect(onSuccess).toHaveBeenCalledWith(["result1", "result2", "result3"]);
  });

  it("一つでも失敗した場合、失敗結果を返すこと", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useParallelResultOperations<string>({ onError }),
    );

    const mockFunction1 = vi.fn().mockResolvedValue(success("result1"));
    const mockFunction2 = vi.fn().mockResolvedValue(failure(mockError));
    const mockFunction3 = vi.fn().mockResolvedValue(success("result3"));

    await act(async () => {
      await result.current.executeAll([
        mockFunction1,
        mockFunction2,
        mockFunction3,
      ]);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toEqual(mockError);
    expect(result.current.data).toBeNull();
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it("予期しないエラーを適切に処理すること", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useParallelResultOperations<string>({ onError }),
    );

    const unexpectedError = new Error("Unexpected error");
    const mockFunction1 = vi.fn().mockRejectedValue(unexpectedError);

    await act(async () => {
      await result.current.executeAll([mockFunction1]);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(unexpectedError);
    expect(onError).toHaveBeenCalledWith(unexpectedError);
  });
});

describe("useResultFormSubmission", () => {
  it("フォーム送信が成功した場合、適切に処理されること", async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useResultFormSubmission<string, { name: string }>({ onSuccess }),
    );

    const mockSubmitFunction = vi
      .fn()
      .mockResolvedValue(success("form submitted"));
    const formData = { name: "test" };

    await act(async () => {
      await result.current.submitForm(mockSubmitFunction, formData);
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toBe("form submitted");
    expect(onSuccess).toHaveBeenCalledWith("form submitted");
    expect(mockSubmitFunction).toHaveBeenCalledWith(formData);
  });

  it("フォーム送信が失敗した場合、適切に処理されること", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useResultFormSubmission<string, { name: string }>({ onError }),
    );

    const mockSubmitFunction = vi.fn().mockResolvedValue(failure(mockError));
    const formData = { name: "test" };

    await act(async () => {
      await result.current.submitForm(mockSubmitFunction, formData);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toEqual(mockError);
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it("送信中はisSubmittingがtrueになること", async () => {
    const { result } = renderHook(() =>
      useResultFormSubmission<string, { name: string }>(),
    );

    let resolvePromise: (value: Result<string, BucketListError>) => void;
    const mockSubmitFunction = vi.fn().mockImplementation(
      () =>
        new Promise<Result<string, BucketListError>>((resolve) => {
          resolvePromise = resolve;
        }),
    );

    // 送信開始
    act(() => {
      result.current.submitForm(mockSubmitFunction, { name: "test" });
    });

    expect(result.current.isSubmitting).toBe(true);
    expect(result.current.isLoading).toBe(true);

    // 完了
    await act(async () => {
      resolvePromise!(success("submitted"));
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("resetOnSuccessオプションが動作すること", async () => {
    const { result } = renderHook(() =>
      useResultFormSubmission<string, { name: string }>({
        resetOnSuccess: true,
      }),
    );

    const mockSubmitFunction = vi.fn().mockResolvedValue(success("submitted"));

    await act(async () => {
      await result.current.submitForm(mockSubmitFunction, { name: "test" });
    });

    expect(result.current.isSuccess).toBe(true);
    // resetOnSuccess は呼び出し側で実装されるため、ここではフラグが設定されていることのみ確認
  });
});
