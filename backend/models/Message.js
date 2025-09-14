const mongoose = require("mongoose");
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["student", "admin"], required: true },
    text: { type: String, default: "" },
    attachments: [
      {
        url: String,
        name: String,
        mimeType: String,
        size: Number,
        caption: { type: String, default: "" },
        originalUrl: String,
        originalName: String,
        originalMimeType: String,
        originalSize: Number,
        width: Number,
        height: Number,
      },
    ],
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    clientId: { type: String },
    replyTo: { type: Schema.Types.ObjectId, ref: "Message", default: null },
    replyToAttachment: { type: Number, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });
module.exports = mongoose.model("Message", messageSchema);
