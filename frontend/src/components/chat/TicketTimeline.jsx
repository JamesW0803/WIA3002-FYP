import React, { useMemo } from "react";
import { ThumbsUp, User } from "lucide-react";

const cls = (...a) => a.filter(Boolean).join(" ");

function formatDayLabel(dateIso) {
  const d = new Date(dateIso);
  // dd/mm/yyyy like your screenshot
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function groupByDay(messages) {
  const map = new Map();
  for (const m of messages) {
    const key = formatDayLabel(m.createdAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  }
  return Array.from(map.entries());
}

function getDisplayName(msg) {
  // IMPORTANT: anonymize admins
  if (msg.senderRole === "admin") return "Admin";
  // student: show their username (or “You” if you want)
  return msg.sender?.username || "Student";
}

function EventIcon({ msg }) {
  // You can customize icons by type later (status change, escalation, etc.)
  if (msg.senderRole === "admin") {
    return (
      <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white shadow">
        <ThumbsUp className="w-5 h-5" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white shadow">
      <User className="w-5 h-5" />
    </div>
  );
}

function AttachmentBlock({ att, onOpenPlan, onOpenImage, msg, idx }) {
  if (!att) return null;

  if (att.type === "plan") {
    return (
      <button
        type="button"
        onClick={() => onOpenPlan?.(att)}
        className="mt-3 w-full text-left rounded-lg border bg-gray-50 p-3 text-sm hover:bg-gray-100"
      >
        <div className="font-medium">Plan sent</div>
        <div className="text-gray-600 mt-1">
          {att.planName || "Academic Plan"}
        </div>
        <div className="text-xs text-gray-400 mt-1">Click to view</div>
      </button>
    );
  }

  const isImage =
    (att.mimeType || att.originalMimeType || "").startsWith("image/") ||
    att.type === "image";

  if (isImage) {
    const thumbUrl = att.originalUrl || att.url;
    return (
      <button
        type="button"
        onClick={() => onOpenImage?.({ message: msg, attachmentIndex: idx })}
        className="mt-3 block rounded-lg border bg-gray-50 p-2 hover:bg-gray-100"
      >
        <img
          src={thumbUrl}
          alt={att.name || att.originalName || "image"}
          className="w-full max-h-64 object-cover rounded-md"
        />
        {(att.caption || msg?.text) && (
          <div className="mt-2 text-xs text-gray-600 line-clamp-2">
            {att.caption || msg.text}
          </div>
        )}
      </button>
    );
  }

  // generic file
  const name = att.name || att.originalName || "Attachment";
  return (
    <a
      href={att.url || att.originalUrl || "#"}
      target="_blank"
      rel="noreferrer"
      className="mt-3 block rounded-lg border bg-gray-50 p-3 text-sm hover:bg-gray-100"
    >
      <div className="font-medium">{name}</div>
      <div className="text-gray-600 mt-1">
        {att.mimeType || att.originalMimeType || ""}
      </div>
    </a>
  );
}

function TimelineEvent({ msg, onOpenPlan, onOpenImage }) {
  const name = getDisplayName(msg);
  const titlePrefix = msg.senderRole === "admin" ? "STATUS:" : `${name}`;

  return (
    <div className="relative pl-14">
      {/* vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

      {/* icon */}
      <div className="absolute left-0 top-1">
        <EventIcon msg={msg} />
      </div>

      {/* card */}
      <div className="rounded-lg border bg-white">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm">
            <span
              className={cls(
                "font-semibold",
                msg.senderRole === "admin" ? "text-red-600" : "text-blue-700"
              )}
            >
              {titlePrefix}
            </span>
            {msg.senderRole !== "admin" && (
              <span className="text-gray-600"> created a ticket</span>
            )}
          </div>

          <div className="text-xs text-gray-400">
            {new Date(msg.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="px-4 py-4 text-sm text-gray-800 whitespace-pre-wrap">
          {msg.text || <span className="text-gray-500">No message.</span>}
          {Array.isArray(msg.attachments) &&
            msg.attachments.map((att, idx) => (
              <AttachmentBlock
                key={idx}
                att={att}
                msg={msg}
                idx={idx}
                onOpenPlan={onOpenPlan}
                onOpenImage={onOpenImage}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

export default function TicketTimeline({
  messages = [],
  onOpenPlan,
  onOpenImage,
}) {
  const groups = useMemo(() => groupByDay(messages), [messages]);

  if (!messages.length) {
    return <div className="text-sm text-gray-500">No updates yet.</div>;
  }

  return (
    <div className="space-y-8">
      {groups.map(([day, msgs]) => (
        <div key={day} className="space-y-3">
          {/* day pill like screenshot */}
          <div className="inline-flex items-center rounded-md bg-brand text-white px-3 py-1 text-sm font-semibold">
            {day}
          </div>

          <div className="space-y-4">
            {msgs.map((m) => (
              <TimelineEvent
                key={m._id || m.clientId}
                msg={m}
                onOpenPlan={onOpenPlan}
                onOpenImage={onOpenImage}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
