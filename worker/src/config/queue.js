const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const downloadQueue = new Queue('download', { connection });
const transcribeQueue = new Queue('transcribe', { connection });
const analyzeQueue = new Queue('analyze', { connection });
const renderQueue = new Queue('render', { connection });
const notifyQueue = new Queue('notify', { connection });

module.exports = {
  downloadQueue,
  transcribeQueue,
  analyzeQueue,
  renderQueue,
  notifyQueue,
  connection,
};
