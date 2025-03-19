import { aiService } from './ai-service';
import { supabase } from './supabase';

// Dichiarazioni di tipo per le librerie esterne
declare global {
  interface Window {
    pdfjsLib: {
      getDocument: (options: { data: ArrayBuffer }) => { promise: any };
    };
    mammoth: {
      extractRawText: (options: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    };
  }
}

export interface QuizQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'open';
  options?: string[];
  correctAnswer?: string | boolean;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  timeLimit?: number; // in seconds
  passingScore?: number; // percentage
  createdAt: string;
  updatedAt: string;
  metadata?: {
    sourceType?: 'document' | 'video' | 'course';
    sourceId?: string;
    generationModel?: string;
    generationPrompt?: string;
    documentText?: string; // Testo estratto dal documento (anteprima)
  };
}

/**
 * Servizio per la generazione di quiz tramite AI
 */
class QuizAIService {
  private readonly defaultModel = 'mistral';
  
  /**
   * Genera un quiz completo basato su un testo o documento
   */
  async generateQuizFromText(
    text: string, 
    options: {
      title?: string;
      questionCount?: number;
      difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
      questionTypes?: ('multiple_choice' | 'true_false' | 'open')[];
      topic?: string;
      timeLimit?: number;
    } = {}
  ): Promise<Quiz> {
    const {
      title = 'Quiz Autogenerato',
      questionCount = 5,
      difficulty = 'mixed',
      questionTypes = ['multiple_choice', 'true_false'],
      topic = '',
      timeLimit = 900 // 15 minuti di default
    } = options;
    
    // Costruzione del prompt per l'AI
    const prompt = this.buildQuizGenerationPrompt(
      text,
      questionCount,
      difficulty,
      questionTypes,
      topic
    );
    
    try {
      // Genera quiz usando l'AI
      const aiResponse = await aiService.generateResponse(prompt, this.defaultModel);
      
      // Parse della risposta in formato quiz
      const quiz = this.parseQuizResponse(aiResponse, {
        title,
        timeLimit,
        sourceType: 'document'
      });
      
      return quiz;
    } catch (error) {
      console.error('Errore nella generazione del quiz:', error);
      throw new Error('Impossibile generare il quiz: ' + (error as Error).message);
    }
  }
  
  /**
   * Genera un quiz basato su un video (usando la trascrizione o metadati)
   */
  async generateQuizFromVideo(
    videoId: string,
    transcription: string,
    options: {
      title?: string;
      questionCount?: number;
      difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
      timeLimit?: number;
    } = {}
  ): Promise<Quiz> {
    const quiz = await this.generateQuizFromText(transcription, {
      ...options,
      title: options.title || 'Quiz sul Video',
      questionCount: options.questionCount || 20, // Default 20 domande per i video
    });
    
    // Aggiungiamo metadati specifici del video
    quiz.metadata = {
      ...quiz.metadata,
      sourceType: 'video',
      sourceId: videoId
    };
    
    return quiz;
  }
  
  /**
   * Genera un quiz da un documento caricato
   */
  async generateQuizFromDocument(
    documentId: string,
    options: {
      title?: string;
      questionCount?: number;
      difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
      timeLimit?: number;
    } = {}
  ): Promise<Quiz> {
    // Estraiamo il testo dal documento
    const text = await this.extractTextFromDocument(documentId);
    
    if (!text || text.trim().length === 0) {
      throw new Error('Impossibile estrarre testo dal documento. Il contenuto è vuoto.');
    }
    
    // Generiamo il quiz dal testo estratto
    const quiz = await this.generateQuizFromText(text, {
      ...options,
      title: options.title || 'Quiz sul Documento',
      questionCount: options.questionCount || 20, // Default 20 domande per i documenti
    });
    
    // Aggiungiamo metadati specifici del documento
    quiz.metadata = {
      ...quiz.metadata,
      sourceType: 'document',
      sourceId: documentId
    };
    
    return quiz;
  }
  
  /**
   * Estrae il testo da un documento dato il suo ID
   * Questa è l'implementazione reale che ottiene il documento da Supabase
   * e ne estrae il testo utilizzando le API appropriate in base al formato
   */
  private async extractTextFromDocument(documentId: string): Promise<string> {
    try {
      // Ottieni metadati del documento da Supabase
      if (!supabase) throw new Error('Supabase client not initialized');
      
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (documentError) throw documentError;
      if (!documentData) throw new Error(`Documento con ID ${documentId} non trovato`);
      
      // Ottieni l'URL del file da Storage
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('documents')
        .createSignedUrl(documentData.file_path, 3600); // URL valido per 1 ora
      
      if (fileError) throw fileError;
      if (!fileData?.signedUrl) throw new Error('Impossibile ottenere URL firmato per il documento');
      
      // Recupera il contenuto del file
      const fileResponse = await fetch(fileData.signedUrl);
      if (!fileResponse.ok) {
        throw new Error(`Errore nel recupero del file: ${fileResponse.statusText}`);
      }
      
      let text = '';
      
      // Estrai il testo in base al tipo di documento
      const fileType = documentData.mime_type || 'application/octet-stream';
      
      if (fileType.includes('pdf')) {
        // Per i PDF, utilizziamo PDF.js
        const arrayBuffer = await fileResponse.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          text += pageText + '\n\n';
        }
      } else if (fileType.includes('word') || fileType.includes('docx')) {
        // Per i documenti Word, utilizziamo mammoth.js
        const arrayBuffer = await fileResponse.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (fileType.includes('text') || fileType.includes('markdown')) {
        // Per i file di testo semplice
        text = await fileResponse.text();
      } else {
        // Per altri tipi di file, utilizziamo il testo memorizzato in Supabase
        // che potrebbe essere stato estratto durante l'upload
        text = documentData.extracted_text || '';
        
        if (!text) {
          throw new Error(`Formato di documento non supportato: ${fileType}`);
        }
      }
      
      // Se abbiamo un testo estratto, lo ritorniamo
      if (text.trim()) {
        console.log(`Estratto con successo ${text.length} caratteri dal documento ${documentId}`);
        return text;
      }
      
      // Se non è stato possibile estrarre il testo, utilizziamo il testo associato
      if (documentData.extracted_text) {
        return documentData.extracted_text;
      }
      
      throw new Error('Impossibile estrarre il testo dal documento');
    } catch (error) {
      console.error('Errore nell\'estrazione del testo dal documento:', error);
      throw new Error('Impossibile estrarre il testo dal documento: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  
  /**
   * Genera un quiz basato su un corso completo
   */
  async generateQuizFromCourse(
    courseId: string,
    courseContent: string,
    options: {
      title?: string;
      questionCount?: number;
      difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
      timeLimit?: number;
      focusAreas?: string[];
    } = {}
  ): Promise<Quiz> {
    const {
      title = 'Valutazione del Corso',
      focusAreas = []
    } = options;
    
    // Costruisci prompt con focus specifici del corso
    let prompt = this.buildQuizGenerationPrompt(
      courseContent,
      options.questionCount || 20, // Default 20 domande per i corsi
      options.difficulty || 'mixed',
      ['multiple_choice', 'true_false', 'open'],
      ''
    );
    
    // Aggiungi indicazioni sulle aree di focus
    if (focusAreas.length > 0) {
      prompt += `\nFocalizza le domande sulle seguenti aree: ${focusAreas.join(', ')}.`;
    }
    
    try {
      // Genera quiz usando l'AI
      const aiResponse = await aiService.generateResponse(prompt, this.defaultModel);
      
      // Parse della risposta in formato quiz
      const quiz = this.parseQuizResponse(aiResponse, {
        title,
        timeLimit: options.timeLimit || 1800, // 30 minuti per quiz di corso
        sourceType: 'course',
        sourceId: courseId
      });
      
      return quiz;
    } catch (error) {
      console.error('Errore nella generazione del quiz per il corso:', error);
      throw new Error('Impossibile generare il quiz per il corso: ' + (error as Error).message);
    }
  }
  
  /**
   * Valuta la risposta aperta di un utente
   */
  async evaluateOpenAnswer(
    question: string,
    expectedAnswer: string,
    userAnswer: string
  ): Promise<{
    score: number; // 0-100
    feedback: string;
    isCorrect: boolean;
  }> {
    const prompt = `
    Valuta la seguente risposta data dall'utente a una domanda aperta.
    
    Domanda: "${question}"
    
    Risposta attesa: "${expectedAnswer}"
    
    Risposta utente: "${userAnswer}"
    
    Fornisci una valutazione strutturata in questo formato:
    Punteggio: [un numero da 0 a 100]
    Feedback: [feedback dettagliato sulla risposta, spiegando cosa è corretto e cosa è sbagliato]
    Corretta: [true/false se la risposta è sostanzialmente corretta]
    
    Assicurati che il feedback sia dettagliato e formativo, evidenziando specifici punti di forza e debolezza della risposta dell'utente.
    `;
    
    try {
      const aiResponse = await aiService.generateResponse(prompt, this.defaultModel);
      return this.parseEvaluationResponse(aiResponse);
    } catch (error) {
      console.error('Errore nella valutazione della risposta:', error);
      // Default fallback in caso di errore
      return {
        score: 0,
        feedback: 'Impossibile valutare la risposta a causa di un errore.',
        isCorrect: false
      };
    }
  }
  
  /**
   * Genera suggerimenti di studio basati sui risultati di un quiz
   */
  async generateStudySuggestions(
    quiz: Quiz,
    userAnswers: Record<string, any>,
    score: number
  ): Promise<{
    weakAreas: string[];
    recommendations: string[];
    nextSteps: string;
  }> {
    // Recupera solo le domande che sono state risposte in modo errato
    const incorrectQuestions = quiz.questions.filter(question => {
      const userAnswer = userAnswers[question.id];
      if (question.type === 'open') {
        // Per risposte aperte, assumiamo che una valutazione sia già stata fatta
        return userAnswer.score < 70; // Soglia per considerare corretta
      } else {
        return userAnswer !== question.correctAnswer;
      }
    });
    
    const prompt = `
    Analizza i risultati di questo quiz e fornisci suggerimenti di studio.
    
    Titolo quiz: "${quiz.title}"
    Descrizione: "${quiz.description}"
    Punteggio ottenuto: ${score}%
    
    Domande risposte in modo errato:
    ${incorrectQuestions.map(q => `- ${q.text}`).join('\n')}
    
    Fornisci:
    1. Elenco delle aree in cui l'utente mostra debolezze
    2. Raccomandazioni di studio specifiche
    3. Suggerimenti per i prossimi passi formativi
    
    Formatta la risposta così:
    Aree deboli: ["area1", "area2", ...]
    Raccomandazioni: ["raccomandazione1", "raccomandazione2", ...]
    Prossimi passi: "descrizione dettagliata"
    `;
    
    try {
      const aiResponse = await aiService.generateResponse(prompt, this.defaultModel);
      return this.parseStudySuggestionsResponse(aiResponse);
    } catch (error) {
      console.error('Errore nella generazione dei suggerimenti:', error);
      // Default fallback
      return {
        weakAreas: ['Comprensione generale degli argomenti'],
        recommendations: ['Rivedere il materiale del corso'],
        nextSteps: 'Rivedere gli argomenti e riprovare il quiz.'
      };
    }
  }
  
  /**
   * Costruisce il prompt per la generazione del quiz
   */
  private buildQuizGenerationPrompt(
    content: string,
    questionCount: number,
    difficulty: string,
    questionTypes: string[],
    topic: string
  ): string {
    return `
    Crea un quiz educativo sull'ambito della consulenza del lavoro basato sul seguente contenuto:
    
    ${content.substring(0, 6000)} ${content.length > 6000 ? '... (contenuto troncato)' : ''}
    
    Requisiti:
    - Genera ${questionCount} domande ${difficulty !== 'mixed' ? `di difficoltà ${difficulty}` : 'di vari livelli di difficoltà'}.
    - Utilizza i seguenti tipi di domande: ${questionTypes.join(', ')}.
    ${topic ? `- Focalizzati sul tema: ${topic}.` : ''}
    - Per ogni domanda, includi il testo, il tipo, le opzioni (se multiple choice), la risposta corretta e una spiegazione DETTAGLIATA.
    - Le spiegazioni devono essere formative e approfondite, spiegando sia perché la risposta corretta è giusta, sia perché le altre opzioni sono sbagliate.
    - Per le domande a scelta multipla, fornisci 4 opzioni di cui solo una corretta.
    - Assicurati che le domande verifichino la comprensione e non solo la memorizzazione.
    - Le domande dovrebbero coprire diversi livelli di conoscenza: ricordo, comprensione, applicazione e analisi.
    - Concentrati su temi come: contratti di lavoro, normativa sul lavoro, buste paga, contributi previdenziali, diritti dei lavoratori, licenziamenti, TFR, ecc.
    - Evita qualsiasi riferimento all'ambito medico o sanitario.
    
    Formatta il risultato in formato JSON come segue:
    {
      "title": "Titolo del quiz",
      "description": "Breve descrizione del quiz",
      "questions": [
        {
          "text": "Testo della domanda 1",
          "type": "multiple_choice",
          "options": ["opzione 1", "opzione 2", "opzione 3", "opzione 4"],
          "correctAnswer": "opzione corretta",
          "explanation": "Spiegazione dettagliata della risposta, incluso perché le altre opzioni sono errate",
          "difficulty": "easy/medium/hard"
        },
        {
          "text": "Testo della domanda 2 (vero/falso)",
          "type": "true_false",
          "correctAnswer": true,
          "explanation": "Spiegazione dettagliata della risposta, cosa sarebbe stato vero/falso al contrario",
          "difficulty": "easy/medium/hard"
        },
        {
          "text": "Testo della domanda 3 (aperta)",
          "type": "open",
          "correctAnswer": "Esempio di risposta corretta",
          "explanation": "Spiegazione dettagliata di cosa rende corretta una risposta e quali elementi dovrebbero essere inclusi",
          "difficulty": "easy/medium/hard"
        }
      ]
    }
    `;
  }
  
  /**
   * Analizza la risposta dell'AI per creare un quiz strutturato
   */
  private parseQuizResponse(
    response: string,
    metadata: {
      title: string;
      timeLimit: number;
      sourceType?: 'document' | 'video' | 'course';
      sourceId?: string;
    }
  ): Quiz {
    try {
      // Cerca di estrarre il JSON dalla risposta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Formato risposta non valido');
      }
      
      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Genera un ID unico per il quiz
      const quizId = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Genera ID per le domande se non presenti
      const questions = parsedResponse.questions.map((q: any, index: number) => ({
        ...q,
        id: `${quizId}_q${index + 1}`
      }));
      
      return {
        id: quizId,
        title: parsedResponse.title || metadata.title,
        description: parsedResponse.description || `Quiz generato automaticamente`,
        questions,
        timeLimit: metadata.timeLimit,
        passingScore: 70, // Default 70%
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          sourceType: metadata.sourceType,
          sourceId: metadata.sourceId,
          generationModel: 'mistral',
          documentText: metadata.sourceType === 'document' ? 'Testo estratto (anteprima)' : undefined
        }
      };
    } catch (error) {
      console.error('Errore parsing risposta AI:', error, response);
      
      // Fallback con quiz base se il parsing fallisce
      return {
        id: `quiz_${Date.now()}_fallback`,
        title: metadata.title,
        description: 'Quiz generato automaticamente',
        questions: [
          {
            id: `quiz_fallback_q1`,
            text: 'Domanda di esempio (il sistema non è riuscito a generare un quiz completo)',
            type: 'multiple_choice',
            options: ['Opzione 1', 'Opzione 2', 'Opzione 3', 'Opzione 4'],
            correctAnswer: 'Opzione 1',
            explanation: 'Questa è una domanda di esempio.',
            difficulty: 'medium'
          }
        ],
        timeLimit: metadata.timeLimit,
        passingScore: 70,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }
  
  /**
   * Analizza la risposta dell'AI per la valutazione di una risposta aperta
   */
  private parseEvaluationResponse(response: string): {
    score: number;
    feedback: string;
    isCorrect: boolean;
  } {
    try {
      // Estrai punteggio
      const scoreMatch = response.match(/Punteggio:?\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
      
      // Estrai feedback
      const feedbackMatch = response.match(/Feedback:?\s*([^\n]+)/i);
      const feedback = feedbackMatch ? feedbackMatch[1].trim() : 'Nessun feedback disponibile';
      
      // Estrai correttezza
      const correctMatch = response.match(/Corretta:?\s*(true|false|vero|falso|sì|si|no)/i);
      const correctText = correctMatch ? correctMatch[1].toLowerCase() : 'false';
      const isCorrect = ['true', 'vero', 'sì', 'si'].includes(correctText);
      
      return { score, feedback, isCorrect };
    } catch (error) {
      console.error('Errore nel parsing della valutazione:', error);
      return {
        score: 0,
        feedback: 'Errore nella valutazione della risposta',
        isCorrect: false
      };
    }
  }
  
  /**
   * Analizza la risposta dell'AI per i suggerimenti di studio
   */
  private parseStudySuggestionsResponse(response: string): {
    weakAreas: string[];
    recommendations: string[];
    nextSteps: string;
  } {
    try {
      // Estrai aree deboli
      const weakAreasMatch = response.match(/Aree deboli:?\s*\[(.*?)\]/is);
      const weakAreasStr = weakAreasMatch ? weakAreasMatch[1] : '';
      const weakAreas = weakAreasStr
        .split(',')
        .map(area => area.replace(/["']/g, '').trim())
        .filter(Boolean);
      
      // Estrai raccomandazioni
      const recommendationsMatch = response.match(/Raccomandazioni:?\s*\[(.*?)\]/is);
      const recommendationsStr = recommendationsMatch ? recommendationsMatch[1] : '';
      const recommendations = recommendationsStr
        .split(',')
        .map(rec => rec.replace(/["']/g, '').trim())
        .filter(Boolean);
      
      // Estrai prossimi passi
      const nextStepsMatch = response.match(/Prossimi passi:?\s*["']?(.*?)["']?$/im);
      const nextSteps = nextStepsMatch ? nextStepsMatch[1].trim() : 'Rivedere gli argomenti e riprovare il quiz.';
      
      return {
        weakAreas: weakAreas.length ? weakAreas : ['Comprensione generale'],
        recommendations: recommendations.length ? recommendations : ['Rivedere il materiale del corso'],
        nextSteps
      };
    } catch (error) {
      console.error('Errore nel parsing dei suggerimenti di studio:', error);
      return {
        weakAreas: ['Comprensione generale degli argomenti'],
        recommendations: ['Rivedere il materiale del corso'],
        nextSteps: 'Rivedere gli argomenti e riprovare il quiz.'
      };
    }
  }
}

export const quizAIService = new QuizAIService();
