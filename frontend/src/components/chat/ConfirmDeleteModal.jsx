import { useState } from "react";

export default function ConfirmDeleteModal({
  open,
  role = "student", // "student" | "admin"
  onClose,
  onConfirm,
}) {
  const [alsoDelete, setAlsoDelete] = useState(false);
  if (!open) return null;

  const otherLabel =
    role === "admin" ? "Also delete for Student" : "Also delete for Admin";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl p-5">
        <h3 className="text-lg font-semibold mb-2">Delete conversation?</h3>
        <p className="text-sm text-gray-600 mb-4">
          Do you want to delete this conversation?
        </p>

        <label className="flex items-center gap-2 text-sm mb-4 select-none">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={alsoDelete}
            onChange={(e) => setAlsoDelete(e.target.checked)}
          />
          <span>{otherLabel}</span>
        </label>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(alsoDelete);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
