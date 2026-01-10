const mongoose = require("mongoose");

const programmeSchema = new mongoose.Schema(
  {
    programme_name: {
      type: String,
      required: true,
      unique: true,
    },
    programme_code: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      // required: true,
    },
    faculty: {
      type: String,
      // required: true,
    },
    department: {
      type: String,
      // required: true,
    },
  },
  {
    timestamps: true,
    collection: "programmes",
  }
);

module.exports = mongoose.model("Programme", programmeSchema);
