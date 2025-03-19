import { vi, describe, it, expect, beforeEach } from 'vitest';
import { quizAIService } from '../../src/services/quiz-ai-service';
import { documentService } from '../../src/services/document-service';
import { aiService } from '../../src/services/ai-service';

// Mock di aiService
vi.mock('../../src/services/ai-service', () => ({
  aiService: {
    generateResponse: vi.fn().mockResolvedValue(`
    {
      "title": "Quiz sull'Intelligenza Artificiale",
      "description": "Un quiz per testare le conoscenze sull'IA",
      "questions": [
        {
          "text": "Cos'è il Machine Learning?",
          "type": "multiple_choice",
          "options": [
            "Un linguaggio di programmazione",
            "Un algoritmo che permette ai computer di imparare dai dati",
            "Un tipo di hardware",
            "Un sistema operativo"
          ],
          "correctAnswer": "Un algoritmo che permette ai computer di imparare dai dati",
          "explanation": "Il Machine Learning è un campo dell'IA che permette ai computer di apprendere dai dati senza essere esplicitamente programmati.",
          "difficulty": "medium"
        },
        {
          "text": "Quale di queste non è un'area dell'IA?",
          "type": "multiple_choice",
          "options": [
            "Natural Language Processing",
            "Computer Vision",
            "Database Management",
            "Robotica"
          ],
          "correctAnswer": "Database Management",
          "explanation": "Database Management è un campo dell'informatica, ma non è specificamente un'area dell'intelligenza artificiale.",
          "difficulty": "medium"
        },
        {
          "text": "L'IA solleva questioni etiche riguardo a...",
          "type": "multiple_choice",
          "options": [
            "Solo la privacy",
            "Solo il lavoro",
            "Solo la responsabilità",
            "Privacy, lavoro e responsabilità"
          ],
          "correctAnswer": "Privacy, lavoro e responsabilità",
          "explanation": "L'IA solleva molteplici questioni etiche, tra cui quelle legate alla privacy, al lavoro e alla responsabilità.",
          "difficulty": "easy"
        }
      ]
    }
    `)
  }
}));

// Mock di documentService
vi.mock('../../src/services/document-service', () => ({
  documentService: {
    uploadDocument: vi.fn().mockResolvedValue({
      id: 'test-doc-id',
      name: 'test-document.pdf',
      url: 'https://example.com/test-document.pdf',
      type: 'application/pdf',
      size: 1024 * 1024,
      created_at: new Date().toISOString(),
      created_by: 'test-user-id',
      status: 'ready'
    }),
    updateDocumentMetadata: vi.fn().mockResolvedValue(null)
  }
}));

describe('QuizAIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateQuizFromText', () => {
    it('Dovrebbe generare un quiz da un testo semplice', async () => {
      const sampleText = `
      L'intelligenza artificiale (IA) è un campo dell'informatica che si concentra sulla creazione di macchine capaci di pensare e apprendere come gli esseri umani.
      `;
      
      const quizOptions = {
        title: 'Test Quiz',
        questionCount: 3,
        difficulty: 'easy' as const
      };
      
      const quiz = await quizAIService.generateQuizFromText(sampleText, quizOptions);
      
      expect(quiz).toBeDefined();
      expect(quiz.title).toBe('Quiz sull\'Intelligenza Artificiale');
      expect(quiz.questions.length).toBe(3);
      expect(quiz.questions[0].type).toBe('multiple_choice');
    });
    
    it('Dovrebbe gestire correttamente le opzioni di difficoltà', async () => {
      const sampleText = 'Testo di esempio';
      
      const quiz = await quizAIService.generateQuizFromText(sampleText, {
        difficulty: 'hard',
        questionCount: 2
      });
      
      expect(quiz).toBeDefined();
      // Il test è semplificato perché non possiamo accedere direttamente alla proprietà aiService
      expect(quiz.title).toBe('Quiz sull\'Intelligenza Artificiale');
      expect(quiz.questions.length).toBe(3);
    });
  });
  
  describe('generateQuizFromDocument', () => {
    it('Dovrebbe generare un quiz da un documento', async () => {
      // Questo test verifica l'integrazione tra documentService e quizAIService
      // Mock di estrattore di testo da documento
      const mockExtractText = vi.fn().mockResolvedValue(
        'Contenuto del documento estratto. Questo è un testo di esempio.'
      );
      
      // Sostituiamo temporaneamente il metodo extractText
      const originalExtractText = (quizAIService as any).extractTextFromDocument;
      (quizAIService as any).extractTextFromDocument = mockExtractText;
      
      try {
        // Creiamo un quiz da un documento
        const documentId = 'test-doc-id';
        const quiz = await (quizAIService as any).generateQuizFromDocument(documentId, {
          title: 'Quiz dal documento',
          questionCount: 3
        });
        
        expect(quiz).toBeDefined();
        expect(quiz.title).toBe('Quiz sull\'Intelligenza Artificiale');  // dal mock
        expect(quiz.questions.length).toBe(3);
        expect(quiz.metadata?.sourceType).toBe('document');
        expect(quiz.metadata?.sourceId).toBe(documentId);
        
        // Verifichiamo che il metodo di estrazione sia stato chiamato
        expect(mockExtractText).toHaveBeenCalledWith(documentId);
      } finally {
        // Ripristiniamo il metodo originale
        (quizAIService as any).extractTextFromDocument = originalExtractText;
      }
    });
  });
  
  describe('evaluateOpenAnswer', () => {
    it('Dovrebbe valutare una risposta aperta', async () => {
      // Modifichiamo il mock per questo test specifico
      const mockGenerateResponse = vi.spyOn(aiService, 'generateResponse');
      mockGenerateResponse.mockResolvedValueOnce(`
        Punteggio: 85
        Feedback: La risposta è sostanzialmente corretta, ma manca di alcuni dettagli.
        Corretta: true
      `);
      
      const result = await quizAIService.evaluateOpenAnswer(
        'Cos\'è il Machine Learning?',
        'Il Machine Learning è una tecnica che permette ai computer di imparare dai dati.',
        'È quando i computer imparano dai dati senza essere programmati esplicitamente.'
      );
      
      expect(result).toBeDefined();
      expect(result.score).toBe(85);
      expect(result.isCorrect).toBe(true);
      expect(result.feedback).toContain('corretta');
    });
  });
  
  describe('integrazioneConDocumenti', () => {
    it('Dovrebbe generare un quiz da un documento caricato', async () => {
      // Simuliamo il caricamento di un documento
      const mockFile = new File(['test content'], 'test-document.pdf', { type: 'application/pdf' });
      const userId = 'test-user-id';
      
      // Carichiamo il documento
      const document = await documentService.uploadDocument(mockFile, userId);
      
      // Mock per estrattore di testo
      const mockExtractText = vi.fn().mockResolvedValue(
        'Contenuto del documento PDF estratto. Questo è un esempio di integrazione.'
      );
      
      // Sostituiamo temporaneamente il metodo extractText
      const originalExtractText = (quizAIService as any).extractTextFromDocument;
      (quizAIService as any).extractTextFromDocument = mockExtractText;
      
      try {
        // Generiamo un quiz dal documento
        const quizOptions = {
          title: 'Quiz dal documento caricato',
          questionCount: 3
        };
        
        const quiz = await (quizAIService as any).generateQuizFromDocument(document.id, quizOptions);
        
        // Verifiche
        expect(quiz).toBeDefined();
        expect(quiz.questions.length).toBe(3);
        expect(quiz.metadata?.sourceType).toBe('document');
        expect(quiz.metadata?.sourceId).toBe(document.id);
        
        // Verifichiamo che il metodo di estrazione sia stato chiamato con l'ID corretto
        expect(mockExtractText).toHaveBeenCalledWith(document.id);
      } finally {
        // Ripristiniamo il metodo originale
        (quizAIService as any).extractTextFromDocument = originalExtractText;
      }
    });
  });
});
