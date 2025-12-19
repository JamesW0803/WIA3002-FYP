import React, { useEffect, useMemo, useState } from "react";
import {
  Menu,
  X,
  Plus,
  Search,
  Filter,
  LifeBuoy,
  LayoutDashboard,
  Ticket,
  BookOpen,
  Settings,
  ChevronRight,
  Paperclip,
  ArrowLeft,
} from "lucide-react";
import useMediaQuery from "../../hooks/useMediaQuery";
import useChatStore from "../../stores/useChatStore";
import { useLocation } from "react-router-dom";
import TicketPreviewModal from "../../components/chat/TicketPreviewModal";
import TicketTimeline from "../../components/chat/TicketTimeline";
import TicketPreviewPanel from "../../components/chat/TicketPreviewPanel";
import PlanViewerModal from "../../components/chat/PlanViewerModal";
import ImageViewerModal from "../../components/chat/ImageViewerModal";
import SharePlanModal from "../../components/chat/SharePlanModal";

const cls = (...a) => a.filter(Boolean).join(" ");

function StatusPill({ status }) {
  const s = (status || "open").toLowerCase();
  const map = {
    open: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    done: "bg-gray-100 text-gray-700 ring-gray-200",
    resolved: "bg-gray-100 text-gray-700 ring-gray-200",
    "in progress": "bg-amber-50 text-amber-800 ring-amber-200",
  };
  return (
    <span
      className={cls(
        "inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ring-1",
        map[s] || map.open
      )}
    >
      {s === "done" ? "resolved" : s}
    </span>
  );
}

function Drawer({ open, onClose, children, title }) {
  return (
    <div
      className={cls("fixed inset-0 z-50", open ? "" : "pointer-events-none")}
    >
      <div
        className={cls(
          "absolute inset-0 bg-black/40 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cls(
          "absolute left-0 top-0 h-full w-[82%] max-w-[320px] bg-white shadow-xl transition-transform",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-brand" />
            <div className="font-semibold">{title}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  return (
    <div
      className={cls("fixed inset-0 z-50", open ? "" : "pointer-events-none")}
    >
      <div
        className={cls(
          "absolute inset-0 bg-black/40 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={cls(
          "absolute left-1/2 top-1/2 w-[94%] max-w-[720px] -translate-x-1/2 -translate-y-1/2",
          "bg-white rounded-2xl shadow-xl border overflow-hidden transition-transform",
          open ? "scale-100" : "scale-95"
        )}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function TicketCard({ t, active, onClick }) {
  const last = t?.lastMessage;
  const subtitle =
    t?.subject || (last?.text ? last.text.slice(0, 80) : "No description yet.");

  return (
    <button
      onClick={onClick}
      className={cls(
        "w-full text-left rounded-xl border p-3 hover:bg-gray-50 transition",
        active
          ? "border-brand ring-2 ring-brand/20 bg-brand/5"
          : "border-gray-200"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium truncate">
          {t.subject?.trim() ? t.subject : "Untitled ticket"}
        </div>
        <StatusPill status={t.status} />
      </div>
      <div className="mt-1 text-xs text-gray-500 truncate">{subtitle}</div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
        <span>
          Updated {new Date(t.updatedAt || Date.now()).toLocaleString()}
        </span>
        <ChevronRight className="w-4 h-4" />
      </div>
    </button>
  );
}

export default function ContactAdvisorPage() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [navOpen, setNavOpen] = useState(false);

  const location = useLocation();

  // “Ticket” state
  const [activeTicketId, setActiveTicketId] = useState(null);

  // Create ticket preview flow
  const [previewOpen, setPreviewOpen] = useState(false);
  const [screen, setScreen] = useState("list"); // "list" | "detail" | "create"
  const [draftPlan, setDraftPlan] = useState(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  // draftPlan example: { planId, planName }
  const [planViewerOpen, setPlanViewerOpen] = useState(false);
  const [planAttachment, setPlanAttachment] = useState(null);

  const [imgOpen, setImgOpen] = useState(false);
  const [imgItems, setImgItems] = useState([]);
  const [imgIndex, setImgIndex] = useState(0);

  const [sharePlanOpen, setSharePlanOpen] = useState(false);

  const {
    connect,
    connected,
    loadLists,
    studentOpen,
    studentDone,
    joinConversation,
    leaveConversation,
    createConversation,
    sendMessage,
  } = useChatStore();

  useEffect(() => {
    connect();
    (async () => {
      await loadLists();
    })();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // Only open when Academic Planner sends the student here with payload
    const st = location.state;
    if (st?.openTicketPreview && st?.planId) {
      setDraftPlan({ planId: st.planId, planName: st.planName || "" });
      setPreviewOpen(true);
      setScreen("list");

      // Clear the location state so refresh/back doesn't reopen it
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tickets = useMemo(() => {
    // You can add filters here (status, category, etc.)
    return [...(studentOpen || []), ...(studentDone || [])];
  }, [studentOpen, studentDone]);

  const activeTicket = useMemo(
    () => tickets.find((t) => t._id === activeTicketId) || null,
    [tickets, activeTicketId]
  );

  const { messagesByConv } = useChatStore();
  const timelineMessages = messagesByConv[activeTicketId] || [];

  const goBackToList = () => {
    if (activeTicketId) leaveConversation(activeTicketId);
    setActiveTicketId(null);
    setScreen("list");
  };

  const openTicket = async (t) => {
    if (activeTicketId) leaveConversation(activeTicketId);
    setActiveTicketId(t._id);
    await joinConversation(t._id);
    setScreen("detail");
  };

  const buildImageItems = (messages) => {
    const items = [];
    for (const m of messages) {
      (m.attachments || []).forEach((att, idxInMessage) => {
        const mime = att.mimeType || att.originalMimeType || "";
        const isImage = mime.startsWith("image/") || att.type === "image";
        if (!isImage) return;

        items.push({
          url: att.url,
          originalUrl: att.originalUrl,
          name: att.name,
          originalName: att.originalName,
          caption: att.caption,
          message: m,
          createdAt: m.createdAt,
          sender: m.sender,
          idxInMessage,
        });
      });
    }
    return items;
  };

  // 1) Open preview (do NOT submit yet)
  const startCreateTicket = ({ planId = null, planName = "" } = {}) => {
    setDraftPlan(planId ? { planId, planName } : null);
    if (activeTicketId) leaveConversation(activeTicketId);
    setActiveTicketId(null);
    setScreen("create");
  };

  // 2) Submit ticket (create + first message w/ plan attachment)
  const submitTicketFromPreview = async ({ message, plan }) => {
    try {
      setSubmittingTicket(true);

      const planName = plan?.planName || "";
      const subject = planName
        ? `Academic Plan Review: ${planName}`
        : "Academic Plan Review";

      const ticket = await createConversation({ subject });
      await loadLists();

      // open it
      if (activeTicketId) leaveConversation(activeTicketId);
      setActiveTicketId(ticket._id);
      await joinConversation(ticket._id);
      setScreen("detail");

      // send initial message ONLY AFTER submit
      const attachments = plan?.planId
        ? [{ type: "plan", planId: plan.planId, planName: plan.planName }]
        : [];

      const text =
        message?.trim() || "Hi advisor team, please review my academic plan.";

      sendMessage(ticket._id, text, attachments);

      setPreviewOpen(false);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const NavContent = (
    <div className="p-3 space-y-1">
      <button
        onClick={() => {
          startCreateTicket();
        }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-brand text-white hover:opacity-95"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">Create Ticket</span>
      </button>

      <button
        onClick={() => {
          if (activeTicketId) leaveConversation(activeTicketId);
          setActiveTicketId(null);
          setScreen("list");
        }}
        className={cls(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100",
          screen === "list" && "bg-gray-100"
        )}
      >
        <Ticket className="w-4 h-4" />
        <span className="text-sm">My Tickets</span>
      </button>

      <div className="mt-4 px-3 py-2 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span
            className={cls(
              "inline-block w-2 h-2 rounded-full",
              connected ? "bg-emerald-500" : "bg-gray-300"
            )}
          />
          <span>{connected ? "Connected" : "Connecting…"}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-80px)] bg-gray-50 overflow-hidden">
      {/* Top bar (mobile) */}
      <div className="md:hidden bg-white border-b px-3 py-3 flex items-center justify-between">
        <button
          onClick={() => setNavOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="font-semibold">Helpdesk</div>
        <button
          onClick={() => startCreateTicket()}
          className="p-2 rounded-lg bg-brand text-white"
          aria-label="Create ticket"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Layout */}
      <div className="h-full grid md:grid-cols-[260px_1fr]">
        {/* Sidebar nav (desktop) */}
        <aside className="hidden md:block border-r bg-white">
          <div className="p-4 border-b flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-brand" />
            <div className="font-semibold">Helpdesk</div>
          </div>
          {NavContent}
        </aside>

        {/* Content area */}
        <div className="min-h-0 overflow-y-auto bg-gray-50">
          {screen === "list" && (
            <section className="bg-white h-full p-4 space-y-3">
              {/* render ticket list ONLY */}
              {tickets.map((t) => (
                <TicketCard
                  key={t._id}
                  t={t}
                  active={false}
                  onClick={() => openTicket(t)}
                />
              ))}
            </section>
          )}

          {screen === "create" && (
            <div className="p-5">
              <button
                type="button"
                onClick={() => setSharePlanOpen(true)}
                className="mb-3 px-4 py-2 rounded-lg border hover:bg-gray-50"
              >
                Choose plan
              </button>

              <TicketPreviewPanel
                initialPlan={draftPlan}
                submitting={submittingTicket}
                onCancel={() => setScreen("list")}
                onSubmit={submitTicketFromPreview}
              />

              <SharePlanModal
                open={sharePlanOpen}
                onClose={() => setSharePlanOpen(false)}
                mode="select"
                onConfirmSelect={(p) => {
                  setDraftPlan(p);
                  setSharePlanOpen(false);
                }}
              />
            </div>
          )}

          {screen === "detail" && activeTicket && (
            <div className="p-5 space-y-4">
              <button
                onClick={goBackToList}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                type="button"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Ticket</div>
                  <h1 className="text-xl font-semibold truncate">
                    {activeTicket.subject || "Untitled ticket"}
                  </h1>
                </div>
                <StatusPill status={activeTicket.status} />
              </div>

              <div className="grid lg:grid-cols-[1fr_320px] gap-4">
                <div className="bg-white border rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      Ticket No: {activeTicketId?.slice(-8)}
                    </div>
                  </div>

                  <div className="mt-6">
                    <TicketTimeline
                      messages={timelineMessages}
                      onOpenPlan={(att) => {
                        setPlanAttachment(att);
                        setPlanViewerOpen(true);
                      }}
                      onOpenImage={({ message, attachmentIndex }) => {
                        const items = buildImageItems(timelineMessages);
                        const targetIdx = items.findIndex(
                          (it) =>
                            it.message?._id === message._id &&
                            it.idxInMessage === attachmentIndex
                        );
                        setImgItems(items);
                        setImgIndex(Math.max(0, targetIdx));
                        setImgOpen(true);
                      }}
                    />

                    <PlanViewerModal
                      open={planViewerOpen}
                      onClose={() => setPlanViewerOpen(false)}
                      attachment={planAttachment}
                    />

                    <ImageViewerModal
                      open={imgOpen}
                      items={imgItems}
                      index={imgIndex}
                      onClose={() => setImgOpen(false)}
                      onPrev={() => setImgIndex((i) => Math.max(0, i - 1))}
                      onNext={() =>
                        setImgIndex((i) => Math.min(imgItems.length - 1, i + 1))
                      }
                    />
                  </div>
                </div>

                <div className="bg-white border rounded-2xl p-4 space-y-3">
                  <div className="font-semibold">Ticket info</div>
                  <div className="text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Created</span>
                      <span>
                        {new Date(
                          activeTicket.createdAt || Date.now()
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 mt-2">
                      <span className="text-gray-500">Category</span>
                      <span>Academic Plan Review</span>
                    </div>
                    <div className="flex justify-between gap-3 mt-2">
                      <span className="text-gray-500">Priority</span>
                      <span>Normal</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav drawer */}
      <Drawer open={navOpen} onClose={() => setNavOpen(false)} title="Helpdesk">
        {NavContent}
      </Drawer>

      {/* Preview modal (the key requirement) */}
      <TicketPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onSubmit={submitTicketFromPreview}
        initialPlan={draftPlan}
        submitting={submittingTicket}
      />
    </div>
  );
}
