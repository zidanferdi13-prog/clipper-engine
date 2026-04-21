const { Worker } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../config/logger');
const { Job, Clip } = require('../models');
const renderService = require('../services/render.service');
const eventEmitter = require('../services/event-emitter.service');

class RenderWorker {
  constructor() {
    this.connection = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker(
      'render',
      async (job) => await this.processJob(job),
      {
        connection: this.connection,
        concurrency: 2, // Render 2 clips at a time
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Render job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Render job ${job.id} failed:`, err.message);
    });

    logger.info('🎬 Render Worker started');
  }

  async processJob(bullJob) {
    const { jobId, segment, clipIndex, totalClips, userId } = bullJob.data;

    try {
      logger.info(`Rendering clip ${clipIndex + 1}/${totalClips} for job ${jobId}`);

      // Get job details
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Update job status
      const progress = 70 + Math.floor((clipIndex / totalClips) * 25);
      await Job.findByIdAndUpdate(jobId, {
        status: 'rendering',
        progress
      });

      // Emit progress event
      eventEmitter.emitJobProgress(userId, {
        jobId,
        status: 'rendering',
        progress,
        message: `Rendering clip ${clipIndex + 1}/${totalClips}...`
      });

      // Render clip
      const result = await renderService.renderClip({
        videoPath: job.metadata.videoUrl,
        segment,
        jobId,
        clipIndex,
        settings: job.settings
      });

      // Create clip in database
      const clip = await Clip.create({
        jobId,
        title: segment.title,
        description: segment.description,
        start: segment.start,
        end: segment.end,
        duration: segment.end - segment.start,
        score: segment.score,
        fileUrl: result.clipUrl,
        thumbnailUrl: result.thumbnailUrl,
        status: 'completed',
        metadata: {
          fileSize: result.fileSize,
          resolution: result.resolution,
          fps: result.fps
        },
        aiAnalysis: {
          hookStrength: segment.hookStrength,
          emotionalTone: segment.emotionalTone,
          keywords: segment.keywords,
          category: segment.category
        }
      });

      logger.info(`Clip ${clipIndex + 1}/${totalClips} rendered for job ${jobId}`);

      // Emit clip rendered event
      eventEmitter.emitClipRendered(userId, {
        jobId,
        clipId: clip._id.toString(),
        clipIndex: clipIndex + 1,
        totalClips
      });

      // If this is the last clip, mark job as completed
      const completedClips = await Clip.countDocuments({ jobId, status: 'completed' });
      if (completedClips === totalClips) {
        await Job.findByIdAndUpdate(jobId, {
          status: 'completed',
          progress: 100,
          completedAt: new Date()
        });

        // Emit job completed event
        eventEmitter.emitJobCompleted(userId, {
          jobId,
          clipsCount: totalClips
        });

        // Add to notify queue
        const { notifyQueue } = require('../../backend/src/config/queue');
        await notifyQueue.add('notify-user', {
          jobId,
          userId,
          type: 'job_completed'
        });

        logger.info(`Job ${jobId} completed successfully`);
      }

      return result;

    } catch (error) {
      logger.error(`Render failed for clip ${clipIndex + 1} of job ${jobId}:`, error);

      await Clip.create({
        jobId,
        title: segment.title,
        start: segment.start,
        end: segment.end,
        duration: segment.end - segment.start,
        status: 'failed'
      });

      throw error;
    }
  }
}

module.exports = RenderWorker;
