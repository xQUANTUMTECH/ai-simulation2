import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { documentService } from '../src/services/document-service';
import { quizAIService } from '../src/services/quiz-ai-service';
import { aiService } from '../src/services/ai-service';

// Mock di aiService per simulare risposte dell'AI senza chiamate reali
vi.mock('../src/services/ai-service', () => ({
  aiService: {
    generateResponse: vi.fn()
  }
}));

// Mock del servizio dei documenti per simulare l'upload e l'estrazione del testo
vi.mock('../src/services/document-service', () => ({
  documentService: {
    uploadDocument: vi.fn(),
    getDocument: vi.fn(),
    extractText: vi.fn()
  }
}));

describe('Integrazione Documento-Quiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('dovrebbe generare un quiz da un documento caricato', async () => {
    // Prepara mock per simulare risposta AI
    const mockQuizResponse = JSON.stringify({
      title: "Quiz sul Documento di Test",
      description: "Verifica la comprensione del documento caricato",
      questions: [
        {
          text: "Qual è l'argomento principale del documento?",
          type: "multiple_choice",
          options: ["Opzione 1", "Opzione 2", "Argomento del documento", "Opzione 4"],
          correctAnswer: "Argomento del documento",
          explanation: "Spiegazione dettagliata della risposta",
          difficulty: "medium"
        },
        {
          text: "Secondo il documento, questa affermazione è vera?",
          type: "true_false",
          correctAnswer: true,
          explanation: "Spiegazione dettagliata del perché è vera",
          difficulty: "easy"
        }
      ]
    });

    // Mock per l'upload del documento
    const mockDocumentId = 'doc_1234567890';
    const mockDocumentFile = new File(['contenuto del documento'], 'test-document.pdf', { type: 'application/pdf' });
    
    documentService.uploadDocument = vi.fn().mockResolvedValue({
      id: mockDocumentId,
      name: 'test-document.pdf',
      type: 'application/pdf',
      url: 'https://example.com/test-document.pdf',
      size: 1024
    });

    // Mock per l'estrazione del testo dal documento
    const mockExtractedText = `
      Questo è il testo estratto dal documento di test.
      Contiene informazioni sull'argomento principale del documento.
      Inoltre, include un'affermazione vera che verrà usata per le domande vero/falso.
    `;
    
    // Utilizziamo spy per accedere al metodo privato extractTextFromDocument
    const extractTextSpy = vi.spyOn(quizAIService as any, 'extractTextFromDocument')
      .mockResolvedValue(mockExtractedText);

    // Mock della risposta dell'AI per la generazione del quiz
    aiService.generateResponse = vi.fn().mockResolvedValue(mockQuizResponse);

    // Esegui il test: upload documento e genera quiz
    const uploadResult = await documentService.uploadDocument(mockDocumentFile, 'test-user-id');
    
    expect(uploadResult.id).toBe(mockDocumentId);
    expect(documentService.uploadDocument).toHaveBeenCalledWith(mockDocumentFile, 'test-user-id');

    // Genera quiz basato sul documento
    const quiz = await quizAIService.generateQuizFromDocument(mockDocumentId, {
      title: 'Quiz sul Documento',
      questionCount: 5
    });

    // Verifica che l'estrazione del testo sia stata chiamata
    expect(extractTextSpy).toHaveBeenCalledWith(mockDocumentId);
    
    // Verifica che l'AI sia stata chiamata con il testo estratto
    expect(aiService.generateResponse).toHaveBeenCalled();
    
    // Verifica la struttura del quiz generato
    expect(quiz).toHaveProperty('id');
    expect(quiz).toHaveProperty('title');
    expect(quiz).toHaveProperty('questions');
    expect(quiz.questions.length).toBeGreaterThan(0);
    
    // Verifica che i metadati contengano le informazioni corrette
    expect(quiz.metadata).toHaveProperty('sourceType', 'document');
    expect(quiz.metadata).toHaveProperty('sourceId', mockDocumentId);
  });

  it('dovrebbe generare un quiz con spiegazioni dettagliate per le risposte', async () => {
    // Prepara mock per simulare risposta AI con spiegazioni dettagliate
    const mockQuizResponse = JSON.stringify({
      title: "Quiz Avanzato sul Documento",
      description: "Verifica approfondita della comprensione del documento",
      questions: [
        {
          text: "Quale concetto fondamentale viene esposto nel documento?",
          type: "multiple_choice",
          options: [
            "Concetto errato A", 
            "Concetto fondamentale corretto", 
            "Concetto errato B", 
            "Concetto errato C"
          ],
          correctAnswer: "Concetto fondamentale corretto",
          explanation: "Il documento spiega chiaramente questo concetto fondamentale nella sezione X. L'opzione A è errata perché contraddice quanto affermato nel paragrafo Y. L'opzione B è errata perché confonde due concetti distinti. L'opzione C non viene menzionata nel documento.",
          difficulty: "hard"
        }
      ]
    });

    // Mock per l'estrazione del testo
    const mockExtractedText = "Contenuto del documento con spiegazione dettagliata del concetto fondamentale";
    vi.spyOn(quizAIService as any, 'extractTextFromDocument')
      .mockResolvedValue(mockExtractedText);

    // Mock della risposta dell'AI
    aiService.generateResponse = vi.fn().mockResolvedValue(mockQuizResponse);

    // Genera quiz
    const quiz = await quizAIService.generateQuizFromDocument('doc_abcdef', {
      questionCount: 1
    });

    // Verifica che la spiegazione sia dettagliata
    expect(quiz.questions[0].explanation).toBeDefined();
    expect((quiz.questions[0].explanation as string).length).toBeGreaterThan(50);
    expect(quiz.questions[0].explanation).toContain("errata");
  });

  it('dovrebbe valutare le risposte aperte con feedback dettagliato', async () => {
    // Mock della risposta dell'AI per la valutazione
    const mockEvaluationResponse = `
      Punteggio: 85
      Feedback: La risposta è generalmente corretta. Hai identificato correttamente il concetto principale, ma manca qualche dettaglio importante menzionato nel documento. La tua spiegazione è chiara ma potrebbe essere più completa.
      Corretta: true
    `;

    aiService.generateResponse = vi.fn().mockResolvedValue(mockEvaluationResponse);

    // Valuta una risposta aperta
    const evaluation = await quizAIService.evaluateOpenAnswer(
      "Spiega il concetto principale del documento",
      "Il concetto principale è X che implica Y e Z",
      "Il concetto principale è X che implica Y"
    );

    // Verifica valutazione
    expect(evaluation.score).toBe(85);
    expect(evaluation.isCorrect).toBe(true);
    expect(evaluation.feedback).toContain("generalmente corretta");
    expect(evaluation.feedback).toContain("manca qualche dettaglio");
  });

  it('dovrebbe generare suggerimenti di studio in base alle risposte errate', async () => {
    // Mock della risposta dell'AI per i suggerimenti di studio
    const mockSuggestionsResponse = `
      Aree deboli: ["Comprensione dei concetti fondamentali", "Applicazione pratica"]
      Raccomandazioni: ["Rivedere il capitolo 3 del documento", "Esercitarsi con esempi pratici", "Consultare risorse aggiuntive"]
      Prossimi passi: "Concentrarsi sui concetti fondamentali prima di procedere agli argomenti avanzati. Creare schemi concettuali per visualizzare le relazioni tra i diversi aspetti."
    `;

    aiService.generateResponse = vi.fn().mockResolvedValue(mockSuggestionsResponse);

    // Crea quiz e risposte di esempio
    const quiz = {
      id: 'quiz_123',
      title: 'Quiz di Test',
      description: 'Descrizione del quiz',
      questions: [
        {
          id: 'q1',
          text: 'Domanda 1?',
          type: 'multiple_choice' as const,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'C',
          difficulty: 'medium' as const
        },
        {
          id: 'q2',
          text: 'Domanda 2?',
          type: 'true_false' as const,
          correctAnswer: true,
          difficulty: 'easy' as const
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const userAnswers = {
      q1: 'A', // risposta errata
      q2: true // risposta corretta
    };

    // Ottieni suggerimenti
    const suggestions = await quizAIService.generateStudySuggestions(quiz, userAnswers, 50);

    // Verifica suggerimenti
    expect(suggestions.weakAreas).toContain("Comprensione dei concetti fondamentali");
    expect(suggestions.recommendations.length).toBe(3);
    expect(suggestions.nextSteps).toContain("Concentrarsi sui concetti fondamentali");
  });
});
