import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  Search,
  MessageSquarePlus,
  Trash2,
  Share2,
  ArrowLeft,
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
import useMediaQuery from "../../hooks/useMediaQuery";
import CoursePlanReviewPanel from "../../components/Faculty/Helpdesk/CoursePlanReviewPanel";
import CoursePlanReviewModal from "../../components/Faculty/Helpdesk/CoursePlanReviewModal";
import axiosClient from "../../api/axiosClient";
import Notification from "../../components/Students/AcademicProfile/Notification";
import { useAcademicProfile } from "../../hooks/useAcademicProfile";

const cls = (...arr) => arr.filter(Boolean).join(" ");

// NEW: View constants
const VIEW_LIST = "list";
const VIEW_CHAT = "chat";

export function ContactAdvisorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState(
    location.state?.conversationId || null
  );
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
  const [planAttachment, setPlanAttachment] = useState(null);
  const [currentCoursePlan, setCurrentCoursePlan] = useState(null);
  const [coursePlanToBeReviewed, setCoursePlanToBeReviewed] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [student, setStudent] = useState();
  const [coursePlanStatus, setCoursePlanStatus] = useState();

  // NEW: detect "mobile" (tailwind md breakpoint)
  const isMobile = useMediaQuery("(max-width: 767px)");
  // NEW: UI view (list vs chat) for small screens
  const [view, setView] = useState(VIEW_LIST);

  const { showNotification, closeNotification, notification } =
    useAcademicProfile();

  useEffect(() => {
    if (location.state?.notificationMessage) {
      const { notificationMessage, notificationType } = location.state;

      showNotification(notificationMessage, notificationType);

      // Clear the state so the page won’t show the notification on refresh
      navigate(location.pathname, { replace: true });
    }
  }, []);

  useEffect(() => {
    connect();
    (async () => {
      setLoadingLists(true);
      await loadLists();
      setLoadingLists(false);
      if (conversationId) {
        onOpen(conversationId);
      }
    })();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const response = await axiosClient.get(
          `/chat/conversations/${conversationId}`
        );
        const conversation = response.data;
        const plan = conversation?.coursePlanToBeReviewed;
        setCoursePlanToBeReviewed(plan);
        setCoursePlanStatus(plan?.status);
        setStudentName(conversation?.student?.username);
      } catch (error) {
        console.error("Error fetching conversation.");
      }
    };
    if (conversationId) {
      fetchConversation();
      onOpen(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    const fetchStudent = async () => {
      const response = await axiosClient.get(`/students/${studentName}`);
      const currentStudent = response.data;
      setStudent(currentStudent);
    };
    if (studentName) {
      fetchStudent();
    }
  }, [studentName]);

  // NEW: keep view in sync with screen size
  useEffect(() => {
    if (!isMobile) {
      // On tablet/desktop we always render split view
      setView(VIEW_CHAT);
    } else {
      // On phones: if a conversation is active show chat, else list
      setView(active ? VIEW_CHAT : VIEW_LIST);
    }
  }, [isMobile, active]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesByConv, active]);

  const storeActiveId = useChatStore((s) => s.activeConversationId);
  useEffect(() => {
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

  const myRole =
    JSON.parse(localStorage.getItem("user") || "{}")?.role || "student";

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

      const mine = m.senderRole === myRole;
      if (!currentBlock || currentBlock.mine !== mine) {
        currentBlock = { type: "msgs", mine, items: [m] };
        groups.push(currentBlock);
      } else {
        currentBlock.items.push(m);
      }
    });

    return groups;
  }, [msgs]);

  const onOpen = async (conversationId) => {
    if (active) leaveConversation(active);
    setActive(conversationId);
    setConversationId(conversationId);
    await joinConversation(conversationId);
    if (isMobile) setView(VIEW_CHAT); // go to chat on phones
  };

  const onNew = async () => {
    if (active) leaveConversation(active);
    setActive(DRAFT_CONVERSATION_ID);
    if (isMobile) setView(VIEW_CHAT);
  };

  const onBackToList = () => {
    if (isMobile) setView(VIEW_LIST);
  };

  const { setReplyTo } = useChatStore.getState();
  const jumpToMessage = (id, imageIndex = null) => {
    let el = null;
    if (imageIndex != null) {
      el = document.getElementById(`msg-${id}-img-${imageIndex}`);
    }
    if (!el) el = document.getElementById(`msg-${id}`);
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

  const openPlanViewer = (attachment) => {
    setPlanAttachment(attachment || null);
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

  // Render
  return (
    <div
      className={cls(
        // Desktop/tablet: two columns; Phone: single stack
        "h-[calc(100vh-80px)] bg-gray-50 overflow-hidden",
        "grid md:grid-cols-[360px_1fr]"
      )}
    >
      {/* Sidebar (LIST) */}
      <aside
        className={cls(
          "border-r bg-white p-4 overflow-y-auto min-h-0",
          // On phones, hide when in chat view
          isMobile && view === VIEW_CHAT ? "hidden" : "block"
        )}
      >
        {/* Small header for phones only */}
        <div className="md:hidden mb-2">
          <h1 className="text-lg font-semibold">Conversations</h1>
          <div className="text-xs text-gray-500">
            {connected ? "Connected" : "Connecting…"}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold hidden md:block">Your Conversations</h2>
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
              /* client-side filter if desired */
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
                onClick={() => onOpen(c._id)}
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
                onClick={() => onOpen(c._id)}
                unread={unreadCounts[c._id] || 0}
              />
            ))}
          </div>
        </Section>
      </aside>

      {/* Chat (MESSAGES) */}
      <main
        className={cls(
          "flex flex-col min-h-0 overflow-hidden",
          // On phones, hide when we’re on list view
          isMobile && view === VIEW_LIST ? "hidden" : "flex"
        )}
      >
        {/* Chat header */}
        <div className="border-b bg-white px-3 sm:px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            {/* Back on phones */}
            {isMobile && (
              <button
                onClick={onBackToList}
                className="p-2 -ml-1 mr-1 rounded-full hover:bg-gray-100"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
            )}
            <div
              className={cls(
                "w-2 h-2 rounded-full",
                connected ? "bg-green-500" : "bg-gray-300"
              )}
            />
            <h1 className="font-semibold truncate">Advisor Team</h1>
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-3">
            <span className="hidden sm:inline">
              {connected ? "Connected" : "Connecting..."}
            </span>

            {active && (
              <button
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center gap-1 text-brand hover:underline"
                title="Share one of your academic plans in this chat"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share Plan</span>
              </button>
            )}
            {active && active !== DRAFT_CONVERSATION_ID && (
              <button
                onClick={() => setShowDelete(true)}
                className="inline-flex items-center gap-1 text-red-600 hover:underline"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </div>
        </div>

        {coursePlanToBeReviewed && (
          <CoursePlanReviewPanel
            status={coursePlanStatus}
            onViewPlan={() => setReviewOpen(true)}
          />
        )}

        <CoursePlanReviewModal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          plan={coursePlanToBeReviewed}
          academicProfile={student?.academicProfile}
          status={coursePlanStatus}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
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
          onConfirm={(alsoDelete) => {
            if (active && active !== DRAFT_CONVERSATION_ID) {
              deleteConversation(active, alsoDelete);
              // After deletion on phones, return to list
              if (isMobile) setView(VIEW_LIST);
            }
          }}
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
          attachment={planAttachment}
        />
        {notification.show && (
          <Notification
            message={notification.message}
            type={notification.type}
            isClosing={notification.isClosing}
            onClose={closeNotification}
          />
        )}
      </main>
    </div>
  );
}

export default ContactAdvisorPage;
