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
    this.ytDlpMaxRetries = parseInt(process.env.YTDLP_MAX_RETRIES || '3', 10);
    this.ytDlpRetryDelayMs = parseInt(process.env.YTDLP_RETRY_DELAY_MS || '3000', 10);
    this.ytDlpTimeoutMs = parseInt(process.env.YTDLP_TIMEOUT_MS || '300000', 10);
    this.ytDlpCookiesPath = process.env.YTDLP_COOKIES_PATH || '';
    this.ytDlpProxy = process.env.YTDLP_PROXY_URL || '';
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

    const normalizedUrl = this.normalizeUrl(url);
    let lastError;

    for (let attempt = 1; attempt <= this.ytDlpMaxRetries; attempt++) {
      const command = await this.buildYtDlpCommand(normalizedUrl, outputPath);

      try {
        const { stderr } = await execPromise(command, {
          timeout: this.ytDlpTimeoutMs,
          maxBuffer: 10 * 1024 * 1024,
        });

        if (stderr) {
          logger.warn('yt-dlp stderr:', stderr);
        }

        return;
      } catch (error) {
        lastError = error;
        const stderr = error?.stderr || error?.message || '';

        if (this.isBotProtectionError(stderr)) {
          throw new Error(
            'YouTube meminta verifikasi bot. Tambahkan cookies YouTube ke worker (YTDLP_COOKIES_PATH) atau coba lagi beberapa menit.'
          );
        }

        const retryable = this.isRetryableDownloadError(stderr);
        const hasNextAttempt = attempt < this.ytDlpMaxRetries;

        if (!retryable || !hasNextAttempt) {
          break;
        }

        const delay = this.ytDlpRetryDelayMs * attempt;
        logger.warn(`yt-dlp attempt ${attempt}/${this.ytDlpMaxRetries} failed. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error(this.formatYtDlpError(lastError));
  }

  normalizeUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtube.com')) {
        parsed.searchParams.delete('t');
        parsed.searchParams.delete('si');
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  async buildYtDlpCommand(url, outputPath) {
    const args = [
      'yt-dlp',
      '--no-progress',
      '--newline',
      '--retries', '5',
      '--fragment-retries', '5',
      '--extractor-retries', '5',
      '--socket-timeout', '30',
      '--sleep-requests', '1',
      '--min-sleep-interval', '1',
      '--max-sleep-interval', '5',
      '--no-check-formats',
      // Download EJS challenge solver scripts from GitHub on first run (needed for YouTube sig/n-challenge)
      '--remote-components', 'ejs:github',
      // Prefer mp4+m4a DASH, fall back to any best combo, then single-file best
      '-f', '"bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best"',
      '--merge-output-format', 'mp4',
    ];

    if (this.ytDlpProxy) {
      args.push('--proxy', `"${this.ytDlpProxy}"`);
    }

    if (await this.cookiesFileExists()) {
      args.push('--cookies', `"${this.ytDlpCookiesPath}"`);
    }

    args.push('-o', `"${outputPath}"`, `"${url}"`);
    return args.join(' ');
  }

  async cookiesFileExists() {
    if (!this.ytDlpCookiesPath) return false;
    try {
      await fs.access(this.ytDlpCookiesPath);
      return true;
    } catch {
      return false;
    }
  }

  isBotProtectionError(stderr) {
    const msg = String(stderr || '').toLowerCase();
    return (
      msg.includes('sign in to confirm') ||
      msg.includes('sign in to confirm you') ||
      msg.includes("sign in to confirm you're not a bot") ||
      msg.includes('use --cookies-from-browser') ||
      msg.includes('use --cookies')
    );
  }

  isRetryableDownloadError(stderr) {
    const msg = String(stderr || '').toLowerCase();
    return (
      msg.includes('http error 429') ||
      msg.includes('http error 403') ||
      msg.includes('too many requests') ||
      msg.includes('timed out') ||
      msg.includes('temporary failure') ||
      msg.includes('connection reset') ||
      msg.includes('unable to download webpage')
    );
  }

  formatYtDlpError(error) {
    const stderr = error?.stderr || '';
    if (stderr) {
      const lines = stderr.split('\n').map(line => line.trim());
      // Prefer actual ERROR lines over WARNING lines
      const errorLine   = lines.find(l => l.startsWith('ERROR:'));
      const warningLine = lines.find(l =>
        l.startsWith('WARNING:') &&
        !l.includes('po_token') &&
        !l.includes('PO Token') &&
        !l.includes('JavaScript runtime')
      );
      const picked = errorLine || warningLine;
      if (picked) return `yt-dlp failed: ${picked}`;
    }
    return error?.message || 'yt-dlp download failed';
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
