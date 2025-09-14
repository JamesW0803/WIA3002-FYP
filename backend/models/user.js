const mongoose = require("mongoose");

const userBaseSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["student", "admin"],
    },
  },
  {
    discriminatorKey: "role",
    collection: "users",
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userBaseSchema);
