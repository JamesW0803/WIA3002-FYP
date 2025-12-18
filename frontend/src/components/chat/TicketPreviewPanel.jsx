import React, { useEffect, useMemo, useState } from "react";
import { Paperclip } from "lucide-react";

export default function TicketPreviewPanel({
  initialPlan = null, // { planId, planName } | null
  category = "Academic Plan Review",
  submitting = false,
  onCancel,
  onSubmit, // async ({ message, plan }) => void
}) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage("");
  }, [initialPlan?.planId]);

  const plan = useMemo(() => initialPlan, [initialPlan]);

  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm">
      <div className="font-semibold text-lg">Create ticket</div>
      <div className="text-sm text-gray-500 mt-1">
        Preview what will be sent before submitting.
      </div>

      <div className="mt-4 rounded-xl border bg-gray-50 p-4">
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
            No plan selected. You can still submit a ticket, but it will not
            attach a plan.
          </div>
        )}
      </div>

      <div className="mt-4">
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

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          onClick={() => !submitting && onCancel?.()}
          className="px-4 py-2 rounded-lg border hover:bg-gray-50 disabled:opacity-60"
          disabled={submitting}
          type="button"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit?.({ message, plan })}
          className="px-4 py-2 rounded-lg bg-brand text-white hover:opacity-95 disabled:opacity-60"
          disabled={submitting}
          type="button"
        >
          {submitting ? "Submitting..." : "Submit ticket"}
        </button>
      </div>
    </div>
  );
}
