import { Link } from "react-router";
import { MobileMenu } from "~/components/ui";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showNavigation?: boolean;
  navigationContent?: React.ReactNode;
}

export function AppLayout({
  children,
  title,
  showNavigation = true,
  navigationContent,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {showNavigation && (
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/">
                  <h1 className="text-xl font-semibold">死ぬまでにやること</h1>
                </Link>
              </div>
              {navigationContent && (
                <div className="flex items-center space-x-4">
                  {navigationContent}
                </div>
              )}
            </div>
          </div>
        </nav>
      )}

      <main className={`flex-1 ${showNavigation ? "" : "pt-0"}`}>
        {title && (
          <div className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>
          </div>
        )}
        {children}
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-500">
            <p>
              © 2025 stopod. Licensed under{" "}
              <a
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                MIT License
              </a>{" "}
              | 本ソフトウェアは「AS IS」で提供され、一切の保証はありません
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
