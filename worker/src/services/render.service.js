const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/logger');

// Set FFmpeg paths
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

class RenderService {
  constructor() {
    this.storageDir = process.env.STORAGE_PATH || './storage';
  }

  async renderClip({ videoPath, segment, jobId, clipIndex, settings }) {
    try {
      const { start, end, title } = segment;
      const { subtitleStyle, aspectRatio } = settings;

      const outputDir = path.join(this.storageDir, 'clips');
      await fs.mkdir(outputDir, { recursive: true });

      const outputPath = path.join(outputDir, `${jobId}_clip_${clipIndex}.mp4`);
      const thumbnailPath = path.join(this.storageDir, 'thumbnails', `${jobId}_clip_${clipIndex}.jpg`);

      logger.info(`Rendering clip ${clipIndex}: ${start}s - ${end}s`);

      // Get aspect ratio dimensions
      const dimensions = this.getAspectRatioDimensions(aspectRatio);

      await this.renderVideo({
        inputPath: videoPath,
        outputPath,
        start,
        end,
        dimensions,
        subtitleStyle
      });

      // Generate thumbnail
      await this.generateThumbnail(outputPath, thumbnailPath);

      // Get file stats
      const stats = await fs.stat(outputPath);

      logger.info(`Clip rendered successfully: ${outputPath}`);

      return {
        clipUrl: outputPath,
        thumbnailUrl: thumbnailPath,
        fileSize: stats.size,
        resolution: `${dimensions.width}x${dimensions.height}`,
        fps: 30
      };

    } catch (error) {
      logger.error('Render error:', error);
      throw new Error(`Failed to render clip: ${error.message}`);
    }
  }

  renderVideo({ inputPath, outputPath, start, end, dimensions, subtitleStyle }) {
    return new Promise((resolve, reject) => {
      const duration = end - start;

      let command = ffmpeg(inputPath)
        .setStartTime(start)
        .setDuration(duration)
        .size(`${dimensions.width}x${dimensions.height}`)
        .aspect(dimensions.aspect)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart',
          '-pix_fmt yuv420p'
        ]);

      // Apply subtitle filter if needed
      if (subtitleStyle && subtitleStyle !== 'none') {
        // TODO: Implement subtitle burning
        // This would involve generating SRT file and burning it into video
        // For now, we skip subtitle rendering in V1
      }

      command
        .on('start', (commandLine) => {
          logger.info('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          logger.info(`Rendering progress: ${progress.percent}%`);
        })
        .on('end', () => {
          logger.info('Rendering finished');
          resolve();
        })
        .on('error', (err) => {
          logger.error('FFmpeg error:', err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  getAspectRatioDimensions(aspectRatio) {
    const ratios = {
      '9:16': { width: 1080, height: 1920, aspect: '9:16' },  // Vertical (TikTok/Reels)
      '1:1': { width: 1080, height: 1080, aspect: '1:1' },    // Square (Instagram)
      '16:9': { width: 1920, height: 1080, aspect: '16:9' }   // Horizontal (YouTube)
    };

    return ratios[aspectRatio] || ratios['9:16'];
  }

  async generateThumbnail(videoPath, thumbnailPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: '320x?'
        })
        .on('end', () => {
          logger.info('Thumbnail generated');
          resolve();
        })
        .on('error', (err) => {
          logger.warn('Thumbnail generation failed:', err);
          resolve(); // Don't fail the whole process if thumbnail fails
        });
    });
  }
}

module.exports = new RenderService();
