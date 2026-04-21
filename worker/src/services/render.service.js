const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const logger = require('../config/logger');

const execPromise = util.promisify(exec);
const subtitleService = require('./subtitle.service');

// Set FFmpeg paths
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

class RenderService {
  constructor() {
    this.storageDir      = process.env.STORAGE_PATH || './storage';
    this.subtitleEnabled = process.env.SUBTITLE_ENABLED !== 'false';
    this.subtitleStyle   = process.env.SUBTITLE_STYLE || 'A';
    this.enhanceAudio    = process.env.ENHANCE_AUDIO  !== 'false';
    this.enhanceVideo    = process.env.ENHANCE_VIDEO  !== 'false';
  }

  async renderClip({ videoPath, segment, jobId, clipIndex, settings, transcript }) {
    try {
      const { start, end } = segment;
      const { subtitleStyle, aspectRatio } = settings;
      const style = subtitleStyle || this.subtitleStyle;

      const outputDir    = path.join(this.storageDir, 'clips');
      const subtitleDir  = path.join(this.storageDir, 'subtitles');
      const thumbnailDir = path.join(this.storageDir, 'thumbnails');

      await fs.mkdir(outputDir,    { recursive: true });
      await fs.mkdir(subtitleDir,  { recursive: true });
      await fs.mkdir(thumbnailDir, { recursive: true });

      const baseId        = `${jobId}_clip_${clipIndex}`;
      const rawPath       = path.join(outputDir, `${baseId}_raw.mp4`);
      const enhancedPath  = path.join(outputDir, `${baseId}_enh.mp4`);
      const subPath       = path.join(subtitleDir, `${baseId}.ass`);
      const srtPath       = path.join(subtitleDir, `${baseId}.srt`);
      const outputPath    = path.join(outputDir, `${baseId}.mp4`);
      const thumbnailPath = path.join(thumbnailDir, `${baseId}.jpg`);

      logger.info(`[Render] Clip ${clipIndex}: ${start}s–${end}s (${(end - start).toFixed(1)}s)`);

      const dimensions = this.getAspectRatioDimensions(aspectRatio);

      // Step 1: Cut + scale/pad to target aspect ratio
      await this.renderVideo({ inputPath: videoPath, outputPath: rawPath, start, end, dimensions });

      // Step 2: Audio loudness + video color enhancement
      await this.enhanceClip(rawPath, enhancedPath);

      // Step 3: Subtitle generation + burn-in
      let finalPath = enhancedPath;
      if (this.subtitleEnabled && transcript?.segments?.length) {
        try {
          await subtitleService.generateSrt(transcript.segments, start, end, srtPath);
          const assFile = await subtitleService.generateAss(
            transcript.segments, start, end, subPath, style
          );
          if (assFile) {
            await subtitleService.burnSubtitles(enhancedPath, assFile, outputPath);
            finalPath = outputPath;
          }
        } catch (subErr) {
          logger.warn(`[Render] Subtitle burn skipped: ${subErr.message}`);
        }
      }

      // Copy to final output if subtitle step was skipped
      if (finalPath !== outputPath) {
        await fs.copyFile(finalPath, outputPath);
      }

      // Step 4: Thumbnail
      await this.generateThumbnail(outputPath, thumbnailPath);

      // Cleanup temp files
      await this._cleanupFiles([rawPath, enhancedPath]);

      const stats = await fs.stat(outputPath);
      logger.info(`[Render] Done: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      return {
        clipUrl:      outputPath,
        thumbnailUrl: thumbnailPath,
        subtitleUrl:  await this._fileExists(srtPath) ? srtPath : null,
        fileSize:     stats.size,
        resolution:   `${dimensions.width}x${dimensions.height}`,
        fps:          30,
      };

    } catch (error) {
      logger.error('[Render] Error:', error);
      throw new Error(`Failed to render clip: ${error.message}`);
    }
  }

  // ── Step 1: Cut + scale + pad ─────────────────────────────────────────────
  renderVideo({ inputPath, outputPath, start, end, dimensions }) {
    return new Promise((resolve, reject) => {
      const duration = end - start;
      const { width, height } = dimensions;

      const vfFilter = [
        `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
        'format=yuv420p',
      ].join(',');

      ffmpeg(inputPath)
        .setStartTime(start)
        .setDuration(duration)
        .videoFilter(vfFilter)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-preset fast', '-crf 23', '-movflags +faststart', '-ar 44100', '-b:a 128k', '-y'])
        .on('start', cmd  => logger.debug('[Render] cmd:', cmd.slice(0, 120)))
        .on('progress', p => logger.debug(`[Render] ${Math.round(p.percent || 0)}%`))
        .on('end',   ()   => resolve())
        .on('error', err  => reject(err))
        .save(outputPath);
    });
  }

  // ── Step 2: Loudness normalization + color enhancement + sharpening ───────
  async enhanceClip(inputPath, outputPath) {
    const audioFilters = [];
    const videoFilters = [];

    if (this.enhanceAudio) {
      // High-pass to remove low rumble + EBU R128 loudness normalize to -14 LUFS
      audioFilters.push('highpass=f=80');
      audioFilters.push('loudnorm=I=-14:TP=-1.5:LRA=11:print_format=none');
    }

    if (this.enhanceVideo) {
      // Subtle contrast/brightness/saturation boost
      videoFilters.push('eq=contrast=1.05:brightness=0.03:saturation=1.10:gamma=1.0');
      // Gentle unsharp mask for crispness
      videoFilters.push('unsharp=luma_msize_x=3:luma_msize_y=3:luma_amount=0.5');
    }

    if (!audioFilters.length && !videoFilters.length) {
      await fs.copyFile(inputPath, outputPath);
      return;
    }

    const vfPart = videoFilters.length
      ? `-vf "${videoFilters.join(',')}" -c:v libx264 -preset fast -crf 22`
      : '-c:v copy';
    const afPart = audioFilters.length
      ? `-af "${audioFilters.join(',')}"  -c:a aac -b:a 128k`
      : '-c:a copy';

    const cmd = [
      `"${ffmpegPath}"`, '-y',
      `-i "${inputPath}"`,
      vfPart, afPart,
      '-movflags +faststart',
      `"${outputPath}"`,
    ].join(' ');

    logger.info('[Render] Enhancement pass...');
    await execPromise(cmd, { timeout: 600_000 });
  }

  // ── Thumbnail ─────────────────────────────────────────────────────────────
  async generateThumbnail(videoPath, thumbnailPath) {
    return new Promise(resolve => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['00:00:01.5'],
          filename:   path.basename(thumbnailPath),
          folder:     path.dirname(thumbnailPath),
          size:       '540x?',
        })
        .on('end',   () => { logger.info('[Render] Thumbnail OK'); resolve(); })
        .on('error', err => { logger.warn('[Render] Thumbnail failed:', err.message); resolve(); });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getAspectRatioDimensions(aspectRatio) {
    const ratios = {
      '9:16': { width: 1080, height: 1920 },
      '1:1':  { width: 1080, height: 1080 },
      '16:9': { width: 1920, height: 1080 },
      '4:5':  { width: 1080, height: 1350 },
    };
    return ratios[aspectRatio] || ratios['9:16'];
  }

  async _cleanupFiles(paths) {
    for (const p of paths) {
      try { await fs.unlink(p); } catch { /* ignore */ }
    }
  }

  async _fileExists(p) {
    try { await fs.access(p); return true; } catch { return false; }
  }
}

module.exports = new RenderService();


