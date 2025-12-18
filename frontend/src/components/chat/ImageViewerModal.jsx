import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  MoreVertical,
  Download,
  CornerUpLeft,
  MoveRight,
} from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");

export default function ImageViewerModal({
  open,
  items, // [{ url, name, caption, message, createdAt, sender, idxInMessage, originalUrl, originalName }]
  index,
  onClose,
  onPrev,
  onNext,
  onGoToMessage, // (messageId) => void
  onReplyImage, // (messageObj, idxInMessage) => void
}) {
  const current = open ? items?.[index] : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowLeft") onPrev?.();
      if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onPrev, onNext, onClose]);

  useEffect(() => {
    if (!open || !items?.length) return;
    const preload = (i) => {
      const it = items[i];
      if (!it) return;
      const img = new Image();
      img.src = it.originalUrl || it.url;
    };
    preload(index - 1);
    preload(index + 1);
  }, [open, items, index]);

  const [menuOpen, setMenuOpen] = useState(false);
  const hideTimer = useRef(null);
  const CLOSE_DELAY = 220;

  const openMenu = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setMenuOpen(true);
  };
  const scheduleClose = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setMenuOpen(false), CLOSE_DELAY);
  };

  useEffect(() => {
    return () => hideTimer.current && clearTimeout(hideTimer.current);
  }, []);

  if (!open || !current) return null;

  const pos = `${index + 1} / ${items.length}`;
  const when =
    new Date(current.createdAt).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) || "";

  async function downloadUrl(url, name = "image") {
    try {
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      a.remove();
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  const canGoToMessage = !!(current?.message?._id || current?.messageId);

  return (
    <div className="fixed inset-0 z-[200] bg-black">
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-30 h-16 px-4 flex items-center justify-between text-white">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">
            {current.name || current.originalName || "Image"}{" "}
            <span className="text-white/60 text-xs ml-2">{pos}</span>
          </div>
          <div className="text-xs text-white/60 truncate">{when}</div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="relative"
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          >
            <button
              className="p-2 rounded-lg hover:bg-white/10"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More"
              type="button"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white text-gray-900 rounded-xl shadow-lg border overflow-hidden">
                <MenuItem
                  onClick={() =>
                    downloadUrl(
                      current.originalUrl || current.url,
                      current.name || "image"
                    )
                  }
                  icon={<Download className="w-4 h-4" />}
                  label="Save As…"
                />

                <MenuItem
                  onClick={() => {
                    const msgId = current?.message?._id || current?.messageId;
                    if (msgId) onGoToMessage?.(msgId);
                  }}
                  icon={<MoveRight className="w-4 h-4" />}
                  label="Go to message"
                  danger={false}
                  disabled={!canGoToMessage}
                />

                <MenuItem
                  onClick={() => {
                    if (current?.message) {
                      onReplyImage?.(
                        current.message,
                        current.idxInMessage ?? 0
                      );
                    }
                  }}
                  icon={<CornerUpLeft className="w-4 h-4" />}
                  label="Reply to this image"
                  disabled={!current?.message}
                />
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10"
            aria-label="Close"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="absolute inset-0 z-20 flex items-center justify-center p-6 pointer-events-none">
        {items.length > 1 && (
          <button
            onClick={onPrev}
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white pointer-events-auto"
            title="Previous"
            type="button"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}

        <div className="max-w-[92vw] max-h-[82vh] select-none pointer-events-auto">
          <img
            src={current.originalUrl || current.url}
            alt={current.name || "image"}
            className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl"
            draggable={false}
          />

          {(current.caption || current.message?.text) && (
            <div className="mt-3 text-center text-white/90 text-sm">
              {current.caption && (
                <div className="whitespace-pre-wrap">{current.caption}</div>
              )}
              {current.message?.text && (
                <div className={cls(current.caption && "mt-2", "opacity-90")}>
                  {current.message.text}
                </div>
              )}
            </div>
          )}
        </div>

        {items.length > 1 && (
          <button
            onClick={onNext}
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white pointer-events-auto"
            title="Next"
            type="button"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        )}
      </div>
    </div>
  );
}

function MenuItem({ onClick, icon, label, danger, disabled }) {
  const clsx = (...a) => a.filter(Boolean).join(" ");
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      className={clsx(
        "flex items-center gap-2 w-full px-3 py-2 text-left text-sm",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100",
        danger ? "text-red-600" : "text-gray-800"
      )}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
