const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const logger = require('../config/logger');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.redisSubscriber = null;
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      }
    });

    // Subscribe to worker events from Redis
    this.redisSubscriber = new Redis(process.env.REDIS_URL);
    this.redisSubscriber.subscribe('worker:events', (err) => {
      if (err) {
        logger.error('Failed to subscribe to worker events:', err);
      } else {
        logger.info('✅ Subscribed to worker events channel');
      }
    });

    // Listen for worker events and forward to WebSocket
    this.redisSubscriber.on('message', (channel, message) => {
      if (channel === 'worker:events') {
        try {
          const event = JSON.parse(message);
          this.forwardEventToClient(event);
        } catch (error) {
          logger.error('Error parsing worker event:', error);
        }
      }
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        next();
      } catch (error) {
        logger.error('WebSocket auth error:', error);
        next(new Error('Invalid token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      logger.info(`WebSocket connected: User ${socket.userId}`);
      
      // Store connection
      this.connectedUsers.set(socket.userId, socket.id);

      // Join user's personal room
      socket.join(`user:${socket.userId}`);

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`WebSocket disconnected: User ${socket.userId}`);
        this.connectedUsers.delete(socket.userId);
      });

      // Ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });

    logger.info('✅ WebSocket service initialized');
  }

  // Forward worker events to specific user
  forwardEventToClient(event) {
    const { type, userId } = event;
    
    if (!userId) return;

    switch (type) {
      case 'job.progress':
        this.emitJobProgress(userId, event);
        break;
      case 'job.completed':
        this.emitJobCompleted(userId, event);
        break;
      case 'job.failed':
        this.emitJobFailed(userId, event);
        break;
      case 'clip.rendered':
        this.emitClipRendered(userId, event);
        break;
      default:
        logger.warn(`Unknown event type: ${type}`);
    }
  }

  // Emit job progress to specific user
  emitJobProgress(userId, jobData) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('job:progress', {
      type: 'job.progress',
      jobId: jobData.jobId,
      status: jobData.status,
      progress: jobData.progress,
      message: jobData.message,
      timestamp: new Date().toISOString()
    });

    logger.info(`Progress emitted to user ${userId}: Job ${jobData.jobId} - ${jobData.progress}%`);
  }

  // Emit job completed
  emitJobCompleted(userId, jobData) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('job:completed', {
      type: 'job.completed',
      jobId: jobData.jobId,
      clipsCount: jobData.clipsCount,
      timestamp: new Date().toISOString()
    });

    logger.info(`Job completed event emitted to user ${userId}: Job ${jobData.jobId}`);
  }

  // Emit job failed
  emitJobFailed(userId, jobData) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('job:failed', {
      type: 'job.failed',
      jobId: jobData.jobId,
      error: jobData.error,
      timestamp: new Date().toISOString()
    });

    logger.error(`Job failed event emitted to user ${userId}: Job ${jobData.jobId}`);
  }

  // Emit clip rendered
  emitClipRendered(userId, clipData) {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit('clip:rendered', {
      type: 'clip.rendered',
      jobId: clipData.jobId,
      clipId: clipData.clipId,
      clipIndex: clipData.clipIndex,
      totalClips: clipData.totalClips,
      timestamp: new Date().toISOString()
    });

    logger.info(`Clip rendered event emitted to user ${userId}: Clip ${clipData.clipIndex}/${clipData.totalClips}`);
  }

  // Broadcast to all connected users (admin notifications, etc)
  broadcast(event, data) {
    if (!this.io) return;

    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });

    logger.info(`Broadcast event: ${event}`);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }
}

// Singleton instance
const websocketService = new WebSocketService();

module.exports = websocketService;
