const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  course_name: String,
});

module.exports = mongoose.model('Course', courseSchema);
