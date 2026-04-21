const { Worker } = require('bullmq');
const Redis = require('ioredis');
const logger = require('../config/logger');

class NotifyWorker {
  constructor() {
    this.connection = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker(
      'notify',
      async (job) => await this.processJob(job),
      {
        connection: this.connection,
        concurrency: 10,
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Notify job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Notify job ${job.id} failed:`, err.message);
    });

    logger.info('📬 Notify Worker started');
  }

  async processJob(bullJob) {
    const { jobId, userId, type } = bullJob.data;

    try {
      logger.info(`Sending notification for job ${jobId}, type: ${type}`);

      // TODO: Implement actual notification service
      // - Email
      // - Push notification
      // - WebSocket
      // - Webhook

      switch (type) {
        case 'job_completed':
          logger.info(`Job ${jobId} completed notification sent to user ${userId}`);
          // await emailService.sendJobCompletedEmail(userId, jobId);
          break;
        
        case 'job_failed':
          logger.info(`Job ${jobId} failed notification sent to user ${userId}`);
          // await emailService.sendJobFailedEmail(userId, jobId);
          break;

        default:
          logger.warn(`Unknown notification type: ${type}`);
      }

      return { success: true };

    } catch (error) {
      logger.error(`Notification failed for job ${jobId}:`, error);
      throw error;
    }
  }
}

module.exports = NotifyWorker;
