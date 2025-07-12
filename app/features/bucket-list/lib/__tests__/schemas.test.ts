import { describe, it, expect } from "vitest";
import {
  bucketItemSchema,
  validateBucketItemForm,
  type BucketItemFormSchema,
} from "../schemas";

describe("bucketItemSchema", () => {
  describe("title フィールド", () => {
    it("有効なタイトルの場合、バリデーションが成功すること", () => {
      const validData: BucketItemFormSchema = {
        title: "富士山に登る",
        description: "日本一高い山に挑戦",
        category_id: 1,
        priority: "high",
        due_date: "2024-12-31",
        due_type: "specific_date",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("富士山に登る");
      }
    });

    it("タイトルが空文字の場合、バリデーションエラーになること", () => {
      const invalidData = {
        title: "",
        category_id: 1,
        priority: "high",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "タイトルを入力してください"
        );
      }
    });

    it("タイトルが201文字の場合、バリデーションエラーになること", () => {
      const longTitle = "a".repeat(201);
      const invalidData = {
        title: longTitle,
        category_id: 1,
        priority: "high",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "タイトルは200文字以内で入力してください"
        );
      }
    });

    it("タイトルが未定義の場合、バリデーションエラーになること", () => {
      const invalidData = {
        category_id: 1,
        priority: "high",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("タイトルは必須です");
      }
    });
  });

  describe("description フィールド", () => {
    it("説明が有効な文字列の場合、バリデーションが成功すること", () => {
      const validData = {
        title: "テストタイトル",
        description: "詳細な説明文",
        category_id: 1,
        priority: "medium",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe("詳細な説明文");
      }
    });

    it("説明が空文字の場合、バリデーションが成功すること", () => {
      const validData = {
        title: "テストタイトル",
        description: "",
        category_id: 1,
        priority: "medium",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("説明が未定義の場合、バリデーションが成功すること", () => {
      const validData = {
        title: "テストタイトル",
        category_id: 1,
        priority: "medium",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("説明が1001文字の場合、バリデーションエラーになること", () => {
      const longDescription = "a".repeat(1001);
      const invalidData = {
        title: "テストタイトル",
        description: longDescription,
        category_id: 1,
        priority: "medium",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "説明は1000文字以内で入力してください"
        );
      }
    });
  });

  describe("category_id フィールド", () => {
    it("有効な正の整数の場合、バリデーションが成功すること", () => {
      const validData = {
        title: "テストタイトル",
        category_id: 5,
        priority: "low",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category_id).toBe(5);
      }
    });

    it("category_idが0の場合、バリデーションエラーになること", () => {
      const invalidData = {
        title: "テストタイトル",
        category_id: 0,
        priority: "medium",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "有効なカテゴリを選択してください"
        );
      }
    });

    it("category_idが負の数の場合、バリデーションエラーになること", () => {
      const invalidData = {
        title: "テストタイトル",
        category_id: -1,
        priority: "medium",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "有効なカテゴリを選択してください"
        );
      }
    });

    it("category_idが小数の場合、バリデーションエラーになること", () => {
      const invalidData = {
        title: "テストタイトル",
        category_id: 1.5,
        priority: "medium",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("無効なカテゴリです");
      }
    });

    it("category_idが未定義の場合、バリデーションエラーになること", () => {
      const invalidData = {
        title: "テストタイトル",
        priority: "medium",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "カテゴリを選択してください"
        );
      }
    });
  });

  describe("priority フィールド", () => {
    it("有効な優先度の場合、バリデーションが成功すること", () => {
      const priorities = ["high", "medium", "low"] as const;

      priorities.forEach((priority) => {
        const validData = {
          title: "テストタイトル",
          category_id: 1,
          priority,
          due_type: "unspecified",
          is_public: true,
        };

        const result = bucketItemSchema.safeParse(validData);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.priority).toBe(priority);
        }
      });
    });

    it("無効な優先度の場合、バリデーションエラーになること", () => {
      const invalidData = {
        title: "テストタイトル",
        category_id: 1,
        priority: "invalid",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it("priorityが未定義の場合、バリデーションエラーになること", () => {
      const invalidData = {
        title: "テストタイトル",
        category_id: 1,
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("優先度を選択してください");
      }
    });
  });

  describe("due_date フィールド", () => {
    it("有効な日付文字列の場合、バリデーションが成功すること", () => {
      const validData = {
        title: "テストタイトル",
        category_id: 1,
        priority: "medium",
        due_date: "2024-12-31",
        due_type: "specific_date",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.due_date).toBe("2024-12-31");
      }
    });

    it("空文字の場合、バリデーションが成功すること", () => {
      const validData = {
        title: "テストタイトル",
        category_id: 1,
        priority: "medium",
        due_date: "",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("未定義の場合、バリデーションが成功すること", () => {
      const validData = {
        title: "テストタイトル",
        category_id: 1,
        priority: "medium",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("無効な日付文字列の場合、バリデーションエラーになること", () => {
      const invalidData = {
        title: "テストタイトル",
        category_id: 1,
        priority: "medium",
        due_date: "invalid-date",
        due_type: "specific_date",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "有効な日付を入力してください"
        );
      }
    });
  });

  describe("due_type フィールド", () => {
    it("有効な期限タイプの場合、バリデーションが成功すること", () => {
      const dueTypes = [
        "specific_date",
        "this_year",
        "next_year",
        "unspecified",
      ] as const;

      dueTypes.forEach((dueType) => {
        const validData = {
          title: "テストタイトル",
          category_id: 1,
          priority: "medium",
          due_type: dueType,
          is_public: true,
        };

        const result = bucketItemSchema.safeParse(validData);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.due_type).toBe(dueType);
        }
      });
    });

    it("無効な期限タイプの場合、バリデーションエラーになること", () => {
      const invalidData = {
        title: "テストタイトル",
        category_id: 1,
        priority: "medium",
        due_type: "invalid_type",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it("due_typeが未定義の場合、バリデーションエラーになること", () => {
      const invalidData = {
        title: "テストタイトル",
        category_id: 1,
        priority: "medium",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "期限タイプを選択してください"
        );
      }
    });
  });

  describe("is_public フィールド", () => {
    it("trueの場合、バリデーションが成功すること", () => {
      const validData = {
        title: "テストタイトル",
        category_id: 1,
        priority: "medium",
        due_type: "unspecified",
        is_public: true,
      };

      const result = bucketItemSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_public).toBe(true);
      }
    });

    it("falseの場合、バリデーションが成功すること", () => {
      const validData = {
        title: "テストタイトル",
        category_id: 1,
        priority: "medium",
        due_type: "unspecified",
        is_public: false,
      };

      const result = bucketItemSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_public).toBe(false);
      }
    });

    it("未定義の場合、デフォルト値trueが設定されること", () => {
      const validData = {
        title: "テストタイトル",
        category_id: 1,
        priority: "medium",
        due_type: "unspecified",
      };

      const result = bucketItemSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_public).toBe(true);
      }
    });
  });
});

describe("validateBucketItemForm", () => {
  it("有効なFormDataの場合、バリデーションが成功すること", () => {
    const formData = new FormData();
    formData.append("title", "世界一周旅行");
    formData.append("description", "様々な国を訪れる");
    formData.append("category_id", "1");
    formData.append("priority", "high");
    formData.append("due_date", "2025-12-31");
    formData.append("due_type", "specific_date");
    formData.append("is_public", "true");

    const result = validateBucketItemForm(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("世界一周旅行");
      expect(result.data.description).toBe("様々な国を訪れる");
      expect(result.data.category_id).toBe(1);
      expect(result.data.priority).toBe("high");
      expect(result.data.due_date).toBe("2025-12-31");
      expect(result.data.due_type).toBe("specific_date");
      expect(result.data.is_public).toBe(true);
    }
  });

  it("descriptionが未設定の場合、空文字として処理されること", () => {
    const formData = new FormData();
    formData.append("title", "テストタイトル");
    formData.append("category_id", "1");
    formData.append("priority", "medium");
    formData.append("due_type", "unspecified");
    formData.append("is_public", "false");

    const result = validateBucketItemForm(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("");
    }
  });

  it("due_dateが未設定の場合、空文字として処理されること", () => {
    const formData = new FormData();
    formData.append("title", "テストタイトル");
    formData.append("category_id", "1");
    formData.append("priority", "medium");
    formData.append("due_type", "unspecified");
    formData.append("is_public", "true");

    const result = validateBucketItemForm(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.due_date).toBe("");
    }
  });

  it("is_publicがfalseの場合、正しく処理されること", () => {
    const formData = new FormData();
    formData.append("title", "テストタイトル");
    formData.append("category_id", "1");
    formData.append("priority", "medium");
    formData.append("due_type", "unspecified");
    formData.append("is_public", "false");

    const result = validateBucketItemForm(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_public).toBe(false);
    }
  });

  it("category_idが数値変換できない場合、バリデーションエラーになること", () => {
    const formData = new FormData();
    formData.append("title", "テストタイトル");
    formData.append("category_id", "invalid");
    formData.append("priority", "medium");
    formData.append("due_type", "unspecified");
    formData.append("is_public", "true");

    const result = validateBucketItemForm(formData);

    expect(result.success).toBe(false);
  });

  it("必須フィールドが不足している場合、バリデーションエラーになること", () => {
    const formData = new FormData();
    formData.append("description", "説明のみ");

    const result = validateBucketItemForm(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});
