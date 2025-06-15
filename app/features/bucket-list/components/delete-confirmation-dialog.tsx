import React from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui";
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
  isSubmitting = false,
}: DeleteConfirmationDialogProps) {
  return (
    <>
      <LoadingOverlay isVisible={isSubmitting} message="削除中..." />
      <Dialog open={isOpen} onOpenChange={!isSubmitting ? onClose : undefined}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>項目を削除しますか？</DialogTitle>
            <DialogDescription>
              「<span className="font-medium">{itemTitle}</span>」を削除します。
              <br />
              <span className="text-red-600">
                ※ この操作は取り消すことができません。
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
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
              variant="destructive"
              onClick={onConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
