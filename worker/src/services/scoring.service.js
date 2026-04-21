'use strict';

const logger = require('../config/logger');

// ─── Viral Keyword Database ────────────────────────────────────────────────────
// Words associated with high-performing short-form content
const VIRAL_KEYWORDS = {
  power: {
    words: [
      'secret', 'crazy', 'truth', 'money', 'mistake', 'warning', 'never', 'best',
      'worst', 'million', 'rich', 'poor', 'hack', 'shocking', 'exposed', 'confess',
      'scandal', 'banned', 'illegal', 'forbidden', 'viral', 'exclusive', 'leaked',
      'untold', 'hidden', 'real', 'actual', 'brutal'
    ],
    weight: 10,
  },
  hook: {
    words: [
      'wait', 'actually', 'honestly', 'listen', 'hear me out', "here's the thing",
      'nobody talks about', "they don't want you", 'changed my life', 'i was wrong',
      'i made a mistake', 'you need to know', 'stop doing', 'start doing',
      'the reason', 'the truth is', 'most people', 'no one tells you', 'i lost',
      'i gained', "you won't believe", 'plot twist', 'but here', "here's why"
    ],
    weight: 8,
  },
  emotional: {
    words: [
      'love', 'hate', 'fear', 'amazing', 'terrible', 'incredible', 'unbelievable',
      'heartbreaking', 'inspiring', 'devastating', 'shocking', 'wild', 'insane',
      'broke down', 'cried', 'laughed', 'screamed', 'regret', 'proud', 'ashamed'
    ],
    weight: 6,
  },
  curiosity: {
    words: [
      'why', 'how', 'what if', 'imagine', 'did you know', 'what happened',
      'you should', 'you need to', 'the answer', 'the reason', 'find out',
      'discovered', 'realized', 'figured out', 'turns out'
    ],
    weight: 5,
  },
  money_status: {
    words: [
      '$', 'dollar', 'profit', 'revenue', 'income', 'salary', 'invest',
      'passive', 'side hustle', 'startup', 'business', 'entrepreneur', 'founder',
      'ceo', 'billionaire', 'millionaire', 'broke', 'debt', 'credit', 'loan'
    ],
    weight: 7,
  },
};

// ─── Emotion → viral potential multiplier ────────────────────────────────────
const TONE_SCORE_BOOST = {
  shocking:    1.10,
  funny:       1.05,
  inspiring:   1.00,
  relatable:   0.95,
  educational: 0.90,
  neutral:     0.75,
};

// ─── Category baseline weights ────────────────────────────────────────────────
const CATEGORY_WEIGHT = {
  business:   0.95,
  motivation: 1.00,
  comedy:     1.05,
  tutorial:   0.90,
  story:      1.00,
  lifestyle:  0.90,
  general:    0.85,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Score keyword density in text (0–100).
 * Rewards presence of multiple high-value words but caps to avoid reward hacking.
 */
function scoreKeywords(text) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let total = 0;
  let maxSingle = 0;

  for (const { words, weight } of Object.values(VIRAL_KEYWORDS)) {
    for (const word of words) {
      if (lower.includes(word)) {
        total += weight;
        if (weight > maxSingle) maxSingle = weight;
      }
    }
  }
  // Blend total (breadth) + max (peak hit) and cap at 100
  return Math.min(total * 2 + maxSingle * 4, 100);
}

/**
 * Estimate speech energy from word count / duration (words-per-second proxy).
 * Higher speech rate = higher energy = more engaging content.
 */
function estimateSpeechEnergy(text, durationSec) {
  if (!text || durationSec <= 0) return 50;
  const wps = text.trim().split(/\s+/).length / durationSec;

  if (wps >= 4.5) return 100;
  if (wps >= 4.0) return 90;
  if (wps >= 3.5) return 80;
  if (wps >= 3.0) return 65;
  if (wps >= 2.5) return 55;
  if (wps >= 2.0) return 45;
  return 30;
}

/**
 * Detect retention-driving patterns in text (0–100).
 * Looks for narrative arcs, specificity, direct address, questions.
 */
function scoreRetentionPattern(text) {
  if (!text) return 50;
  const lower = text.toLowerCase();
  let score = 50;

  // Narrative arc keywords
  if (/\b(and then|but then|suddenly|so i|i realized|turns out|until)\b/.test(lower)) score += 12;
  // Specific numbers make content feel credible & relatable
  if (/\$[\d,]+|\d+%|\d+ (years?|months?|days?|hours?|minutes?|seconds?)\b/.test(lower)) score += 10;
  // Direct address to viewer
  if (/\b(you|your|you're|you've|you'll|you'd)\b/.test(lower)) score += 8;
  // Curiosity questions
  if (/\?/.test(text)) score += 8;
  // Lists / steps signal value
  if (/\b(first|second|third|step \d|number \d|\d\.)\b/.test(lower)) score += 8;
  // Contrast creates tension
  if (/\b(but|however|although|yet|instead|actually|despite)\b/.test(lower)) score += 6;
  // All-caps emphasis words
  const capsWords = (text.match(/\b[A-Z]{3,}\b/g) || []).length;
  score += Math.min(capsWords * 4, 12);

  return Math.min(score, 100);
}

// ─── Scoring Service ──────────────────────────────────────────────────────────

class ScoringService {
  /**
   * Enhance and re-rank AI-provided clips using multi-factor heuristic scoring.
   *
   * Formula (weighted sum, then tone + category multipliers):
   *   base = aiScore*0.35 + keywords*0.20 + hookStr*0.20 + energy*0.10 + retention*0.15
   *   final = clamp(base * toneBoost * categoryWeight, 0, 100)
   *
   * @param {Array}  clips      - Raw clips from ai.service.analyzeTranscript()
   * @param {Object} transcript - { fullText, segments }
   * @returns {Array} Clips with enriched score + scoreBreakdown, sorted best-first
   */
  enhanceScores(clips, transcript = {}) {
    if (!clips?.length) return [];

    const scored = clips.map(clip => {
      const clipText  = this._extractClipText(clip, transcript);
      const duration  = Math.max(1, (clip.end || 0) - (clip.start || 0));

      // Component scores (each 0–100)
      const aiScore    = Math.min(clip.score        || 50, 100);
      const hookStr    = Math.min(clip.hookStrength || 50, 100);
      const keywords   = scoreKeywords(clipText);
      const energy     = estimateSpeechEnergy(clipText, duration);
      const retention  = scoreRetentionPattern(clipText);

      // Weighted base
      const base =
        aiScore   * 0.35 +
        keywords  * 0.20 +
        hookStr   * 0.20 +
        energy    * 0.10 +
        retention * 0.15;

      // Multipliers from content tone & category
      const toneBoost = TONE_SCORE_BOOST[clip.emotionalTone]  ?? 0.90;
      const catMult   = CATEGORY_WEIGHT[clip.category]         ?? 0.90;

      const finalScore = Math.round(Math.min(base * toneBoost * catMult, 100));

      // Generate hashtags for this clip
      const hashtags = this.generateHashtags(clip);

      return {
        ...clip,
        score: finalScore,
        hashtags: clip.hashtags?.length ? clip.hashtags : hashtags,
        scoreBreakdown: {
          ai:        Math.round(aiScore),
          keywords:  Math.round(keywords),
          hook:      Math.round(hookStr),
          energy:    Math.round(energy),
          retention: Math.round(retention),
        },
      };
    });

    // Sort best-first, remove exact duplicates by (start, end)
    scored.sort((a, b) => b.score - a.score);
    const seen = new Set();
    return scored.filter(c => {
      const key = `${c.start.toFixed(1)}-${c.end.toFixed(1)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Extract transcript text that overlaps with a clip's time range.
   */
  _extractClipText(clip, transcript) {
    const segs = transcript?.segments || [];
    if (!segs.length) return transcript?.fullText?.slice(0, 400) || '';
    return segs
      .filter(s => s.end >= clip.start && s.start <= clip.end)
      .map(s => s.text)
      .join(' ')
      .trim();
  }

  /**
   * Generate platform-appropriate hashtags from clip metadata.
   */
  generateHashtags(clip, count = 8) {
    const base = ['#shorts', '#fyp', '#viral', '#trending', '#foryou'];

    const toneMap = {
      funny:       ['#funny', '#comedy', '#lol', '#humor'],
      inspiring:   ['#motivation', '#mindset', '#success', '#inspire'],
      shocking:    ['#mindblown', '#omg', '#shocking', '#cantbelieve'],
      educational: ['#learnontiktok', '#didyouknow', '#facts'],
      relatable:   ['#relatable', '#mood', '#facts'],
    };
    const catMap = {
      business:   ['#business', '#entrepreneur', '#hustle', '#money'],
      motivation: ['#motivation', '#grindset', '#winning', '#growth'],
      comedy:     ['#comedy', '#funny', '#meme', '#relatable'],
      tutorial:   ['#tutorial', '#howto', '#tips', '#lifehack'],
      story:      ['#storytime', '#realstory', '#irl'],
      lifestyle:  ['#lifestyle', '#vlog', '#dayinmylife'],
    };

    const extras = [
      ...(toneMap[clip.emotionalTone] || []),
      ...(catMap[clip.category]       || []),
    ];
    const all = [...base, ...extras].filter((v, i, a) => a.indexOf(v) === i);
    return all.slice(0, count);
  }

  /**
   * Quick single-clip score (no transcript context needed).
   * Useful for re-render / manual score refresh.
   */
  quickScore(text, durationSec, emotionalTone = 'neutral', category = 'general') {
    const keywords  = scoreKeywords(text);
    const energy    = estimateSpeechEnergy(text, durationSec);
    const retention = scoreRetentionPattern(text);
    const base      = keywords * 0.35 + energy * 0.30 + retention * 0.35;
    const mult      = (TONE_SCORE_BOOST[emotionalTone] ?? 0.90) * (CATEGORY_WEIGHT[category] ?? 0.90);
    return Math.round(Math.min(base * mult, 100));
  }
}

module.exports = new ScoringService();
