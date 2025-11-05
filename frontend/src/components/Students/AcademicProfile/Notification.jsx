import React, { useEffect } from "react";

const Notification = ({
  title,
  message,
  type = "info",
  isClosing,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === "success"
      ? "bg-green-50 border-green-400 text-green-700"
      : type === "error"
      ? "bg-red-50 border-red-400 text-red-700"
      : "bg-blue-50 border-blue-400 text-blue-700";

  return (
    <div
      className={`fixed z-50 left-4 right-4 sm:left-auto sm:right-4 bottom-[env(safe-area-inset-bottom,16px)]
      border-l-4 p-3 sm:p-4 rounded-lg shadow-lg max-w-md sm:max-w-xs
      ${bgColor} transition-all duration-300 animate-slideIn`}
      role="status"
      aria-live="polite"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          {title && <p className="text-sm font-semibold mb-0.5">{title}</p>}
          <p className="text-sm break-words">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 hover:opacity-75 text-lg font-bold leading-none"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Notification;
