'use strict';

/**
 * SubtitleService — Generate ASS/SRT subtitle files from transcript segments
 * and burn them into video clips using FFmpeg.
 *
 * Three built-in styles:
 *   A — White bold + yellow active-word highlight + black stroke (default)
 *   B — Cinematic centered, 2-line fade-in
 *   C — Meme-style big Impact font pop
 */

const path      = require('path');
const fs        = require('fs').promises;
const { exec }  = require('child_process');
const util      = require('util');
const logger    = require('../config/logger');

const execPromise = util.promisify(exec);

// ─── Time Formatters ──────────────────────────────────────────────────────────

/** Seconds → ASS timestamp (H:MM:SS.cs) */
function toAssTime(sec) {
  const h  = Math.floor(sec / 3600);
  const m  = Math.floor((sec % 3600) / 60);
  const s  = Math.floor(sec % 60);
  const cs = Math.round((sec % 1) * 100);
  return `${h}:${pad2(m)}:${pad2(s)}.${pad2(cs)}`;
}

/** Seconds → SRT timestamp (HH:MM:SS,mmm) */
function toSrtTime(sec) {
  const h  = Math.floor(sec / 3600);
  const m  = Math.floor((sec % 3600) / 60);
  const s  = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${String(ms).padStart(3, '0')}`;
}

function pad2(n) { return String(n).padStart(2, '0'); }

// ─── ASS Style Definitions ────────────────────────────────────────────────────
// PlayRes: 1080×1920 matches 9:16 portrait render target.
// Colours are in ASS ABGR hex format: &HAABBGGRR
//   White  = &H00FFFFFF
//   Yellow = &H0000FFFF  (BGRhex of RGB #FFFF00)
//   Black  = &H00000000

const ASS_STYLE_HEADERS = {
  A: `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial Black,68,&H00FFFFFF,&H0000FFFF,&H00000000,&HA0000000,-1,0,0,0,100,100,0,0,1,4,2,2,60,60,140,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`,

  B: `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Helvetica Neue,58,&H00FFFFFF,&H00FFFFFF,&H00000000,&HA0000000,-1,0,0,0,100,100,1.5,0,1,3,1,2,80,80,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`,

  C: `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Impact,82,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,3,2,50,50,100,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`,
};

// Style-specific layout options
const STYLE_OPTIONS = {
  A: { wordsPerChunk: 6, maxCharsPerLine: 22, maxLines: 2, posY: 1720, fadeTag: '' },
  B: { wordsPerChunk: 8, maxCharsPerLine: 28, maxLines: 2, posY: 1720, fadeTag: '{\\fad(200,200)}' },
  C: { wordsPerChunk: 5, maxCharsPerLine: 18, maxLines: 2, posY: 1700, fadeTag: '' },
};

// ─── Subtitle Service ─────────────────────────────────────────────────────────

class SubtitleService {
  constructor() {
    this.storageDir = process.env.STORAGE_PATH || './storage';
    try {
      this.ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    } catch {
      this.ffmpegPath = 'ffmpeg';
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Generate an ASS subtitle file for a clip's time range.
   *
   * @param {Array}  segments  - Transcript segments [{start, end, text, words?}]
   * @param {number} clipStart - Clip start time in seconds
   * @param {number} clipEnd   - Clip end time in seconds
   * @param {string} outputPath - Path to write the .ass file
   * @param {string} styleKey  - 'A' | 'B' | 'C'
   * @returns {string|null} Path to the written .ass file, or null if no segments
   */
  async generateAss(segments, clipStart, clipEnd, outputPath, styleKey = 'A') {
    const style = STYLE_OPTIONS[styleKey] || STYLE_OPTIONS.A;
    const header = ASS_STYLE_HEADERS[styleKey] || ASS_STYLE_HEADERS.A;

    // Filter segments that overlap with the clip window
    const overlap = (segments || []).filter(s => s.end > clipStart && s.start < clipEnd);
    if (!overlap.length) {
      logger.warn(`[Subtitle] No overlapping segments for clip ${clipStart}–${clipEnd}`);
      return null;
    }

    const dialogLines = [];

    for (const seg of overlap) {
      // Normalize to clip-relative timestamps
      const relStart = Math.max(0, seg.start - clipStart);
      const relEnd   = Math.min(clipEnd - clipStart, seg.end - clipStart);
      if (relEnd <= relStart) continue;

      // Word-level timestamps available (Whisper verbose_json with word_timestamps)
      if (seg.words && seg.words.length > 0) {
        const lines = this._wordsToAssDialogue(seg.words, clipStart, clipEnd, style, styleKey);
        dialogLines.push(...lines);
      } else {
        // Sentence-level: split into timed chunks
        const lines = this._sentenceToAssDialogue(seg.text, relStart, relEnd, style, styleKey);
        dialogLines.push(...lines);
      }
    }

    if (!dialogLines.length) return null;

    const assContent = `${header}\n${dialogLines.join('\n')}\n`;
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, assContent, 'utf-8');
    logger.info(`[Subtitle] ASS written: ${outputPath} (${dialogLines.length} dialogue lines)`);
    return outputPath;
  }

  /**
   * Burn an ASS subtitle file into a video using FFmpeg.
   * Outputs a new file with _sub suffix.
   *
   * @param {string} inputPath  - Video file path
   * @param {string} assPath    - ASS subtitle file path
   * @param {string} outputPath - Output video path
   * @returns {string} Output path
   */
  async burnSubtitles(inputPath, assPath, outputPath) {
    // Cross-platform path escape for the ass= filter
    // On Linux: forward slashes, colons in path need escaping
    const escapedAss = assPath
      .replace(/\\/g, '/')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'");

    const cmd = [
      `"${this.ffmpegPath}"`,
      '-y',
      `-i "${inputPath}"`,
      `-vf "ass='${escapedAss}'"`,
      '-c:v libx264 -preset fast -crf 22',
      '-c:a copy',
      '-movflags +faststart',
      `"${outputPath}"`,
    ].join(' ');

    logger.info(`[Subtitle] Burning subtitles into: ${outputPath}`);
    try {
      await execPromise(cmd, { timeout: 300_000 });
    } catch (err) {
      logger.error(`[Subtitle] Burn error: ${err.message}`);
      throw err;
    }
    return outputPath;
  }

  /**
   * Generate a plain SRT file (for download / external use).
   */
  async generateSrt(segments, clipStart, clipEnd, outputPath) {
    const overlap = (segments || []).filter(s => s.end > clipStart && s.start < clipEnd);
    let idx = 1;
    let srt = '';

    for (const seg of overlap) {
      const relStart = Math.max(0, seg.start - clipStart);
      const relEnd   = Math.min(clipEnd - clipStart, seg.end - clipStart);
      if (relEnd <= relStart) continue;

      srt += `${idx}\n${toSrtTime(relStart)} --> ${toSrtTime(relEnd)}\n${seg.text.trim()}\n\n`;
      idx++;
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, srt, 'utf-8');
    return outputPath;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Convert word-level timestamps to ASS Dialogue entries.
   * Style A: for each word window, renders all words but highlights active word in yellow.
   */
  _wordsToAssDialogue(words, clipStart, clipEnd, style, styleKey) {
    const lines = [];
    const { wordsPerChunk, posY } = style;

    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunk     = words.slice(i, i + wordsPerChunk);
      const chunkEndW = chunk[chunk.length - 1];
      const chunkRelEnd = Math.min(clipEnd - clipStart, chunkEndW.end - clipStart);

      // For each word in chunk, emit a dialogue line where that word is highlighted
      chunk.forEach((word, wi) => {
        const wRelStart = Math.max(0, word.start - clipStart);
        const wRelEnd   = wi + 1 < chunk.length
          ? Math.max(0, chunk[wi + 1].start - clipStart)
          : chunkRelEnd;

        if (wRelEnd <= wRelStart || wRelStart < 0) return;

        const wordText = (word.word || word.text || '').trim();
        if (!wordText) return;

        let assText;
        if (styleKey === 'A') {
          // Build line: other words white, active word yellow + slightly larger
          const parts = chunk.map((w, idx) => {
            const t = (w.word || w.text || '').trim();
            return idx === wi
              ? `{\\c&H0000FFFF&\\bord5}${t}{\\c&H00FFFFFF&\\bord4}` // yellow active
              : t;
          });
          assText = `{\\an2\\pos(540,${posY})}${parts.join(' ')}`;
        } else if (styleKey === 'C') {
          // Meme: all caps, just show active word big
          assText = `{\\an2\\pos(540,${posY})}${wordText.toUpperCase()}`;
        } else {
          // Style B: show the chunk, no per-word colour
          const chunkWords = chunk.map(w => (w.word || w.text || '').trim()).join(' ');
          assText = `{\\an2\\pos(540,${posY})}${style.fadeTag}${chunkWords}`;
        }

        lines.push(
          `Dialogue: 0,${toAssTime(wRelStart)},${toAssTime(wRelEnd)},Default,,0,0,0,,${assText}`
        );

        // For styles B/C, only emit once per chunk (not per word)
        if (styleKey !== 'A') return;
      });

      // Non-A styles: one dialogue per chunk
      if (styleKey !== 'A') {
        const chunkRelStart = Math.max(0, chunk[0].start - clipStart);
        if (chunkRelEnd > chunkRelStart) {
          const chunkWords = chunk.map(w => (w.word || w.text || '').trim()).join(' ');
          const assText    = styleKey === 'C'
            ? `{\\an2\\pos(540,${posY})}${chunkWords.toUpperCase()}`
            : `{\\an2\\pos(540,${posY})}${style.fadeTag}${chunkWords}`;
          lines.push(
            `Dialogue: 0,${toAssTime(chunkRelStart)},${toAssTime(chunkRelEnd)},Default,,0,0,0,,${assText}`
          );
        }
      }
    }

    return lines;
  }

  /**
   * Split sentence text into timed subtitle chunks (when word timestamps unavailable).
   */
  _sentenceToAssDialogue(text, relStart, relEnd, style, styleKey) {
    const { maxCharsPerLine, maxLines, posY, fadeTag } = style;
    const blocks = this._chunkText(text, maxCharsPerLine, maxLines);
    if (!blocks.length) return [];

    const chunkDur = (relEnd - relStart) / blocks.length;
    return blocks.map((block, i) => {
      const cs = relStart + i * chunkDur;
      const ce = cs + chunkDur;

      let displayText;
      if (styleKey === 'C') {
        displayText = `{\\an2\\pos(540,${posY})}${block.toUpperCase()}`;
      } else if (styleKey === 'B') {
        displayText = `{\\an2\\pos(540,${posY})}${fadeTag}${block}`;
      } else {
        // Style A: no per-word highlight at sentence level, just render white
        displayText = `{\\an2\\pos(540,${posY})}${block}`;
      }

      return `Dialogue: 0,${toAssTime(cs)},${toAssTime(ce)},Default,,0,0,0,,${displayText}`;
    });
  }

  /**
   * Break text into line-wrapped blocks that respect char-per-line and line limits.
   * Returns an array of ASS multi-line strings (lines joined with \\N).
   */
  _chunkText(text, maxCharsPerLine, maxLines) {
    const words  = text.trim().split(/\s+/);
    const blocks = [];
    let   lines  = [];
    let   curLine = '';

    for (const word of words) {
      if (curLine.length > 0 && curLine.length + 1 + word.length > maxCharsPerLine) {
        lines.push(curLine);
        curLine = '';
        if (lines.length >= maxLines) {
          blocks.push(lines.join('\\N'));
          lines = [];
        }
      }
      curLine += (curLine ? ' ' : '') + word;
    }
    if (curLine) lines.push(curLine);
    if (lines.length) blocks.push(lines.join('\\N'));

    return blocks.length ? blocks : [''];
  }
}

module.exports = new SubtitleService();
