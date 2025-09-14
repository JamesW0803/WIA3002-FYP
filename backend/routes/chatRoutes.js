const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const mongoose = require("mongoose");

const { authenticate } = require("../middleware/authMiddleware");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const { getIO } = require("../socket");

const {
  ensureContainer,
  getWriteSAS,
  UPLOADS_CONTAINER,
} = require("../lib/azure");

// Create a conversation (student can create many; admin can create for a student)
router.post("/conversations", authenticate, async (req, res) => {
  try {
    const me = req.user.user_id;
    const role = req.user.role;
    const { subject = "", studentId } = req.body;

    const student = role === "admin" ? studentId || null : me;
    if (!student)
      return res.status(400).json({ message: "studentId required" });

    // no uniqueness constraint; each create is a new dialogue
    const convo = await Conversation.create({ student, subject });
    res.status(201).json(convo);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to create conversation" });
  }
});

// List conversations
// - student: only their own
// - admin: all
router.get("/conversations", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    const me = req.user.user_id;
    const { status = "open" } = req.query;

    const filter = role === "admin" ? {} : { student: me };
    if (["open", "done"].includes(status)) filter.status = status;

    if (role === "admin") filter.deletedForAdmin = { $ne: true };
    else filter.deletedForStudent = { $ne: true };

    const convos = await Conversation.find(filter)
      .sort({ updatedAt: -1 })
      .populate({
        path: "student",
        select: "username role profilePicture profileColor email",
      })
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username role profilePicture" },
      });

    res.json(convos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

router.delete("/conversations/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { alsoDeleteOther = false } = req.body || {};
    const role = req.user.role;
    const me = req.user.user_id;

    const convo = await Conversation.findById(id);
    if (!convo)
      return res.status(404).json({ message: "Conversation not found" });

    if (role !== "admin" && String(convo.student) !== String(me)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // apply soft-delete flags
    if (role === "admin") {
      convo.deletedForAdmin = true;
      if (alsoDeleteOther) convo.deletedForStudent = true;
    } else {
      convo.deletedForStudent = true;
      if (alsoDeleteOther) convo.deletedForAdmin = true;
    }

    // If both deleted → hard delete
    let hardDeleted = false;
    if (convo.deletedForStudent && convo.deletedForAdmin) {
      // remove messages then conversation
      await Message.deleteMany({ conversation: convo._id });
      await Conversation.deleteOne({ _id: convo._id });
      hardDeleted = true;
    } else {
      await convo.save();
    }

    // Notify via socket
    const io = getIO && getIO();
    if (io) {
      if (hardDeleted || alsoDeleteOther) {
        io.to("admins").emit("conversation:deleted", { conversationId: id });
        io.to(`user:${convo.student.toString()}`).emit("conversation:deleted", {
          conversationId: id,
        });
      } else {
        // only hide for requester: emit back so their list updates immediately
        if (role === "admin")
          io.to("admins").emit("conversation:deleted", { conversationId: id });
        else
          io.to(`user:${convo.student.toString()}`).emit(
            "conversation:deleted",
            { conversationId: id }
          );
      }
    }

    return res.json({ ok: true, hardDeleted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to delete conversation" });
  }
});

// Paginated messages for a conversation
router.get("/messages", authenticate, async (req, res) => {
  try {
    const { conversationId, before, limit = 30 } = req.query;
    if (!conversationId)
      return res.status(400).json({ message: "conversationId required" });

    const convo = await Conversation.findById(conversationId).lean();
    if (!convo)
      return res.status(404).json({ message: "Conversation not found" });

    // auth: student only sees own; admin sees all
    const role = req.user.role;
    const me = req.user.user_id;
    if (role !== "admin" && String(convo.student) !== String(me)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (
      (role === "admin" && convo.deletedForAdmin) ||
      (role !== "admin" && convo.deletedForStudent)
    ) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const query = { conversation: conversationId };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate({ path: "sender", select: "username role profilePicture" })
      .populate({
        path: "replyTo",
        select: "_id text attachments sender createdAt",
        populate: { path: "sender", select: "username role profilePicture" },
      });

    res.json({ messages: messages.reverse() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// Mark conversation status (admin only)
router.patch("/conversations/:id/status", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admins only" });
    const { id } = req.params;
    const { status } = req.body; // "open" | "done"
    if (!["open", "done"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const update = {
      $set: {
        status,
        ...(status === "done"
          ? { closedBy: req.user.user_id, closedAt: new Date() }
          : {}),
      },
      ...(status === "open" ? { $unset: { closedBy: "", closedAt: "" } } : {}),
    };

    const convo = await Conversation.findByIdAndUpdate(id, update, {
      new: true,
    })
      .populate({ path: "student", select: "username role profilePicture" })
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username role profilePicture" },
      });

    if (!convo)
      return res.status(404).json({ message: "Conversation not found" });
    res.json(convo);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to update status" });
  }
});

router.post("/upload-url", authenticate, async (req, res) => {
  try {
    const { filename, mimeType } = req.body || {};
    if (!filename || !mimeType) {
      return res
        .status(400)
        .json({ message: "filename and mimeType required" });
    }

    // make sure the container exists (dev-friendly)
    await ensureContainer(UPLOADS_CONTAINER, "blob");

    const safeName = filename.replace(/[^\w.\-]+/g, "_");
    const blobName = `${req.user.user_id}/${Date.now()}_${crypto
      .randomBytes(6)
      .toString("hex")}_${safeName}`;

    const { uploadUrl, blobUrl, expiresOn } = await getWriteSAS({
      containerName: UPLOADS_CONTAINER,
      blobName,
      contentType: mimeType,
      minutes: 15,
    });

    res.json({ uploadUrl, blobUrl, expiresOn });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to create upload URL" });
  }
});

// Unread counts per conversation for current user
router.get("/unread-counts", authenticate, async (req, res) => {
  try {
    const me = req.user.user_id;
    const role = req.user.role; // "student" | "admin"

    // Limit conversations: students only see theirs; admins see all.
    const convFilter =
      role === "admin"
        ? { deletedForAdmin: { $ne: true } }
        : { student: me, deletedForStudent: { $ne: true } };
    const convs = await Conversation.find(convFilter).select("_id").lean();
    const convIds = convs.map((c) => c._id);

    if (convIds.length === 0) return res.json({});
    const counts = await Message.aggregate([
      {
        $match: {
          conversation: { $in: convIds },
          senderRole: { $ne: role }, // only messages from the other side
          readBy: { $nin: [new mongoose.Types.ObjectId(me)] },
        },
      },
      { $group: { _id: "$conversation", count: { $sum: 1 } } },
    ]);
    const result = {};
    for (const c of counts) result[c._id.toString()] = c.count;
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to get unread counts" });
  }
});

module.exports = router;
