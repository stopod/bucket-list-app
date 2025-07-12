import { describe, it, expect, beforeEach } from "vitest";
import {
  // エラー作成関数
  createValidationError,
  createDatabaseError,
  createAuthenticationError,
  createNotFoundError,
  createConflictError,
  createNetworkError,
  createBusinessRuleError,
  createApplicationError,
  // エラー型判定関数
  isValidationError,
  isDatabaseError,
  isAuthenticationError,
  isNotFoundError,
  isConflictError,
  isNetworkError,
  isBusinessRuleError,
  isApplicationError,
  type ValidationError,
  type DatabaseError,
  type AuthenticationError,
  type NotFoundError,
  type ConflictError,
  type NetworkError,
  type BusinessRuleError,
  type ApplicationError,
  type BucketListError,
} from "../errors";

describe("errors", () => {
  describe("エラー作成関数", () => {
    describe("createValidationError", () => {
      it("必須パラメータでValidationErrorが作成されること", () => {
        const error = createValidationError(
          "email",
          "メールアドレスが必須です"
        );

        expect(error.type).toBe("ValidationError");
        expect(error.field).toBe("email");
        expect(error.message).toBe("メールアドレスが必須です");
        expect(error.code).toBeUndefined();
      });

      it("オプションのcodeパラメータが設定されること", () => {
        const error = createValidationError(
          "password",
          "パスワードが短すぎます",
          "MIN_LENGTH"
        );

        expect(error.type).toBe("ValidationError");
        expect(error.field).toBe("password");
        expect(error.message).toBe("パスワードが短すぎます");
        expect(error.code).toBe("MIN_LENGTH");
      });

      it("空文字列のフィールドでも正しく作成されること", () => {
        const error = createValidationError("", "エラーメッセージ");

        expect(error.field).toBe("");
        expect(error.message).toBe("エラーメッセージ");
      });
    });

    describe("createDatabaseError", () => {
      it("メッセージのみでDatabaseErrorが作成されること", () => {
        const error = createDatabaseError("データベース接続に失敗しました");

        expect(error.type).toBe("DatabaseError");
        expect(error.message).toBe("データベース接続に失敗しました");
        expect(error.operation).toBeUndefined();
        expect(error.code).toBeUndefined();
      });

      it("操作とコードが設定されること", () => {
        const error = createDatabaseError(
          "レコードの作成に失敗しました",
          "create",
          "UNIQUE_VIOLATION"
        );

        expect(error.type).toBe("DatabaseError");
        expect(error.message).toBe("レコードの作成に失敗しました");
        expect(error.operation).toBe("create");
        expect(error.code).toBe("UNIQUE_VIOLATION");
      });

      it("すべての操作タイプが設定できること", () => {
        const operations: DatabaseError["operation"][] = [
          "create",
          "read",
          "update",
          "delete",
        ];

        operations.forEach((operation) => {
          const error = createDatabaseError("テストエラー", operation);
          expect(error.operation).toBe(operation);
        });
      });
    });

    describe("createAuthenticationError", () => {
      it("AuthenticationErrorが正しく作成されること", () => {
        const error = createAuthenticationError(
          "認証に失敗しました",
          "invalid_credentials"
        );

        expect(error.type).toBe("AuthenticationError");
        expect(error.message).toBe("認証に失敗しました");
        expect(error.reason).toBe("invalid_credentials");
      });

      it("すべての認証エラー理由が設定できること", () => {
        const reasons: AuthenticationError["reason"][] = [
          "invalid_credentials",
          "token_expired",
          "insufficient_permissions",
          "user_not_found",
        ];

        reasons.forEach((reason) => {
          const error = createAuthenticationError("テストエラー", reason);
          expect(error.reason).toBe(reason);
        });
      });
    });

    describe("createNotFoundError", () => {
      it("リソース名のみでNotFoundErrorが作成されること", () => {
        const error = createNotFoundError("user");

        expect(error.type).toBe("NotFoundError");
        expect(error.resource).toBe("user");
        expect(error.id).toBeUndefined();
        expect(error.message).toBe("user not found");
      });

      it("IDが含まれたメッセージが作成されること", () => {
        const error = createNotFoundError("post", "123");

        expect(error.type).toBe("NotFoundError");
        expect(error.resource).toBe("post");
        expect(error.id).toBe("123");
        expect(error.message).toBe("post with id 123 not found");
      });

      it("カスタムメッセージが設定されること", () => {
        const customMessage = "指定されたユーザーが見つかりません";
        const error = createNotFoundError("user", "456", customMessage);

        expect(error.type).toBe("NotFoundError");
        expect(error.resource).toBe("user");
        expect(error.id).toBe("456");
        expect(error.message).toBe(customMessage);
      });

      it("IDなしでカスタムメッセージが設定されること", () => {
        const customMessage = "カスタムエラーメッセージ";
        const error = createNotFoundError("item", undefined, customMessage);

        expect(error.resource).toBe("item");
        expect(error.id).toBeUndefined();
        expect(error.message).toBe(customMessage);
      });
    });

    describe("createConflictError", () => {
      it("ConflictErrorが正しく作成されること", () => {
        const error = createConflictError(
          "email",
          "メールアドレスが既に使用されています"
        );

        expect(error.type).toBe("ConflictError");
        expect(error.resource).toBe("email");
        expect(error.message).toBe("メールアドレスが既に使用されています");
        expect(error.conflictingData).toBeUndefined();
      });

      it("競合データが設定されること", () => {
        const conflictingData = { existingEmail: "test@example.com" };
        const error = createConflictError(
          "email",
          "エラーメッセージ",
          conflictingData
        );

        expect(error.conflictingData).toEqual(conflictingData);
      });
    });

    describe("createNetworkError", () => {
      it("メッセージのみでNetworkErrorが作成されること", () => {
        const error = createNetworkError("ネットワークエラーが発生しました");

        expect(error.type).toBe("NetworkError");
        expect(error.message).toBe("ネットワークエラーが発生しました");
        expect(error.statusCode).toBeUndefined();
        expect(error.url).toBeUndefined();
      });

      it("ステータスコードとURLが設定されること", () => {
        const error = createNetworkError(
          "リクエストが失敗しました",
          404,
          "https://api.example.com/users"
        );

        expect(error.statusCode).toBe(404);
        expect(error.url).toBe("https://api.example.com/users");
      });
    });

    describe("createBusinessRuleError", () => {
      it("BusinessRuleErrorが正しく作成されること", () => {
        const error = createBusinessRuleError(
          "MAX_ITEMS_EXCEEDED",
          "最大アイテム数を超えています"
        );

        expect(error.type).toBe("BusinessRuleError");
        expect(error.rule).toBe("MAX_ITEMS_EXCEEDED");
        expect(error.message).toBe("最大アイテム数を超えています");
        expect(error.context).toBeUndefined();
      });

      it("コンテキストが設定されること", () => {
        const context = { currentCount: 100, maxAllowed: 50 };
        const error = createBusinessRuleError(
          "LIMIT_EXCEEDED",
          "エラーメッセージ",
          context
        );

        expect(error.context).toEqual(context);
      });
    });

    describe("createApplicationError", () => {
      it("メッセージのみでApplicationErrorが作成されること", () => {
        const error = createApplicationError("予期しないエラーが発生しました");

        expect(error.type).toBe("ApplicationError");
        expect(error.message).toBe("予期しないエラーが発生しました");
        expect(error.cause).toBeUndefined();
        expect(error.context).toBeUndefined();
      });

      it("原因エラーとコンテキストが設定されること", () => {
        const cause = new Error("元のエラー");
        const context = { userId: "123", action: "save" };
        const error = createApplicationError(
          "アプリケーションエラー",
          cause,
          context
        );

        expect(error.cause).toBe(cause);
        expect(error.context).toEqual(context);
      });
    });
  });

  describe("エラー型判定関数", () => {
    let validationError: ValidationError;
    let databaseError: DatabaseError;
    let authenticationError: AuthenticationError;
    let notFoundError: NotFoundError;
    let conflictError: ConflictError;
    let networkError: NetworkError;
    let businessRuleError: BusinessRuleError;
    let applicationError: ApplicationError;

    beforeEach(() => {
      validationError = createValidationError("field", "message");
      databaseError = createDatabaseError("message");
      authenticationError = createAuthenticationError(
        "message",
        "invalid_credentials"
      );
      notFoundError = createNotFoundError("resource");
      conflictError = createConflictError("resource", "message");
      networkError = createNetworkError("message");
      businessRuleError = createBusinessRuleError("rule", "message");
      applicationError = createApplicationError("message");
    });

    describe("isValidationError", () => {
      it("ValidationErrorの場合、trueが返されること", () => {
        expect(isValidationError(validationError)).toBe(true);
      });

      it("他のエラー型の場合、falseが返されること", () => {
        const otherErrors: BucketListError[] = [
          databaseError,
          authenticationError,
          notFoundError,
          conflictError,
          networkError,
          businessRuleError,
          applicationError,
        ];

        otherErrors.forEach((error) => {
          expect(isValidationError(error)).toBe(false);
        });
      });

      it("型ガードとして機能すること", () => {
        if (isValidationError(validationError)) {
          // TypeScriptでValidationError型として扱われることを確認
          expect(validationError.field).toBeDefined();
        }
      });
    });

    describe("isDatabaseError", () => {
      it("DatabaseErrorの場合、trueが返されること", () => {
        expect(isDatabaseError(databaseError)).toBe(true);
      });

      it("他のエラー型の場合、falseが返されること", () => {
        const otherErrors: BucketListError[] = [
          validationError,
          authenticationError,
          notFoundError,
          conflictError,
          networkError,
          businessRuleError,
          applicationError,
        ];

        otherErrors.forEach((error) => {
          expect(isDatabaseError(error)).toBe(false);
        });
      });

      it("型ガードとして機能すること", () => {
        if (isDatabaseError(databaseError)) {
          // TypeScriptでDatabaseError型として扱われることを確認
          expect(databaseError.type).toBe("DatabaseError");
          expect(databaseError.message).toBeDefined();
          // operationはオプショナルなのでundefinedでも正常
        }
      });
    });

    describe("isAuthenticationError", () => {
      it("AuthenticationErrorの場合、trueが返されること", () => {
        expect(isAuthenticationError(authenticationError)).toBe(true);
      });

      it("他のエラー型の場合、falseが返されること", () => {
        const otherErrors: BucketListError[] = [
          validationError,
          databaseError,
          notFoundError,
          conflictError,
          networkError,
          businessRuleError,
          applicationError,
        ];

        otherErrors.forEach((error) => {
          expect(isAuthenticationError(error)).toBe(false);
        });
      });

      it("型ガードとして機能すること", () => {
        if (isAuthenticationError(authenticationError)) {
          // TypeScriptでAuthenticationError型として扱われることを確認
          expect(authenticationError.reason).toBeDefined();
        }
      });
    });

    describe("isNotFoundError", () => {
      it("NotFoundErrorの場合、trueが返されること", () => {
        expect(isNotFoundError(notFoundError)).toBe(true);
      });

      it("他のエラー型の場合、falseが返されること", () => {
        const otherErrors: BucketListError[] = [
          validationError,
          databaseError,
          authenticationError,
          conflictError,
          networkError,
          businessRuleError,
          applicationError,
        ];

        otherErrors.forEach((error) => {
          expect(isNotFoundError(error)).toBe(false);
        });
      });

      it("型ガードとして機能すること", () => {
        if (isNotFoundError(notFoundError)) {
          // TypeScriptでNotFoundError型として扱われることを確認
          expect(notFoundError.resource).toBeDefined();
        }
      });
    });

    describe("isConflictError", () => {
      it("ConflictErrorの場合、trueが返されること", () => {
        expect(isConflictError(conflictError)).toBe(true);
      });

      it("他のエラー型の場合、falseが返されること", () => {
        const otherErrors: BucketListError[] = [
          validationError,
          databaseError,
          authenticationError,
          notFoundError,
          networkError,
          businessRuleError,
          applicationError,
        ];

        otherErrors.forEach((error) => {
          expect(isConflictError(error)).toBe(false);
        });
      });

      it("型ガードとして機能すること", () => {
        if (isConflictError(conflictError)) {
          // TypeScriptでConflictError型として扱われることを確認
          expect(conflictError.resource).toBeDefined();
          expect(conflictError.type).toBe("ConflictError");
          // conflictingDataはオプショナルなのでundefinedでも正常
        }
      });
    });

    describe("isNetworkError", () => {
      it("NetworkErrorの場合、trueが返されること", () => {
        expect(isNetworkError(networkError)).toBe(true);
      });

      it("他のエラー型の場合、falseが返されること", () => {
        const otherErrors: BucketListError[] = [
          validationError,
          databaseError,
          authenticationError,
          notFoundError,
          conflictError,
          businessRuleError,
          applicationError,
        ];

        otherErrors.forEach((error) => {
          expect(isNetworkError(error)).toBe(false);
        });
      });

      it("型ガードとして機能すること", () => {
        if (isNetworkError(networkError)) {
          // TypeScriptでNetworkError型として扱われることを確認
          expect(networkError.type).toBe("NetworkError");
          expect(networkError.message).toBeDefined();
          // statusCodeとurlはオプショナルなのでundefinedでも正常
        }
      });
    });

    describe("isBusinessRuleError", () => {
      it("BusinessRuleErrorの場合、trueが返されること", () => {
        expect(isBusinessRuleError(businessRuleError)).toBe(true);
      });

      it("他のエラー型の場合、falseが返されること", () => {
        const otherErrors: BucketListError[] = [
          validationError,
          databaseError,
          authenticationError,
          notFoundError,
          conflictError,
          networkError,
          applicationError,
        ];

        otherErrors.forEach((error) => {
          expect(isBusinessRuleError(error)).toBe(false);
        });
      });

      it("型ガードとして機能すること", () => {
        if (isBusinessRuleError(businessRuleError)) {
          // TypeScriptでBusinessRuleError型として扱われることを確認
          expect(businessRuleError.rule).toBeDefined();
          expect(businessRuleError.type).toBe("BusinessRuleError");
          // contextはオプショナルなのでundefinedでも正常
        }
      });
    });

    describe("isApplicationError", () => {
      it("ApplicationErrorの場合、trueが返されること", () => {
        expect(isApplicationError(applicationError)).toBe(true);
      });

      it("他のエラー型の場合、falseが返されること", () => {
        const otherErrors: BucketListError[] = [
          validationError,
          databaseError,
          authenticationError,
          notFoundError,
          conflictError,
          networkError,
          businessRuleError,
        ];

        otherErrors.forEach((error) => {
          expect(isApplicationError(error)).toBe(false);
        });
      });

      it("型ガードとして機能すること", () => {
        if (isApplicationError(applicationError)) {
          // TypeScriptでApplicationError型として扱われることを確認
          expect(applicationError.type).toBe("ApplicationError");
          expect(applicationError.message).toBeDefined();
          // causeとcontextはオプショナルなのでundefinedでも正常
        }
      });
    });
  });

  describe("エラー型の統合性", () => {
    it("すべてのエラー型がBucketListErrorに含まれること", () => {
      const errors: BucketListError[] = [
        createValidationError("field", "message"),
        createDatabaseError("message"),
        createAuthenticationError("message", "invalid_credentials"),
        createNotFoundError("resource"),
        createConflictError("resource", "message"),
        createNetworkError("message"),
        createBusinessRuleError("rule", "message"),
        createApplicationError("message"),
      ];

      errors.forEach((error) => {
        expect(error.type).toBeDefined();
        expect(error.message).toBeDefined();
      });
    });

    it("各エラー型が一意の型識別子を持つこと", () => {
      const errorTypes = [
        "ValidationError",
        "DatabaseError",
        "AuthenticationError",
        "NotFoundError",
        "ConflictError",
        "NetworkError",
        "BusinessRuleError",
        "ApplicationError",
      ];

      const uniqueTypes = new Set(errorTypes);
      expect(uniqueTypes.size).toBe(errorTypes.length);
    });

    it("型判定関数が相互排他的であること", () => {
      const errors: BucketListError[] = [
        createValidationError("field", "message"),
        createDatabaseError("message"),
        createAuthenticationError("message", "invalid_credentials"),
        createNotFoundError("resource"),
        createConflictError("resource", "message"),
        createNetworkError("message"),
        createBusinessRuleError("rule", "message"),
        createApplicationError("message"),
      ];

      const typeCheckers = [
        isValidationError,
        isDatabaseError,
        isAuthenticationError,
        isNotFoundError,
        isConflictError,
        isNetworkError,
        isBusinessRuleError,
        isApplicationError,
      ];

      errors.forEach((error) => {
        const trueCheckers = typeCheckers.filter((checker) => checker(error));
        expect(trueCheckers.length).toBe(1); // 1つの型チェッカーのみがtrueを返す
      });
    });
  });

  describe("エッジケースの処理", () => {
    it("空文字列のメッセージでもエラーが作成されること", () => {
      const error = createValidationError("field", "");
      expect(error.message).toBe("");
      expect(error.type).toBe("ValidationError");
    });

    it("特殊文字を含むフィールド名が正しく処理されること", () => {
      const specialField = "user-email_123";
      const error = createValidationError(specialField, "エラー");
      expect(error.field).toBe(specialField);
    });

    it("非常に長いメッセージでも正しく処理されること", () => {
      const longMessage = "a".repeat(1000);
      const error = createDatabaseError(longMessage);
      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(1000);
    });

    it("nullやundefinedを含むコンテキストが正しく設定されること", () => {
      const context = {
        nullValue: null,
        undefinedValue: undefined,
        stringValue: "test",
        numberValue: 42,
      };
      const error = createBusinessRuleError("test", "message", context);
      expect(error.context).toEqual(context);
    });
  });
});
