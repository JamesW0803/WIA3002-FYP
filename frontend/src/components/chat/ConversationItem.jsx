import { CheckCircle, MessageCircle } from "lucide-react";

const cls = (...arr) => arr.filter(Boolean).join(" ");

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";

const relativeTime = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dd = Math.floor(h / 24);
  return `${dd}d`;
};

function ConversationItem({
  convo,
  active,
  onClick,
  unread = 0,
  loading = false,
}) {
  const avatarBg = convo.student?.profileColor || "#1E3A8A";
  const lastMessage = convo.lastMessage?.text || "No messages yet";
  const truncatedMessage =
    lastMessage.length > 40
      ? lastMessage.substring(0, 40) + "..."
      : lastMessage;

  if (loading) {
    return (
      <div className="w-full p-4 rounded-xl border border-gray-200 bg-white animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200" />
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
          <div className="w-8 h-3 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cls(
        "w-full p-4 rounded-xl text-left transition-all duration-200 group",
        "border hover:border-brand hover:shadow-sm",
        active
          ? "border-brand bg-brand/5 shadow-sm ring-2 ring-brand/20"
          : "border-gray-200 bg-white",
        "hover:bg-brand/3 transform hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar with status indicator */}
        <div className="relative">
          {convo.student?.profilePicture ? (
            <img
              src={convo.student.profilePicture}
              alt=""
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium border-2 border-white shadow-sm"
              style={{ backgroundColor: avatarBg }}
            >
              {initials(convo.student?.username || "Student")}
            </div>
          )}
          {/* Online status indicator */}
          <div
            className={cls(
              "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
              convo.status === "open" ? "bg-green-500" : "bg-gray-300"
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-sm font-semibold text-gray-800 truncate">
              {convo.student?.username || "Advisor Team"}
            </div>
            {convo.status === "done" && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Resolved
              </span>
            )}
          </div>

          <div className="text-sm text-gray-600 truncate flex items-center gap-1">
            {convo.lastMessage ? (
              <>
                <MessageCircle className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="truncate">{truncatedMessage}</span>
              </>
            ) : (
              <span className="text-gray-400 italic">Start a conversation</span>
            )}
          </div>
        </div>

        {/* Right side info */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {relativeTime(convo.updatedAt || convo.createdAt)}
          </span>
          {unread > 0 && (
            <span className="min-w-[22px] h-6 px-2 rounded-full bg-brand text-white text-xs font-semibold flex items-center justify-center shadow-sm transform group-hover:scale-110 transition-transform">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default ConversationItem;
