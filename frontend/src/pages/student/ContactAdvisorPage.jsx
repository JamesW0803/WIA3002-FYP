import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  Search,
  MessageSquarePlus,
  Trash2,
  Share2,
} from "lucide-react";
import useChatStore, { DRAFT_CONVERSATION_ID } from "../../stores/useChatStore";
import EmptySmall from "../../components/chat/EmptySmall";
import EmptyLarge from "../../components/chat/EmptyLarge";
import Section from "../../components/chat/Section";
import ConversationItem from "../../components/chat/ConversationItem";
import Composer from "../../components/chat/Composer";
import DateChip from "../../components/chat/DateChip";
import MessageGroup from "../../components/chat/MessageGroup";
import ConfirmDeleteModal from "../../components/chat/ConfirmDeleteModal";
import ImageViewerModal from "../../components/chat/ImageViewerModal";
import SharePlanModal from "../../components/chat/SharePlanModal";
import PlanViewerModal from "../../components/chat/PlanViewerModal";

const cls = (...arr) => arr.filter(Boolean).join(" ");

export function ContactAdvisorPage() {
  const [active, setActive] = useState(null);
  const [loadingLists, setLoadingLists] = useState(true);
  const unreadCounts = useChatStore((s) => s.unreadCounts);

  const [showDelete, setShowDelete] = useState(false);
  const { deleteConversation } = useChatStore();

  const endRef = useRef(null);
  const {
    connect,
    connected,
    loadLists,
    studentOpen,
    studentDone,
    joinConversation,
    leaveConversation,
    messagesByConv,
    sendMessage,
  } = useChatStore();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
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

  const storeActiveId = useChatStore((s) => s.activeConversationId);
  useEffect(() => {
    // If we were on a draft and the store moved us to a real convo, follow it.
    if (
      active === DRAFT_CONVERSATION_ID &&
      storeActiveId &&
      storeActiveId !== DRAFT_CONVERSATION_ID
    ) {
      setActive(storeActiveId);
    }
  }, [storeActiveId]); // eslint-disable-line react-hooks/exhaustive-deps

  const msgs = useMemo(
    () => (active ? messagesByConv[active] || [] : []),
    [active, messagesByConv]
  );

  const grouped = useMemo(() => {
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
      const mine = m.senderRole === "student";
      if (!currentBlock || currentBlock.mine !== mine) {
        currentBlock = { type: "msgs", mine, items: [m] };
        groups.push(currentBlock);
      } else {
        currentBlock.items.push(m);
      }
    });
    return groups;
  }, [msgs]);

  const onOpen = async (c) => {
    if (active) leaveConversation(active);
    setActive(c._id);
    await joinConversation(c._id);
  };

  const onNew = async () => {
    if (active) leaveConversation(active);
    setActive(DRAFT_CONVERSATION_ID);
  };

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

  const flattenImages = (convId) => {
    const msgs = messagesByConv[convId] || [];
    const out = [];
    msgs.forEach((m) => {
      (m.attachments || []).forEach((a, i) => {
        if (a?.mimeType?.startsWith("image/")) {
          out.push({
            url: a.url,
            name: a.name,
            caption: a.caption,
            message: m, // keep entire message for reply / jump
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
    setReplyTo({ ...message, __imageIndex: idx });
  };

  const goToMessageFromViewer = (id, idx) => {
    setViewerOpen(false);
    id && jumpToMessage(id, idx);
  };

  return (
    <div className="grid md:grid-cols-[360px_1fr] h-[calc(100vh-80px)] bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="border-r bg-white p-4 overflow-y-auto min-h-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Your Conversations</h2>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1 text-brand hover:underline"
          >
            <PlusCircle className="w-4 h-4" /> New
          </button>
        </div>
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            placeholder="Search"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand"
            onChange={() => {
              /* implement client-side filter if desired */
            }}
          />
        </div>
        <Section
          title={`Open (${studentOpen.length})`}
          loading={loadingLists}
          count={studentOpen.length}
        >
          {studentOpen.length === 0 && !loadingLists && (
            <EmptySmall
              icon={MessageSquarePlus}
              title="No open conversations"
              subtitle={'Start a new one with "New".'}
            />
          )}
          <div className="space-y-2">
            {studentOpen.map((c) => (
              <ConversationItem
                key={c._id}
                convo={c}
                active={active === c._id}
                onClick={() => onOpen(c)}
                unread={unreadCounts[c._id] || 0}
              />
            ))}
          </div>
        </Section>
        <Section
          title={`Done (${studentDone.length})`}
          loading={loadingLists}
          count={studentDone.length}
        >
          <div className="space-y-2">
            {studentDone.map((c) => (
              <ConversationItem
                key={c._id}
                convo={{ ...c, status: "done" }}
                active={active === c._id}
                onClick={() => onOpen(c)}
                unread={unreadCounts[c._id] || 0}
              />
            ))}
          </div>
        </Section>
      </aside>

      {/* Chat */}
      <main className="flex flex-col min-h-0 overflow-hidden">
        <div className="border-b bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div
              className={cls(
                "w-2 h-2 rounded-full",
                connected ? "bg-green-500" : "bg-gray-300"
              )}
            />
            <h1 className="font-semibold">Advisor Team</h1>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-3">
            {connected ? "Connected" : "Connecting..."}
            {active && (
              <button
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center gap-1 text-brand hover:underline"
                title="Share one of your academic plans in this chat"
              >
                <Share2 className="w-4 h-4" /> Share Plan
              </button>
            )}
            {active && active !== DRAFT_CONVERSATION_ID && (
              <button
                onClick={() => setShowDelete(true)}
                className="inline-flex items-center gap-1 text-red-600 hover:underline"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          {!active && (
            <EmptyLarge
              title="Select or start a conversation"
              subtitle="Your previous conversations with the advisor team will appear here."
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
          disabled={!active}
          draftMode={active === DRAFT_CONVERSATION_ID}
          onSendWithAttachments={(text, attachments) =>
            sendMessage(active, text, attachments)
          }
        />

        <ConfirmDeleteModal
          open={showDelete}
          role="student"
          onClose={() => setShowDelete(false)}
          onConfirm={(alsoDelete) =>
            active &&
            active !== DRAFT_CONVERSATION_ID &&
            deleteConversation(active, alsoDelete)
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

        <SharePlanModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          conversationId={active}
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

export default ContactAdvisorPage;
