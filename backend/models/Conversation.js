const mongoose = require("mongoose");
const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    // one student per conversation (advisor side is a team, not a single user)
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    coursePlanToBeReviewed: {
      type: Schema.Types.ObjectId,
      ref: "StudentAcademicPlan",
      required: false,
      default: null,
    },
    subject: { type: String, default: "" },
    status: {
      type: String,
      enum: ["open", "done"],
      default: "open",
      index: true,
    },
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    closedAt: { type: Date },

    deletedForStudent: { type: Boolean, default: false, index: true },
    deletedForAdmin: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

conversationSchema.index({ student: 1, updatedAt: -1 });
module.exports = mongoose.model("Conversation", conversationSchema);
