const mongoose = require('mongoose');

const clipSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  start: {
    type: Number,
    required: true
  },
  end: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  fileUrl: String,
  thumbnailUrl: String,
  subtitleUrl: String,
  status: {
    type: String,
    enum: ['pending', 'rendering', 'completed', 'failed'],
    default: 'pending'
  },
  metadata: {
    fileSize: Number,
    resolution: String,
    fps: Number,
    bitrate: String
  },
  aiAnalysis: {
    hookStrength: Number,
    emotionalTone: String,
    keywords: [String],
    category: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
clipSchema.index({ jobId: 1 });
clipSchema.index({ score: -1 });

module.exports = mongoose.model('Clip', clipSchema);
