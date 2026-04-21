const User = require('../models/User');
const Job = require('../models/Job');
const Clip = require('../models/Clip');
const UsageLog = require('../models/UsageLog');
const logger = require('../config/logger');
const { downloadQueue } = require('../config/queue');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, plan } = req.query;

    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) query.status = status;
    if (plan) query.plan = plan;

    const users = await User.find(query)
      .select('-passwordHash -refreshToken')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });

  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-passwordHash -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user stats
    const jobsCount = await Job.countDocuments({ userId: id });
    const clipsCount = await Clip.countDocuments({ 
      jobId: { $in: await Job.find({ userId: id }).select('_id') }
    });
    
    const creditsUsed = await UsageLog.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, total: { $sum: '$creditsUsed' } } }
    ]);

    res.json({
      success: true,
      data: {
        user,
        stats: {
          jobsCount,
          clipsCount,
          creditsUsed: creditsUsed[0]?.total || 0
        }
      }
    });

  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, credits, status, role } = req.body;

    const updateData = {};
    if (plan) updateData.plan = plan;
    if (credits !== undefined) updateData.credits = credits;
    if (status) updateData.status = status;
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-passwordHash -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info(`User ${id} updated by admin ${req.adminUser.email}`);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });

  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Also delete user's jobs and clips
    await Job.deleteMany({ userId: id });
    await Clip.deleteMany({ 
      jobId: { $in: await Job.find({ userId: id }).select('_id') }
    });

    logger.info(`User ${id} deleted by admin ${req.adminUser.email}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// Get all jobs
exports.getAllJobs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;

    const jobs = await Job.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Job.countDocuments(query);

    res.json({
      success: true,
      data: {
        jobs,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });

  } catch (error) {
    logger.error('Get all jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
};

// Get job by ID
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id).populate('userId', 'name email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const clips = await Clip.find({ jobId: id });

    res.json({
      success: true,
      data: {
        job,
        clips
      }
    });

  } catch (error) {
    logger.error('Get job by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
      error: error.message
    });
  }
};

// Retry failed job
exports.retryJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    if (job.status !== 'failed') {
      return res.status(400).json({
        success: false,
        message: 'Only failed jobs can be retried'
      });
    }

    // Reset job status
    job.status = 'pending';
    job.progress = 0;
    job.error = undefined;
    await job.save();

    // Re-queue the job
    await downloadQueue.add('download-video', {
      jobId: job._id.toString(),
      sourceUrl: job.sourceUrl,
      userId: job.userId.toString()
    });

    logger.info(`Job ${id} retried by admin ${req.adminUser.email}`);

    res.json({
      success: true,
      message: 'Job queued for retry',
      data: { job }
    });

  } catch (error) {
    logger.error('Retry job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry job',
      error: error.message
    });
  }
};

// Delete job
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await Job.findByIdAndDelete(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Delete associated clips
    await Clip.deleteMany({ jobId: id });

    logger.info(`Job ${id} deleted by admin ${req.adminUser.email}`);

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

// Get system stats
exports.getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalJobs = await Job.countDocuments();
    const completedJobs = await Job.countDocuments({ status: 'completed' });
    const failedJobs = await Job.countDocuments({ status: 'failed' });
    const processingJobs = await Job.countDocuments({ 
      status: { $in: ['pending', 'downloading', 'transcribing', 'analyzing', 'rendering'] }
    });
    const totalClips = await Clip.countDocuments();

    // Recent activity
    const recentJobs = await Job.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        stats: {
          users: {
            total: totalUsers,
            active: activeUsers
          },
          jobs: {
            total: totalJobs,
            completed: completedJobs,
            failed: failedJobs,
            processing: processingJobs
          },
          clips: {
            total: totalClips
          }
        },
        recentActivity: recentJobs
      }
    });

  } catch (error) {
    logger.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
};

// Get usage stats
exports.getUsageStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.setDate(startDate.getDate() - parseInt(days)));

    const stats = await UsageLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          creditsUsed: { $sum: '$creditsUsed' },
          minutesProcessed: { $sum: '$minutesProcessed' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        stats,
        period: `${days} days`
      }
    });

  } catch (error) {
    logger.error('Get usage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage stats',
      error: error.message
    });
  }
};

// Get failed jobs
exports.getFailedJobs = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const jobs = await Job.find({ status: 'failed' })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Job.countDocuments({ status: 'failed' });

    res.json({
      success: true,
      data: {
        jobs,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });

  } catch (error) {
    logger.error('Get failed jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch failed jobs',
      error: error.message
    });
  }
};
