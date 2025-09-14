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
      className={`fixed left-4 bottom-4 z-50 border-l-4 p-4 rounded-lg shadow-lg max-w-xs transition-all duration-300 ${bgColor} animate-slideIn`}
    >
      <div className="flex justify-between items-start">
        <p className="text-sm">{message}</p>
        <button
          onClick={onClose}
          className="ml-2 hover:opacity-75 text-lg font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Notification;
