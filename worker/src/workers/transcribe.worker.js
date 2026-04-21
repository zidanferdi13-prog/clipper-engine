const { Worker } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../config/logger');
const { Job } = require('../models');
const transcribeService = require('../services/transcribe.service');
const eventEmitter = require('../services/event-emitter.service');

class TranscribeWorker {
  constructor() {
    this.connection = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker(
      'transcribe',
      async (job) => await this.processJob(job),
      {
        connection: this.connection,
        concurrency: 1, // Transcription is CPU intensive
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Transcribe job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Transcribe job ${job.id} failed:`, err.message);
    });

    logger.info('🎙️ Transcribe Worker started');
  }

  async processJob(bullJob) {
    const { jobId, videoPath, userId } = bullJob.data;

    try {
      logger.info(`Processing transcription for job ${jobId}`);

      // Update job status
      await Job.findByIdAndUpdate(jobId, {
        status: 'transcribing',
        progress: 30
      });

      // Emit progress event
      eventEmitter.emitJobProgress(userId, {
        jobId,
        status: 'transcribing',
        progress: 30,
        message: 'Transcribing audio...'
      });

      // Transcribe audio
      const transcript = await transcribeService.transcribe(videoPath, jobId);

      logger.info(`Transcription completed for job ${jobId}`);

      // Update job progress
      await Job.findByIdAndUpdate(jobId, {
        progress: 50
      });

      // Add to analyze queue
      const { analyzeQueue } = require('../../backend/src/config/queue');
      await analyzeQueue.add('analyze-content', {
        jobId,
        transcript,
        userId
      });

      return transcript;

    } catch (error) {
      logger.error(`Transcription failed for job ${jobId}:`, error);

      await Job.findByIdAndUpdate(jobId, {
        status: 'failed',
        error: {
          message: error.message,
          code: 'TRANSCRIBE_FAILED',
          timestamp: new Date()
        }
      });

      throw error;
    }
  }
}

module.exports = TranscribeWorker;
