const mongoose = require('mongoose');
const User = require('./user')  // Base model

const studentSchema = new mongoose.Schema({
  faculty : {
    type: String,
    required: true,
    default: "Faculty of Computer Science and Information Technology", 
  },
  department: {
    type: String,
    required: true,
  },
  programme: {
    type: String,
    required: true,
  },
  course_plans: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'course_plan' 
  }],
  
});

const Student = User.discriminator('student', studentSchema);

module.exports = Student;
