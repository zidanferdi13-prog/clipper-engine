const OpenAI = require('openai');
const logger = require('../config/logger');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async analyzeTranscript(transcript, numClips = 5) {
    try {
      const { fullText, segments } = transcript;

      logger.info(`Analyzing transcript for ${numClips} viral clips...`);

      const prompt = `Kamu adalah AI expert yang membantu content creator membuat viral short-form video.

Berikut adalah transkrip lengkap dari sebuah video:

"""
${fullText}
"""

Berikut adalah segmentasi dengan timestamp:
${JSON.stringify(segments.slice(0, 50), null, 2)}

TUGAS:
Pilih ${numClips} segmen terbaik yang paling berpotensi VIRAL untuk dijadikan short-form content (TikTok/Reels/Shorts).

KRITERIA SEGMENT VIRAL:
1. **Hook Kuat** - Menarik perhatian di 3 detik pertama
2. **Emosi Tinggi** - Lucu, inspiring, shocking, relatable
3. **Value/Insight** - Ada pembelajaran atau info berharga
4. **Stand-alone** - Bisa dipahami tanpa context lengkap
5. **Durasi Ideal** - 30-60 detik
6. **Call-to-Action** - Ada ajakan atau pertanyaan yang engage
7. **Trending Topic** - Relatable dengan trend saat ini

OUTPUT FORMAT (JSON):
Berikan array of objects dengan struktur:
[
  {
    "title": "Judul menarik untuk clip",
    "description": "Deskripsi singkat kenapa ini viral",
    "start": <timestamp_mulai_dalam_detik>,
    "end": <timestamp_selesai_dalam_detik>,
    "score": <skor 0-100>,
    "hookStrength": <skor 0-100>,
    "emotionalTone": "funny/inspiring/shocking/educational/relatable",
    "keywords": ["keyword1", "keyword2"],
    "category": "business/motivation/comedy/tutorial/story"
  }
]

PENTING:
- Pastikan timestamp start & end akurat
- Urutkan berdasarkan score tertinggi
- Pilih segment yang berbeda (jangan overlapping)
- Judul harus clickbait tapi tidak misleading

Berikan HANYA JSON array, tanpa text lain.`;

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Kamu adalah AI expert dalam video content analysis dan viral content creation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0].message.content;
      logger.info('AI analysis response received');

      // Parse JSON response
      let result = JSON.parse(responseText);
      
      // Handle different response formats
      let clips = Array.isArray(result) ? result : (result.clips || result.segments || []);

      // Validate and sanitize clips
      clips = clips.map(clip => ({
        title: clip.title || 'Untitled Clip',
        description: clip.description || '',
        start: parseFloat(clip.start) || 0,
        end: parseFloat(clip.end) || 0,
        score: Math.min(100, Math.max(0, clip.score || 50)),
        hookStrength: Math.min(100, Math.max(0, clip.hookStrength || 50)),
        emotionalTone: clip.emotionalTone || 'neutral',
        keywords: Array.isArray(clip.keywords) ? clip.keywords : [],
        category: clip.category || 'general'
      }));

      // Sort by score
      clips.sort((a, b) => b.score - a.score);

      // Limit to requested number
      clips = clips.slice(0, numClips);

      logger.info(`AI analysis completed: ${clips.length} clips identified`);

      return clips;

    } catch (error) {
      logger.error('AI analysis error:', error);
      
      // Fallback: simple segmentation if AI fails
      logger.warn('Falling back to simple segmentation');
      return this.fallbackSegmentation(transcript, numClips);
    }
  }

  fallbackSegmentation(transcript, numClips) {
    const { segments } = transcript;
    
    // Simple fallback: divide into equal parts
    const totalDuration = segments[segments.length - 1]?.end || 0;
    const clipDuration = 45; // 45 seconds per clip
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
