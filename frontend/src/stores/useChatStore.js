import { create } from "zustand";
import axiosClient from "../api/axiosClient";
import { io } from "socket.io-client";

export const DRAFT_CONVERSATION_ID = "__draft__";

const makeSocket = (token) => {
  const base = process.env.REACT_APP_BASE_URL || "http://localhost:5000/api";
  let origin = "http://localhost:5000";
  try {
    origin = new URL(base).origin;
  } catch {}
  return io(origin, {
    path: "/api/socket.io",
    auth: { token },
    autoConnect: false,
    transports: ["websocket", "polling"],
  });
};

// helper: upsert with de-dupe by _id or clientId
function upsertMsg(arr, msg) {
  const i = arr.findIndex(
    (m) =>
      (m._id && msg._id && m._id === msg._id) ||
      (m.clientId && msg.clientId && m.clientId === msg.clientId)
  );
  if (i === -1) return [...arr, msg];
  const next = arr.slice();
  next[i] = msg;
  return next;
}

const useChatStore = create((set, get) => ({
  socket: null,
  connected: false,
  activeConversationId: null,
  unreadCounts: {},
  seenMsgIds: {},
  replyTo: null,
  studentOpen: [],
  studentDone: [],
  adminOpen: [],
  adminDone: [],
  messagesByConv: {},
  setReplyTo: (msg) => set({ replyTo: msg }),
  clearReplyTo: () => set({ replyTo: null }),

  _removeConvoFromState: (convoId) =>
    set((s) => {
      const prune = (arr) => arr.filter((c) => c._id !== convoId);
      const next = {
        adminOpen: prune(s.adminOpen),
        adminDone: prune(s.adminDone),
        studentOpen: prune(s.studentOpen),
        studentDone: prune(s.studentDone),
        messagesByConv: { ...s.messagesByConv },
        unreadCounts: { ...s.unreadCounts },
      };
      delete next.messagesByConv[convoId];
      delete next.unreadCounts[convoId];
      return {
        ...next,
        activeConversationId:
          s.activeConversationId === convoId ? null : s.activeConversationId,
      };
    }),

  loadUnreadCounts: async () => {
    const { data } = await axiosClient.get("/chat/unread-counts");
    set({ unreadCounts: data || {} });
  },

  getUploadUrl: async ({ filename, mimeType }) => {
    const { data } = await axiosClient.post("/chat/upload-url", {
      filename,
      mimeType,
    });
    return data; // { uploadUrl, blobUrl, expiresOn }
  },

  putToAzure: async ({ uploadUrl, file }) => {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });
    if (!res.ok) throw new Error(`Azure upload failed: ${res.status}`);
  },

  connect: async () => {
    const token = localStorage.getItem("token");
    const socket = makeSocket(token);
    set({ socket });

    socket.on("connect", () => set({ connected: true }));
    socket.on("disconnect", () => set({ connected: false }));

    // IMPORTANT: Do NOT append to messages here.
    // This event is for inbox/list previews only.
    socket.on(
      "conversation:updated",
      ({ conversationId, lastMessage, updatedAt, student, status }) => {
        const role = JSON.parse(localStorage.getItem("user"))?.role;
        const isFromOther =
          lastMessage?.senderRole && lastMessage.senderRole !== role;
        const isActive = get().activeConversationId === conversationId;
        const msgId = lastMessage?._id;

        // Light-weight preview bump (optional):
        const bump = (list) => {
          const idx = list.findIndex((c) => c._id === conversationId);
          if (idx === -1) {
            return [
              {
                _id: conversationId,
                student,
                status: status || "open",
                lastMessage,
                updatedAt,
              },
              ...list,
            ];
          }
          const updated = {
            ...list[idx],
            lastMessage,
            updatedAt,
            status: status || list[idx].status,
            student: list[idx].student || student,
          };
          const copy = list.slice();
          copy.splice(idx, 1);
          return [updated, ...copy];
        };

        const removeFrom = (list) =>
          list.filter((c) => c._id !== conversationId);

        set((s) => {
          let lists;
          if (role === "admin") {
            const goingOpen = (status || "").toLowerCase() !== "done";
            lists = {
              adminOpen: goingOpen
                ? bump(s.adminOpen)
                : removeFrom(s.adminOpen),
              adminDone: goingOpen
                ? removeFrom(s.adminDone)
                : bump(s.adminDone),
            };
          } else {
            const goingOpen = (status || "").toLowerCase() !== "done";
            lists = {
              studentOpen: goingOpen
                ? bump(s.studentOpen)
                : removeFrom(s.studentOpen),
              studentDone: goingOpen
                ? removeFrom(s.studentDone)
                : bump(s.studentDone),
            };
          }
          const unreadCounts = { ...s.unreadCounts };
          const seenMsgIds = { ...s.seenMsgIds };

          if (isFromOther && msgId && !seenMsgIds[msgId]) {
            if (isActive) {
              get().socket?.emit("message:read", {
                conversationId,
                messageIds: [msgId],
              });
              unreadCounts[conversationId] = 0;
            } else {
              unreadCounts[conversationId] =
                (unreadCounts[conversationId] || 0) + 1;
            }
            seenMsgIds[msgId] = true;
          }
          return { ...lists, unreadCounts, seenMsgIds };
        });
      }
    );

    socket.on("conversation:deleted", ({ conversationId }) => {
      get()._removeConvoFromState(conversationId);
    });

    socket.on("message:new", (msg) => {
      const convId = msg.conversation;
      const myRole = JSON.parse(localStorage.getItem("user"))?.role;
      const isFromOther = msg.senderRole !== myRole;
      const isActive = get().activeConversationId === convId;
      const msgId = msg._id;

      set((state) => {
        const existing = state.messagesByConv[convId] || [];
        const updates = {
          messagesByConv: {
            ...state.messagesByConv,
            [convId]: upsertMsg(existing, msg), // de-dupe here
          },
          unreadCounts: { ...state.unreadCounts },
          seenMsgIds: { ...state.seenMsgIds },
        };

        if (isFromOther && msgId && !updates.seenMsgIds[msgId]) {
          if (isActive) {
            get().socket?.emit("message:read", {
              conversationId: convId,
              messageIds: [msgId],
            });
          } else {
            updates.unreadCounts[convId] =
              (updates.unreadCounts[convId] || 0) + 1;
          }
          updates.seenMsgIds[msgId] = true;
        }
        return updates;
      });
    });

    // inside create(...) where socket listeners are set up
    socket.on("message:ack", ({ clientId, serverId, conversationId }) => {
      const draftId = DRAFT_CONVERSATION_ID;
      const wasDraftActive = get().activeConversationId === draftId;

      set((s) => {
        const next = {
          ...s,
          messagesByConv: { ...s.messagesByConv },
        };

        // if we were composing in a draft, move to the real conversation
        if (conversationId && wasDraftActive) {
          next.activeConversationId = conversationId;
        }

        // remove the optimistic draft message that had clientId (message:new will arrive for the real convo)
        const draftMsgs = next.messagesByConv[draftId] || [];
        if (draftMsgs.length) {
          const filtered = draftMsgs.filter((m) => m.clientId !== clientId);
          if (filtered.length) next.messagesByConv[draftId] = filtered;
          else delete next.messagesByConv[draftId];
        }
        return next;
      });

      // join and load the real conversation so history & read receipts are correct
      if (conversationId) {
        get().joinConversation(conversationId);
      }
    });

    // Inside useChatStore.js -> connect function
    socket.on("conversation:new", (newConvo) => {
      const role = JSON.parse(localStorage.getItem("user"))?.role;

      set((s) => {
        const isDone = (newConvo.status || "").toLowerCase() === "done";
        const listKey =
          role === "admin"
            ? isDone
              ? "adminDone"
              : "adminOpen"
            : isDone
            ? "studentDone"
            : "studentOpen";

        // 1. Check if it already exists in the target list
        const exists = s[listKey].some((c) => c._id === newConvo._id);

        // 2. If it exists, don't add a duplicate
        if (exists) return s;

        // 3. Otherwise, add it to the top
        return {
          ...s,
          [listKey]: [newConvo, ...s[listKey]],
        };
      });
    });

    socket.connect();
  },

  loadLists: async () => {
    const role = JSON.parse(localStorage.getItem("user"))?.role;
    const open = await axiosClient.get("/chat/conversations?status=open");
    const done = await axiosClient.get("/chat/conversations?status=done");
    if (role === "admin") set({ adminOpen: open.data, adminDone: done.data });
    else set({ studentOpen: open.data, studentDone: done.data });
    await get().loadUnreadCounts();
  },

  joinConversation: async (conversationId) => {
    set({ activeConversationId: conversationId });
    get().socket?.emit("conversation:join", { conversationId });
    const { data } = await axiosClient.get("/chat/messages", {
      params: { conversationId, limit: 30 },
    });
    // ensure unique after initial load, just in case
    const deduped = [];
    const seen = new Set();
    for (const m of data.messages) {
      const key = m._id || `cid:${m.clientId}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(m);
      }
    }
    set((s) => ({
      messagesByConv: { ...s.messagesByConv, [conversationId]: deduped },
    }));

    // mark all other-side messages as read
    const myRole = JSON.parse(localStorage.getItem("user"))?.role;
    const toMark = deduped
      .filter((m) => m.senderRole !== myRole && m._id)
      .map((m) => m._id);
    if (toMark.length) {
      get().socket?.emit("message:read", {
        conversationId,
        messageIds: toMark,
      });
    }
    // reset unread badge locally
    set((s) => ({
      unreadCounts: { ...s.unreadCounts, [conversationId]: 0 },
    }));
  },

  leaveConversation: (conversationId) =>
    get().socket?.emit("conversation:leave", { conversationId }),

  createConversation: async ({ subject, studentId } = {}) => {
    const { data } = await axiosClient.post("/chat/conversations", {
      subject,
      studentId,
    });
    return data;
  },

  sendMessage: (conversationId, text, attachments = [], studentId = null) => {
    const clientId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const reply = get().replyTo;
    const replyTo = reply?._id || null;
    const replyToAttachment = Number.isInteger(reply?.__imageIndex)
      ? reply.__imageIndex
      : null;

    get().socket?.emit("message:send", {
      conversationId:
        conversationId === DRAFT_CONVERSATION_ID ? null : conversationId,
      text,
      clientId,
      attachments,
      replyTo,
      replyToAttachment,
      createForStudentId: studentId,
    });

    const convKey =
      conversationId === DRAFT_CONVERSATION_ID
        ? DRAFT_CONVERSATION_ID
        : conversationId;

    const previewReplyTo =
      reply && replyToAttachment != null && Array.isArray(reply.attachments)
        ? {
            ...reply,
            attachments: [reply.attachments[replyToAttachment]].filter(Boolean),
          }
        : reply
        ? {
            _id: reply._id,
            text: reply.text,
            sender: reply.sender,
            createdAt: reply.createdAt,
            attachments: reply.attachments || [],
          }
        : null;

    const myRole =
      JSON.parse(localStorage.getItem("user") || "{}")?.role || "student";

    set((s) => ({
      messagesByConv: {
        ...s.messagesByConv,
        [convKey]: upsertMsg(s.messagesByConv[convKey] || [], {
          clientId,
          text,
          attachments,
          senderRole: myRole,
          createdAt: new Date().toISOString(),
          conversation: convKey,
          replyTo: previewReplyTo,
          replyToAttachment,
        }),
      },
    }));
    get().clearReplyTo();
  },

  deleteConversation: async (conversationId, alsoDeleteOther) => {
    await axiosClient.delete(`/chat/conversations/${conversationId}`, {
      data: { alsoDeleteOther: !!alsoDeleteOther },
    });
    get()._removeConvoFromState(conversationId);
  },

  markStatus: async (conversationId, status) => {
    const { data } = await axiosClient.patch(
      `/chat/conversations/${conversationId}/status`,
      { status }
    );
    return data;
  },
}));

export default useChatStore;
