const mongoose = require('mongoose');

const usageLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  action: {
    type: String,
    enum: ['job_created', 'clip_rendered', 'credit_purchased', 'credit_used'],
    required: true
  },
  creditsUsed: {
    type: Number,
    default: 0
  },
  minutesProcessed: {
    type: Number,
    default: 0
  },
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for analytics
usageLogSchema.index({ userId: 1, createdAt: -1 });
usageLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('UsageLog', usageLogSchema);
