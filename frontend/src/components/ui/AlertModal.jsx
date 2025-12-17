import React from "react";
import { Button } from "./button"; // adjust path if needed

const AlertModal = ({
  open,
  title = "Notice",
  message = "",
  onClose,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",

  // UI behavior
  disableClose = false,
  isLoading = false,
}) => {
  if (!open) return null;

  const isConfirmMode = typeof onConfirm === "function";

  const handleBackdropClick = () => {
    if (disableClose) return;
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>

        <div className="p-5">
          {typeof message === "string" ? (
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {message}
            </p>
          ) : (
            message
          )}
        </div>

        <div className="p-5 pt-0 flex justify-end gap-2">
          {isConfirmMode ? (
            <>
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isLoading || disableClose}
              >
                {cancelText}
              </Button>

              <Button
                className="bg-[#1E3A8A] text-white"
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? "Please wait..." : confirmText}
              </Button>
            </>
          ) : (
            <Button
              className="bg-[#1E3A8A] text-white"
              onClick={onClose}
              disabled={isLoading || disableClose}
            >
              OK
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
