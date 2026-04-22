const OpenAI = require('openai');
const logger = require('../config/logger');
const scoringService = require('../services/scoring.service');

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
    const MAX_AI_CANDIDATES = parseInt(process.env.CLIP_AI_CANDIDATES || `${Math.max(numClips * 6, 18)}`, 10);

    try {
      const { fullText, segments } = transcript;

      if (!Array.isArray(segments) || !segments.length) {
        throw new Error('Transcript segments are missing');
      }

      // Calculate total video duration from last segment
      const totalDuration = segments.length ? segments[segments.length - 1].end : 0;

      logger.info(`Analyzing transcript for ${numClips} viral clips (${MIN_CLIP_SEC}s-${MAX_CLIP_SEC}s each, total ${totalDuration.toFixed(0)}s)...`);

      const candidates = this.buildCandidateWindows(transcript, {
        minClipSec: MIN_CLIP_SEC,
        maxClipSec: MAX_CLIP_SEC,
        maxCandidates: MAX_AI_CANDIDATES,
      });

      if (!candidates.length) {
        throw new Error('No clip candidates could be generated from transcript');
      }

      logger.info(`Prepared ${candidates.length} transcript candidates for AI ranking`);

      const candidateList = candidates.map((candidate) => {
        const preview = this.toPreviewText(candidate.text, 280);
        return [
          `ID ${candidate.id}`,
          `WINDOW ${candidate.start.toFixed(1)}s-${candidate.end.toFixed(1)}s (${candidate.duration.toFixed(1)}s)`,
          `HOOK ${candidate.hookStrength}/100`,
          `HEURISTIC ${candidate.score}/100`,
          `TEXT: "${preview}"`
        ].join(' | ');
      }).join('\n');

      const prompt = `Kamu adalah AI expert yang membantu content creator membuat viral short-form video.

VIDEO DURATION: ${totalDuration.toFixed(0)} detik

RINGKASAN TRANSKRIP:
"""
${this.toPreviewText(fullText, 1800)}
"""

KANDIDAT CLIP TERBAIK DARI SELURUH VIDEO:
${candidateList}

=== TUGAS ===
Pilih TEPAT ${numClips} clip terbaik dari daftar kandidat di atas untuk konten viral (TikTok/Reels/YouTube Shorts).

=== ATURAN DURASI (WAJIB DIPATUHI) ===
- Setiap clip HARUS berdurasi MINIMUM ${MIN_CLIP_SEC} detik dan MAKSIMUM ${MAX_CLIP_SEC} detik
- Gunakan start/end dari kandidat yang dipilih. Jangan membuat timestamp baru di luar kandidat.
- DILARANG: end - start < ${MIN_CLIP_SEC} atau end - start > ${MAX_CLIP_SEC}
- DILARANG memilih kandidat yang overlapping satu sama lain

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
      "candidateId": <id kandidat yang dipilih>,
      "title": "Judul clickbait menarik (max 60 karakter)",
      "description": "Kenapa clip ini berpotensi viral (1-2 kalimat)",
      "start": <detik_float, harus sama dengan start kandidat>,
      "end": <detik_float, harus sama dengan end kandidat>,
      "score": <0-100, potensi viral>,
      "hookStrength": <0-100, kekuatan kalimat pembuka>,
      "emotionalTone": "funny|inspiring|shocking|educational|relatable",
      "keywords": ["max 5 keywords"],
      "category": "business|motivation|comedy|tutorial|story|lifestyle|general"
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
      const result = this.parseModelJson(responseText);
      let clips = this.normalizeAiSelection({
        aiResult: result,
        candidates,
        totalDuration,
        minClipSec: MIN_CLIP_SEC,
        maxClipSec: MAX_CLIP_SEC,
      });

      if (clips.length < numClips) {
        logger.warn(`AI returned ${clips.length}/${numClips} valid clips, filling from heuristic candidates`);
        clips = this.fillMissingClips(clips, candidates, numClips);
      }

      // Remove overlapping clips (keep higher scoring one)
      clips = this.removeOverlapping(clips);

      if (clips.length < numClips) {
        clips = this.fillMissingClips(clips, candidates, numClips);
      }

      // Sort by score, limit
      clips.sort((a, b) => b.score - a.score);
      clips = clips.slice(0, numClips);

      logger.info(`AI analysis completed: ${clips.length} clips identified`);

      return clips;

    } catch (error) {
      logger.error('AI analysis error:', error);
      logger.warn('Falling back to heuristic transcript segmentation');
      return this.fallbackSegmentation(transcript, numClips, MIN_CLIP_SEC, MAX_CLIP_SEC);
    }
  }

  parseModelJson(responseText = '') {
    const trimmed = String(responseText || '').trim();

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (!match) {
        throw error;
      }

      return JSON.parse(match[0]);
    }
  }

  normalizeAiSelection({ aiResult, candidates, totalDuration, minClipSec, maxClipSec }) {
    const rawClips = Array.isArray(aiResult) ? aiResult : (aiResult?.clips || aiResult?.segments || []);
    const candidateMap = new Map(candidates.map(candidate => [candidate.id, candidate]));

    return rawClips.map((clip) => {
      const candidateId = Number.parseInt(clip.candidateId, 10);
      const candidate = candidateMap.get(candidateId);
      let start = candidate ? candidate.start : (parseFloat(clip.start) || 0);
      let end = candidate ? candidate.end : (parseFloat(clip.end) || 0);

      start = Math.max(0, Math.min(start, totalDuration));

      if (end - start < minClipSec) {
        end = Math.min(start + minClipSec, totalDuration);
      }

      if (end - start > maxClipSec) {
        end = Math.min(start + maxClipSec, totalDuration);
      }

      if (end - start < minClipSec && start > 0) {
        start = Math.max(0, end - minClipSec);
      }

      const duration = end - start;
      if (duration < minClipSec || duration > maxClipSec) {
        return null;
      }

      const clipText = candidate?.text || '';
      const derivedHookStrength = candidate?.hookStrength || scoringService.quickScore(clipText, duration);
      const safeScore = candidate
        ? Math.max(candidate.score, parseFloat(clip.score) || 0)
        : (parseFloat(clip.score) || 50);

      logger.info(`Clip "${clip.title || candidate?.title || `Candidate ${candidateId || '?'}`}": ${start.toFixed(1)}s -> ${end.toFixed(1)}s (${duration.toFixed(1)}s)`);

      return {
        title: clip.title || candidate?.title || 'Untitled Clip',
        description: clip.description || candidate?.description || '',
        start,
        end,
        score: Math.min(100, Math.max(0, safeScore)),
        hookStrength: Math.min(100, Math.max(0, parseFloat(clip.hookStrength) || derivedHookStrength || 50)),
        emotionalTone: clip.emotionalTone || candidate?.emotionalTone || 'neutral',
        keywords: Array.isArray(clip.keywords) ? clip.keywords.slice(0, 5) : (candidate?.keywords || []),
        category: clip.category || candidate?.category || 'general',
      };
    }).filter(Boolean);
  }

  fillMissingClips(existingClips, candidates, numClips) {
    const selected = [...existingClips];

    for (const candidate of candidates) {
      if (selected.length >= numClips) {
        break;
      }

      const duplicate = selected.some((clip) =>
        Math.abs(clip.start - candidate.start) < 0.25 && Math.abs(clip.end - candidate.end) < 0.25
      );

      if (duplicate) {
        continue;
      }

      const overlaps = selected.some((clip) => candidate.start < clip.end && candidate.end > clip.start);
      if (overlaps) {
        continue;
      }

      selected.push({
        title: candidate.title,
        description: candidate.description,
        start: candidate.start,
        end: candidate.end,
        score: candidate.score,
        hookStrength: candidate.hookStrength,
        emotionalTone: candidate.emotionalTone,
        keywords: candidate.keywords,
        category: candidate.category,
      });
    }

    return selected;
  }

  buildCandidateWindows(transcript, options = {}) {
    const { segments = [] } = transcript || {};
    const minClipSec = options.minClipSec || 30;
    const maxClipSec = options.maxClipSec || 90;
    const maxCandidates = options.maxCandidates || 18;

    if (!segments.length) {
      return [];
    }

    const windows = [];
    let lastSampledStart = -Infinity;
    const minStartGap = Math.max(10, Math.floor(minClipSec / 2));

    for (let startIndex = 0; startIndex < segments.length; startIndex++) {
      const startSegment = segments[startIndex];
      if (!startSegment?.text?.trim()) {
        continue;
      }

      if (startSegment.start - lastSampledStart < minStartGap) {
        continue;
      }

      let bestWindow = null;
      let textParts = [];

      for (let endIndex = startIndex; endIndex < segments.length; endIndex++) {
        const endSegment = segments[endIndex];
        const duration = endSegment.end - startSegment.start;

        if (duration > maxClipSec + 0.5) {
          break;
        }

        if (endSegment.text?.trim()) {
          textParts.push(endSegment.text.trim());
        }

        if (duration < minClipSec) {
          continue;
        }

        const text = textParts.join(' ').trim();
        if (!text) {
          continue;
        }

        const score = scoringService.quickScore(text, duration);
        const hookText = this.toPreviewText(text, 140);
        const hookStrength = scoringService.quickScore(hookText, Math.min(duration, 12));
        const window = {
          start: startSegment.start,
          end: endSegment.end,
          duration,
          score,
          hookStrength,
          text,
          title: this.generateFallbackTitle(text, windows.length + 1),
          description: 'Transcript-picked candidate clip with strong hook and retention signals.',
          emotionalTone: this.detectEmotionalTone(text),
          keywords: this.extractKeywords(text),
          category: this.detectCategory(text),
        };

        if (!bestWindow || window.score > bestWindow.score || (window.score === bestWindow.score && window.hookStrength > bestWindow.hookStrength)) {
          bestWindow = window;
        }
      }

      if (bestWindow) {
        windows.push(bestWindow);
        lastSampledStart = startSegment.start;
      }
    }

    windows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.hookStrength - a.hookStrength;
    });

    const selected = [];
    for (const window of windows) {
      if (selected.length >= maxCandidates) {
        break;
      }

      const overlaps = selected.some((candidate) => window.start < candidate.end && window.end > candidate.start);
      if (overlaps) {
        continue;
      }

      selected.push(window);
    }

    return selected.map((candidate, index) => ({
      id: index + 1,
      ...candidate,
    }));
  }

  toPreviewText(text = '', maxLength = 240) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, maxLength - 3).trim()}...`;
  }

  extractKeywords(text = '', maxKeywords = 5) {
    const stopwords = new Set([
      'yang', 'dan', 'untuk', 'dengan', 'karena', 'dari', 'this', 'that', 'have', 'your',
      'about', 'they', 'them', 'kami', 'kamu', 'saya', 'akan', 'atau', 'juga', 'udah',
      'adalah', 'bisa', 'dalam', 'lebih', 'kalau', 'buat', 'dapat', 'jadi', 'seperti'
    ]);

    const counts = new Map();
    for (const word of String(text || '').toLowerCase().match(/[a-z0-9$%]{4,}/g) || []) {
      if (stopwords.has(word)) {
        continue;
      }

      counts.set(word, (counts.get(word) || 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  detectEmotionalTone(text = '') {
    const lower = text.toLowerCase();

    if (/(shock|gila|parah|ternyata|plot twist|nggak nyangka|crazy|shocking|unbelievable)/.test(lower)) return 'shocking';
    if (/(haha|lucu|ketawa|funny|joke|meme| ngakak )/.test(` ${lower} `)) return 'funny';
    if (/(inspir|motiva|semangat|mindset|success|berhasil|dream)/.test(lower)) return 'inspiring';
    if (/(gimana|caranya|tutorial|tips|step|rahasia|how to|belajar)/.test(lower)) return 'educational';
    if (/(gue juga|aku juga|relate|pernah|rasanya|kehidupan|daily|capek)/.test(lower)) return 'relatable';

    return 'neutral';
  }

  detectCategory(text = '') {
    const lower = text.toLowerCase();

    if (/(bisnis|business|startup|jualan|marketing|sales|uang|profit|revenue)/.test(lower)) return 'business';
    if (/(motiva|mindset|discipline|growth|sukses|berhasil)/.test(lower)) return 'motivation';
    if (/(funny|lucu|joke|komedi|ngakak)/.test(lower)) return 'comedy';
    if (/(tutorial|tips|step|how to|caranya|belajar)/.test(lower)) return 'tutorial';
    if (/(story|cerita|pengalaman|kejadian|dulu|waktu itu)/.test(lower)) return 'story';
    if (/(lifestyle|daily|rutinitas|hidup|kebiasaan)/.test(lower)) return 'lifestyle';

    return 'general';
  }

  generateFallbackTitle(text = '', index = 1) {
    const preview = this.toPreviewText(text, 54);
    if (!preview) {
      return `Clip ${index}`;
    }

    return preview;
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

  fallbackSegmentation(transcript, numClips, minSec = 60, maxSec = 90) {
    const candidates = this.buildCandidateWindows(transcript, {
      minClipSec: minSec,
      maxClipSec: maxSec,
      maxCandidates: Math.max(numClips * 3, 12),
    });

    const clips = this.fillMissingClips([], candidates, numClips);

    if (clips.length) {
      logger.info(`Heuristic fallback produced ${clips.length} clips from transcript-wide candidates`);
      return clips;
    }

    const { segments = [] } = transcript || {};
    const totalDuration = segments.length ? segments[segments.length - 1].end : 0;
    const clipDuration = Math.max(minSec, 60);
    const linearFallback = [];

    for (let i = 0; i < numClips; i++) {
      const start = i * clipDuration;
      const end = Math.min(start + clipDuration, totalDuration);

      if (start >= totalDuration) {
        break;
      }

      linearFallback.push({
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

    return linearFallback;
  }
}

module.exports = new AIService();
