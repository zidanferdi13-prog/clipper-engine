const { Worker } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../config/logger');
const { renderQueue } = require('../config/queue');
const { Job } = require('../models');
const aiService = require('../services/ai.service');
const scoringService = require('../services/scoring.service');
const eventEmitter = require('../services/event-emitter.service');

class AnalyzeWorker {
  constructor() {
    this.connection = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker(
      'analyze',
      async (job) => await this.processJob(job),
      {
        connection: this.connection,
        concurrency: 3,
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Analyze job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Analyze job ${job.id} failed:`, err.message);
    });

    logger.info('🤖 Analyze Worker started');
  }

  async processJob(bullJob) {
    const { jobId, transcript, userId } = bullJob.data;

    try {
      logger.info(`Processing AI analysis for job ${jobId}`);

      // Get job settings
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Update job status
      await Job.findByIdAndUpdate(jobId, {
        status: 'analyzing',
        progress: 60
      });

      // Emit progress event
      eventEmitter.emitJobProgress(userId, {
        jobId,
        status: 'analyzing',
        progress: 60,
        message: 'AI is analyzing video content...'
      });

      // Analyze transcript with AI
      const rawSegments = await aiService.analyzeTranscript(
        transcript,
        job.settings.clips
      );

      // Enhance scores with heuristic viral scoring engine
      const segments = scoringService.enhanceScores(rawSegments, transcript);

      logger.info(`AI analysis complete for job ${jobId}: ${segments.length} clips, top score ${segments[0]?.score}`);

      // Update job progress
      await Job.findByIdAndUpdate(jobId, { progress: 70 });

      // Add render jobs, passing transcript for subtitle generation
      for (let i = 0; i < segments.length; i++) {
        await renderQueue.add('render-clip', {
          jobId,
          segment:    segments[i],
          clipIndex:  i,
          totalClips: segments.length,
          userId,
          transcript, // passed to render worker for subtitle generation
        });
      }

      return segments;

    } catch (error) {
      logger.error(`AI analysis failed for job ${jobId}:`, error);

      await Job.findByIdAndUpdate(jobId, {
        status: 'failed',
        error: {
          message: error.message,
          code: 'ANALYZE_FAILED',
          timestamp: new Date()
        }
      });

      throw error;
    }
  }
}

module.exports = AnalyzeWorker;
