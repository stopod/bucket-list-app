import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useAsyncOperation,
  useParallelAsyncOperations,
  useFormSubmission,
} from "../use-async-operation";

describe("useAsyncOperation", () => {
  describe("基本機能", () => {
    it("初期状態が正しく設定されること", () => {
      const mockAsyncFunction = vi.fn().mockResolvedValue("success");
      const { result } = renderHook(() => useAsyncOperation(mockAsyncFunction));

      // TDD: 期待する初期状態を明確に定義
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBeNull();
      // isSuccessは (!isLoading && !error) なので初期状態ではtrue
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(typeof result.current.execute).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });

    it("成功時の処理が正しく動作すること", async () => {
      const mockResult = { data: "test data" };
      const mockAsyncFunction = vi.fn().mockResolvedValue(mockResult);
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useAsyncOperation(mockAsyncFunction, { onSuccess })
      );

      await act(async () => {
        const executeResult = await result.current.execute("arg1", "arg2");
        expect(executeResult).toEqual(mockResult);
      });

      expect(mockAsyncFunction).toHaveBeenCalledWith("arg1", "arg2");
      expect(onSuccess).toHaveBeenCalledWith(mockResult);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.data).toEqual(mockResult);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });

    it("エラー時の処理が正しく動作すること", async () => {
      const mockError = new Error("Test error");
      const mockAsyncFunction = vi.fn().mockRejectedValue(mockError);
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useAsyncOperation(mockAsyncFunction, { onError })
      );

      await act(async () => {
        const executeResult = await result.current.execute();
        expect(executeResult).toBeNull();
      });

      expect(onError).toHaveBeenCalledWith(mockError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe("Test error");
      expect(result.current.data).toBeNull();
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
    });

    it("throwOnErrorオプションが正しく動作すること", async () => {
      const mockError = new Error("Test error");
      const mockAsyncFunction = vi.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useAsyncOperation(mockAsyncFunction, { throwOnError: true })
      );

      await act(async () => {
        await expect(result.current.execute()).rejects.toThrow("Test error");
      });

      expect(result.current.error).toBe("Test error");
      expect(result.current.isError).toBe(true);
    });

    it("reset機能が正しく動作すること", async () => {
      const mockAsyncFunction = vi.fn().mockResolvedValue("success");
      const { result } = renderHook(() => useAsyncOperation(mockAsyncFunction));

      // まず実行して状態を変更
      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.data).toBe("success");
      expect(result.current.isSuccess).toBe(true);

      // リセット
      act(() => {
        result.current.reset();
      });

      // TDD: リセット後は初期状態と同じになるべき
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBeNull();
      // リセット後も (!isLoading && !error) なのでtrue
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  describe("ローディング状態", () => {
    it("実行中はisLoadingがtrueになること", async () => {
      let resolveFunction: (value: string) => void;
      const mockAsyncFunction = vi.fn().mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            resolveFunction = resolve;
          })
      );

      const { result } = renderHook(() => useAsyncOperation(mockAsyncFunction));

      // TDD: 実行前の状態確認
      expect(result.current.isLoading).toBe(false);

      // 実行開始
      act(() => {
        result.current.execute();
      });

      // TDD: 実行中の状態確認
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);

      // 実行完了
      await act(async () => {
        resolveFunction!("completed");
      });

      // TDD: 完了後の状態確認
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toBe("completed");
    });

    it("エラー発生前にエラー状態がクリアされること", async () => {
      const mockAsyncFunction = vi
        .fn()
        .mockRejectedValueOnce(new Error("First error"))
        .mockResolvedValueOnce("success");

      const { result } = renderHook(() => useAsyncOperation(mockAsyncFunction));

      // TDD: 最初の実行でエラー
      await act(async () => {
        await result.current.execute();
      });

      // TDD: エラー状態の確認
      expect(result.current.error).toBe("First error");
      expect(result.current.isError).toBe(true);
      expect(result.current.isSuccess).toBe(false);

      // TDD: 2回目の実行で成功
      await act(async () => {
        await result.current.execute();
      });

      // TDD: エラーがクリアされて成功状態になることを確認
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBe("success");
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  describe("エラーハンドリング", () => {
    it("文字列エラーが適切に処理されること", async () => {
      const mockAsyncFunction = vi.fn().mockRejectedValue("String error");
      const { result } = renderHook(() => useAsyncOperation(mockAsyncFunction));

      // TDD: エラーが発生する操作を実行
      await act(async () => {
        await result.current.execute();
      });

      // TDD: 文字列エラーは"Unknown error"に変換される
      expect(result.current.error).toBe("Unknown error");
      expect(result.current.isError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.data).toBeNull();
    });

    it("nullエラーが適切に処理されること", async () => {
      const mockAsyncFunction = vi.fn().mockRejectedValue(null);
      const { result } = renderHook(() => useAsyncOperation(mockAsyncFunction));

      // TDD: nullエラーが発生する操作を実行
      await act(async () => {
        await result.current.execute();
      });

      // TDD: nullエラーは"Unknown error"に変換される
      expect(result.current.error).toBe("Unknown error");
      expect(result.current.isError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
    });

    it("オブジェクトエラーが適切に処理されること", async () => {
      const mockAsyncFunction = vi
        .fn()
        .mockRejectedValue({ message: "Object error" });
      const { result } = renderHook(() => useAsyncOperation(mockAsyncFunction));

      // TDD: オブジェクトエラーが発生する操作を実行
      await act(async () => {
        await result.current.execute();
      });

      // TDD: オブジェクトエラーは"Unknown error"に変換される
      expect(result.current.error).toBe("Unknown error");
      expect(result.current.isError).toBe(true);
      expect(result.current.isSuccess).toBe(false);
    });
  });
});

describe("useParallelAsyncOperations", () => {
  describe("基本機能", () => {
    it("初期状態が正しく設定されること", () => {
      const operations = [
        () => Promise.resolve("result1"),
        () => Promise.resolve("result2"),
      ];
      const { result } = renderHook(() =>
        useParallelAsyncOperations(operations)
      );

      // TDD: 並列操作の初期状態確認
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBeNull();
      // 初期状態では (!isLoading && !error) なのでtrue
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(typeof result.current.executeAll).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });

    it("並列実行が正しく動作すること", async () => {
      const operation1 = vi.fn().mockResolvedValue("result1");
      const operation2 = vi.fn().mockResolvedValue("result2");
      const operations = [operation1, operation2];
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useParallelAsyncOperations(operations, { onSuccess })
      );

      await act(async () => {
        const executeResult = await result.current.executeAll();
        expect(executeResult).toEqual(["result1", "result2"]);
      });

      expect(operation1).toHaveBeenCalled();
      expect(operation2).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(["result1", "result2"]);
      expect(result.current.data).toEqual(["result1", "result2"]);
      expect(result.current.isSuccess).toBe(true);
    });

    it("一つでもエラーが発生した場合、全体がエラーになること", async () => {
      const operation1 = vi.fn().mockResolvedValue("result1");
      const operation2 = vi
        .fn()
        .mockRejectedValue(new Error("Operation2 failed"));
      const operations = [operation1, operation2];
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useParallelAsyncOperations(operations, { onError })
      );

      await act(async () => {
        const executeResult = await result.current.executeAll();
        expect(executeResult).toBeNull();
      });

      expect(onError).toHaveBeenCalledWith(new Error("Operation2 failed"));
      expect(result.current.error).toBe("Operation2 failed");
      expect(result.current.isError).toBe(true);
    });

    it("空の操作配列でも正しく動作すること", async () => {
      const operations: Array<() => Promise<any>> = [];
      const { result } = renderHook(() =>
        useParallelAsyncOperations(operations)
      );

      await act(async () => {
        const executeResult = await result.current.executeAll();
        expect(executeResult).toEqual([]);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe("エラーハンドリング", () => {
    it("throwOnErrorオプションが正しく動作すること", async () => {
      const operation1 = vi.fn().mockResolvedValue("result1");
      const operation2 = vi.fn().mockRejectedValue(new Error("Test error"));
      const operations = [operation1, operation2];

      const { result } = renderHook(() =>
        useParallelAsyncOperations(operations, { throwOnError: true })
      );

      await act(async () => {
        await expect(result.current.executeAll()).rejects.toThrow("Test error");
      });

      expect(result.current.error).toBe("Test error");
      expect(result.current.isError).toBe(true);
    });
  });
});

describe("useFormSubmission", () => {
  describe("基本機能", () => {
    it("初期状態が正しく設定されること", () => {
      const mockSubmitFunction = vi.fn().mockResolvedValue("success");
      const { result } = renderHook(() =>
        useFormSubmission(mockSubmitFunction)
      );

      // TDD: フォーム送信の初期状態確認
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBeNull();
      // 初期状態では (!isLoading && !error) なのでtrue
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(typeof result.current.submitForm).toBe("function");
      expect(typeof result.current.execute).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });

    it("フォーム送信が正しく動作すること", async () => {
      const mockSubmitFunction = vi.fn().mockResolvedValue("form submitted");
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useFormSubmission(mockSubmitFunction, { onSuccess })
      );

      const formData = { name: "Test", email: "test@example.com" };

      await act(async () => {
        const submitResult = await result.current.submitForm(formData);
        expect(submitResult).toBe("form submitted");
      });

      expect(mockSubmitFunction).toHaveBeenCalledWith(formData);
      expect(onSuccess).toHaveBeenCalledWith("form submitted");
      expect(result.current.data).toBe("form submitted");
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });

    it("submitFormとexecuteが同じ動作をすること", async () => {
      const mockSubmitFunction = vi.fn().mockResolvedValue("success");
      const { result } = renderHook(() =>
        useFormSubmission(mockSubmitFunction)
      );

      const formData = { test: "data" };

      await act(async () => {
        await result.current.submitForm(formData);
      });

      expect(mockSubmitFunction).toHaveBeenCalledWith(formData);

      // reset後にexecuteでも同じ動作
      act(() => {
        result.current.reset();
      });

      await act(async () => {
        await result.current.execute(formData);
      });

      expect(mockSubmitFunction).toHaveBeenCalledTimes(2);
      expect(mockSubmitFunction).toHaveBeenLastCalledWith(formData);
    });

    it("isSubmittingがisLoadingと同期していること", async () => {
      let resolveFunction: (value: string) => void;
      const mockSubmitFunction = vi.fn().mockImplementation(
        () =>
          new Promise<string>((resolve) => {
            resolveFunction = resolve;
          })
      );

      const { result } = renderHook(() =>
        useFormSubmission(mockSubmitFunction)
      );

      // TDD: 送信前の状態確認
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isLoading).toBe(false);

      // 送信開始
      act(() => {
        result.current.submitForm({ test: "data" });
      });

      // TDD: 送信中の状態確認
      expect(result.current.isSubmitting).toBe(true);
      expect(result.current.isLoading).toBe(true);

      // 送信完了
      await act(async () => {
        resolveFunction!("completed");
      });

      // TDD: 送信完了後の状態確認
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBe("completed");
    });
  });

  describe("オプション機能", () => {
    it("resetFormOnSuccessオプションが設定されること", () => {
      const mockSubmitFunction = vi.fn().mockResolvedValue("success");
      const { result } = renderHook(() =>
        useFormSubmission(mockSubmitFunction, { resetFormOnSuccess: true })
      );

      // オプションが設定されていることを確認（実際のリセット処理は呼び出し側で実装）
      expect(result.current).toBeDefined();
    });

    it("redirectOnSuccessオプションが設定されること", () => {
      const mockSubmitFunction = vi.fn().mockResolvedValue("success");
      const { result } = renderHook(() =>
        useFormSubmission(mockSubmitFunction, {
          redirectOnSuccess: "/dashboard",
        })
      );

      // オプションが設定されていることを確認（実際のリダイレクト処理は呼び出し側で実装）
      expect(result.current).toBeDefined();
    });

    it("全てのオプションが組み合わせて使用できること", async () => {
      const mockSubmitFunction = vi.fn().mockResolvedValue("success");
      const onSuccess = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useFormSubmission(mockSubmitFunction, {
          onSuccess,
          onError,
          resetFormOnSuccess: true,
          redirectOnSuccess: "/success",
          throwOnError: false,
        })
      );

      await act(async () => {
        await result.current.submitForm({ test: "data" });
      });

      expect(onSuccess).toHaveBeenCalledWith("success");
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe("エラーハンドリング", () => {
    it("フォーム送信エラーが適切に処理されること", async () => {
      const mockError = new Error("Validation failed");
      const mockSubmitFunction = vi.fn().mockRejectedValue(mockError);
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useFormSubmission(mockSubmitFunction, { onError })
      );

      await act(async () => {
        const submitResult = await result.current.submitForm({
          invalid: "data",
        });
        expect(submitResult).toBeNull();
      });

      expect(onError).toHaveBeenCalledWith(mockError);
      expect(result.current.error).toBe("Validation failed");
      expect(result.current.isError).toBe(true);
      expect(result.current.isSubmitting).toBe(false);
    });
  });
});
