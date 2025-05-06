const mongoose = require("mongoose");

const userBaseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    discriminatorKey: "role",
    collection: "users",
  }
);

module.exports = mongoose.model("User", userBaseSchema);
