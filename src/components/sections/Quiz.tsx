import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock, BarChart } from 'lucide-react';

interface Quiz {
  questions: Question[];
  title?: string;
  description?: string;
  timeLimit?: number;
}

interface QuizProps {
  isDarkMode: boolean;
  quiz: Quiz | null;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
  onBack: () => void;
  onComplete: (score: number) => void;
}

interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'open';
  options?: string[];
  correctAnswer?: string | boolean;
}

export function Quiz({ isDarkMode, quiz, isGenerating, error, onGenerate, onBack, onComplete }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!quiz) {
    return (
      <div className="text-center py-12">
        {error ? (
          <div className="space-y-4">
            <p className="text-red-500">{error}</p>
            <button
              onClick={onGenerate}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Riprova
            </button>
          </div>
        ) : isGenerating ? (
          <div className="space-y-4">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-400">Generazione quiz in corso...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-400">
              Il quiz verrà generato automaticamente dal documento allegato al video.
            </p>
            <button
              onClick={onGenerate}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Genera Quiz
            </button>
          </div>
        )}
      </div>
    );
  }

  const questions = quiz.questions || [];

  const calculateScore = () => {
    let correct = 0;
    let total = questions.length;

    questions.forEach((question: Question) => {
      if (question.type !== 'open' && question.correctAnswer === answers[question.id]) {
        correct++;
      }
    });

    return (correct / total) * 100;
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    const score = calculateScore();
    onComplete(score);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-700 pb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold">Verifica delle Competenze</h2>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Clock size={20} />
          <span>{formatTime(timeLeft)}</span>
        </div>
        <button onClick={onBack} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
          <AlertTriangle size={20} />
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 bg-gray-700 rounded-full">
          <div 
            className="h-2 bg-purple-500 rounded-full transition-all"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-400">
          {currentQuestion + 1} di {questions.length}
        </span>
      </div>

      {/* Question */}
      <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <p className="text-lg mb-6">{questions[currentQuestion].text}</p>

        {questions[currentQuestion].type === 'multiple_choice' && (
          <div className="space-y-3">
            {questions[currentQuestion].options?.map((option: string, index: number) => (
              <label 
                key={index}
                className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                  answers[questions[currentQuestion].id] === option
                    ? 'bg-purple-500 bg-opacity-20 border border-purple-500'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${questions[currentQuestion].id}`}
                  value={option}
                  checked={answers[questions[currentQuestion].id] === option}
                  onChange={(e) => setAnswers(prev => ({
                    ...prev,
                    [questions[currentQuestion].id]: e.target.value
                  }))}
                  className="hidden"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )}

        {questions[currentQuestion].type === 'true_false' && (
          <div className="flex gap-4">
            {['Vero', 'Falso'].map((option: string, index: number) => (
              <label
                key={option}
                className={`flex-1 p-4 rounded-lg text-center cursor-pointer transition-colors ${
                  answers[questions[currentQuestion].id] === (index === 0)
                    ? 'bg-purple-500 bg-opacity-20 border border-purple-500'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${questions[currentQuestion].id}`}
                  value={index === 0 ? 'true' : 'false'}
                  checked={answers[questions[currentQuestion].id] === (index === 0)}
                  onChange={(e) => setAnswers(prev => ({
                    ...prev,
                    [questions[currentQuestion].id]: e.target.value === 'true'
                  }))}
                  className="hidden"
                />
                {option}
              </label>
            ))}
          </div>
        )}

        {questions[currentQuestion].type === 'open' && (
          <textarea
            value={answers[questions[currentQuestion].id] as string || ''}
            onChange={(e) => setAnswers(prev => ({
              ...prev,
              [questions[currentQuestion].id]: e.target.value
            }))}
            placeholder="Scrivi la tua risposta..."
            className="w-full h-32 p-4 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500"
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
          className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Precedente
        </button>
        
        {currentQuestion === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Invia Risposte
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Prossima
          </button>
        )}
      </div>

      {/* Results Modal */}
      {isSubmitted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} max-w-lg w-full`}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Quiz Completato!</h3>
              <p className="text-gray-400">
                Hai completato il quiz con un punteggio del {calculateScore()}%
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <span>Risposte Corrette</span>
                <span className="text-green-500">4/5</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tempo Impiegato</span>
                <span>{formatTime(900 - timeLeft)}</span>
              </div>
            </div>

            <button
              onClick={onBack}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Torna al Corso
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
