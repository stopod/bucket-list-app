import React, { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { Link, useNavigate } from "react-router";
import { Button, MobileMenu } from "~/components/ui";
import { useAuth } from "~/features/auth";
import { AppLayout } from "~/shared/layouts";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "死ぬまでにやること" },
    {
      name: "description",
      content: "あなたの夢や目標を管理するやりたいことりすと",
    },
  ];
}

export default function HomePage() {
  const { user, loading, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navigate = useNavigate();

  // 認証済みユーザーのリダイレクトは削除
  // タイトルクリックで直接ダッシュボードに行くように変更

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>読み込み中...</div>
      </div>
    );
  }

  const navigationContent = user ? (
    <MobileMenu
      user={user}
      onSignOut={handleSignOut}
      isSigningOut={isSigningOut}
    />
  ) : (
    <>
      <Link to="/login">
        <Button variant="outline">ログイン</Button>
      </Link>
      <Link to="/register">
        <Button>新規登録</Button>
      </Link>
    </>
  );

  return (
    <AppLayout showNavigation={true} navigationContent={navigationContent}>
      {/* ヒーローセクション */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">人生は一度きり</span>
              <span className="block text-indigo-600 mt-2">
                やりたいことを叶えよう
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600">
              夢や目標を整理し、達成までの道のりを可視化。あなたの「やりたいこと」を実現するためのデジタルバケットリストです。
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                // 認証済みユーザー向けのボタン
                <>
                  <Link to="/dashboard">
                    <Button
                      size="lg"
                      className="text-lg px-8 py-4 w-full sm:w-auto"
                    >
                      ダッシュボードへ
                    </Button>
                  </Link>
                  <Link to="/bucket-list">
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-lg px-8 py-4 w-full sm:w-auto"
                    >
                      やりたいこと一覧
                    </Button>
                  </Link>
                </>
              ) : (
                // 未認証ユーザー向けのボタン
                <>
                  <Link to="/register">
                    <Button
                      size="lg"
                      className="text-lg px-8 py-4 w-full sm:w-auto"
                    >
                      無料で始める
                    </Button>
                  </Link>
                  <Link to="/public">
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-lg px-8 py-4 w-full sm:w-auto"
                    >
                      みんなのリストを見る
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 機能紹介セクション */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              シンプルで強力な機能
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              やりたいことの管理に必要な機能をすべて備えています
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 機能1: カテゴリ管理 */}
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                カテゴリ分類
              </h3>
              <p className="text-gray-600">
                旅行、スキル習得、体験など9つのカテゴリで整理。やりたいことを体系的に管理できます。
              </p>
            </div>

            {/* 機能2: 進捗管理 */}
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                進捗可視化
              </h3>
              <p className="text-gray-600">
                達成率やカテゴリ別進捗をグラフで確認。モチベーション維持に役立ちます。
              </p>
            </div>

            {/* 機能3: 期限管理 */}
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                期限設定
              </h3>
              <p className="text-gray-600">
                具体的な日付や「今年中」「来年中」など、柔軟な期限設定で計画的に進められます。
              </p>
            </div>

            {/* 機能4: 優先度管理 */}
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                優先度設定
              </h3>
              <p className="text-gray-600">
                高・中・低の3段階で優先度を設定。重要なことから順番に取り組めます。
              </p>
            </div>

            {/* 機能5: 公開設定 */}
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                公開・非公開
              </h3>
              <p className="text-gray-600">
                項目ごとに公開・非公開を選択。プライベートな目標も安心して管理できます。
              </p>
            </div>

            {/* 機能6: 達成記録 */}
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                達成記録
              </h3>
              <p className="text-gray-600">
                達成時にコメントを残せます。振り返りや達成感の記録として活用できます。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* デモ統計セクション */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              こんな使い方ができます
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              実際の利用例をご紹介します
            </p>
          </div>

          {/* デモ統計カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">127</div>
              <div className="text-gray-600">登録されたやりたいこと</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">43</div>
              <div className="text-gray-600">達成された目標数</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">34%</div>
              <div className="text-gray-600">平均達成率</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">9</div>
              <div className="text-gray-600">カテゴリ数</div>
            </div>
          </div>

          {/* サンプル項目 */}
          <div className="bg-white rounded-lg shadow p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              こんなやりたいことが登録されています
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full mr-2 bg-blue-500"></div>
                  <span className="text-sm text-gray-500">旅行・観光</span>
                  <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    完了
                  </span>
                </div>
                <h4 className="font-medium text-gray-900">
                  北海道で雪まつりを見る
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  2024年2月に札幌雪まつりを見てきました！感動的でした。
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full mr-2 bg-green-500"></div>
                  <span className="text-sm text-gray-500">
                    スキル習得・学習
                  </span>
                  <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    進行中
                  </span>
                </div>
                <h4 className="font-medium text-gray-900">TOEIC 800点を取る</h4>
                <p className="text-sm text-gray-600 mt-1">
                  現在730点。あと70点がんばります！
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full mr-2 bg-purple-500"></div>
                  <span className="text-sm text-gray-500">
                    体験・チャレンジ
                  </span>
                  <span className="ml-auto text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                    高
                  </span>
                </div>
                <h4 className="font-medium text-gray-900">
                  バンジージャンプに挑戦
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  今年の夏までに挑戦したい！
                </p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full mr-2 bg-orange-500"></div>
                  <span className="text-sm text-gray-500">創作・芸術</span>
                  <span className="ml-auto text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    未着手
                  </span>
                </div>
                <h4 className="font-medium text-gray-900">油絵を習う</h4>
                <p className="text-sm text-gray-600 mt-1">
                  退職後の趣味として始めたい
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA セクション */}
      <div className="py-16 bg-indigo-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            今すぐ始めて、人生を変えよう
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            無料で始められます。あなたの夢の実現をサポートします。
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="text-lg px-8 py-4 w-full sm:w-auto">
                無料アカウント作成
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-4 w-full sm:w-auto"
              >
                既にアカウントをお持ちの方
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
