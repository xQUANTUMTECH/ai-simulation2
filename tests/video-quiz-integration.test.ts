import { vi, describe, it, expect, beforeEach } from 'vitest';
import { videoService } from '../src/services/video-service';
import { quizService } from '../src/services/quiz-service';
import { quizAIService } from '../src/services/quiz-ai-service';

// Mock di supabase
vi.mock('../src/services/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
      storage: {
        from: vi.fn()
      }
    }
  };
});

// Importiamo supabase dopo il mock
import { supabase } from '../src/services/supabase';

// Mock del servizio AI
vi.mock('../src/services/ai-service', () => {
  return {
    aiService: {
      generateResponse: vi.fn()
    }
  };
});

// Mock del servizio di trascrizione video
vi.mock('../src/services/video-transcoding-service', () => {
  return {
    videoTranscodingService: {
      extractTranscription: vi.fn()
    }
  };
});

import { videoTranscodingService } from '../src/services/video-transcoding-service';
import { aiService } from '../src/services/ai-service';

describe('Integrazione Video e Quiz', () => {
  const mockVideoId = 'video-123';
  const mockVideoUrl = 'https://example.com/video.mp4';
  const mockTranscription = 'Questa è una trascrizione di esempio del video che parla di intelligenza artificiale e machine learning. Le reti neurali sono alla base di molti algoritmi moderni.';
  
  // Esempio di quiz generato
  const mockGeneratedQuiz = {
    title: 'Quiz sull\'Intelligenza Artificiale',
    description: 'Quiz basato sul video di intelligenza artificiale',
    questions: [
      {
        id: 'q1',
        text: 'Cosa è alla base di molti algoritmi moderni?',
        type: 'multiple_choice',
        options: [
          { id: 'a', text: 'Reti neurali', isCorrect: true },
          { id: 'b', text: 'Algoritmi genetici', isCorrect: false },
          { id: 'c', text: 'Alberi decisionali', isCorrect: false },
          { id: 'd', text: 'Sistemi esperti', isCorrect: false }
        ],
        explanation: 'Le reti neurali sono menzionate nella trascrizione come base di molti algoritmi moderni.'
      },
      {
        id: 'q2',
        text: 'Quali sono i due principali argomenti menzionati nella trascrizione?',
        type: 'multiple_choice',
        options: [
          { id: 'a', text: 'Intelligenza artificiale e machine learning', isCorrect: true },
          { id: 'b', text: 'Programmazione e sviluppo web', isCorrect: false },
          { id: 'c', text: 'Database e cloud computing', isCorrect: false },
          { id: 'd', text: 'Hardware e architettura software', isCorrect: false }
        ],
        explanation: 'La trascrizione menziona specificamente l\'intelligenza artificiale e il machine learning.'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock della trascrizione video
    vi.mocked(videoTranscodingService.extractTranscription).mockResolvedValue(mockTranscription);
    
    // Mock della risposta AI per la generazione del quiz
    vi.mocked(aiService.generateResponse).mockResolvedValue(JSON.stringify(mockGeneratedQuiz));
    
    // Mock delle query Supabase
    // @ts-ignore - Ignoriamo problemi di tipo nei test
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'quizzes') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: { id: 'quiz-123', ...mockGeneratedQuiz },
              error: null
            })
          })
        };
      }
      if (table === 'videos') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: mockVideoId, url: mockVideoUrl, transcription: mockTranscription }],
              error: null
            })
          })
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      };
    });
  });

  describe('Generazione Quiz da Video', () => {
    it('dovrebbe generare un quiz da un video usando la trascrizione', async () => {
      // 1. Prima verifichiamo che possiamo ottenere una trascrizione dal video
      const transcription = await videoTranscodingService.extractTranscription(mockVideoUrl);
      expect(transcription).toBe(mockTranscription);
      expect(videoTranscodingService.extractTranscription).toHaveBeenCalledWith(mockVideoUrl);
      
      // 2. Verifichiamo che la funzione di generazione quiz da trascrizione venga chiamata
      const quiz = await quizAIService.generateQuizFromText(transcription, {
        questionCount: 20,
        difficulty: 'medium',
        questionTypes: ['multiple_choice', 'true_false', 'open']
      });
      
      // 3. Verifichiamo che il servizio AI sia stato chiamato per generare il quiz
      expect(aiService.generateResponse).toHaveBeenCalled();
      
      // 4. Verifichiamo che il quiz generato abbia la struttura corretta
      expect(quiz).toHaveProperty('title');
      expect(quiz).toHaveProperty('questions');
      expect(quiz.questions.length).toBeGreaterThan(0);
      
      // 5. Verifichiamo che il quiz possa essere salvato nel database
      const savedQuiz = await quizService.createQuiz({
        title: quiz.title,
        description: quiz.description,
        questions: quiz.questions,
        sourceType: 'video',
        sourceId: mockVideoId
      });
      
      expect(supabase.from).toHaveBeenCalledWith('quizzes');
      expect(savedQuiz).toHaveProperty('id', 'quiz-123');
    });
    
    it('dovrebbe generare un quiz completo con almeno 20 domande quando richiesto', async () => {
      // Modifichiamo il mock per restituire un quiz con 20 domande
      const quizWith20Questions = {
        ...mockGeneratedQuiz,
        questions: Array(20).fill(0).map((_, i) => ({
          id: `q${i+1}`,
          text: `Domanda ${i+1}?`,
          type: 'multiple_choice',
          options: [`Risposta corretta ${i+1}`, `Risposta errata ${i+1}.1`, `Risposta errata ${i+1}.2`, `Risposta errata ${i+1}.3`],
          correctAnswer: `Risposta corretta ${i+1}`,
          explanation: `Spiegazione per la domanda ${i+1}`,
          difficulty: 'medium'
        }))
      };
      
      vi.mocked(aiService.generateResponse).mockResolvedValueOnce(JSON.stringify(quizWith20Questions));
      
      // Generiamo un quiz specificando 20 domande
      const quiz = await quizAIService.generateQuizFromText(mockTranscription, {
        questionCount: 20,
        difficulty: 'medium',
        questionTypes: ['multiple_choice', 'true_false', 'open']
      });
      
      // Verifichiamo che il quiz abbia 20 domande
      expect(quiz.questions.length).toBe(20);
      
      // Verifichiamo che tutte le domande abbiano spiegazioni
      const allQuestionsHaveExplanations = quiz.questions.every(q => 
        q.explanation && q.explanation.length > 0
      );
      expect(allQuestionsHaveExplanations).toBe(true);
    });
    
    it('dovrebbe includere domande a risposta aperta quando richiesto', async () => {
      // Modifichiamo il mock per includere domande a risposta aperta
      const quizWithOpenQuestions = {
        ...mockGeneratedQuiz,
        questions: [
          ...mockGeneratedQuiz.questions,
          {
            id: 'q3',
            text: 'Spiega come le reti neurali contribuiscono all\'intelligenza artificiale moderna.',
            type: 'open',
            correctAnswer: 'Le reti neurali sono fondamentali per l\'AI moderna perché permettono l\'apprendimento da grandi quantità di dati, consentendo ai sistemi di riconoscere pattern complessi e fare predizioni accurate.',
            explanation: 'Una risposta completa dovrebbe menzionare l\'apprendimento automatico, il riconoscimento di pattern e la capacità predittiva.',
            difficulty: 'hard'
          }
        ]
      };
      
      vi.mocked(aiService.generateResponse).mockResolvedValueOnce(JSON.stringify(quizWithOpenQuestions));
      
      // Generiamo un quiz specificando di includere domande a risposta aperta
      const quiz = await quizAIService.generateQuizFromText(mockTranscription, {
        questionCount: 10,
        difficulty: 'medium',
        questionTypes: ['multiple_choice', 'true_false', 'open']
      });
      
      // Verifichiamo che ci sia almeno una domanda a risposta aperta
      const hasOpenQuestion = quiz.questions.some(q => q.type === 'open');
      expect(hasOpenQuestion).toBe(true);
      
      // Verifichiamo che le domande a risposta aperta abbiano i campi necessari
      const openQuestions = quiz.questions.filter(q => q.type === 'open');
      openQuestions.forEach(q => {
        expect(q).toHaveProperty('correctAnswer');
        expect(q).toHaveProperty('explanation');
      });
    });
  });

  describe('Flusso completo da Video a Quiz', () => {
    it('dovrebbe gestire l\'intero processo di generazione quiz da video', async () => {
      // Simulazione del processo completo dall'upload del video alla generazione del quiz
      
      // 1. Supponiamo che il video sia già stato caricato e abbiamo l'ID
      // 2. Otteniamo i dettagli del video
      // @ts-ignore - Ignoriamo problemi di tipo nei test
      vi.mocked(supabase.from).mockImplementation((table) => {
        if (table === 'videos') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: mockVideoId, url: mockVideoUrl, transcription: null }],
                error: null
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: { id: mockVideoId, transcription: mockTranscription },
                error: null
              })
            })
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        };
      });
      
      // 3. Estraiamo la trascrizione dal video
      const transcription = await videoTranscodingService.extractTranscription(mockVideoUrl);
      
      // 4. Aggiorniamo la trascrizione nel record del video
      await videoService.updateTranscription(mockVideoId, transcription);
      
      // 5. Generiamo il quiz dalla trascrizione
      const quiz = await quizAIService.generateQuizFromText(transcription);
      
      // 6. Salviamo il quiz associandolo al video
      const savedQuiz = await quizService.createQuiz({
        title: quiz.title,
        description: quiz.description,
        questions: quiz.questions,
        sourceType: 'video',
        sourceId: mockVideoId
      });
      
      // Verifichiamo che tutte le fasi siano state completate correttamente
      expect(videoTranscodingService.extractTranscription).toHaveBeenCalledWith(mockVideoUrl);
      expect(aiService.generateResponse).toHaveBeenCalled();
      expect(savedQuiz).toHaveProperty('id');
    });
  });
});
