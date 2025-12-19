import React, { use, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Undo2,
  Search,
  MessageSquarePlus,
  Trash2,
  FileText,
  MessageCircle
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
import CoursePlanReviewPanel from "../../components/Faculty/Helpdesk/CoursePlanReviewPanel";
import CoursePlanReviewModal from "../../components/Faculty/Helpdesk/CoursePlanReviewModal";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../context/AuthContext";

const cls = (...arr) => arr.filter(Boolean).join(" ");
const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";

export function HelpDesk() {
  const location = useLocation();
  const [conversationId, setConversationId] = useState(location.state?.conversationId || null)

  const [active, setActive] = useState(null);
  const [tab, setTab] = useState("open");
  const [subFilter, setSubFilter] = useState("all"); // New sub-filter: "all", "chat", "review"
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
  const [currentCoursePlan, setCurrentCoursePlan ] = useState(null)
  const [coursePlanToBeReviewed, setCoursePlanToBeReviewed ] = useState(null)
  const [reviewOpen, setReviewOpen] = useState(false);
  const [studentName, setStudentName] = useState("")
  const [student, setStudent] = useState()
  const [coursePlanStatus, setCoursePlanStatus] = useState()
  const { user, setUser } = useAuth();

  useEffect(() => {
    connect();
    (async () => {
      setLoadingLists(true);
      await loadLists();
      setLoadingLists(false);
      if (conversationId) {
        openConversation(conversationId)
      }
    })();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const fetchConversation = async () =>{
      try {
          const response = await axiosClient.get(`/chat/conversation/id/${conversationId}`);
          const conversation = response.data;
          const plan = conversation?.coursePlanToBeReviewed
          setCoursePlanToBeReviewed(plan);
          setCoursePlanStatus(plan?.status)
          setStudentName(conversation?.student?.username)
      }catch(error){
          console.error("Error fetching conversation.")
      }
    }
    if(conversationId){
      fetchConversation();
      openConversation(conversationId)
    }
  }, [conversationId])

  useEffect(() => {
    const fetchStudent = async() => {
        const response = await axiosClient.get(`/students/${studentName}`)
        const currentStudent = response.data
        setStudent(currentStudent)
    }
    if(studentName){
      fetchStudent()
    }
  }, [studentName])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesByConv, active]);

  const list = tab === "open" ? adminOpen : adminDone;

  // Modified Filter Logic
  const filtered = useMemo(() => {
    let result = [...list];

    // 1. Sub-filter by type
    if (subFilter === "chat") {
      result = result.filter(c => !c.coursePlanToBeReviewed);
    } else if (subFilter === "review") {
      result = result.filter(c => !!c.coursePlanToBeReviewed);
    }

    // 2. Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          (c.student?.username || "").toLowerCase().includes(q) ||
          (c.lastMessage?.text || "").toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [list, search, subFilter]);

  const grouped = useMemo(() => {
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

  const openConversation = async (conversationId) => {
    if (active && hasNoMessages(active)) {
      await deleteConversation(active, true);  
    }

    if (active) leaveConversation(active);
    setActive(conversationId);
    await joinConversation(conversationId);
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

  const openPlanViewer = async (url) => {
    const planId = url.planId
    const fetchPlan = async () =>{
      try {
          const res = await axiosClient.get(`/academic-plans/plans/${planId}`)
          const plan = res.data.data;
          setCurrentCoursePlan(plan);
      }catch(error){
          console.error("Error fetching course plan.")
      }
    }
    await fetchPlan();
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

  const hasNoMessages = (convId) => {
    if (!messagesByConv[convId]) return false; 
    return messagesByConv[convId].length === 0;
  };

  const handleCoursePlanStatusChange = async (updatedStatus) => {
    const planId = coursePlanToBeReviewed?._id;
    if (!planId) return;

    try {
      const response = await axiosClient.patch(`/academic-plans/plans/${planId}/status`, {
        status: updatedStatus,
      });

      if (response.data.success) {
        setCoursePlanStatus(updatedStatus);
        setCoursePlanToBeReviewed(response.data.data);
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  return (
    <div className="grid md:grid-cols-[360px_1fr] h-[calc(100vh-80px)] bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="border-r bg-white p-4 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Helpdesk</h2>
          <span className={cls("text-[11px] px-2 py-0.5 rounded-full", connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
            {connected ? "Live" : "Offline"}
          </span>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab("open")}
            className={cls("flex-1 px-3 py-1 rounded-md text-sm transition-all", tab === "open" ? "bg-brand text-white font-medium" : "bg-gray-100 text-gray-600")}
          >
            Open
          </button>
          <button
            onClick={() => setTab("done")}
            className={cls("flex-1 px-3 py-1 rounded-md text-sm transition-all", tab === "done" ? "bg-brand text-white font-medium" : "bg-gray-100 text-gray-600")}
          >
            Done
          </button>
        </div>

        {/* Sub-Filters (Category) */}
        <div className="flex gap-2 mb-3 border-b pb-3">
            <button 
                onClick={() => setSubFilter("all")}
                className={cls("text-xs px-2 py-1 rounded", subFilter === "all" ? "bg-gray-200 font-bold" : "text-gray-400")}
            >
                All
            </button>
            <button 
                onClick={() => setSubFilter("chat")}
                className={cls("text-xs px-2 py-1 rounded flex items-center gap-1", subFilter === "chat" ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-400")}
            >
                <MessageCircle className="w-3 h-3"/> Messages
            </button>
            <button 
                onClick={() => setSubFilter("review")}
                className={cls("text-xs px-2 py-1 rounded flex items-center gap-1", subFilter === "review" ? "bg-orange-50 text-orange-700 font-bold" : "text-gray-400")}
            >
                <FileText className="w-3 h-3"/> Reviews
            </button>
        </div>

        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
            <Section
            title={`${subFilter.toUpperCase()} (${filtered.length})`}
            loading={loadingLists}
            count={filtered.length}
            >
            {filtered.length === 0 && !loadingLists && (
                <EmptySmall
                icon={MessageSquarePlus}
                title="No threads found"
                subtitle="Try changing your filters or search."
                />
            )}
            <div className="space-y-2">
                {filtered.map((c) => (
                <ConversationItem
                    key={c._id}
                    convo={c}
                    active={active === c._id}
                    onClick={() => setConversationId(c._id)}
                    unread={unreadCounts[c._id] || 0}
                />
                ))}
            </div>
            </Section>
        </div>
      </aside>

      {/* Main chat */}
      <main className="flex flex-col min-h-0 overflow-hidden">
        <div className="border-b bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {headerStudent ? (
              headerStudent.profilePicture ? (
                <img src={headerStudent.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: headerStudent.profileColor || "#1E3A8A" }}
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
                <button onClick={toggleStatus} className="inline-flex items-center gap-1 text-green-700 hover:underline text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Mark Done
                </button>
              ) : (
                <button onClick={toggleStatus} className="inline-flex items-center gap-1 text-brand hover:underline text-sm font-medium">
                  <Undo2 className="w-4 h-4" /> Reopen
                </button>
              )}
              <button onClick={() => setShowDelete(true)} className="inline-flex items-center gap-1 text-red-600 hover:underline text-sm font-medium">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          )}
        </div>

        {coursePlanToBeReviewed && (
          <CoursePlanReviewPanel
            status={coursePlanStatus}
            accessLevel={user?.access_level}
            onAction={handleCoursePlanStatusChange}
            onViewPlan={() => setReviewOpen(true)}
          />
        )}

        <CoursePlanReviewModal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          plan={coursePlanToBeReviewed}
          academicProfile={student?.academicProfile}
          status={coursePlanStatus}
          accessLevel={user?.access_level}
          onAction={handleCoursePlanStatusChange}
        /> 

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
          plan={currentCoursePlan}
        />
      </main>
    </div>
  );
}

export default HelpDesk;