const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  subjectCode: {
    type: String,
    trim: true,
    default: ''
  },
  semester: {
    type: String,
    required: true,
    trim: true
  },
  branch: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['Lecture Notes', 'Question Paper', 'Study Guide', 'Lab Manual', 'Assignment', 'Other'],
    default: 'Lecture Notes'
  },
  academicYear: {
    type: String,
    trim: true,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    trim: true,
    default: ''
  },
  fileType: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  upvotes: {
    type: Number,
    default: 0
  },
  downvotes: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

noteSchema.index({ title: 'text', description: 'text', subject: 'text', subjectCode: 'text', tags: 'text' });
noteSchema.index({ semester: 1, branch: 1, subject: 1, category: 1 });

module.exports = mongoose.model('Note', noteSchema);
