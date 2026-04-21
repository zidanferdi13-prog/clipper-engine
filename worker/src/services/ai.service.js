const OpenAI = require('openai');
const logger = require('../config/logger');

class AIService {
  constructor() {
    this.maxRetries = parseInt(process.env.OPENAI_MAX_RETRIES || '4', 10);
    this.initialRetryDelayMs = parseInt(process.env.OPENAI_RETRY_DELAY_MS || '1500', 10);
    this.openai = new OpenAI({
      apiKey:     process.env.OPENAI_API_KEY,
      timeout:    parseInt(process.env.OPENAI_TIMEOUT_MS || '180000', 10),
      maxRetries: 0, // retries handled manually so we control the loop
    });
  }

  async analyzeTranscript(transcript, numClips = 5) {
    const MIN_CLIP_SEC = parseInt(process.env.CLIP_MIN_SEC || '30', 10);
    const MAX_CLIP_SEC = parseInt(process.env.CLIP_MAX_SEC || '90', 10);

    try {
      const { fullText, segments } = transcript;

      // Calculate total video duration from last segment
      const totalDuration = segments.length ? segments[segments.length - 1].end : 0;

      logger.info(`Analyzing transcript for ${numClips} viral clips (${MIN_CLIP_SEC}s-${MAX_CLIP_SEC}s each, total ${totalDuration.toFixed(0)}s)...`);

      // Build a flattened, easy-to-read segment list with index for AI reference
      const segmentList = segments.map((s, i) =>
        `[${i}] ${s.start.toFixed(1)}s-${s.end.toFixed(1)}s: "${s.text.trim()}"`
      ).join('\n');

      const prompt = `Kamu adalah AI expert yang membantu content creator membuat viral short-form video.

VIDEO DURATION: ${totalDuration.toFixed(0)} detik

TRANSKRIP LENGKAP:
"""
${fullText}
"""

DAFTAR SEGMEN DENGAN TIMESTAMP:
${segmentList}

=== TUGAS ===
Pilih TEPAT ${numClips} clip terbaik dari video ini untuk konten viral (TikTok/Reels/YouTube Shorts).

=== ATURAN DURASI (WAJIB DIPATUHI) ===
- Setiap clip HARUS berdurasi MINIMUM ${MIN_CLIP_SEC} detik dan MAKSIMUM ${MAX_CLIP_SEC} detik
- Hitung: durasi = end - start. Jika kurang dari ${MIN_CLIP_SEC}s, perluas ke segmen berikutnya sampai cukup
- Pilih start dari awal segmen pertama yang dipilih, end dari akhir segmen terakhir yang dipilih
- DILARANG: end - start < ${MIN_CLIP_SEC} atau end - start > ${MAX_CLIP_SEC}

=== KRITERIA CLIP VIRAL ===
1. **Hook Kuat** - Kalimat pembuka langsung menarik perhatian dalam 3 detik
2. **Emosi Tinggi** - Lucu, inspiring, shocking, atau sangat relatable
3. **Nilai Tinggi** - Ada insight, pelajaran, atau informasi berharga
4. **Self-Contained** - Bisa dipahami tanpa menonton sisa video
5. **Call-to-Action** - Memicu komentar, share, atau save
6. **No Overlap** - Setiap clip harus dari bagian video yang berbeda (tidak boleh overlapping)

=== OUTPUT FORMAT ===
Kembalikan JSON object dengan key "clips" berisi array:
{
  "clips": [
    {
      "title": "Judul clickbait menarik (max 60 karakter)",
      "description": "Kenapa clip ini berpotensi viral (1-2 kalimat)",
      "start": <detik_float, dari timestamp segmen>,
      "end": <detik_float, dari timestamp segmen, pastikan end-start >= ${MIN_CLIP_SEC}>,
      "score": <0-100, potensi viral>,
      "hookStrength": <0-100, kekuatan kalimat pembuka>,
      "emotionalTone": "funny|inspiring|shocking|educational|relatable",
      "keywords": ["max 5 keywords"],
      "category": "business|motivation|comedy|tutorial|story|lifestyle"
    }
  ]
}

Urutkan clips berdasarkan score tertinggi. Output HANYA JSON, tanpa teks lain.`;

      const completion = await this.withRetry(async () => {
        return this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL_ANALYSIS || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Kamu adalah AI expert dalam viral video content analysis. Selalu ikuti aturan durasi dengan ketat. Output selalu JSON valid.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.4,  // lower = more consistent rule-following
          response_format: { type: 'json_object' }
        });
      });

      const responseText = completion.choices[0].message.content;
      logger.info('AI analysis response received');

      // Parse JSON response
      let result = JSON.parse(responseText);
      let clips = Array.isArray(result) ? result : (result.clips || result.segments || []);

      // Validate, sanitize, and ENFORCE duration rules
      clips = clips.map(clip => {
        let start = parseFloat(clip.start) || 0;
        let end   = parseFloat(clip.end)   || 0;

        // Clamp start to valid range
        start = Math.max(0, Math.min(start, totalDuration));

        // Enforce minimum duration
        if (end - start < MIN_CLIP_SEC) {
          end = Math.min(start + MIN_CLIP_SEC, totalDuration);
        }

        // Enforce maximum duration
        if (end - start > MAX_CLIP_SEC) {
          end = start + MAX_CLIP_SEC;
        }

        // If we couldn't reach min duration (near end of video), push start back
        if (end - start < MIN_CLIP_SEC && start > 0) {
          start = Math.max(0, end - MIN_CLIP_SEC);
        }

        const duration = end - start;
        logger.info(`Clip "${clip.title}": ${start.toFixed(1)}s → ${end.toFixed(1)}s (${duration.toFixed(1)}s)`);

        return {
          title:         clip.title         || 'Untitled Clip',
          description:   clip.description   || '',
          start,
          end,
          score:         Math.min(100, Math.max(0, parseFloat(clip.score)         || 50)),
          hookStrength:  Math.min(100, Math.max(0, parseFloat(clip.hookStrength)  || 50)),
          emotionalTone: clip.emotionalTone  || 'neutral',
          keywords:      Array.isArray(clip.keywords) ? clip.keywords.slice(0, 5) : [],
          category:      clip.category       || 'general'
        };
      });

      // Remove overlapping clips (keep higher scoring one)
      clips = this.removeOverlapping(clips);

      // Sort by score, limit
      clips.sort((a, b) => b.score - a.score);
      clips = clips.slice(0, numClips);

      logger.info(`AI analysis completed: ${clips.length} clips identified`);

      return clips;

    } catch (error) {
      logger.error('AI analysis error:', error);
      logger.warn('Falling back to simple segmentation');
      return this.fallbackSegmentation(transcript, numClips, MIN_CLIP_SEC);
    }
  }

  // Remove clips that overlap — keep higher-score one
  removeOverlapping(clips) {
    const sorted = [...clips].sort((a, b) => b.score - a.score);
    const kept = [];
    for (const clip of sorted) {
      const overlaps = kept.some(k => clip.start < k.end && clip.end > k.start);
      if (!overlaps) kept.push(clip);
    }
    return kept;
  }

  async withRetry(fn) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const canRetry = this.isRetryable(error) && attempt <= this.maxRetries;

        if (!canRetry) {
          throw error;
        }

        const delay = this.initialRetryDelayMs * Math.pow(2, attempt - 1);
        const status = error?.status || 'n/a';
        const code = error?.code || error?.cause?.code || 'n/a';
        logger.warn(
          `OpenAI analysis request failed (attempt ${attempt}/${this.maxRetries + 1}): ${error.message} (status=${status}, code=${code}). Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  isRetryable(error) {
    const status = error?.status;
    const code = error?.code;
    const message = String(error?.message || '').toLowerCase();

    if ([408, 409, 429, 500, 502, 503, 504].includes(status)) {
      return true;
    }

    if (['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
      return true;
    }

    return (
      message.includes('connection error') ||
      message.includes('timeout') ||
      message.includes('temporarily unavailable')
    );
  }

  fallbackSegmentation(transcript, numClips, minSec = 60) {
    const { segments } = transcript;
    const totalDuration = segments.length ? segments[segments.length - 1].end : 0;
    const clipDuration  = Math.max(minSec, 60);
    const clips = [];

    for (let i = 0; i < numClips; i++) {
      const start = i * clipDuration;
      const end = Math.min(start + clipDuration, totalDuration);

      if (start < totalDuration) {
        clips.push({
          title: `Clip ${i + 1}`,
          description: 'Auto-generated clip',
          start,
          end,
          score: 50,
          hookStrength: 50,
          emotionalTone: 'neutral',
          keywords: [],
          category: 'general'
        });
      }
    }

    return clips;
  }
}

module.exports = new AIService();
