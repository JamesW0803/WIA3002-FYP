import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Undo2,
  Search,
  MessageSquarePlus,
  Trash2,
  FileText,
  MessagesSquare,
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
  const [conversationId, setConversationId] = useState(location.state?.conversationId || null);

  const [active, setActive] = useState(null);
  const [tab, setTab] = useState("open"); // "open" or "done"
  const [search, setSearch] = useState("");
  const [loadingLists, setLoadingLists] = useState(true);
  const { user } = useAuth();

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

  // Modal States
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [planOpen, setPlanOpen] = useState(false);
  const [planUrl, setPlanUrl] = useState(null);
  const [currentCoursePlan, setCurrentCoursePlan] = useState(null);
  const [coursePlanToBeReviewed, setCoursePlanToBeReviewed] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [student, setStudent] = useState();
  const [coursePlanStatus, setCoursePlanStatus] = useState();

  // Initial Load
  useEffect(() => {
    connect();
    (async () => {
      setLoadingLists(true);
      await loadLists();
      setLoadingLists(false);
      if (conversationId) openConversation(conversationId);
    })();
  }, []);

  // Sync active conversation data
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const response = await axiosClient.get(`/chat/conversation/id/${conversationId}`);
        const conversation = response.data;
        const plan = conversation?.coursePlanToBeReviewed;
        setCoursePlanToBeReviewed(plan || null);
        setCoursePlanStatus(plan?.status || null);
        setStudentName(conversation?.student?.username || "");
      } catch (error) {
        console.error("Error fetching conversation.");
      }
    };
    if (conversationId) {
      fetchConversation();
      openConversation(conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    const fetchStudent = async () => {
      const response = await axiosClient.get(`/students/${studentName}`);
      setStudent(response.data);
    };
    if (studentName) fetchStudent();
  }, [studentName]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesByConv, active]);

  // --- FILTERING LOGIC ---
  const { inquiries, reviewRequests } = useMemo(() => {
    const baseList = tab === "open" ? adminOpen : adminDone;
    const q = search.trim().toLowerCase();
    
    const filtered = q 
      ? baseList.filter(c => 
          (c.student?.username || "").toLowerCase().includes(q) ||
          (c.lastMessage?.text || "").toLowerCase().includes(q)
        )
      : baseList;

    return {
      inquiries: filtered.filter(c => !c.coursePlanToBeReviewed),
      reviewRequests: filtered.filter(c => !!c.coursePlanToBeReviewed)
    };
  }, [adminOpen, adminDone, tab, search]);

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

  // --- ACTIONS ---
  const openConversation = async (id) => {
    if (active && hasNoMessages(active)) await deleteConversation(active, true);
    if (active) leaveConversation(active);
    setActive(id);
    await joinConversation(id);
  };

  const toggleStatus = async () => {
    if (!active) return;
    const newStatus = tab === "open" ? "done" : "open";
    await markStatus(active, newStatus);
    await loadLists();
    setTab(newStatus);
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

  const hasNoMessages = (convId) => (messagesByConv[convId] || []).length === 0;

  // Header Logic
  const currentList = tab === "open" ? adminOpen : adminDone;
  const headerStudent = useMemo(() => currentList.find((c) => c._id === active)?.student, [active, currentList]);
  const { setReplyTo } = useChatStore.getState();

  const jumpToMessage = (id, imageIndex = null) => {
    const elId = imageIndex != null ? `msg-${id}-img-${imageIndex}` : `msg-${id}`;
    const el = document.getElementById(elId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-yellow-400", "flash-highlight");
      setTimeout(() => el.classList.remove("ring-2", "ring-yellow-400", "flash-highlight"), 1200);
    }
  };

  return (
    <div className="grid md:grid-cols-[360px_1fr] h-[calc(100vh-80px)] bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="border-r bg-white flex flex-col min-h-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-xl text-gray-800">Helpdesk</h2>
            <span className={cls("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold", connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
              {connected ? "Live" : "Offline"}
            </span>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
            <button onClick={() => setTab("open")} className={cls("flex-1 py-1.5 text-xs rounded-md transition-all", tab === "open" ? "bg-white shadow-sm font-semibold text-brand" : "text-gray-500")}>Open</button>
            <button onClick={() => setTab("done")} className={cls("flex-1 py-1.5 text-xs rounded-md transition-all", tab === "done" ? "bg-white shadow-sm font-semibold text-brand" : "text-gray-500")}>Resolved</button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or message..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* SECTION: Review Requests */}
          <Section 
            title="Course Plan Reviews" 
            loading={loadingLists} 
            count={reviewRequests.length}
            icon={<FileText className="w-4 h-4 text-orange-500" />}
          >
            <div className="space-y-1 mt-2">
              {reviewRequests.map((c) => (
                <ConversationItem
                  key={c._id}
                  convo={c}
                  active={active === c._id}
                  onClick={() => setConversationId(c._id)}
                  unread={unreadCounts[c._id] || 0}
                  className="border-l-4 border-orange-400"
                />
              ))}
              {reviewRequests.length === 0 && !loadingLists && (
                <p className="text-center text-xs text-gray-400 py-4 italic">No pending plan reviews</p>
              )}
            </div>
          </Section>

          <hr className="border-gray-100" />

          {/* SECTION: General Inquiries */}
          <Section 
            title="General Inquiries" 
            loading={loadingLists} 
            count={inquiries.length}
            icon={<MessagesSquare className="w-4 h-4 text-blue-500" />}
          >
            <div className="space-y-1 mt-2">
              {inquiries.map((c) => (
                <ConversationItem
                  key={c._id}
                  convo={c}
                  active={active === c._id}
                  onClick={() => setConversationId(c._id)}
                  unread={unreadCounts[c._id] || 0}
                />
              ))}
              {inquiries.length === 0 && !loadingLists && (
                <p className="text-center text-xs text-gray-400 py-4 italic">No general messages</p>
              )}
            </div>
          </Section>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex flex-col min-h-0 overflow-hidden relative">
        <div className="border-b bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {headerStudent ? (
              headerStudent.profilePicture ? (
                <img src={headerStudent.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-50" />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: headerStudent.profileColor || "#1E3A8A" }}>
                  {initials(headerStudent.username)}
                </div>
              )
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
            )}
            <div className="min-w-0">
              <div className="font-bold text-gray-800 truncate">{headerStudent?.username || "Select a thread"}</div>
              {active && <div className="text-[11px] text-gray-500 font-medium">STUDENT • {headerStudent?.email || ""}</div>}
            </div>
          </div>

          {active && (
            <div className="flex items-center gap-4">
              <button onClick={toggleStatus} className={cls("text-xs font-bold uppercase flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors", tab === "open" ? "text-green-600 hover:bg-green-50" : "text-brand hover:bg-blue-50")}>
                {tab === "open" ? <><CheckCircle2 className="w-4 h-4" /> Mark Done</> : <><Undo2 className="w-4 h-4" /> Reopen</>}
              </button>
              <button onClick={() => setShowDelete(true)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
            </div>
          )}
        </div>

        {/* Dynamic Review Panel */}
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f9fafb]">
          {!active && (
            <div className="h-full flex items-center justify-center">
                <EmptyLarge title="Helpdesk Dashboard" subtitle="Select a review request or general inquiry from the left to begin." />
            </div>
          )}

          <AnimatePresence initial={false}>
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
                  onOpenImage={(m, i) => { /* logic to open image */ }}
                  onOpenPlan={(url) => { /* logic to open plan */ }}
                />
              )
            )}
          </AnimatePresence>
          <div ref={endRef} />
        </div>

        <div className="p-4 bg-white border-t">
          <Composer
            disabled={!active || tab === "done"}
            onSendWithAttachments={(text, attachments) => sendMessage(active, text, attachments)}
          />
        </div>

        {/* Modals */}
        <ConfirmDeleteModal open={showDelete} role="admin" onClose={() => setShowDelete(false)} onConfirm={(alsoDelete) => active && deleteConversation(active, alsoDelete)} />
      </main>
    </div>
  );
}

export default HelpDesk;