const Redis = require('ioredis');
const logger = require('../config/logger');

class EventEmitterService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  // Emit job progress event
  emitJobProgress(userId, jobData) {
    const event = {
      type: 'job.progress',
      userId,
      jobId: jobData.jobId,
      status: jobData.status,
      progress: jobData.progress,
      message: jobData.message,
      timestamp: new Date().toISOString()
    };

    this.redis.publish('worker:events', JSON.stringify(event));
    logger.info(`Event emitted: job.progress - Job ${jobData.jobId} - ${jobData.progress}%`);
  }

  // Emit job completed event
  emitJobCompleted(userId, jobData) {
    const event = {
      type: 'job.completed',
      userId,
      jobId: jobData.jobId,
      clipsCount: jobData.clipsCount,
      timestamp: new Date().toISOString()
    };

    this.redis.publish('worker:events', JSON.stringify(event));
    logger.info(`Event emitted: job.completed - Job ${jobData.jobId}`);
  }

  // Emit job failed event
  emitJobFailed(userId, jobData) {
    const event = {
      type: 'job.failed',
      userId,
      jobId: jobData.jobId,
      error: jobData.error,
      timestamp: new Date().toISOString()
    };

    this.redis.publish('worker:events', JSON.stringify(event));
    logger.error(`Event emitted: job.failed - Job ${jobData.jobId}`);
  }

  // Emit clip rendered event
  emitClipRendered(userId, clipData) {
    const event = {
      type: 'clip.rendered',
      userId,
      jobId: clipData.jobId,
      clipId: clipData.clipId,
      clipIndex: clipData.clipIndex,
      totalClips: clipData.totalClips,
      timestamp: new Date().toISOString()
    };

    this.redis.publish('worker:events', JSON.stringify(event));
    logger.info(`Event emitted: clip.rendered - Clip ${clipData.clipIndex}/${clipData.totalClips}`);
  }
}

// Singleton instance
const eventEmitterService = new EventEmitterService();

module.exports = eventEmitterService;
