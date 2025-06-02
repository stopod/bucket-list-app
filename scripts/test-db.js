// Prisma接続テスト用スクリプト
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

async function testConnection() {
  console.log("🎭 周央サンゴの接続テスト開始ンゴ～！");
  console.log("環境:", process.env.NODE_ENV || "development");
  console.log(
    "DB URL:",
    process.env.POSTGRES_URL?.replace(/:[^@]+@/, ":****@")
  );

  try {
    // 接続テスト
    await prisma.$connect();
    console.log("✅ データベースに接続成功ンゴ！");

    // テストユーザー作成
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        name: "周央サンゴ",
      },
    });
    console.log("✅ テストユーザー作成成功ンゴ！", testUser);

    // ユーザー数を確認
    const count = await prisma.user.count();
    console.log(`📊 現在のユーザー数: ${count}人ンゴ！`);
  } catch (error) {
    console.error("❌ エラーが発生したンゴ...", error);
  } finally {
    await prisma.$disconnect();
    console.log("🎭 接続テスト終了ンゴ～！");
  }
}

testConnection();
