const crypto = require("crypto");
const mongoose = require("mongoose");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Student = require("../models/Student");

const { getIO } = require("../socket");

const {
  ensureContainer,
  getWriteSAS,
  UPLOADS_CONTAINER,
} = require("../lib/azure");

// POST /chat/conversations
exports.createConversation = async (req, res) => {
  try {
    const me = req.user.user_id;
    const role = req.user.role;
    const { subject = "", studentId } = req.body;

    const student = role === "admin" ? studentId || null : me;
    if (!student)
      return res.status(400).json({ message: "studentId required" });

    const convo = await Conversation.create({ student, subject });
    return res.status(201).json(convo);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to create conversation" });
  }
};

// POST /chat/conversations/create-or-get
exports.createOrGetConversation = async (req, res) => {
  try {
    const me = req.user.user_id;
    const role = req.user.role;
    const { subject = "", studentId, studentName } = req.body;

    let student = studentId || null;

    // allow admin create by studentName
    if (!student && studentName) {
      const studentDoc = await Student.findOne({ username: studentName });
      if (!studentDoc)
        return res.status(404).json({ message: "Student not found" });
      student = studentDoc._id;
    }

    // admin must specify student
    if (role === "admin" && !student) {
      return res
        .status(400)
        .json({ message: "studentId or studentName required" });
    }

    // students can only create for themselves
    if (role !== "admin") student = me;

    let convo = await Conversation.findOne({
      student,
      status: "open",
      deletedForAdmin: { $ne: true },
      deletedForStudent: { $ne: true },
    });

    if (!convo) {
      convo = await Conversation.create({ student, subject });
    }

    return res.status(201).json(convo);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to create conversation" });
  }
};

// GET /chat/conversations?status=open|done
exports.listConversations = async (req, res) => {
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

    return res.json(convos);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

// PATCH /chat/conversations/:id/status  (admin only)
exports.updateConversationStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const { id } = req.params;
    const { status } = req.body; // "open" | "done"

    if (!["open", "done"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

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

    // optional: notify lists in realtime
    const io = getIO && getIO();
    if (io) {
      io.to("admins").emit("conversation:updated", {
        conversationId: convo._id,
        lastMessage: convo.lastMessage,
        updatedAt: convo.updatedAt,
        student: convo.student,
        status: convo.status,
      });
      io.to(`user:${convo.student._id || convo.student}`).emit(
        "conversation:updated",
        {
          conversationId: convo._id,
          lastMessage: convo.lastMessage,
          updatedAt: convo.updatedAt,
          student: convo.student,
          status: convo.status,
        }
      );
    }

    return res.json(convo);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to update status" });
  }
};

// GET /chat/messages?conversationId=...&before=...&limit=...
exports.getMessages = async (req, res) => {
  try {
    const { conversationId, before, limit = 30 } = req.query;
    if (!conversationId) {
      return res.status(400).json({ message: "conversationId required" });
    }

    const convo = await Conversation.findById(conversationId).lean();
    if (!convo)
      return res.status(404).json({ message: "Conversation not found" });

    const role = req.user.role;
    const me = req.user.user_id;

    // auth: student only sees own; admin sees all
    if (role !== "admin" && String(convo.student) !== String(me)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // soft-delete visibility
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

    return res.json({ messages: messages.reverse() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// GET /chat/unread-counts
exports.getUnreadCounts = async (req, res) => {
  try {
    const me = req.user.user_id;
    const role = req.user.role; // "student" | "admin"

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
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to get unread counts" });
  }
};

// POST /chat/upload-url
exports.getUploadUrl = async (req, res) => {
  try {
    const { filename, mimeType } = req.body || {};
    if (!filename || !mimeType) {
      return res
        .status(400)
        .json({ message: "filename and mimeType required" });
    }

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

    return res.json({ uploadUrl, blobUrl, expiresOn });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to create upload URL" });
  }
};

// POST /chat/conversations/advise-on-course-plan (admin only)
exports.adviseOnCoursePlan = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    const { studentId, message } = req.body;
    if (!studentId || !message) {
      return res
        .status(400)
        .json({ message: "studentId and message required" });
    }

    let convo = await Conversation.findOne({
      student: studentId,
      status: "open",
      deletedForAdmin: { $ne: true },
      deletedForStudent: { $ne: true },
    });

    if (!convo) {
      convo = await Conversation.create({
        student: studentId,
        subject: "General Support",
      });
    }

    const newMsg = await Message.create({
      conversation: convo._id,
      sender: req.user.user_id,
      senderRole: "admin",
      text: message,
    });

    convo.lastMessage = newMsg._id;
    await convo.save();

    return res.json(convo);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to send feedback" });
  }
};

// DELETE /chat/conversations/:id
exports.deleteConversation = async (req, res) => {
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
      await Message.deleteMany({ conversation: convo._id });
      await Conversation.deleteOne({ _id: convo._id });
      hardDeleted = true;
    } else {
      await convo.save();
    }

    // Notify via socket (if available)
    const io = getIO && getIO();
    if (io) {
      if (hardDeleted || alsoDeleteOther) {
        io.to("admins").emit("conversation:deleted", { conversationId: id });
        io.to(`user:${convo.student.toString()}`).emit("conversation:deleted", {
          conversationId: id,
        });
      } else {
        if (role === "admin") {
          io.to("admins").emit("conversation:deleted", { conversationId: id });
        } else {
          io.to(`user:${convo.student.toString()}`).emit(
            "conversation:deleted",
            {
              conversationId: id,
            }
          );
        }
      }
    }

    return res.json({ ok: true, hardDeleted });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to delete conversation" });
  }
};
