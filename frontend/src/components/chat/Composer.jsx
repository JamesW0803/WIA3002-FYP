import { useState, useRef, useEffect } from "react";
import useChatStore from "../../stores/useChatStore";
import { Send, Paperclip, X, CornerUpLeft } from "lucide-react";
import AttachmentModal from "./AttachmentModal";
import { compressImage } from "../../utils/compressImage";
import { motion } from "framer-motion";

const cls = (...arr) => arr.filter(Boolean).join(" ");

function Composer({ disabled, onSendWithAttachments, draftMode = false }) {
  const [value, setValue] = useState("");
  const [staged, setStaged] = useState([]);
  const [showAttach, setShowAttach] = useState(false);

  const textRef = useRef(null);
  const { getUploadUrl, putToAzure, replyTo, clearReplyTo } = useChatStore();
  const wasDraftRef = useRef(draftMode);

  useEffect(() => {
    if (!textRef.current) return;
    textRef.current.style.height = "auto";
    textRef.current.style.height =
      Math.min(textRef.current.scrollHeight, 140) + "px";
  }, [value]);

  useEffect(() => {
    if (wasDraftRef.current && !draftMode) {
      setValue("");
      cleanupPreviews(staged);
      setStaged([]);
      setShowAttach(false);
    }
    wasDraftRef.current = draftMode;
  }, [draftMode]);

  useEffect(() => {
    if (!replyTo || disabled) return;
    // Let the reply chip render first, then focus + move caret to end
    requestAnimationFrame(() => {
      const el = textRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {}
    });
  }, [replyTo, disabled]);

  const pickFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";
    if (!selected.length) return;
    const prepared = selected.map((f) => ({
      file: f,
      caption: "",
      previewUrl: f.type?.startsWith("image/") ? URL.createObjectURL(f) : null,
    }));
    setStaged((prev) => [...prev, ...prepared]);
    setShowAttach(true);
  };

  const cleanupPreviews = (items) => {
    try {
      for (const it of items || []) {
        if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
      }
    } catch {}
  };

  const doSend = async () => {
    if (disabled) return;
    if (!value.trim() && staged.length === 0) return;

    if (staged.length > 0) {
      setShowAttach(true);
      return;
    }
    await onSendWithAttachments(value, []);
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  const sendStaged = async (items, opts = { group: true, caption: "" }) => {
    if (disabled || !items?.length) return;

    const uploadOne = async (f, caption = "") => {
      const isImg = f.type?.startsWith("image/");
      // 1) ALWAYS upload the original as-is
      const { uploadUrl: upOrig, blobUrl: originalUrl } = await getUploadUrl({
        filename: f.name,
        mimeType: f.type || "application/octet-stream",
      });
      await putToAzure({ uploadUrl: upOrig, file: f });
      // 2) Try to create a smaller preview for fast chat rendering
      let previewFile = f;
      let width = null,
        height = null,
        wasCompressed = false;
      if (isImg) {
        try {
          const c = await compressImage(f, {
            maxWidth: 1600,
            maxHeight: 1600,
            maxSizeKB: 450,
            initialQuality: 0.82,
            minQuality: 0.58,
            preferType: "image/webp",
          });
          if (c?.wasCompressed && c?.file) {
            previewFile = c.file;
            width = c.width;
            height = c.height;
            wasCompressed = true;
          }
        } catch (err) {
          console.warn("Image compression failed:", err);
        }
      }
      // 3) Upload preview only if different from original; else reuse original
      let url = originalUrl;
      let mimeType = f.type || "application/octet-stream";
      let size = f.size;
      if (wasCompressed) {
        const { uploadUrl: upPrev, blobUrl: previewUrl } = await getUploadUrl({
          filename: previewFile.name,
          mimeType: previewFile.type || "application/octet-stream",
        });
        await putToAzure({ uploadUrl: upPrev, file: previewFile });
        url = previewUrl;
        mimeType = previewFile.type || mimeType;
        size = previewFile.size;
      }

      return {
        // what chat renders:
        url,
        name: f.name, // keep the original filename visible
        mimeType,
        size,
        caption: caption || "",
        width,
        height,
        // original (used by viewer/download):
        originalUrl,
        originalName: f.name,
        originalMimeType: f.type || "application/octet-stream",
        originalSize: f.size,
      };
    };

    const isImage = (f) => f?.type?.startsWith("image/");
    const onlyImages = items.every((it) => isImage(it.file));
    const caption = (opts.caption || "").trim();

    if (opts.group) {
      const attachments = [];
      for (const it of items) {
        attachments.push(await uploadOne(it.file, "")); // no per-item captions when grouped
      }

      if (onlyImages) {
        // gallery + caption under it (in same bubble because caption is m.text)
        await onSendWithAttachments(caption, attachments);
      } else {
        // caption first (own bubble), then files (no captions)
        if (caption) await onSendWithAttachments(caption, []);
        await onSendWithAttachments("", attachments);
      }
    } else {
      for (let i = 0; i < items.length; i++) {
        const isLast = i === items.length - 1;
        const att = await uploadOne(items[i].file, isLast ? caption : "");
        await onSendWithAttachments("", [att]);
      }
    }

    cleanupPreviews(items);
    setStaged([]);
    setShowAttach(false);
  };

  return (
    <div className="border-t bg-white p-4">
      {/* Attachment Modal */}
      <AttachmentModal
        open={showAttach}
        items={staged}
        onItemsChange={(next) => setStaged(next)}
        onCancel={() => {
          cleanupPreviews(staged);
          setStaged([]);
          setShowAttach(false);
        }}
        onSend={sendStaged}
      />
      {/* Reply chip */}
      {replyTo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-3 px-4 py-3 rounded-lg border bg-brand/5 border-brand/20 text-sm flex items-start gap-3"
        >
          <div className="flex-1 overflow-hidden">
            <div className="font-semibold text-brand flex items-center gap-2">
              <CornerUpLeft className="w-4 h-4" />
              Replying to {replyTo?.sender?.username || "message"}
            </div>

            {/* Enhanced reply preview */}
            {Number.isInteger(replyTo.__imageIndex) &&
            Array.isArray(replyTo.attachments) &&
            replyTo.attachments[replyTo.__imageIndex]?.mimeType?.startsWith(
              "image/"
            ) ? (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={replyTo.attachments[replyTo.__imageIndex].url}
                  alt="thumbnail"
                  className="w-10 h-10 object-cover rounded border"
                />
                <div className="truncate text-gray-700">
                  {replyTo.attachments[replyTo.__imageIndex].caption || "Image"}
                </div>
              </div>
            ) : (
              <div className="text-gray-700 truncate mt-1 text-sm">
                {replyTo.text ||
                  (Array.isArray(replyTo.attachments) &&
                  replyTo.attachments.length
                    ? `📎 ${replyTo.attachments.length} attachment${
                        replyTo.attachments.length > 1 ? "s" : ""
                      }`
                    : "No content")}
              </div>
            )}
          </div>

          <button
            onClick={clearReplyTo}
            className="shrink-0 self-center inline-flex items-center justify-center rounded-full p-1 hover:bg-brand/10 text-brand transition-colors"
            title="Cancel reply"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}
      <div className="flex items-center gap-3">
        <label
          title="Attach files"
          className={cls(
            "cursor-pointer shrink-0 inline-flex items-center justify-center rounded-xl",
            "w-11 h-11 sm:w-12 sm:h-12",
            "bg-gray-100 hover:bg-gray-200 transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Paperclip className="w-5 h-5" />
          <input
            type="file"
            multiple
            disabled={disabled}
            onChange={pickFiles}
            className="hidden"
          />
        </label>

        <div className="flex-1 relative mt-0.5 sm:mt-2">
          <textarea
            ref={textRef}
            rows={1}
            disabled={disabled}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled
                ? "Select a conversation to message"
                : staged.length
                ? "You have files staged. Click Send to open the modal."
                : "Type your message..."
            }
            className={cls(
              "w-full resize-none border border-gray-300 rounded-xl px-4 py-3.5 pr-12",
              "min-h-[44px] sm:min-h-[48px] leading-5",
              "focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent",
              "overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              disabled ? "bg-gray-100" : "bg-white"
            )}
          />
          {value && (
            <div className="absolute right-3 bottom-2 text-xs text-gray-400">
              {value.length}/2000
            </div>
          )}
        </div>

        <button
          onClick={doSend}
          disabled={disabled || (!value.trim() && staged.length === 0)}
          className={cls(
            "shrink-0 inline-flex items-center justify-center rounded-xl",
            "w-11 h-11 sm:w-12 sm:h-12",
            "transition-all duration-200 transform hover:scale-105 active:scale-95",
            disabled || (!value.trim() && staged.length === 0)
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-brand text-white hover:bg-brand/90 shadow-md"
          )}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default Composer;
