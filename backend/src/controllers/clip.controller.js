const Clip = require('../models/Clip');
const Job = require('../models/Job');
const logger = require('../config/logger');

// Get Clip by ID
exports.getClipById = async (req, res) => {
  try {
    const { id } = req.params;

    const clip = await Clip.findById(id).populate('jobId', 'userId');

    if (!clip) {
      return res.status(404).json({
        success: false,
        message: 'Clip not found'
      });
    }

    // Check ownership
    if (clip.jobId.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { clip }
    });

  } catch (error) {
    logger.error('Get clip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clip',
      error: error.message
    });
  }
};

// Get Clips by Job ID
exports.getClipsByJobId = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Verify job ownership
    const job = await Job.findOne({ _id: jobId, userId: req.user.userId });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const clips = await Clip.find({ jobId }).sort({ score: -1 });

    res.json({
      success: true,
      data: {
        clips,
        total: clips.length
      }
    });

  } catch (error) {
    logger.error('Get clips by job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clips',
      error: error.message
    });
  }
};

// Delete Clip
exports.deleteClip = async (req, res) => {
  try {
    const { id } = req.params;

    const clip = await Clip.findById(id).populate('jobId', 'userId');

    if (!clip) {
      return res.status(404).json({
        success: false,
        message: 'Clip not found'
      });
    }

    // Check ownership
    if (clip.jobId.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await clip.deleteOne();

    logger.info(`Clip deleted: ${id}`);

    res.json({
      success: true,
      message: 'Clip deleted successfully'
    });

  } catch (error) {
    logger.error('Delete clip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete clip',
      error: error.message
    });
  }
};
