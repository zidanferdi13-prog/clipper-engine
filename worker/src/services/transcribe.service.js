'use strict';

const { exec }  = require('child_process');
const util      = require('util');
const path      = require('path');
const fs        = require('fs');
const fsp       = require('fs').promises;
const https     = require('https');
const logger    = require('../config/logger');
const OpenAI    = require('openai');
const { toFile } = require('openai');

const execPromise = util.promisify(exec);

// ─── Config ────────────────────────────────────────────────────────────────────
const WHISPER_MAX_BYTES = parseInt(process.env.WHISPER_MAX_MB    || '24',     10) * 1024 * 1024;
const FFMPEG_TIMEOUT_MS = parseInt(process.env.FFMPEG_TIMEOUT_MS  || '300000', 10);
const CHUNK_SEC         = parseInt(process.env.WHISPER_CHUNK_SEC  || '600',    10);
const MAX_RETRIES       = parseInt(process.env.OPENAI_MAX_RETRIES || '4',      10);
const RETRY_DELAY_MS    = parseInt(process.env.OPENAI_RETRY_DELAY_MS || '2000', 10);
const API_TIMEOUT_MS    = parseInt(process.env.OPENAI_TIMEOUT_MS  || '300000', 10);

// ─── OpenAI client factory ─────────────────────────────────────────────────────
// CRITICAL: maxRetries:0 — the SDK must NOT retry internally because retrying
// a multipart upload re-reads an already-consumed ReadStream → ECONNRESET.
// Our own withRetry() creates a brand-new stream + toFile() on every attempt.
//
// httpAgent family:4 — forces IPv4, prevents Docker routing through broken
// IPv6 path or a host-level proxy that intercepts HTTPS mid-stream.
//
// Proxy env vars are scrubbed — undici (used by the openai SDK) may otherwise
// route multipart uploads through an HTTP proxy, mangling the stream.
function buildOpenAIClient() {
  const proxyVars = ['HTTP_PROXY','HTTPS_PROXY','http_proxy','https_proxy','ALL_PROXY','all_proxy'];
  for (const v of proxyVars) delete process.env[v];

  return new OpenAI({
    apiKey:     process.env.OPENAI_API_KEY,
    timeout:    API_TIMEOUT_MS,
    maxRetries: 0,
    httpAgent:  new https.Agent({ family: 4, keepAlive: true }),
  });
}

// ─── Retryable error predicate ─────────────────────────────────────────────────
function isRetryable(error) {
  const status  = error?.status;
  const code    = error?.code || error?.cause?.code || '';
  const message = String(error?.message || '').toLowerCase();

  if ([408, 429, 500, 502, 503, 504].includes(status))                                    return true;
  if (['ETIMEDOUT','ECONNRESET','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','EPIPE'].includes(code)) return true;
  if (message.includes('connection error') || message.includes('timeout') ||
      message.includes('econnreset'))                                                      return true;
  return false;
}

// ─── Retry with exponential backoff ────────────────────────────────────────────
// `fn` receives the 1-based attempt number so callers can create fresh resources.
async function withRetry(fn, { maxRetries = MAX_RETRIES, initialDelay = RETRY_DELAY_MS, label = 'OpenAI' } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt > maxRetries) throw err;

      const delay  = initialDelay * Math.pow(2, attempt - 1);
      const status = err?.status ?? 'n/a';
      const code   = err?.code || err?.cause?.code || 'n/a';
      logger.warn(
        `[${label}] attempt ${attempt}/${maxRetries + 1} failed: ${err.message} ` +
        `(status=${status}, code=${code}) — retrying in ${delay}ms`
      );
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ─── File helpers ──────────────────────────────────────────────────────────────
async function assertFile(filePath, label = 'file') {
  let stat;
  try   { stat = await fsp.stat(filePath); }
  catch { throw new Error(`${label} not found: ${filePath}`); }
  if (stat.size === 0) throw new Error(`${label} is empty (0 bytes): ${filePath}`);
  return stat;
}

// Creates a fresh ReadStream + toFile() wrapper on every call.
// Never reuse — a ReadStream can only be consumed once.
async function makeWhisperFile(filePath) {
  const stream = fs.createReadStream(filePath);
  return toFile(stream, path.basename(filePath), { type: 'audio/mpeg' });
}

// ─── FFmpeg helpers ────────────────────────────────────────────────────────────
async function ffmpegExtract(inputPath, outputPath, extraArgs = '') {
  // mono 16kHz 32kbps — Whisper's native sample rate, ~14 MB/hr
  const cmd = `ffmpeg -y -i "${inputPath}" ${extraArgs} -vn -ac 1 -ar 16000 -acodec libmp3lame -b:a 32k "${outputPath}"`;
  await execPromise(cmd, { timeout: FFMPEG_TIMEOUT_MS });
}

async function getAudioDuration(audioPath) {
  const { stdout } = await execPromise(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`
  );
  return parseFloat(stdout.trim());
}

// ─── Service ───────────────────────────────────────────────────────────────────
class TranscribeService {
  constructor() {
    this.storageDir = process.env.STORAGE_PATH || './storage';
    this.openai     = buildOpenAIClient();
  }

  // Public entry point
  async transcribe(videoPath, jobId) {
    let audioPath;
    try {
      audioPath = await this._extractAudio(videoPath, jobId);

      const stat      = await assertFile(audioPath, 'audio');
      const sizeMB    = (stat.size / 1024 / 1024).toFixed(2);
      const chunked   = stat.size > WHISPER_MAX_BYTES;
      logger.info(`Audio ready: ${sizeMB} MB — ${chunked ? 'chunked' : 'single'} upload`);

      const raw = chunked
        ? await this._transcribeChunked(audioPath, jobId)
        : await this._transcribeSingle(audioPath);

      logger.info('Transcription complete');
      return this._formatTranscript(raw);

    } catch (error) {
      logger.error(`Transcription failed [${jobId}]: ${error.message}`, { stack: error.stack });
      throw new Error(`Failed to transcribe: ${error.message}`);
    }
  }

  // Single-shot upload — file fits within Whisper's 25 MB limit
  async _transcribeSingle(audioPath) {
    return withRetry(async (attempt) => {
      logger.info(`Whisper upload attempt ${attempt}…`);
      // Fresh stream + toFile() on every retry — never reuse a consumed stream
      const file = await makeWhisperFile(audioPath);
      return this.openai.audio.transcriptions.create({
        file,
        model:                   'whisper-1',
        response_format:         'verbose_json',
        timestamp_granularities: ['word'],
      });
    }, { label: 'Whisper/single' });
  }

  // Chunked upload for files larger than WHISPER_MAX_BYTES
  async _transcribeChunked(audioPath, jobId) {
    const tempDir = path.join(this.storageDir, 'temp');
    await fsp.mkdir(tempDir, { recursive: true });

    const totalSec  = await getAudioDuration(audioPath);
    const numChunks = Math.ceil(totalSec / CHUNK_SEC);
    logger.info(`Splitting into ${numChunks} chunks × ${CHUNK_SEC}s`);

    let fullText = '';
    const allWords = [];

    for (let i = 0; i < numChunks; i++) {
      const start     = i * CHUNK_SEC;
      const chunkPath = path.join(tempDir, `${jobId}_chunk${i}.mp3`);

      try {
        // -ss before -i = fast seek; -t limits duration
        await ffmpegExtract(audioPath, chunkPath, `-ss ${start} -t ${CHUNK_SEC}`);
        await assertFile(chunkPath, `chunk ${i}`);

        logger.info(`Transcribing chunk ${i + 1}/${numChunks} (offset ${start}s)…`);
        const result = await withRetry(async (attempt) => {
          logger.info(`  chunk ${i + 1} attempt ${attempt}…`);
          const file = await makeWhisperFile(chunkPath);
          return this.openai.audio.transcriptions.create({
            file,
            model:                   'whisper-1',
            response_format:         'verbose_json',
            timestamp_granularities: ['word'],
          });
        }, { label: `Whisper/chunk${i}` });

        fullText += (fullText ? ' ' : '') + result.text;
        for (const w of (result.words || [])) {
          allWords.push({ word: w.word, start: w.start + start, end: w.end + start });
        }
      } finally {
        await fsp.unlink(chunkPath).catch(() => {});
      }
    }

    return { text: fullText, words: allWords };
  }

  // Audio extraction from video file
  async _extractAudio(videoPath, jobId) {
    const audioDir  = path.join(this.storageDir, 'audio');
    await fsp.mkdir(audioDir, { recursive: true });
    const audioPath = path.join(audioDir, `${jobId}.mp3`);

    logger.info('Extracting audio from video…');
    await assertFile(videoPath, 'source video');
    await ffmpegExtract(videoPath, audioPath);
    await assertFile(audioPath, 'extracted audio');

    logger.info('Audio extracted successfully');
    return audioPath;
  }

  // Format raw Whisper response into { fullText, words, segments }
  _formatTranscript({ text, words = [] }) {
    const segments = [];
    let seg = { text: '', start: 0, end: 0, words: [] };

    words.forEach((w, i) => {
      if (i === 0) seg.start = w.start;
      seg.text += w.word + ' ';
      seg.words.push({ word: w.word, start: w.start, end: w.end });
      seg.end = w.end;

      const sentenceEnd = /[.!?]$/.test(w.word);
      if (sentenceEnd || seg.words.length >= 30) {
        segments.push({ ...seg, text: seg.text.trim() });
        seg = { text: '', start: w.end, end: w.end, words: [] };
      }
    });

    if (seg.words.length > 0) {
      segments.push({ ...seg, text: seg.text.trim() });
    }

    return {
      fullText: text,
      words:    words.map(w => ({ word: w.word, start: w.start, end: w.end })),
      segments,
    };
  }
}

module.exports = new TranscribeService();
