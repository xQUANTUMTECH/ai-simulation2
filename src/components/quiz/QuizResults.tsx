import React, { useEffect, useState } from 'react';
import { 
  Award, 
  Check, 
  XCircle, 
  Clock, 
  Lightbulb, 
  BarChart3, 
  Download, 
  Share2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Brain,
  Zap
} from 'lucide-react';
import { supabase } from '../../services/supabase.ts';
import { quizAIService } from '../../services/quiz-ai-service.ts';

interface QuizResultsProps {
  quizId: string;
  resultId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // in secondi
  isDarkMode: boolean;
  onClose?: () => void;
  onRetake?: () => void;
}

interface ResultData {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  time_spent: number;
  completion_date: string;
  answers: {
    questionId: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    question: string;
    explanation?: string;
  }[];
  feedback: {
    strength: string[];
    weakness: string[];
    summary: string;
  };
  recommendations: string;
  aiAnalysis?: {
    weakAreas: string[];
    recommendations: string[];
    nextSteps: string;
    status: 'loading' | 'completed' | 'error';
  };
}

interface Question {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_option: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

export function QuizResults({ 
  quizId, 
  resultId, 
  score, 
  totalQuestions, 
  correctAnswers, 
  timeSpent,
  isDarkMode, 
  onClose,
  onRetake
}: QuizResultsProps) {
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingAIAnalysis, setLoadingAIAnalysis] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<string[]>([]);

  useEffect(() => {
    fetchResultData();
  }, [resultId]);
  
  // Esegui analisi AI solo dopo che i dati sono stati caricati
  useEffect(() => {
    if (resultData && !resultData.aiAnalysis) {
      generateAIAnalysis();
    }
  }, [resultData]);
  
  // Genera analisi AI
  const generateAIAnalysis = async () => {
    if (!resultData) return;
    
    try {
      setLoadingAIAnalysis(true);
      
      // Ottieni le domande del quiz
      if (!supabase) {
        throw new Error('Supabase client non inizializzato');
      }
      
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();
      
      if (!quizData) throw new Error('Quiz non trovato');
      
      // Prepara le risposte dell'utente nel formato atteso
      const userAnswers: Record<string, any> = {};
      resultData.answers.forEach(answer => {
        userAnswers[answer.questionId] = {
          answer: answer.userAnswer,
          isCorrect: answer.isCorrect,
          ...(answer.isCorrect ? {} : { correctAnswer: answer.correctAnswer })
        };
      });
      
      // Genera suggerimenti di studio usando il servizio AI
      const aiSuggestions = await quizAIService.generateStudySuggestions(
        {
          id: quizId,
          title: quizData.title || 'Quiz',
          description: quizData.description || 'Descrizione non disponibile',
          questions: resultData.answers.map(a => ({
            id: a.questionId,
            text: a.question,
            type: 'multiple_choice',
            correctAnswer: a.correctAnswer,
            difficulty: 'medium' // Aggiungiamo un valore predefinito per il campo difficulty
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        userAnswers,
        resultData.score
      );
      
      // Aggiorna lo stato con l'analisi AI
      setResultData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          aiAnalysis: {
            ...aiSuggestions,
            status: 'completed'
          }
        };
      });
      
      // Salva l'analisi AI nel database
      if (supabase) {
        await supabase
          .from('quiz_results')
          .update({ 
            ai_analysis: aiSuggestions,
            updated_at: new Date().toISOString()
          })
          .eq('id', resultId);
      }
        
    } catch (err) {
      console.error('Errore nella generazione dell\'analisi AI:', err);
      
      // Aggiorna lo stato con errore
      setResultData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          aiAnalysis: {
            weakAreas: ['Comprensione generale dell\'argomento'],
            recommendations: ['Rivedere il materiale del corso'],
            nextSteps: 'Consulta il materiale didattico e riprova il quiz quando ti senti più preparato.',
            status: 'error'
          }
        };
      });
    } finally {
      setLoadingAIAnalysis(false);
    }
  };

  const fetchResultData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Connessione al database non disponibile');
      }
      
      // Recupera i dettagli del risultato dal DB
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('id', resultId)
        .single();
      
      if (error) throw error;
      
      // Se non ci sono dati completi nel DB, impostiamo valori iniziali a zero
      if (!data || !data.answers || !data.feedback) {
        const emptyData: ResultData = {
          id: resultId,
          user_id: '',
          quiz_id: quizId,
          score: 0,
          time_spent: 0,
          completion_date: new Date().toISOString(),
          answers: [],
          feedback: {
            strength: [],
            weakness: [],
            summary: 'Nessun feedback disponibile'
          },
          recommendations: 'Nessuna raccomandazione disponibile'
        };
        setResultData(emptyData);
      } else {
        setResultData(data as unknown as ResultData);
      }
    } catch (err) {
      console.error('Errore nel recupero dei risultati:', err);
      setError('Si è verificato un errore nel caricamento dei risultati. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const toggleQuestionExpanded = (questionId: string) => {
    setExpandedQuestions(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const generateCertificate = async () => {
    if (!supabase || !resultData) return;
    
    try {
      // In un'implementazione reale, qui si chiamerebbero le API per generare un certificato
      alert('Generazione del certificato in corso. Sarà presto disponibile nella tua sezione certificati.');
    } catch (err) {
      console.error('Errore nella generazione del certificato:', err);
      alert('Errore nella generazione del certificato. Riprova più tardi.');
    }
  };

  if (loading) {
    return (
      <div className={`fixed inset-0 z-50 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} flex items-center justify-center`}>
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`fixed inset-0 z-50 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} p-6 flex flex-col items-center justify-center`}>
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2">Errore</h2>
        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{error}</p>
        <button 
          onClick={onClose} 
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Chiudi
        </button>
      </div>
    );
  }

  if (!resultData) {
    return (
      <div className={`fixed inset-0 z-50 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} p-6 flex flex-col items-center justify-center`}>
        <AlertCircle className="text-yellow-500 mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2">Dati non disponibili</h2>
        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
          Non è stato possibile recuperare i risultati del quiz.
        </p>
        <button 
          onClick={onClose} 
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Chiudi
        </button>
      </div>
    );
  }

  const isPassing = resultData.score >= 60;

  return (
    <div className={`fixed inset-0 z-50 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} overflow-auto`}>
      <div className="container mx-auto p-6">
        {/* Header con punteggio */}
        <div className={`rounded-lg p-6 mb-6 text-center ${
          isPassing 
            ? isDarkMode ? 'bg-green-900 bg-opacity-20' : 'bg-green-50' 
            : isDarkMode ? 'bg-orange-900 bg-opacity-20' : 'bg-orange-50'
        }`}>
          <div className="flex items-center justify-center mb-4">
            <Award 
              className={`${
                isPassing 
                  ? 'text-green-500' 
                  : 'text-orange-500'
              }`} 
              size={48} 
            />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {isPassing ? 'Congratulazioni!' : 'Quiz Completato'}
          </h1>
          <p className="text-5xl font-bold mb-4">
            {resultData.score}%
          </p>
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {correctAnswers} corrette su {totalQuestions} domande
          </p>
          <div className="mt-4">
            <div className="flex justify-center space-x-6">
              <div className="text-center">
                <Clock className="mx-auto mb-1 text-gray-500" size={20} />
                <p className="text-sm text-gray-500">Tempo</p>
                <p className="font-medium">{formatTime(resultData.time_spent)}</p>
              </div>
              <div className="text-center">
                <BarChart3 className="mx-auto mb-1 text-gray-500" size={20} />
                <p className="text-sm text-gray-500">Risultato</p>
                <p className={`font-medium ${
                  isPassing 
                    ? 'text-green-500' 
                    : 'text-orange-500'
                }`}>
                  {isPassing ? 'Superato' : 'Non superato'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Analisi delle risposte */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 mb-6 shadow-sm`}>
          <h2 className="text-xl font-bold mb-4">Feedback</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-medium mb-2 flex items-center">
                <Check className="text-green-500 mr-2" size={18} />
                Punti di forza
              </h3>
              <ul className="space-y-2">
                {resultData.feedback.strength.map((strength, idx) => (
                  <li 
                    key={idx} 
                    className={`flex items-start ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mt-2 mr-2"></span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-2 flex items-center">
                <Lightbulb className="text-orange-500 mr-2" size={18} />
                Aree di miglioramento
              </h3>
              <ul className="space-y-2">
                {resultData.feedback.weakness.map((weakness, idx) => (
                  <li 
                    key={idx} 
                    className={`flex items-start ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 mr-2"></span>
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className="font-medium mb-2">Riepilogo</h3>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              {resultData.feedback.summary}
            </p>
          </div>
        </div>
        
        {/* Raccomandazioni */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 mb-6 shadow-sm`}>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Lightbulb className="text-yellow-500 mr-2" size={20} />
            Raccomandazioni
          </h2>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
            {resultData.recommendations}
          </p>
        </div>
        
        {/* Risposte alle domande */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 mb-6 shadow-sm`}>
          <h2 className="text-xl font-bold mb-4">Risposte</h2>
          
          <div className="space-y-4">
            {resultData.answers.map((answer, idx) => (
              <div 
                key={answer.questionId} 
                className={`border rounded-lg overflow-hidden ${
                  isDarkMode
                    ? answer.isCorrect ? 'border-green-700' : 'border-red-700'
                    : answer.isCorrect ? 'border-green-200' : 'border-red-200'
                }`}
              >
                <div 
                  className={`p-4 flex justify-between items-center cursor-pointer ${
                    answer.isCorrect
                      ? isDarkMode ? 'bg-green-900 bg-opacity-20' : 'bg-green-50'
                      : isDarkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'
                  }`}
                  onClick={() => toggleQuestionExpanded(answer.questionId)}
                >
                  <div className="flex items-center">
                    {answer.isCorrect 
                      ? <Check className="text-green-500 mr-2" size={18} />
                      : <XCircle className="text-red-500 mr-2" size={18} />
                    }
                    <div>
                      <span className="text-sm text-gray-500 font-medium">Domanda {idx + 1}</span>
                      <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {answer.question}
                      </p>
                    </div>
                  </div>
                  {expandedQuestions.includes(answer.questionId) 
                    ? <ChevronUp size={20} /> 
                    : <ChevronDown size={20} />
                  }
                </div>
                
                {expandedQuestions.includes(answer.questionId) && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">La tua risposta:</p>
                        <p className={`p-2 rounded ${
                          answer.isCorrect
                            ? isDarkMode ? 'bg-green-900 bg-opacity-20 text-green-400' : 'bg-green-50 text-green-700'
                            : isDarkMode ? 'bg-red-900 bg-opacity-20 text-red-400' : 'bg-red-50 text-red-700'
                        }`}>
                          {answer.userAnswer}
                        </p>
                      </div>
                      
                      {!answer.isCorrect && (
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Risposta corretta:</p>
                          <p className={`p-2 rounded ${
                            isDarkMode ? 'bg-green-900 bg-opacity-20 text-green-400' : 'bg-green-50 text-green-700'
                          }`}>
                            {answer.correctAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {answer.explanation && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Spiegazione:</p>
                        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {answer.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Azioni */}
        <div className="flex flex-wrap justify-between gap-4">
          <div className="space-x-4">
            <button 
              onClick={onClose} 
              className={`px-4 py-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Chiudi
            </button>
            
            <button 
              onClick={onRetake} 
              className={`px-4 py-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-purple-700 hover:bg-purple-600' 
                  : 'bg-purple-600 hover:bg-purple-700'
              } text-white`}
            >
              Ritenta Quiz
            </button>
          </div>
          
          <div className="space-x-4">
            <button 
              onClick={() => window.print()} 
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              <Download size={18} />
              <span>Salva PDF</span>
            </button>
            
            {isPassing && (
              <button 
                onClick={generateCertificate} 
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Award size={18} />
                <span>Genera Certificato</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
