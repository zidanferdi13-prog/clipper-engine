const Clip = require('../models/Clip');
const Job = require('../models/Job');
const logger = require('../config/logger');

// Helper: convert internal /app/storage/... path → public HTTP URL
function toPublicUrl(filePath) {
  if (!filePath) return null;
  const base = (process.env.STORAGE_PATH || '/app/storage').replace(/\/$/, '');
  const apiUrl = (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`);
  // Replace the storage prefix with the public /storage route
  return filePath.replace(base, `${apiUrl}/storage`);
}

function serializeClip(clip) {
  const obj = clip.toObject ? clip.toObject() : { ...clip };
  obj.fileUrl      = toPublicUrl(obj.fileUrl);
  obj.thumbnailUrl = toPublicUrl(obj.thumbnailUrl);
  obj.subtitleUrl  = toPublicUrl(obj.subtitleUrl);
  return obj;
}

// Get Clip by ID
exports.getClipById = async (req, res) => {
  try {
    const { id } = req.params;

    const clip = await Clip.findById(id);

    if (!clip) {
      return res.status(404).json({
        success: false,
        message: 'Clip not found'
      });
    }

    // Check ownership via related Job
    const job = await Job.findById(clip.jobId);
    if (!job || job.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { clip: serializeClip(clip) }
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

    // jobId stored as plain string by worker (strict:false schema)
    const clips = await Clip.find({ jobId: String(jobId) }).sort({ score: -1 });

    res.json({
      success: true,
      data: {
        clips: clips.map(serializeClip),
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

    const clip = await Clip.findById(id);

    if (!clip) {
      return res.status(404).json({
        success: false,
        message: 'Clip not found'
      });
    }

    // Check ownership via related Job
    const job = await Job.findById(clip.jobId);
    if (!job || job.userId.toString() !== req.user.userId) {
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
