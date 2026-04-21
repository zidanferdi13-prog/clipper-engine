const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/logger');
const OpenAI = require('openai');

const execPromise = util.promisify(exec);

class TranscribeService {
  constructor() {
    this.storageDir = process.env.STORAGE_PATH || './storage';
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async transcribe(videoPath, jobId) {
    try {
      // Extract audio from video
      const audioPath = await this.extractAudio(videoPath, jobId);

      // Transcribe with OpenAI Whisper
      logger.info('Starting transcription with OpenAI Whisper...');

      const audioFile = await fs.readFile(audioPath);
      const audioBlob = new Blob([audioFile], { type: 'audio/mp3' });

      const transcription = await this.openai.audio.transcriptions.create({
        file: audioBlob,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['word']
      });

      logger.info('Transcription completed');

      // Format transcript with word-level timestamps
      const formattedTranscript = this.formatTranscript(transcription);

      return formattedTranscript;

    } catch (error) {
      logger.error('Transcription error:', error);
      throw new Error(`Failed to transcribe: ${error.message}`);
    }
  }

  async extractAudio(videoPath, jobId) {
    try {
      const audioDir = path.join(this.storageDir, 'audio');
      await fs.mkdir(audioDir, { recursive: true });

      const audioPath = path.join(audioDir, `${jobId}.mp3`);

      logger.info('Extracting audio from video...');

      const command = `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -q:a 2 "${audioPath}"`;
      await execPromise(command);

      logger.info('Audio extracted successfully');

      return audioPath;

    } catch (error) {
      logger.error('Audio extraction error:', error);
      throw new Error(`Failed to extract audio: ${error.message}`);
    }
  }

  formatTranscript(transcription) {
    const { text, words } = transcription;

    // Build word-level transcript
    const wordLevelTranscript = (words || []).map(word => ({
      word: word.word,
      start: word.start,
      end: word.end
    }));

    // Build sentence-level segments (group by sentences)
    const segments = [];
    let currentSegment = {
      text: '',
      start: 0,
      end: 0,
      words: []
    };

    (words || []).forEach((word, index) => {
      if (index === 0) {
        currentSegment.start = word.start;
      }

      currentSegment.text += word.word + ' ';
      currentSegment.words.push({
        word: word.word,
        start: word.start,
        end: word.end
      });
      currentSegment.end = word.end;

      // End segment on sentence-ending punctuation or every ~30 words
      const endsWithPunctuation = /[.!?]$/.test(word.word);
      if (endsWithPunctuation || currentSegment.words.length >= 30) {
        segments.push({ ...currentSegment });
        currentSegment = {
          text: '',
          start: word.end,
          end: word.end,
          words: []
        };
      }
    });

    // Add last segment if not empty
    if (currentSegment.words.length > 0) {
      segments.push(currentSegment);
    }

    return {
      fullText: text,
      words: wordLevelTranscript,
      segments
    };
  }
}

module.exports = new TranscribeService();
