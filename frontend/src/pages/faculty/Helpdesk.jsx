import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Undo2,
  Search,
  MessageSquarePlus,
  Trash2,
} from "lucide-react";
import useChatStore from "../../stores/useChatStore";
import EmptySmall from "../../components/chat/EmptySmall";
import EmptyLarge from "../../components/chat/EmptyLarge";
import Section from "../../components/chat/Section";
import ConversationItem from "../../components/chat/ConversationItem";
import Composer from "../../components/chat/Composer";
import DateChip from "../../components/chat/DateChip";
import MessageGroup from "../../components/chat/MessageGroup";
import ConfirmDeleteModal from "../../components/chat/ConfirmDeleteModal";
import ImageViewerModal from "../../components/chat/ImageViewerModal";
import PlanViewerModal from "../../components/chat/PlanViewerModal";

const cls = (...arr) => arr.filter(Boolean).join(" ");
const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";

export function HelpDesk() {
  const [active, setActive] = useState(null);
  const [tab, setTab] = useState("open");
  const [search, setSearch] = useState("");
  const [loadingLists, setLoadingLists] = useState(true);
  const endRef = useRef(null);

  const [showDelete, setShowDelete] = useState(false);
  const { deleteConversation } = useChatStore();

  const unreadCounts = useChatStore((s) => s.unreadCounts);

  const {
    connect,
    connected,
    loadLists,
    adminOpen,
    adminDone,
    joinConversation,
    leaveConversation,
    messagesByConv,
    sendMessage,
    markStatus,
  } = useChatStore();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const [planOpen, setPlanOpen] = useState(false);
  const [planUrl, setPlanUrl] = useState(null);

  useEffect(() => {
    connect();
    (async () => {
      setLoadingLists(true);
      await loadLists();
      setLoadingLists(false);
    })();
    // eslint-disable-next-line
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesByConv, active]);

  const list = tab === "open" ? adminOpen : adminDone;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        (c.student?.username || "").toLowerCase().includes(q) ||
        (c.lastMessage?.text || "").toLowerCase().includes(q)
    );
  }, [list, search]);

  const grouped = useMemo(() => {
    // derive inside the memo to keep deps accurate
    const msgs = active ? messagesByConv[active] || [] : [];

    const groups = [];
    let currentDay = "";
    let currentBlock = null;

    msgs.forEach((m) => {
      const day = new Date(m.createdAt).toDateString();
      if (day !== currentDay) {
        groups.push({ type: "date", when: m.createdAt });
        currentDay = day;
        currentBlock = null;
      }
      const mine = m.senderRole === "admin";
      if (!currentBlock || currentBlock.mine !== mine) {
        currentBlock = { type: "msgs", mine, items: [m] };
        groups.push(currentBlock);
      } else {
        currentBlock.items.push(m);
      }
    });

    return groups;
  }, [active, messagesByConv]);

  const openConversation = async (c) => {
    if (active) leaveConversation(active);
    setActive(c._id);
    await joinConversation(c._id);
  };

  const toggleStatus = async () => {
    if (!active) return;
    const newStatus = tab === "open" ? "done" : "open";
    await markStatus(active, newStatus);
    await loadLists();
    setTab(newStatus);
  };

  const flattenImages = (convId) => {
    const msgs = messagesByConv[convId] || [];
    const out = [];
    msgs.forEach((m) => {
      (m.attachments || []).forEach((a, i) => {
        if (a?.mimeType?.startsWith("image/")) {
          out.push({
            url: a.url,
            originalUrl: a.originalUrl || a.url,
            name: a.originalName || a.name,
            caption: a.caption,
            message: m,
            sender: m.sender,
            createdAt: m.createdAt,
            idxInMessage: i,
          });
        }
      });
    });
    return out;
  };

  const openImageViewer = (message, idxInMessage) => {
    const all = flattenImages(active);
    const start = all.findIndex(
      (it) =>
        it.message?._id === message._id && it.idxInMessage === idxInMessage
    );
    setViewerItems(all);
    setViewerIndex(Math.max(0, start));
    setViewerOpen(true);
  };

  const openPlanViewer = (url) => {
    setPlanUrl(url);
    setPlanOpen(true);
  };

  const nextImage = () =>
    setViewerIndex((i) => (i + 1) % Math.max(1, viewerItems.length));
  const prevImage = () =>
    setViewerIndex(
      (i) =>
        (i - 1 + Math.max(1, viewerItems.length)) %
        Math.max(1, viewerItems.length)
    );
  const replyToThisImage = (message, idx) => {
    setViewerOpen(false);
    // Persist the specific image index so Composer + sendMessage know it
    setReplyTo({ ...message, __imageIndex: idx });
  };

  const goToMessageFromViewer = (id, idx) => {
    setViewerOpen(false);
    id && jumpToMessage(id, idx);
  };

  const headerStudent = useMemo(
    () => list.find((c) => c._id === active)?.student,
    [active, list]
  );

  const { setReplyTo } = useChatStore.getState();
  const jumpToMessage = (id, imageIndex = null) => {
    let el = null;
    if (imageIndex != null) {
      el = document.getElementById(`msg-${id}-img-${imageIndex}`);
    }
    if (!el) {
      el = document.getElementById(`msg-${id}`);
    }
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-yellow-400", "flash-highlight");
      setTimeout(
        () =>
          el.classList.remove("ring-2", "ring-yellow-400", "flash-highlight"),
        1200
      );
    }
  };

  return (
    <div className="grid md:grid-cols-[360px_1fr] h-[calc(100vh-80px)] bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="border-r bg-white p-4 overflow-y-auto min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Helpdesk</h2>
          <span
            className={cls(
              "text-[11px] px-2 py-0.5 rounded-full",
              connected
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            )}
          >
            {connected ? "Live" : "Offline"}
          </span>
        </div>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab("open")}
            className={cls(
              "px-3 py-1 rounded-full text-sm",
              tab === "open" ? "bg-brand text-white" : "bg-gray-100"
            )}
          >
            Open
          </button>
          <button
            onClick={() => setTab("done")}
            className={cls(
              "px-3 py-1 rounded-full text-sm",
              tab === "done" ? "bg-brand text-white" : "bg-gray-100"
            )}
          >
            Done
          </button>
        </div>
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students or text"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand"
          />
        </div>

        <Section
          title={`${tab === "open" ? "Open" : "Done"} (${list.length})`}
          loading={loadingLists}
          count={list.length}
        >
          {filtered.length === 0 && !loadingLists && (
            <EmptySmall
              icon={MessageSquarePlus}
              title={
                tab === "open"
                  ? "No open conversations"
                  : "No done conversations"
              }
              subtitle={
                tab === "open"
                  ? "You’ll see new student messages here."
                  : "Closed threads will appear here."
              }
            />
          )}
          <div className="space-y-2">
            {filtered.map((c) => (
              <ConversationItem
                key={c._id}
                convo={c}
                active={active === c._id}
                onClick={() => openConversation(c)}
                unread={unreadCounts[c._id] || 0}
              />
            ))}
          </div>
        </Section>
      </aside>

      {/* Main chat */}
      <main className="flex flex-col min-h-0 overflow-hidden">
        <div className="border-b bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {headerStudent ? (
              headerStudent.profilePicture ? (
                <img
                  src={headerStudent.profilePicture}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium"
                  style={{
                    backgroundColor: headerStudent.profileColor || "#1E3A8A",
                  }}
                >
                  {initials(headerStudent.username)}
                </div>
              )
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-200" />
            )}
            <div className="min-w-0">
              <div className="font-semibold truncate">
                {headerStudent?.username || "Select a conversation"}
              </div>
              {active && (
                <div className="text-xs text-gray-500">
                  Student • {headerStudent?.email || ""}
                </div>
              )}
            </div>
          </div>
          {active && (
            <div className="flex items-center gap-3">
              {tab === "open" ? (
                <button
                  onClick={toggleStatus}
                  className="inline-flex items-center gap-1 text-green-700 hover:underline"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark Done
                </button>
              ) : (
                <button
                  onClick={toggleStatus}
                  className="inline-flex items-center gap-1 text-brand hover:underline"
                >
                  <Undo2 className="w-4 h-4" /> Reopen
                </button>
              )}
              <button
                onClick={() => setShowDelete(true)}
                className="inline-flex items-center gap-1 text-red-600 hover:underline"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          {!active && (
            <EmptyLarge
              title="Pick a student thread"
              subtitle="New and recent conversations appear on the left."
            />
          )}

          <AnimatePresence>
            {grouped.map((g, idx) =>
              g.type === "date" ? (
                <DateChip key={`d:${idx}`} when={g.when} />
              ) : (
                <MessageGroup
                  key={`g:${idx}`}
                  mine={g.mine}
                  messages={g.items}
                  onReply={(m) => setReplyTo(m)}
                  onJumpTo={jumpToMessage}
                  onOpenImage={openImageViewer}
                  onOpenPlan={openPlanViewer}
                />
              )
            )}
          </AnimatePresence>
          <div ref={endRef} />
        </div>

        <Composer
          disabled={!active || tab === "done"}
          onSendWithAttachments={(text, attachments) =>
            sendMessage(active, text, attachments)
          }
        />

        <ConfirmDeleteModal
          open={showDelete}
          role="admin"
          onClose={() => setShowDelete(false)}
          onConfirm={(alsoDelete) =>
            active && deleteConversation(active, alsoDelete)
          }
        />

        <ImageViewerModal
          open={viewerOpen}
          items={viewerItems}
          index={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onPrev={prevImage}
          onNext={nextImage}
          onGoToMessage={goToMessageFromViewer}
          onReplyImage={replyToThisImage}
        />

        <PlanViewerModal
          open={planOpen}
          onClose={() => setPlanOpen(false)}
          planUrl={planUrl}
        />
      </main>
    </div>
  );
}

export default HelpDesk;
