import { describe, it, expect, vi } from "vitest";
import { success, failure } from "~/shared/types/result";
import {
  combineResults,
  collectResults,
  wrapAsync,
  matchResult,
  tapResult,
  pipeResults,
  resultToOption,
  optionToResult,
  mapOrElse,
  transformIf,
  filterSuccesses,
  filterFailures,
} from "../result-helpers";

describe("result-helpers", () => {
  describe("combineResults", () => {
    it("すべてのResultが成功の場合、結合された成功結果が返されること", () => {
      const result1 = success("first");
      const result2 = success("second");
      const result3 = success("third");

      const combined = combineResults(result1, result2, result3);

      expect(combined.success).toBe(true);
      if (combined.success) {
        expect(combined.data).toEqual(["first", "second", "third"]);
      }
    });

    it("2つのResultが成功の場合、タプル形式で結合されること", () => {
      const result1 = success(42);
      const result2 = success("hello");

      const combined = combineResults(result1, result2);

      expect(combined.success).toBe(true);
      if (combined.success) {
        expect(combined.data).toEqual([42, "hello"]);
      }
    });

    it("最初のResultが失敗の場合、最初の失敗が返されること", () => {
      const error1 = "first error";
      const error2 = "second error";
      const result1 = failure(error1);
      const result2 = failure(error2);
      const result3 = success("third");

      const combined = combineResults(result1, result2, result3);

      expect(combined.success).toBe(false);
      if (!combined.success) {
        expect(combined.error).toBe(error1);
      }
    });

    it("中間のResultが失敗の場合、その失敗が返されること", () => {
      const result1 = success("first");
      const result2 = failure("middle error");
      const result3 = success("third");

      const combined = combineResults(result1, result2, result3);

      expect(combined.success).toBe(false);
      if (!combined.success) {
        expect(combined.error).toBe("middle error");
      }
    });

    it("空の配列の場合、空の成功結果が返されること", () => {
      const combined = combineResults();

      expect(combined.success).toBe(true);
      if (combined.success) {
        expect(combined.data).toEqual([]);
      }
    });

    it("可変長引数で複数のResultを処理できること", () => {
      const results = [success(1), success(2), success(3), success(4)];
      const combined = combineResults(...results);

      expect(combined.success).toBe(true);
      if (combined.success) {
        expect(combined.data).toEqual([1, 2, 3, 4]);
      }
    });
  });

  describe("collectResults", () => {
    it("すべてが成功の場合、配列として結合されること", () => {
      const results = [success("a"), success("b"), success("c")];
      const collected = collectResults(results);

      expect(collected.success).toBe(true);
      if (collected.success) {
        expect(collected.data).toEqual(["a", "b", "c"]);
      }
    });

    it("一つでも失敗がある場合、最初の失敗が返されること", () => {
      const results = [success("a"), failure("error"), success("c")];
      const collected = collectResults(results);

      expect(collected.success).toBe(false);
      if (!collected.success) {
        expect(collected.error).toBe("error");
      }
    });

    it("空の配列の場合、空の成功結果が返されること", () => {
      const results: any[] = [];
      const collected = collectResults(results);

      expect(collected.success).toBe(true);
      if (collected.success) {
        expect(collected.data).toEqual([]);
      }
    });

    it("すべてが失敗の場合、最初の失敗が返されること", () => {
      const results = [failure("error1"), failure("error2"), failure("error3")];
      const collected = collectResults(results);

      expect(collected.success).toBe(false);
      if (!collected.success) {
        expect(collected.error).toBe("error1");
      }
    });
  });

  describe("wrapAsync", () => {
    it("非同期操作が成功した場合、成功結果が返されること", async () => {
      const asyncOperation = async () => "success value";
      const result = await wrapAsync(asyncOperation);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("success value");
      }
    });

    it("非同期操作が失敗した場合、失敗結果が返されること", async () => {
      const error = new Error("async error");
      const asyncOperation = async () => {
        throw error;
      };
      const result = await wrapAsync(asyncOperation);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });

    it("エラーマッパーが提供された場合、エラーが変換されること", async () => {
      const originalError = new Error("original error");
      const mappedError = "mapped error";
      const asyncOperation = async () => {
        throw originalError;
      };
      const errorMapper = () => mappedError;

      const result = await wrapAsync(asyncOperation, errorMapper);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(mappedError);
      }
    });

    it("Promise.resolveでラップされた値も正しく処理されること", async () => {
      const asyncOperation = () => Promise.resolve(42);
      const result = await wrapAsync(asyncOperation);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it("Promise.rejectでラップされたエラーも正しく処理されること", async () => {
      const rejectedValue = "rejected value";
      const asyncOperation = () => Promise.reject(rejectedValue);
      const result = await wrapAsync(asyncOperation);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(rejectedValue);
      }
    });
  });

  describe("matchResult", () => {
    it("成功の場合、onSuccess関数が実行されること", () => {
      const result = success("test data");
      const onSuccess = vi.fn((data: string) => `success: ${data}`);
      const onFailure = vi.fn(() => "failure");

      const matched = matchResult(result, onSuccess, onFailure);

      expect(onSuccess).toHaveBeenCalledWith("test data");
      expect(onFailure).not.toHaveBeenCalled();
      expect(matched).toBe("success: test data");
    });

    it("失敗の場合、onFailure関数が実行されること", () => {
      const result = failure("test error");
      const onSuccess = vi.fn(() => "success");
      const onFailure = vi.fn((error: string) => `failure: ${error}`);

      const matched = matchResult(result, onSuccess, onFailure);

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onFailure).toHaveBeenCalledWith("test error");
      expect(matched).toBe("failure: test error");
    });

    it("異なる戻り値型でも正しく動作すること", () => {
      const successResult = success(100);
      const failureResult = failure("error");

      const successMatched = matchResult(
        successResult,
        (data) => data * 2,
        () => 0
      );

      const failureMatched = matchResult(
        failureResult,
        (data) => data * 2,
        () => -1
      );

      expect(successMatched).toBe(200);
      expect(failureMatched).toBe(-1);
    });
  });

  describe("tapResult", () => {
    it("成功の場合、onSuccess関数が実行され元のResultが返されること", () => {
      const result = success("test data");
      const onSuccess = vi.fn();
      const onFailure = vi.fn();

      const tapped = tapResult(result, onSuccess, onFailure);

      expect(onSuccess).toHaveBeenCalledWith("test data");
      expect(onFailure).not.toHaveBeenCalled();
      expect(tapped).toBe(result);
    });

    it("失敗の場合、onFailure関数が実行され元のResultが返されること", () => {
      const result = failure("test error");
      const onSuccess = vi.fn();
      const onFailure = vi.fn();

      const tapped = tapResult(result, onSuccess, onFailure);

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onFailure).toHaveBeenCalledWith("test error");
      expect(tapped).toBe(result);
    });

    it("onSuccess関数が未提供の場合、成功時に何も実行されないこと", () => {
      const result = success("test data");
      const onFailure = vi.fn();

      const tapped = tapResult(result, undefined, onFailure);

      expect(onFailure).not.toHaveBeenCalled();
      expect(tapped).toBe(result);
    });

    it("onFailure関数が未提供の場合、失敗時に何も実行されないこと", () => {
      const result = failure("test error");
      const onSuccess = vi.fn();

      const tapped = tapResult(result, onSuccess, undefined);

      expect(onSuccess).not.toHaveBeenCalled();
      expect(tapped).toBe(result);
    });

    it("両方の関数が未提供の場合、元のResultがそのまま返されること", () => {
      const result = success("test data");
      const tapped = tapResult(result);

      expect(tapped).toBe(result);
    });
  });

  describe("pipeResults", () => {
    it("すべての変換が成功した場合、最終結果が返されること", () => {
      const initial = success(10);
      const transform1 = (x: number) => success(x * 2);
      const transform2 = (x: number) => success(x + 5);

      const piped = pipeResults(initial, transform1, transform2);

      expect(piped.success).toBe(true);
      if (piped.success) {
        expect(piped.data).toBe(25); // (10 * 2) + 5
      }
    });

    it("初期値が失敗の場合、変換は実行されず失敗が返されること", () => {
      const initial = failure("initial error");
      const transform1 = vi.fn((x: number) => success(x * 2));
      const transform2 = vi.fn((x: number) => success(x + 5));

      const piped = pipeResults(initial, transform1, transform2);

      expect(transform1).not.toHaveBeenCalled();
      expect(transform2).not.toHaveBeenCalled();
      expect(piped.success).toBe(false);
      if (!piped.success) {
        expect(piped.error).toBe("initial error");
      }
    });

    it("中間の変換が失敗した場合、以降の変換は実行されず失敗が返されること", () => {
      const initial = success(10);
      const transform1 = (x: number) => success(x * 2);
      const transform2 = () => failure("transform2 error");
      const transform3 = vi.fn((x: number) => success(x + 10));

      const piped = pipeResults(initial, transform1, transform2, transform3);

      expect(transform3).not.toHaveBeenCalled();
      expect(piped.success).toBe(false);
      if (!piped.success) {
        expect(piped.error).toBe("transform2 error");
      }
    });

    it("3つの変換関数が正しく順次実行されること", () => {
      const initial = success("hello");
      const transform1 = (x: string) => success(x.toUpperCase());
      const transform2 = (x: string) => success(`${x} WORLD`);
      const transform3 = (x: string) => success(`${x}!`);

      const piped = pipeResults(initial, transform1, transform2, transform3);

      expect(piped.success).toBe(true);
      if (piped.success) {
        expect(piped.data).toBe("HELLO WORLD!");
      }
    });
  });

  describe("resultToOption", () => {
    it("成功の場合、データが返されること", () => {
      const result = success("test data");
      const option = resultToOption(result);

      expect(option).toBe("test data");
    });

    it("失敗の場合、nullが返されること", () => {
      const result = failure("test error");
      const option = resultToOption(result);

      expect(option).toBe(null);
    });

    it("数値データの場合も正しく動作すること", () => {
      const successResult = success(42);
      const failureResult = failure("error");

      expect(resultToOption(successResult)).toBe(42);
      expect(resultToOption(failureResult)).toBe(null);
    });

    it("null値自体が成功データの場合、nullが返されること", () => {
      const result = success(null);
      const option = resultToOption(result);

      expect(option).toBe(null);
    });
  });

  describe("optionToResult", () => {
    it("有効な値の場合、成功結果が返されること", () => {
      const value = "test value";
      const error = "test error";
      const result = optionToResult(value, error);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("test value");
      }
    });

    it("nullの場合、失敗結果が返されること", () => {
      const value = null;
      const error = "null error";
      const result = optionToResult(value, error);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("null error");
      }
    });

    it("undefinedの場合、失敗結果が返されること", () => {
      const value = undefined;
      const error = "undefined error";
      const result = optionToResult(value, error);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("undefined error");
      }
    });

    it("0値の場合、成功結果が返されること", () => {
      const value = 0;
      const error = "zero error";
      const result = optionToResult(value, error);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(0);
      }
    });

    it("空文字列の場合、成功結果が返されること", () => {
      const value = "";
      const error = "empty string error";
      const result = optionToResult(value, error);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("");
      }
    });
  });

  describe("mapOrElse", () => {
    it("成功の場合、変換関数が適用された値が返されること", () => {
      const result = success(10);
      const defaultValue = 0;
      const transform = (x: number) => x * 2;

      const mapped = mapOrElse(result, defaultValue, transform);

      expect(mapped).toBe(20);
    });

    it("失敗の場合、デフォルト値が返されること", () => {
      const result = failure("error");
      const defaultValue = "default";
      const transform = vi.fn((x: string) => x.toUpperCase());

      const mapped = mapOrElse(result, defaultValue, transform);

      expect(transform).not.toHaveBeenCalled();
      expect(mapped).toBe("default");
    });

    it("異なる型のデフォルト値と変換関数も正しく動作すること", () => {
      const successResult = success("hello");
      const failureResult = failure("error");
      const defaultValue = 0;
      const transform = (x: string) => x.length;

      expect(mapOrElse(successResult, defaultValue, transform)).toBe(5);
      expect(mapOrElse(failureResult, defaultValue, transform)).toBe(0);
    });
  });

  describe("transformIf", () => {
    it("成功かつ条件がtrueの場合、変換が適用されること", () => {
      const result = success(10);
      const condition = (x: number) => x > 5;
      const transform = (x: number) => x * 2;

      const transformed = transformIf(result, condition, transform);

      expect(transformed.success).toBe(true);
      if (transformed.success) {
        expect(transformed.data).toBe(20);
      }
    });

    it("成功だが条件がfalseの場合、元の値が返されること", () => {
      const result = success(3);
      const condition = (x: number) => x > 5;
      const transform = vi.fn((x: number) => x * 2);

      const transformed = transformIf(result, condition, transform);

      expect(transform).not.toHaveBeenCalled();
      expect(transformed.success).toBe(true);
      if (transformed.success) {
        expect(transformed.data).toBe(3);
      }
    });

    it("失敗の場合、条件や変換は実行されず元の結果が返されること", () => {
      const result = failure("error");
      const condition = vi.fn(() => true);
      const transform = vi.fn(() => "transformed");

      const transformed = transformIf(result, condition, transform);

      expect(condition).not.toHaveBeenCalled();
      expect(transform).not.toHaveBeenCalled();
      expect(transformed).toBe(result);
    });

    it("文字列での条件判定も正しく動作すること", () => {
      const result = success("hello world");
      const condition = (x: string) => x.includes("world");
      const transform = (x: string) => x.toUpperCase();

      const transformed = transformIf(result, condition, transform);

      expect(transformed.success).toBe(true);
      if (transformed.success) {
        expect(transformed.data).toBe("HELLO WORLD");
      }
    });
  });

  describe("filterSuccesses", () => {
    it("成功結果のデータのみが抽出されること", () => {
      const results = [
        success("first"),
        failure("error1"),
        success("second"),
        failure("error2"),
        success("third"),
      ];

      const successes = filterSuccesses(results);

      expect(successes).toEqual(["first", "second", "third"]);
    });

    it("すべて失敗の場合、空の配列が返されること", () => {
      const results = [failure("error1"), failure("error2"), failure("error3")];

      const successes = filterSuccesses(results);

      expect(successes).toEqual([]);
    });

    it("すべて成功の場合、すべてのデータが抽出されること", () => {
      const results = [success(1), success(2), success(3)];

      const successes = filterSuccesses(results);

      expect(successes).toEqual([1, 2, 3]);
    });

    it("空の配列の場合、空の配列が返されること", () => {
      const results: any[] = [];
      const successes = filterSuccesses(results);

      expect(successes).toEqual([]);
    });
  });

  describe("filterFailures", () => {
    it("失敗結果のエラーのみが抽出されること", () => {
      const results = [
        success("data1"),
        failure("error1"),
        success("data2"),
        failure("error2"),
        failure("error3"),
      ];

      const failures = filterFailures(results);

      expect(failures).toEqual(["error1", "error2", "error3"]);
    });

    it("すべて成功の場合、空の配列が返されること", () => {
      const results = [success("data1"), success("data2"), success("data3")];

      const failures = filterFailures(results);

      expect(failures).toEqual([]);
    });

    it("すべて失敗の場合、すべてのエラーが抽出されること", () => {
      const results = [failure("error1"), failure("error2"), failure("error3")];

      const failures = filterFailures(results);

      expect(failures).toEqual(["error1", "error2", "error3"]);
    });

    it("空の配列の場合、空の配列が返されること", () => {
      const results: any[] = [];
      const failures = filterFailures(results);

      expect(failures).toEqual([]);
    });
  });
});
