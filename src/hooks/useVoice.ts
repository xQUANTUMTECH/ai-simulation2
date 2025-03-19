import { useState, useEffect, useCallback } from 'react';
import { voiceService, VoiceConfig } from '../services/voice-service';

export function useVoice(config?: Partial<VoiceConfig>) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config?.language) {
      voiceService.setLanguage(config.language);
    }

    const handleFinalResult = (text: string) => {
      setTranscript(text);
    };

    const handleError = (error: string) => {
      setError(error);
      setIsListening(false);
      setIsSpeaking(false);
    };

    const handleSpeakEnd = () => {
      setIsSpeaking(false);
    };

    voiceService.on('finalResult', handleFinalResult);
    voiceService.on('error', handleError);
    voiceService.on('speakEnd', handleSpeakEnd);
    voiceService.on('listeningStart', () => setIsListening(true));
    voiceService.on('listeningStop', () => setIsListening(false));

    return () => {
      voiceService.removeListener('finalResult', handleFinalResult);
      voiceService.removeListener('error', handleError);
      voiceService.removeListener('speakEnd', handleSpeakEnd);
      voiceService.removeListener('listeningStart', () => setIsListening(true));
      voiceService.removeListener('listeningStop', () => setIsListening(false));
    };
  }, [config?.language]);

  const startListening = useCallback(() => {
    try {
      voiceService.startListening();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error starting voice recognition');
    }
  }, []);

  const stopListening = useCallback(() => {
    voiceService.stopListening();
  }, []);

  const speak = useCallback(async (text: string, speakConfig?: Partial<VoiceConfig>) => {
    try {
      setIsSpeaking(true);
      setError(null);
      await voiceService.speak(text, speakConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error speaking text');
      setIsSpeaking(false);
    }
  }, []);

  const cancel = useCallback(() => {
    if (isSpeaking) {
      voiceService.cancel();
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  return {
    isListening,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
    cancel,
    isSupported: voiceService.isSupported()
  };
}