const { Worker } = require('bullmq');
const Redis = require('ioredis');
const path = require('path');
const logger = require('../config/logger');
const { Job } = require('../models');
const downloadService = require('../services/download.service');
const eventEmitter = require('../services/event-emitter.service');

class DownloadWorker {
  constructor() {
    this.connection = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker(
      'download',
      async (job) => await this.processJob(job),
      {
        connection: this.connection,
        concurrency: 2, // Process 2 downloads at a time
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Download job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Download job ${job.id} failed:`, err.message);
    });

    logger.info('📥 Download Worker started');
  }

  async processJob(bullJob) {
    const { jobId, sourceUrl, userId } = bullJob.data;

    try {
      logger.info(`Processing download for job ${jobId}`);

      // Update job status
      await Job.findByIdAndUpdate(jobId, {
        status: 'downloading',
        progress: 10
      });

      // Emit progress event
      eventEmitter.emitJobProgress(userId, {
        jobId,
        status: 'downloading',
        progress: 10,
        message: 'Downloading video...'
      });

      // Download video
      const result = await downloadService.downloadVideo(sourceUrl, jobId);

      // Update job with video metadata
      await Job.findByIdAndUpdate(jobId, {
        status: 'downloading',
        progress: 50,
        metadata: {
          duration: result.duration,
          videoUrl: result.videoPath,
          thumbnailUrl: result.thumbnailPath,
          fileSize: result.fileSize
        }
      });

      logger.info(`Video downloaded for job ${jobId}`);

      // Add to transcribe queue
      const { transcribeQueue } = require('../../backend/src/config/queue');
      await transcribeQueue.add('transcribe-audio', {
        jobId,
        videoPath: result.videoPath,
        userId
      });

      return result;

    } catch (error) {
      logger.error(`Download failed for job ${jobId}:`, error);

      await Job.findByIdAndUpdate(jobId, {
        status: 'failed',
        error: {
          message: error.message,
          code: 'DOWNLOAD_FAILED',
          timestamp: new Date()
        }
      });

      throw error;
    }
  }
}

module.exports = DownloadWorker;
