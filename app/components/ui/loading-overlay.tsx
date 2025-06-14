import { cn } from "~/shared/utils";
import { Spinner } from "./spinner";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({ 
  isVisible, 
  message = "処理中...", 
  className 
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label="読み込み中"
    >
      <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center space-y-4 min-w-[200px]">
        <Spinner size="lg" />
        <p className="text-gray-700 text-center font-medium">{message}</p>
      </div>
    </div>
  );
}