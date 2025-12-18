import React, { useEffect, useMemo, useState } from "react";
import { X, Paperclip } from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");

export default function TicketPreviewModal({
  open,
  onClose,
  onSubmit, // async ({ message, plan }) => void
  initialPlan = null, // { planId, planName } | null
  category = "Academic Plan Review",
  submitting = false,
}) {
  const [message, setMessage] = useState("");

  // Reset message every time it opens, so it feels “fresh”
  useEffect(() => {
    if (open) setMessage("");
  }, [open]);

  const plan = useMemo(() => initialPlan, [initialPlan]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !submitting && onClose?.()}
      />

      {/* Modal */}
      <div className="absolute left-1/2 top-1/2 w-[94%] max-w-[720px] -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl border overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="font-semibold">Preview ticket before submitting</div>
          <button
            onClick={() => !submitting && onClose?.()}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Close"
            disabled={submitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border bg-gray-50 p-4">
            <div className="text-sm font-medium">What will be sent</div>

            <div className="mt-2 text-sm text-gray-700 space-y-2">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Category</span>
                <span className="font-medium">{category}</span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Attachment</span>
                <span className="inline-flex items-center gap-2 font-medium">
                  <Paperclip className="w-4 h-4" />
                  {plan?.planName || "No plan selected"}
                </span>
              </div>
            </div>

            {!plan?.planId && (
              <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                No plan was passed in. You can still submit a ticket, but it
                will not attach a plan.
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">
              Message to advisor (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-2 w-full min-h-[120px] border rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand"
              placeholder="Example: Please check prerequisites and whether my workload is balanced."
              disabled={submitting}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => !submitting && onClose?.()}
              className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit?.({ message, plan })}
              className="px-4 py-2 rounded-lg bg-brand text-white hover:opacity-95 disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit ticket"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
