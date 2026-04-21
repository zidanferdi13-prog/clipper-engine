require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const logger = require('./config/logger');

// Import workers
const DownloadWorker = require('./workers/download.worker');
const TranscribeWorker = require('./workers/transcribe.worker');
const AnalyzeWorker = require('./workers/analyze.worker');
const RenderWorker = require('./workers/render.worker');
const NotifyWorker = require('./workers/notify.worker');

// Connect to Database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('✅ MongoDB Connected (Worker)');
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Start Workers
const startWorkers = () => {
  logger.info('🚀 Starting workers...');

  new DownloadWorker();
  new TranscribeWorker();
  new AnalyzeWorker();
  new RenderWorker();
  new NotifyWorker();

  logger.info('✅ All workers started successfully');
};

// Initialize
const init = async () => {
  await connectDB();
  startWorkers();
};

init();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});
