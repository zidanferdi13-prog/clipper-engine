const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const logger = require('../config/logger');

const execPromise = util.promisify(exec);

// Check if USE_YTDL_CORE environment variable is set (for Raspberry Pi)
const USE_YTDL_CORE = process.env.USE_YTDL_CORE === 'true';
let ytdl;

if (USE_YTDL_CORE) {
  try {
    ytdl = require('ytdl-core');
    logger.info('Using ytdl-core for video downloads (Raspberry Pi mode)');
  } catch (error) {
    logger.warn('ytdl-core not found, falling back to yt-dlp');
  }
}

class DownloadService {
  constructor() {
    this.storageDir = process.env.STORAGE_PATH || './storage';
  }

  async downloadVideo(url, jobId) {
    try {
      const outputDir = path.join(this.storageDir, 'raw');
      const outputPath = path.join(outputDir, `${jobId}.mp4`);
      const thumbnailPath = path.join(this.storageDir, 'thumbnails', `${jobId}.jpg`);

      // Ensure directories exist
      await fs.mkdir(outputDir, { recursive: true });
      await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });

      logger.info(`Downloading video from: ${url}`);

      // Choose download method based on environment
      if (USE_YTDL_CORE && ytdl) {
        await this.downloadWithYtdlCore(url, outputPath);
      } else {
        await this.downloadWithYtDlp(url, outputPath);
      }

      // Get video metadata
      const stats = await fs.stat(outputPath);
      const duration = await this.getVideoDuration(outputPath);

      // Generate thumbnail
      await this.generateThumbnail(outputPath, thumbnailPath);

      logger.info(`Video downloaded successfully: ${outputPath}`);

      return {
        videoPath: outputPath,
        thumbnailPath,
        fileSize: stats.size,
        duration
      };

    } catch (error) {
      logger.error('Download error:', error);
      throw new Error(`Failed to download video: ${error.message}`);
    }
  }

  async downloadWithYtdlCore(url, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        logger.info('Using ytdl-core for download');
        
        ytdl(url, {
          quality: 'highestvideo',
          filter: format => format.container === 'mp4'
        })
          .pipe(fsSync.createWriteStream(outputPath))
          .on('finish', () => {
            logger.info('ytdl-core download completed');
            resolve();
          })
          .on('error', (error) => {
            logger.error('ytdl-core download error:', error);
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  async downloadWithYtDlp(url, outputPath) {
    logger.info('Using yt-dlp for download');
    
    const command = `yt-dlp -f "best[ext=mp4]" -o "${outputPath}" "${url}"`;
    
    const { stdout, stderr } = await execPromise(command, {
      timeout: 300000 // 5 minutes timeout
    });

    if (stderr) {
      logger.warn('yt-dlp stderr:', stderr);
    }
  }

  async getVideoDuration(videoPath) {
    try {
      const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
      const { stdout } = await execPromise(command);
      return parseFloat(stdout.trim());
    } catch (error) {
      logger.warn('Failed to get video duration:', error);
      return 0;
    }
  }

  async generateThumbnail(videoPath, thumbnailPath) {
    try {
      const command = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${thumbnailPath}"`;
      await execPromise(command);
      logger.info('Thumbnail generated');
    } catch (error) {
      logger.warn('Failed to generate thumbnail:', error);
    }
  }
}

module.exports = new DownloadService();
