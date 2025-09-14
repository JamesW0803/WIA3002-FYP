import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Trash2, FileText, X, Plus } from "lucide-react";

const cls = (...arr) => arr.filter(Boolean).join(" ");

export default function AttachmentModal({
  open,
  items, // [{ file, previewUrl }]
  onItemsChange, // (nextItems) => void
  onCancel, // () => void
  onSend, // async (items, { group, caption }) => void
}) {
  const addInputRef = useRef(null);
  const replaceIndexRef = useRef(null);
  const replaceInputRef = useRef(null);

  const hasImages = useMemo(
    () => (items || []).some((it) => it.file?.type?.startsWith("image/")),
    [items]
  );
  const hasOnlyImages = useMemo(
    () =>
      (items || []).length > 0 &&
      (items || []).every((it) => it.file?.type?.startsWith("image/")),
    [items]
  );

  const headerLabel = useMemo(() => {
    const n = items?.length || 0;
    if (n === 0) return "No items";
    if (hasOnlyImages) return `${n} image${n > 1 ? "s" : ""} selected`;
    const onlyFiles =
      n > 0 &&
      (items || []).every((it) => !it.file?.type?.startsWith("image/"));
    if (onlyFiles) return `${n} file${n > 1 ? "s" : ""} selected`;
    return `${n} item${n > 1 ? "s" : ""} selected`;
  }, [items, hasOnlyImages]);

  // Controls: Group + single caption
  const [groupItems, setGroupItems] = useState(true);
  const [groupCaption, setGroupCaption] = useState("");

  useEffect(() => {
    if (open) {
      setGroupItems(true);
      setGroupCaption("");
    }
  }, [open]);

  // keyboard: Esc to cancel
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onCancel?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const canSend = (items && items.length > 0) || false;

  const doRemove = (i) => {
    const next = items.slice();
    const old = next[i];
    try {
      old?.previewUrl && URL.revokeObjectURL(old.previewUrl);
    } catch {}
    next.splice(i, 1);
    onItemsChange(next);
  };

  const doReplace = (i) => {
    replaceIndexRef.current = i;
    replaceInputRef.current?.click();
  };

  const onReplaceChosen = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const f = files[0];
    const i = replaceIndexRef.current ?? 0;
    const next = items.slice();
    const prev = next[i];
    try {
      prev?.previewUrl && URL.revokeObjectURL(prev.previewUrl);
    } catch {}
    next[i] = {
      file: f,
      previewUrl: f.type?.startsWith("image/") ? URL.createObjectURL(f) : null,
    };
    onItemsChange(next);
  };

  const doAdd = () => addInputRef.current?.click();

  const onAddChosen = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const appended = files.map((f) => ({
      file: f,
      previewUrl: f.type?.startsWith("image/") ? URL.createObjectURL(f) : null,
    }));
    onItemsChange([...(items || []), ...appended]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,94vw)] bg-white rounded-2xl shadow-2xl border border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="font-semibold">{headerLabel}</div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-gray-100"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Body: previews */}
        <div className="max-h-[58vh] overflow-y-auto p-5">
          {hasImages ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              {items.map((it, i) => {
                const isImage = it.file?.type?.startsWith("image/");
                return (
                  <div
                    key={i}
                    className={cls(
                      "relative rounded-lg overflow-hidden border bg-gray-50",
                      isImage ? "h-40" : "h-32"
                    )}
                  >
                    {isImage ? (
                      <img
                        src={it.previewUrl}
                        alt={it.file?.name || "image"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-white">
                        <FileText className="w-8 h-8 text-gray-400 mb-1" />
                        <div className="px-2 text-center text-xs text-gray-700 truncate w-full">
                          {it.file?.name || "File"}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {(it.file?.type || "application/octet-stream")
                            .split("/")
                            .pop()
                            .toUpperCase()}{" "}
                          {it.file?.size
                            ? `• ${Math.ceil(it.file.size / 1024)} KB`
                            : ""}
                        </div>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => doReplace(i)}
                        title="Replace"
                        className="p-1.5 rounded-md bg-white/90 hover:bg-white shadow border"
                      >
                        <RefreshCw className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => doRemove(i)}
                        title="Remove"
                        className="p-1.5 rounded-md bg-white/90 hover:bg-white shadow border"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2 mb-5">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border bg-gray-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white border flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-gray-800 truncate">
                        {it.file?.name || "File"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {it.file?.size
                          ? `${Math.ceil(it.file.size / 1024)} KB`
                          : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => doReplace(i)}
                      title="Replace"
                      className="p-2 rounded-md bg-white hover:bg-gray-50 border"
                    >
                      <RefreshCw className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      onClick={() => doRemove(i)}
                      title="Remove"
                      className="p-2 rounded-md bg-white hover:bg-gray-50 border"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Controls: Add + Group + single caption */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={doAdd}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
              <input
                ref={addInputRef}
                type="file"
                multiple
                onChange={onAddChosen}
                className="hidden"
              />
              <input
                ref={replaceInputRef}
                type="file"
                onChange={onReplaceChosen}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={groupItems}
                  onChange={(e) => setGroupItems(e.target.checked)}
                />
                <span>Group items</span>
              </label>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-700 mb-1">Caption</div>
            <input
              value={groupCaption}
              onChange={(e) => setGroupCaption(e.target.value.slice(0, 2000))}
              placeholder="Caption (optional)"
              className="w-full border rounded-xl px-3 py-2 text-sm"
            />
            <div className="mt-1 text-[11px] text-gray-400">
              {groupCaption.length}/2000
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSend(items, { group: groupItems, caption: groupCaption })
            }
            disabled={!canSend}
            className={cls(
              "px-4 py-2 rounded-lg text-white",
              canSend
                ? "bg-brand hover:bg-brand/90"
                : "bg-gray-300 cursor-not-allowed"
            )}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
