import { motion, AnimatePresence } from "framer-motion";
import {
  CornerUpLeft,
  User,
  File,
  Paperclip,
  FileText,
  Image,
  Download,
  ExternalLink,
} from "lucide-react";

const cls = (...arr) => arr.filter(Boolean).join(" ");

const timeHHMM = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function MessageGroup({
  mine,
  messages,
  onReply,
  onJumpTo,
  onOpenImage,
  onOpenPlan,
}) {
  return (
    <div
      className={cls(
        "mb-4 flex w-full",
        mine ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cls(
          "max-w-2xl space-y-2",
          mine && "items-end flex flex-col"
        )}
      >
        {messages.map((m) => {
          const atts = Array.isArray(m.attachments) ? m.attachments : [];
          const hasPlanAttachment = atts.some(
            (a) => a.type === "academic-plan" && a.planId
          );
          const isPlanOnly = hasPlanAttachment && atts.length === 1 && !m.text;

          const hasContent = m.text || atts.length > 0;

          const widthClass = isPlanOnly ? "w-full" : "w-fit";

          return (
            <motion.div
              key={m._id ? `id:${m._id}` : `cid:${m.clientId}`}
              id={m._id ? `msg-${m._id}` : undefined}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              exit={{ opacity: 0 }}
              className={cls("relative group", "cv-auto")}
            >
              {/* Reply button */}
              {onReply && (
                <button
                  title="Reply"
                  onClick={() => m._id && onReply(m)}
                  className={cls(
                    "hidden sm:flex items-center justify-center",
                    "absolute -top-3 z-20 transition-all duration-200",
                    "w-6 h-6 rounded-full shadow-md",
                    mine
                      ? "-left-2 bg-brand/80 text-white hover:bg-brand/50"
                      : "-right-2 bg-white text-gray-600 hover:bg-gray-100 border border-gray-200",
                    "opacity-0 group-hover:opacity-100"
                  )}
                >
                  <CornerUpLeft className="w-3 h-3" />
                </button>
              )}
              {/* Bubble */}
              <div
                className={cls(
                  widthClass,
                  "max-w-[min(400px,90vw)] px-4 py-3 rounded-2xl text-sm overflow-hidden min-h-[44px] break-words",
                  mine
                    ? "bg-brand/90 text-white rounded-br-md"
                    : "bg-white border border-gray-200 rounded-bl-md shadow-sm"
                )}
              >
                {/* Reply preview */}
                {!!m.replyTo && (
                  <div
                    className={cls(
                      "mb-2 px-3 py-2 rounded-lg border-l-4 text-xs cursor-pointer transition-colors",
                      mine
                        ? "bg-white/10 border-white/30 hover:bg-white/15"
                        : "bg-brand/5 border-brand/20 hover:bg-brand/10"
                    )}
                    onClick={() =>
                      m.replyTo?._id &&
                      onJumpTo?.(m.replyTo._id, m.replyToAttachment ?? null)
                    }
                  >
                    <div
                      className={cls(
                        "flex items-center gap-2 font-semibold mb-1",
                        mine ? "text-white" : "text-brand"
                      )}
                    >
                      <User className="w-3 h-3" />
                      {m.replyTo?.sender?.username || "Message"}
                    </div>
                    {Number.isInteger(m.replyToAttachment) &&
                    Array.isArray(m.replyTo?.attachments) &&
                    m.replyTo.attachments[
                      m.replyToAttachment
                    ]?.mimeType?.startsWith("image/") ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={m.replyTo.attachments[m.replyToAttachment].url}
                          alt="thumbnail"
                          className="w-10 h-10 object-cover rounded border"
                        />
                        <div
                          className={cls(
                            mine ? "text-white/90" : "text-gray-700"
                          )}
                        >
                          {m.replyTo.attachments[m.replyToAttachment].caption ||
                            "Image"}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cls(
                          "truncate text-left",
                          mine ? "text-white/90" : "text-gray-700"
                        )}
                      >
                        {m.replyTo.text ? (
                          m.replyTo.text
                        ) : Array.isArray(m.replyTo.attachments) &&
                          m.replyTo.attachments.length ? (
                          <span className="inline-flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            {m.replyTo.attachments.length} attachment
                            {m.replyTo.attachments.length > 1 ? "s" : ""}
                          </span>
                        ) : (
                          "No content"
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments */}
                {atts.length > 0 && (
                  <div
                    className={cls(
                      "grid gap-2 mb-2 w-full",
                      atts.some((a) => a.mimeType?.startsWith("image/"))
                        ? "grid-cols-1 sm:grid-cols-2"
                        : "grid-cols-1"
                    )}
                  >
                    {atts.map((a, i) => {
                      const isImg = a.mimeType?.startsWith("image/");
                      const isPlan = a.type === "plan" && a.planId;

                      if (isImg) {
                        return (
                          <motion.button
                            type="button"
                            key={i}
                            id={`msg-${m._id}-img-${i}`}
                            onClick={() => onOpenImage?.(m, i)}
                            className="block text-left rounded-lg overflow-hidden border border-gray-200 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-brand transition-all duration-200 hover:shadow-md"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="relative">
                              <img
                                src={a.url}
                                alt={a.name}
                                className="w-full h-48 object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                <Image className="w-3 h-3 inline mr-1" />
                                Image
                              </div>
                            </div>
                            {a.caption && (
                              <div className="px-3 py-2 text-xs text-gray-700 bg-white border-t">
                                {a.caption}
                              </div>
                            )}
                          </motion.button>
                        );
                      }

                      if (isPlan) {
                        const hasJson = !!a.url;
                        console.log("is plan" )
                        return (
                          <div
                            key={i}
                            className="w-full rounded-2xl overflow-hidden"
                          >
                            <div
                              className={cls(
                                "flex items-center justify-between gap-3 px-4 py-3 rounded-2xl",
                                // solid blue strip like your second screenshot
                                "bg-brand"
                              )}
                            >
                              {/* Left: icon + plan name */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-white" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-white truncate">
                                    {a.planName || "Academic plan"}
                                  </div>
                                  <div className="text-xs text-white/70">
                                    Academic plan
                                  </div>
                                </div>
                              </div>

                              {/* Right: actions */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onOpenPlan?.(a)}
                                  className="px-3 py-1.5 rounded-full bg-white text-brand text-xs font-semibold hover:bg-gray-100"
                                >
                                  View
                                </button>

                                {hasJson && (
                                  <a
                                    href={a.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-white/80 underline"
                                  >
                                    JSON
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <motion.a
                          key={i}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className={cls(
                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full group",
                            mine
                              ? "bg-brand/90 hover:bg-brand text-white"
                              : "bg-gray-100 hover:bg-gray-200 border border-gray-200"
                          )}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <FileText className="w-5 h-5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div
                              className={cls(
                                "font-medium truncate text-sm",
                                mine ? "text-white" : "text-gray-800"
                              )}
                            >
                              {a.name || "File"}
                            </div>
                            <div
                              className={cls(
                                "text-xs opacity-70",
                                mine ? "text-white/80" : "text-gray-600"
                              )}
                            >
                              {a.size ? Math.ceil(a.size / 1024) + " KB" : ""}
                            </div>
                            {a.caption && (
                              <div
                                className={cls(
                                  "mt-1 text-xs truncate",
                                  mine ? "text-white/90" : "text-gray-700"
                                )}
                              >
                                {a.caption}
                              </div>
                            )}
                          </div>
                          <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                        </motion.a>
                      );
                    })}
                  </div>
                )}

                {/* Text */}
                {m.text && (
                  <div className="whitespace-pre-wrap leading-relaxed break-words">
                    {m.text}
                  </div>
                )}

                {/* Timestamp */}
                {hasContent && (
                  <div
                    className={cls(
                      "text-xs mt-1 opacity-70",
                      mine ? "text-white/80" : "text-gray-500"
                    )}
                  >
                    {timeHHMM(m.createdAt)}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default MessageGroup;
