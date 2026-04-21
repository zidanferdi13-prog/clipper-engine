const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sourceUrl: {
    type: String,
    required: true
  },
  title: String,
  status: {
    type: String,
    enum: ['pending', 'downloading', 'transcribing', 'analyzing', 'rendering', 'completed', 'failed'],
    default: 'pending'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  settings: {
    clips: {
      type: Number,
      default: 5,
      min: 1,
      max: 20
    },
    subtitleStyle: {
      type: String,
      enum: ['tiktok', 'youtube', 'minimal', 'bold'],
      default: 'tiktok'
    },
    language: {
      type: String,
      default: 'id'
    },
    aspectRatio: {
      type: String,
      enum: ['9:16', '1:1', '16:9'],
      default: '9:16'
    }
  },
  metadata: {
    duration: Number,
    videoUrl: String,
    audioUrl: String,
    thumbnailUrl: String,
    fileSize: Number
  },
  error: {
    message: String,
    code: String,
    timestamp: Date
  },
  creditsUsed: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

// Index for faster queries
jobSchema.index({ userId: 1, createdAt: -1 });
jobSchema.index({ status: 1 });

module.exports = mongoose.model('Job', jobSchema);
