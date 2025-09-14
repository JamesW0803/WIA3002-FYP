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
  items, // [{ url, name, caption, message, createdAt, sender, idxInMessage }]
  index, // number
  onClose,
  onPrev,
  onNext,
  onGoToMessage, // (messageId) => void
  onReplyImage, // (messageObj, idxInMessage) => void
}) {
  const current = open ? items[index] : null;

  // Keyboard: Esc/←/→
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

  // Preload neighbors
  useEffect(() => {
    if (!open || !items?.length) return;
    const preload = (i) => {
      const it = items[i];
      if (!it) return;
      const img = new Image();
      img.src = it.url;
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
      window.open(url, "_blank", "noopener");
    }
  }

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 z-0"
        onClick={onClose}
        aria-hidden
      />
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between text-white pointer-events-auto">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="truncate">
            <div className="font-semibold truncate">
              {current?.sender?.username || "User"}
            </div>
            <div className="text-xs opacity-80">{when}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm opacity-80">{pos}</div>

          {/* Hover menu */}
          <div className="relative inline-block">
            <button
              className="p-2 rounded-full hover:bg-white/10"
              title="More"
              onMouseEnter={openMenu}
              onMouseLeave={scheduleClose}
              onFocus={openMenu}
              onBlur={scheduleClose}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="w-5 h-5 text-white" />
            </button>

            {/* Optional: a tiny invisible bridge so there's no gap between button and menu */}
            <div
              className="absolute right-0 top-full h-2 w-48"
              onMouseEnter={openMenu}
              onMouseLeave={scheduleClose}
              aria-hidden
            />

            <div
              role="menu"
              onMouseEnter={openMenu}
              onMouseLeave={scheduleClose}
              className={cls(
                "absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur border border-white/20 z-40",
                "rounded-xl shadow-lg overflow-hidden transition-opacity duration-150",
                menuOpen ? "opacity-100 visible" : "opacity-0 invisible"
              )}
            >
              <MenuItem
                onClick={() =>
                  onGoToMessage?.(current.message?._id, current.idxInMessage)
                }
                icon={<MoveRight className="w-4 h-4" />}
                label="Go To Message"
              />
              <MenuItem
                onClick={() =>
                  onReplyImage?.(current.message, current.idxInMessage)
                }
                icon={<CornerUpLeft className="w-4 h-4" />}
                label="Reply to this image"
              />
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
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="absolute inset-0 z-20 flex items-center justify-center p-6 pointer-events-none">
        {/* Prev */}
        {items.length > 1 && (
          <button
            onClick={onPrev}
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white pointer-events-auto"
            title="Previous"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}

        {/* Image */}
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

        {/* Next */}
        {items.length > 1 && (
          <button
            onClick={onNext}
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white pointer-events-auto"
            title="Next"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        )}
      </div>
    </div>
  );
}

function MenuItem({ onClick, icon, label, danger }) {
  return (
    <button
      onClick={onClick}
      className={cls(
        "flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-100",
        danger ? "text-red-600" : "text-gray-800"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
