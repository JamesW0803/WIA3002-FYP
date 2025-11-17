const { Server } = require("socket.io");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const socketAuth = require("./authSocket");
const mongoose = require("mongoose");

let ioInstance = null;
function getIO() {
  return ioInstance;
}

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
    path: "/api/socket.io",
  });

  ioInstance = io;

  socketAuth(io);

  io.on("connection", (socket) => {
    const { id: userId, role } = socket.user;

    // personal room (for targeted notifications)
    socket.join(`user:${userId}`);
    // global advisors room
    if (role === "admin") socket.join("admins");

    socket.on("conversation:join", async ({ conversationId }) => {
      const convo = await Conversation.findById(conversationId).lean();
      if (!convo) return;
      // auth
      if (role !== "admin" && String(convo.student) !== String(userId)) return;
      socket.join(`conv:${conversationId}`);
    });

    socket.on("conversation:leave", ({ conversationId }) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on("typing", ({ conversationId, isTyping }) => {
      socket
        .to(`conv:${conversationId}`)
        .emit("typing", { userId, isTyping, conversationId });
    });

    socket.on(
      "message:send",
      async ({
        conversationId,
        text,
        attachments = [],
        clientId,
        replyTo,
        replyToAttachment,
        createForStudentId,
      }) => {
        // block only if no text AND no attachments
        if (!text?.trim() && (!attachments || attachments.length === 0)) return;

        let convo = null;
        let isNewConvo = false;

        const looksLikeObjectId =
          conversationId && mongoose.isValidObjectId(conversationId);

        if (looksLikeObjectId) {
          convo = await Conversation.findById(conversationId);
          if (!convo) return; // silently drop if bad id
          // authorization
          if (role !== "admin" && String(convo.student) !== String(userId))
            return;
        } else {
          const studentId = role === "admin" ? createForStudentId : userId;
          if (!studentId) return; // admin must specify target student if starting a new thread via socket

          convo = await Conversation.findOne({
            student: studentId,
            status: "open",
            deletedForAdmin: { $ne: true },
            deletedForStudent: { $ne: true }
          });

          if(!convo){
            convo = await Conversation.create({
              student: studentId,
              subject: "",
            });
            isNewConvo = true;
          }
        }

        // Validate reply target belongs to same conversation (or drop it)
        let replyToId = null;
        if (replyTo && mongoose.isValidObjectId(replyTo)) {
          try {
            const target = await Message.findById(replyTo).select(
              "conversation"
            );
            if (target && String(target.conversation) === String(convo._id)) {
              replyToId = target._id;
            }
          } catch {}
        }

        if (role === "student") {
          convo.deletedForAdmin = false;
        } else {
          convo.deletedForStudent = false;
        }

        const msg = await Message.create({
          conversation: convo._id,
          sender: userId,
          senderRole: role,
          text: text ?? "",
          attachments,
          clientId,
          readBy: [userId],
          replyTo: replyToId,
          replyToAttachment: Number.isInteger(replyToAttachment)
            ? replyToAttachment
            : null,
        });

        convo.lastMessage = msg._id;
        if (role === "student" && convo.status === "done") {
          convo.status = "open";
          convo.closedBy = undefined;
          convo.closedAt = undefined;
        }
        await convo.save();
        await convo.populate({
          path: "student",
          select: "username role profilePicture profileColor email",
        });

        const payload = await Message.findById(msg._id)
          .populate({ path: "sender", select: "username role profilePicture" })
          .populate({
            path: "replyTo",
            select: "_id text attachments sender createdAt",
            populate: {
              path: "sender",
              select: "username role profilePicture",
            },
          });

        socket.join(`conv:${convo._id}`);

        io.to(`conv:${convo._id}`).emit("message:new", payload);

        const updatedEnvelope = {
          conversationId: convo._id.toString(),
          updatedAt: new Date(),
          lastMessage: payload,
          status: convo.status,
          student: convo.student
            ? {
                _id: convo.student._id,
                username: convo.student.username,
                role: convo.student.role,
                profilePicture: convo.student.profilePicture,
                profileColor: convo.student.profileColor,
                email: convo.student.email,
              }
            : undefined,
        };

        io.to("admins").emit("conversation:updated", updatedEnvelope);
        io.to(`user:${convo.student._id.toString()}`).emit(
          "conversation:updated",
          updatedEnvelope
        );
        socket.emit("message:ack", {
          clientId,
          serverId: msg._id.toString(),
          conversationId: convo._id.toString(),
          isNew: isNewConvo,
        });
      }
    );

    socket.on("message:read", async ({ conversationId, messageIds }) => {
      await Message.updateMany(
        { _id: { $in: messageIds }, conversation: conversationId },
        { $addToSet: { readBy: userId } }
      );
      socket
        .to(`conv:${conversationId}`)
        .emit("message:read", { by: userId, messageIds });
    });

    socket.on("disconnect", () => {});
  });

  return io;
}

module.exports = initSocket;
module.exports.getIO = getIO;
