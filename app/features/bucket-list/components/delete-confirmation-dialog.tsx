import { Button } from "~/components/ui/button";
import { LoadingOverlay } from "~/components/ui";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemTitle: string;
  isSubmitting?: boolean;
}

export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  itemTitle,
  isSubmitting = false
}: DeleteConfirmationDialogProps) {
  if (!isOpen) return null;

  // ESCキーでダイアログを閉じる
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting) {
      onClose();
    }
  };

  return (
    <>
      <LoadingOverlay 
        isVisible={isSubmitting} 
        message="削除中..."
      />
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60"
        onClick={!isSubmitting ? onClose : undefined}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div 
          className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              項目を削除しますか？
            </h3>
            <p className="text-gray-600">
              「<span className="font-medium">{itemTitle}</span>」を削除します。
            </p>
            <p className="text-sm text-red-600 mt-2">
              ※ この操作は取り消すことができません。
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? "削除中..." : "削除する"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}