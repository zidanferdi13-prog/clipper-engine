const express = require('express');
const { createServer } = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/database');
const logger = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');
const websocketService = require('./services/websocket.service');

// Routes
const authRoutes = require('./routes/auth.routes');
const jobRoutes = require('./routes/job.routes');
const clipRoutes = require('./routes/clip.routes');
const usageRoutes = require('./routes/usage.routes');
const billingRoutes = require('./routes/billing.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/clips', clipRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);

// Error Handler
app.use(errorHandler);

// Initialize WebSocket
websocketService.initialize(httpServer);

// Start Server
httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔌 WebSocket ready`);
});

module.exports = app;
