const Job = require('../models/Job');
const User = require('../models/User');
const UsageLog = require('../models/UsageLog');
const { downloadQueue } = require('../config/queue');
const logger = require('../config/logger');

// Create Job
exports.createJob = async (req, res) => {
  try {
    const { sourceUrl, settings } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!sourceUrl) {
      return res.status(400).json({
        success: false,
        message: 'Source URL is required'
      });
    }

    // Check user credits
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.credits < 1) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient credits'
      });
    }

    // Create job
    const job = await Job.create({
      userId,
      sourceUrl,
      status: 'pending',
      settings: {
        clips: settings?.clips || 5,
        subtitleStyle: settings?.subtitleStyle || 'tiktok',
        language: settings?.language || 'id',
        aspectRatio: settings?.aspectRatio || '9:16'
      }
    });

    // Deduct credits
    user.credits -= 1;
    await user.save();

    // Log usage
    await UsageLog.create({
      userId,
      jobId: job._id,
      action: 'job_created',
      creditsUsed: 1
    });

    // Add to download queue
    await downloadQueue.add('download-video', {
      jobId: job._id.toString(),
      sourceUrl,
      userId: userId
    });

    logger.info(`Job created: ${job._id} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: {
        job: {
          id: job._id,
          sourceUrl: job.sourceUrl,
          status: job.status,
          progress: job.progress,
          settings: job.settings,
          createdAt: job.createdAt
        },
        remainingCredits: user.credits
      }
    });

  } catch (error) {
    logger.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job',
      error: error.message
    });
  }
};

// Get My Jobs
exports.getMyJobs = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Job.countDocuments(query);

    res.json({
      success: true,
      data: {
        jobs,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });

  } catch (error) {
    logger.error('Get my jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
};

// Get Job by ID
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const job = await Job.findOne({ _id: id, userId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: { job }
    });

  } catch (error) {
    logger.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
      error: error.message
    });
  }
};

// Delete Job
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const job = await Job.findOneAndDelete({ _id: id, userId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    logger.info(`Job deleted: ${id} by user ${userId}`);

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });

  } catch (error) {
    logger.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job',
      error: error.message
    });
  }
};
