const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    course_code: { 
        type: String, 
        required: true,
        unique: true,
    },
    course_name: { 
      type: String, 
      required: true,
      unique: true,
    },
    description: { 
      type: String, 
      required: true,
      unique: true,
    },
    credit_hours: {
      type: Number,
      required: true,
    },
    prerequisites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'courses'
    }],
    department: {
        type: String,
        required: false,
    },
}, {
    timestamps: true,
    collection: 'courses'
});

module.exports = mongoose.model('Course', courseSchema);
