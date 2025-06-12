import { Link } from "react-router";

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
    <div className="min-h-screen bg-gray-50">
      {showNavigation && (
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/">
                  <h1 className="text-xl font-semibold">人生でやりたいこと</h1>
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

      <main className={showNavigation ? "" : "pt-0"}>
        {title && (
          <div className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
