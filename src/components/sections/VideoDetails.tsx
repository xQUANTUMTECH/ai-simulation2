import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, MessageSquare, Download, Clock } from 'lucide-react';
import { VideoPlayer } from '../VideoPlayer';
import { Quiz } from './Quiz';
import { quizService, Quiz as QuizType } from '../../services/quiz-service';

interface VideoDetailsProps {
  isDarkMode: boolean;
  onBack: () => void;
}

export function VideoDetails({ isDarkMode, onBack }: VideoDetailsProps) {
  const [activeTab, setActiveTab] = useState<'resources' | 'notes' | 'transcript' | 'quiz'>('resources');
  const [videoCompleted, setVideoCompleted] = useState(true); // Set to true for demo
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [quiz, setQuiz] = useState<QuizType | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [notes, setNotes] = useState<Array<{ time: number; text: string }>>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);
  const [quizEnabled, setQuizEnabled] = useState(true); // Always enabled for demo
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Demo: Video is always considered completed
    setVideoCompleted(true);

    const handleLoadedData = () => {
      setIsVideoLoaded(true);
      setIsLoading(false);
    };

    const handleError = (e: ErrorEvent) => {
      setError('Errore durante il caricamento del video');
      setIsLoading(false);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
  }, []);

  const video = {
    id: '1',
    title: 'Introduzione alle Emergenze Cardiache',
    description: 'Una panoramica completa sulla gestione delle emergenze cardiache in ambito ospedaliero.',
    duration: '45:30',
    url: 'https://storage.googleapis.com/webcontainer-io/example-video.mp4',
    durationInSeconds: 2730, // 45:30 in seconds
    progress: 80,
    course: 'Gestione Emergenze Mediche',
    resources: [
      { id: '1', title: 'Protocollo Emergenze', type: 'PDF', size: '2.4 MB' },
      { id: '2', title: 'Checklist Procedure', type: 'PDF', size: '1.8 MB' }
    ],
    transcript: `
      In questo video affronteremo le procedure di base per la gestione delle emergenze cardiache.
      Inizieremo con una panoramica dei protocolli standard, seguita da esempi pratici di intervento.
      È fondamentale ricordare che la tempestività e la precisione sono cruciali in queste situazioni.
    `
  };

  const handleVideoComplete = async () => {
    setVideoCompleted(true);
    // Here you would update the video progress in the database
  };

  const generateQuiz = async () => {
    setIsGeneratingQuiz(true);
    setQuizError(null);
    
    try {
      // Mock quiz data for demo
      setQuiz({
        id: '1',
        title: 'Quiz sulle Emergenze Cardiache',
        description: 'Verifica le tue conoscenze sulle procedure di emergenza',
        course_id: '1',
        video_id: '1',
        created_by: '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        questions: [
          {
            id: '1',
            quiz_id: '1',
            question: "Qual è il primo passo nella gestione di un'emergenza cardiaca?",
            question_type: 'MULTIPLE_CHOICE',
            order_in_quiz: 1,
            answers: [
              { id: 'a1', question_id: '1', answer: "Chiamare immediatamente i soccorsi", is_correct: false, order_in_question: 1 },
              { id: 'a2', question_id: '1', answer: "Valutare lo stato di coscienza del paziente", is_correct: true, order_in_question: 2 },
              { id: 'a3', question_id: '1', answer: "Iniziare il massaggio cardiaco", is_correct: false, order_in_question: 3 }
            ]
          },
          {
            id: '2', 
            quiz_id: '1',
            question: 'La rianimazione cardiopolmonare deve essere continuata fino a:',
            question_type: 'MULTIPLE_CHOICE',
            order_in_quiz: 2,
            answers: [
              { id: 'b1', question_id: '2', answer: 'Arrivo dei soccorsi professionali', is_correct: true, order_in_question: 1 },
              { id: 'b2', question_id: '2', answer: 'Il paziente si muove', is_correct: false, order_in_question: 2 },
              { id: 'b3', question_id: '2', answer: 'Passano 10 minuti', is_correct: false, order_in_question: 3 }
            ]
          }
        ]
      });
    } catch (error) {
      setQuizError('Errore durante la generazione del quiz');
      console.error('Quiz generation error:', error);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSkipAttempt = () => {
    setShowSkipWarning(true);
    setTimeout(() => {
      setShowSkipWarning(false);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold">{video.title}</h2>
          <p className="text-gray-400">{video.course}</p>
        </div>
      </div>

      {/* Video Player */}
      {video.url ? (
        <VideoPlayer
          src={video.url}
          title={video.title}
          duration={video.durationInSeconds}
          isDarkMode={isDarkMode}
          initialProgress={video.progress}
          onTimeUpdate={(time) => {/* Handle time update */}}
          onSkipAttempt={handleSkipAttempt}
          onComplete={() => console.log('Video completed')}
        />
      ) : (
        <div className={`aspect-video rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <p className="text-gray-400">Video non disponibile</p>
        </div>
      )}
      
      {/* Skip Warning */}
      {showSkipWarning && (
        <div className="bg-red-500 bg-opacity-20 text-red-500 p-4 rounded-lg">
          <p className="text-center">
            Non è possibile saltare il video. È necessario guardarlo interamente per accedere al quiz.
          </p>
        </div>
      )}

      {/* Description */}
      <p className="text-gray-400">{video.description}</p>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'resources' 
              ? 'border-b-2 border-purple-500 text-purple-500' 
              : 'text-gray-400'
          }`}
        >
          Risorse
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'notes'
              ? 'border-b-2 border-purple-500 text-purple-500'
              : 'text-gray-400'
          }`}
        >
          Note
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'transcript'
              ? 'border-b-2 border-purple-500 text-purple-500'
              : 'text-gray-400'
          }`}
        >
          Trascrizione
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`px-4 py-2 -mb-px transition-colors ${
            activeTab === 'quiz'
              ? 'border-b-2 border-purple-500 text-purple-500'
              : quizEnabled
                ? 'text-gray-400 hover:text-purple-500'
                : 'text-gray-600 cursor-not-allowed opacity-50'
          }`}
          disabled={!quizEnabled}
        >
          Quiz
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'resources' && (
          <div className="space-y-4">
            {video.resources.map(resource => (
              <div 
                key={resource.id}
                className={`p-4 rounded-xl border ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500 bg-opacity-20 flex items-center justify-center">
                      <FileText size={24} className="text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{resource.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{resource.type}</span>
                        <span>•</span>
                        <span>{resource.size}</span>
                      </div>
                    </div>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-purple-500 hover:bg-gray-700 rounded-lg transition-colors">
                    <Download size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <p className="whitespace-pre-line">{video.transcript}</p>
          </div>
        )}

        {activeTab === 'quiz' && videoCompleted && (
          <Quiz
            isDarkMode={isDarkMode}
            quiz={quiz}
            isGenerating={isGeneratingQuiz}
            error={quizError}
            onGenerate={generateQuiz}
            onBack={() => setActiveTab('resources')}
            onComplete={(score) => {
              console.log('Quiz completed with score:', score);
              setActiveTab('resources');
            }}
          />
        )}

        {activeTab === 'quiz' && videoCompleted && !quiz && !isGeneratingQuiz && (
          <div className="p-6 text-center space-y-4">
            <p className="text-gray-400">
              Video completato! Ora puoi verificare le tue conoscenze.
            </p>
            <button
              onClick={generateQuiz}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 mx-auto"
            >
              <MessageSquare size={20} />
              Genera Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}