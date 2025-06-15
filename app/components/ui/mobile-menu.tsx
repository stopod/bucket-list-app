import { useState } from "react";
import { Link } from "react-router";
import { Button } from "./button";

interface MobileMenuProps {
  user?: {
    email?: string;
  } | null;
  onSignOut: () => void;
  isSigningOut: boolean;
}

export function MobileMenu({ user, onSignOut, isSigningOut }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* ハンバーガーメニューボタン */}
      <button
        onClick={toggleMenu}
        className="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="メニューを開く"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={
              isOpen
                ? "M6 18L18 6M6 6l12 12" // X アイコン
                : "M4 6h16M4 12h16M4 18h16" // ハンバーガーアイコン
            }
          />
        </svg>
      </button>

      {/* オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMenu}
        />
      )}

      {/* スライドアウトメニュー */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">メニュー</h2>
            <button
              onClick={closeMenu}
              className="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              aria-label="メニューを閉じる"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* ユーザー情報 */}
          {user && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">ログイン中</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.email}
              </p>
            </div>
          )}

          {/* ナビゲーションリンク */}
          <nav className="flex-1 p-4 space-y-2">
            <Link
              to="/dashboard"
              onClick={closeMenu}
              className="flex items-center px-4 py-3 text-base font-medium text-gray-700 rounded-md hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <svg
                className="mr-3 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              ダッシュボード
            </Link>

            <Link
              to="/bucket-list"
              onClick={closeMenu}
              className="flex items-center px-4 py-3 text-base font-medium text-gray-700 rounded-md hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <svg
                className="mr-3 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              やりたいこと一覧
            </Link>

            <Link
              to="/public"
              onClick={closeMenu}
              className="flex items-center px-4 py-3 text-base font-medium text-gray-700 rounded-md hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <svg
                className="mr-3 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              みんなのやりたいこと
            </Link>
          </nav>

          {/* ログアウトボタン */}
          <div className="p-4 border-t border-gray-200">
            <Button
              onClick={() => {
                closeMenu();
                onSignOut();
              }}
              variant="outline"
              className="w-full"
              disabled={isSigningOut}
            >
              {isSigningOut ? "ログアウト中..." : "ログアウト"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
