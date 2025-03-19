import { aiService } from './ai-service';

export interface TTSConfig {
  voice?: string;
  language?: string;
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry';
  pitch?: number;
  rate?: number;
}

class TTSService {
  private readonly groqKey = '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';

  async synthesize(text: string, config: TTSConfig = {}): Promise<ArrayBuffer> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'whisper-large-v3',
          input: text,
          voice: config.voice || 'alloy',
          language: config.language || 'it',
          emotion: config.emotion || 'neutral',
          pitch: config.pitch || 1.0,
          rate: config.rate || 1.0
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('TTS error:', error);
      throw error;
    }
  }

  async speak(text: string, config: TTSConfig = {}): Promise<void> {
    try {
      const audioData = await this.synthesize(text, config);
      const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };

        audio.play();
      });
    } catch (error) {
      console.error('Speech error:', error);
      throw error;
    }
  }
}

export const ttsService = new TTSService();