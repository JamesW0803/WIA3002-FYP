const mongoose = require("mongoose");
const User = require("./User"); // Base model

const adminSchema = new mongoose.Schema({
  access_level: {
    type: String,
    enum: ["super", "basic"],
    default: "basic",
  },
  access_level: {
    type: String,
    enum: ["super", "basic"],
    default: "basic",
  },
});

const Admin = User.discriminator("admin", adminSchema);

module.exports = Admin;
