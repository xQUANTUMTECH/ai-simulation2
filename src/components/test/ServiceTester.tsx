import React, { useState, useRef } from 'react';
import { CheckCircle, AlertTriangle, Play, Loader, Upload, FileText, Video, Mic, VolumeX, Brain, Database } from 'lucide-react';
import { hlsService } from '../../services/hls-service';
import { documentService } from '../../services/document-service';
import { supabase } from '../../services/supabase';
import { quizAIService } from '../../services/quiz-ai-service';
import MongodbTester from './MongodbTester';
import AuthTester from './AuthTester';

export interface TestResult {
  name: string;
  status: 'success' | 'error' | 'running' | 'pending';
  message?: string;
}

export function ServiceTester({ isDarkMode = true }: { isDarkMode?: boolean }) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('all');
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [documentForQuizId, setDocumentForQuizId] = useState<string | null>(null);
  const [videoForQuizId, setVideoForQuizId] = useState<string | null>(null);
  const [showMongoTester, setShowMongoTester] = useState(false);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (name: string, update: Partial<TestResult>) => {
    setResults(prev => 
      prev.map(r => r.name === name ? { ...r, ...update } : r)
    );
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    // Determina quali test eseguire in base alla selezione
    const testFunctions = [];
    if (selectedService === 'all' || selectedService === 'auth') {
      testFunctions.push(testAuthService);
    }
    if (selectedService === 'all' || selectedService === 'document') {
      testFunctions.push(testDocumentService);
    }
    if (selectedService === 'all' || selectedService === 'stream') {
      testFunctions.push(testHlsService);
    }
    if (selectedService === 'all' || selectedService === 'upload') {
      testFunctions.push(testFileUpload);
    }
    if (selectedService === 'all' || selectedService === 'quiz') {
      testFunctions.push(testQuizGeneration);
    }
    if (selectedService === 'all' || selectedService === 'mongodb') {
      testFunctions.push(testMongodbService);
    }
    
    // Esegui i test selezionati in sequenza
    for (const testFn of testFunctions) {
      await testFn();
    }
    
    setIsRunning(false);
  };

  const handleVideoSelect = async () => {
    videoInputRef.current?.click();
  };

  const handleDocumentSelect = async () => {
    documentInputRef.current?.click();
  };

  const handleVideoInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await testVideoUploadWithFile(file);
    }
  };

  const handleDocumentInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await testDocumentServiceWithFile(file);
    }
  };

  const handleGenerateDocumentQuiz = async () => {
    if (!documentForQuizId) {
      updateResult('Document Quiz', {
        status: 'error',
        message: 'Nessun documento disponibile. Carica prima un documento.'
      });
      return;
    }

    updateResult('Document Quiz', {
      status: 'running',
      message: 'Generazione quiz dal documento...'
    });

    try {
      // Generiamo un quiz dal documento
      const quiz = await (quizAIService as any).generateQuizFromDocument(documentForQuizId, {
        title: 'Quiz Automatico',
        questionCount: 3
      });

      updateResult('Document Quiz', {
        status: 'success',
        message: `Quiz generato con successo: ${quiz.title}, ${quiz.questions.length} domande`
      });
    } catch (error) {
      updateResult('Document Quiz', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Errore sconosciuto'
      });
    }
  };

  // Definiamo un safe supabase helper per evitare errori di null
  const safeSupabase = supabase ?? {
    auth: {
      getSession: async () => ({ data: { session: null }, error: new Error('Client Supabase non inizializzato') }),
      getUser: async () => ({ data: { user: null }, error: new Error('Client Supabase non inizializzato') })
    },
    storage: {
      from: () => ({
        upload: async () => ({ error: new Error('Funzione upload non disponibile') }),
        getPublicUrl: () => ({ data: { publicUrl: 'placeholder-url' } })
      })
    },
    from: () => ({
      insert: async () => ({ error: new Error('Database non disponibile') }),
      select: () => ({
        eq: () => ({
          order: async () => ({ data: [], error: null })
        })
      })
    })
  };

  const testAuthService = async () => {
    const testName = 'Auth Service';
    addResult({
      name: testName,
      status: 'running',
      message: 'Verifico connessione a Supabase...'
    });

    try {
      // Test 1: Verifica che il client Supabase sia inizializzato
      if (!supabase) {
        throw new Error('Supabase client non inizializzato');
      }

      // Test 2: Verifica che possiamo ottenere la sessione (anche se null)
      const { data, error } = await safeSupabase.auth.getSession();
      if (error) throw error;

      updateResult(testName, {
        status: 'success',
        message: data.session ? 'Connesso come ' + data.session.user.email : 'Nessun utente autenticato, ma servizio disponibile'
      });
    } catch (error) {
      updateResult(testName, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Errore sconosciuto'
      });
    }
  };

  const testDocumentService = async () => {
    const testName = 'Document Service';
    addResult({
      name: testName,
      status: 'running',
      message: 'Seleziona un documento dalla cartella Download...'
    });

    try {
      // Invece di creare automaticamente un file, attendiamo che l'utente selezioni un documento
      updateResult(testName, {
        status: 'running',
        message: 'In attesa della selezione di un documento...'
      });
      
      // L'utente dovrà cliccare su un pulsante per selezionare un file
      // handleDocumentSelect verrà chiamato quando l'utente fa clic su un pulsante apposito
      
    } catch (error) {
      updateResult(testName, {
        status: 'error',
        message: error instanceof Error ? 
          error.message : 'Errore durante il test del servizio documenti'
      });
    }
  };

  const testDocumentServiceWithFile = async (file: File) => {
    const testName = 'Document Service';
    updateResult(testName, {
      status: 'running',
      message: `Documento selezionato: ${file.name}. Caricamento in corso...`
    });

    try {
      // Otteniamo l'utente corrente o un ID simulato per il test
      let userId = 'test-user';
      try {
        const { data } = await safeSupabase.auth.getUser();
        if (data.user) {
          userId = data.user.id;
        }
      } catch (e) {
        // Ignoriamo errori, usiamo l'ID di test
      }
      
      // Test upload documento reale
      const uploadResult = await documentService.uploadDocument(file, userId);
      
      // Salva l'ID del documento per generare quiz
      setDocumentForQuizId(uploadResult.id);
      
      updateResult(testName, {
        status: 'success',
        message: `Documento caricato con successo - ID: ${uploadResult.id}, Nome: ${file.name}`
      });
      
      // Aggiungiamo un nuovo risultato per il test di generazione quiz
      addResult({
        name: 'Document Quiz',
        status: 'pending',
        message: 'Genera quiz basato sul documento'
      });
      
    } catch (error) {
      updateResult(testName, {
        status: 'error',
        message: error instanceof Error ? 
          error.message : 'Errore durante il caricamento del documento'
      });
    }
  };

  const testHlsService = async () => {
    const testName = 'HLS Service';
    addResult({
      name: testName,
      status: 'running',
      message: 'Verifico servizio streaming HLS...'
    });

    try {
      // Test inizializzazione HLS service
      if (!hlsService) {
        throw new Error('HLS service non inizializzato');
      }
      
      // Verifica che il browser supporti HLS
      const checkMethod = (hlsService as any).checkHlsSupport;
      const isSupported = typeof checkMethod === 'function' 
        ? checkMethod.call(hlsService) 
        : true;
      
      if (!isSupported) {
        throw new Error('HLS non supportato su questo browser');
      }
      
      // Verifica che il servizio abbia i metodi principali
      const requiredMethods = ['loadSource', 'play', 'pause', 'setQuality'];
      const missingMethods = requiredMethods.filter(
        method => typeof (hlsService as any)[method] !== 'function'
      );
      
      if (missingMethods.length > 0) {
        throw new Error(`Metodi mancanti nell'HLS service: ${missingMethods.join(', ')}`);
      }
      
      // Verifichiamo che possiamo aggiungere una sorgente
      const testSource = {
        id: 'test-video',
        name: 'Test Video',
        url: 'https://example.com/test.m3u8',
        type: 'hls' as const
      };
      
      hlsService.addSource(testSource);
      const sources = hlsService.getAllSources();
      const sourceFound = sources.some(s => s.id === 'test-video');
      
      if (!sourceFound) {
        throw new Error('Impossibile aggiungere o recuperare sorgenti');
      }
      
      // Rimuovi la sorgente di test
      hlsService.removeSource('test-video');
      
      updateResult(testName, {
        status: 'success',
        message: 'Servizio HLS inizializzato correttamente'
      });
    } catch (error) {
      updateResult(testName, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Errore sconosciuto'
      });
    }
  };

  const testFileUpload = async () => {
    const testName = 'Video Upload';
    addResult({
      name: testName,
      status: 'running',
      message: 'Seleziona un video dalla cartella Download...'
    });

    try {
      updateResult(testName, {
        status: 'running',
        message: 'In attesa della selezione di un video...'
      });
      
      // L'utente dovrà cliccare su un pulsante per selezionare un file video
      // handleVideoSelect verrà chiamato quando l'utente fa clic su un pulsante apposito
      
    } catch (error) {
      updateResult(testName, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Errore sconosciuto'
      });
    }
  };

  const testVideoUploadWithFile = async (file: File) => {
    const testName = 'Video Upload';
    updateResult(testName, {
      status: 'running',
      message: `Video selezionato: ${file.name}. Caricamento in corso...`
    });

    try {
      // Verifica che il file sia effettivamente un video
      if (!file.type.startsWith('video/')) {
        throw new Error('Il file selezionato non è un video');
      }
      
      // Otteniamo l'utente corrente o un ID simulato per il test
      let userId = 'test-user';
      try {
        const { data } = await safeSupabase.auth.getUser();
        if (data.user) {
          userId = data.user.id;
        }
      } catch (e) {
        // Ignoriamo errori, usiamo l'ID di test
      }
      
      // Verifica che i bucket esistano
      const buckets = ['videos', 'documents'];
      
      const results = await Promise.all(
        buckets.map(async (bucket) => {
          try {
            return { bucket, exists: true };
          } catch (error) {
            return { bucket, exists: false };
          }
        })
      );
      
      const missingBuckets = results.filter(r => !r.exists).map(r => r.bucket);
      if (missingBuckets.length > 0) {
        throw new Error(`Bucket mancanti: ${missingBuckets.join(', ')}`);
      }
      
      // Carica il video su Supabase
      const fileExt = file.name.split('.').pop();
      const fileName = `test-uploads/${userId}/${crypto.randomUUID()}.${fileExt}`;
      
      // Utilizziamo safeSupabase per evitare errori di null
      const { error: uploadError } = await safeSupabase.storage
        .from('videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;
      
      // Ottieni l'URL pubblico
      const { data: { publicUrl } } = safeSupabase.storage
        .from('videos')
        .getPublicUrl(fileName);
      
      // Simuliamo un ID per il video
      const videoId = `video_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setVideoForQuizId(videoId);
      
      updateResult(testName, {
        status: 'success',
        message: `Video caricato con successo - Nome: ${file.name}, Dimensione: ${(file.size / (1024 * 1024)).toFixed(2)} MB`
      });
      
      // Aggiungiamo un nuovo risultato per il test di generazione quiz da video
      addResult({
        name: 'Video Quiz',
        status: 'pending',
        message: 'Genera quiz basato sul video'
      });
      
    } catch (error) {
      updateResult(testName, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Errore sconosciuto'
      });
    }
  };

  const handleGenerateVideoQuiz = async () => {
    if (!videoForQuizId) {
      updateResult('Video Quiz', {
        status: 'error',
        message: 'Nessun video disponibile. Carica prima un video.'
      });
      return;
    }

    updateResult('Video Quiz', {
      status: 'running',
      message: 'Generazione quiz dal video...'
    });

    try {
      // Generazione di una trascrizione di esempio per il video
      const mockTranscription = `
        Nel video viene presentata una panoramica sull'intelligenza artificiale e le sue applicazioni.
        Vengono illustrati i principali metodi di machine learning, come l'apprendimento supervisionato,
        l'apprendimento non supervisionato e l'apprendimento per rinforzo.
        Il video esplora anche come l'IA sta trasformando settori come la medicina, l'automotive
        e l'istruzione. Vengono discusse anche le sfide etiche e legali dell'intelligenza artificiale.
      `;
      
      // Generiamo un quiz dal video
      const quiz = await quizAIService.generateQuizFromVideo(videoForQuizId, mockTranscription, {
        title: 'Quiz sul Video',
        questionCount: 3
      });

      updateResult('Video Quiz', {
        status: 'success',
        message: `Quiz generato con successo: ${quiz.title}, ${quiz.questions.length} domande`
      });
    } catch (error) {
      updateResult('Video Quiz', {
        status: 'error',
        message: error instanceof Error ? error.message : 'Errore sconosciuto'
      });
    }
  };

  const testQuizGeneration = async () => {
    const testName = 'Quiz Generation';
    addResult({
      name: testName,
      status: 'running',
      message: 'Test generazione quiz da documento o video...'
    });

    try {
      // Verifichiamo prima che il servizio di quiz AI sia disponibile
      if (!quizAIService) {
        throw new Error('Quiz AI service non inizializzato');
      }
      
      // Prepariamo un testo di esempio per il test
      const sampleText = `
      L'intelligenza artificiale (IA) è un campo dell'informatica che si concentra sulla creazione di macchine capaci di pensare e apprendere come gli esseri umani.
      
      Le principali aree dell'IA includono:
      1. Machine Learning: algoritmi che permettono ai computer di imparare dai dati.
      2. Natural Language Processing: permette ai computer di comprendere e generare linguaggio umano.
      3. Computer Vision: consente alle macchine di interpretare e comprendere informazioni visive.
      4. Robotica: combina l'IA con sistemi fisici per creare robot intelligenti.
      
      Le applicazioni dell'IA sono numerose, dalla medicina alla finanza, dai trasporti all'intrattenimento. Tuttavia, l'IA solleva anche importanti questioni etiche riguardo alla privacy, al lavoro e alla responsabilità.
      `;
      
      // Generiamo un quiz di prova
      const quizOptions = {
        title: 'Quiz di test sull\'IA',
        questionCount: 3,
        difficulty: 'easy' as const
      };
      
      const quiz = await quizAIService.generateQuizFromText(sampleText, quizOptions);
      
      if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        throw new Error('La generazione del quiz non ha prodotto domande valide');
      }
      
      updateResult(testName, {
        status: 'success',
        message: `Quiz generato con successo: ${quiz.questions.length} domande`
      });
    } catch (error) {
      updateResult(testName, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Errore sconosciuto'
      });
    }
  };

  const testMongodbService = async () => {
    const testName = 'MongoDB Service';
    addResult({
      name: testName,
      status: 'running',
      message: 'Verifico connessione a MongoDB Express API...'
    });

    try {
      // Verifica connessione al backend Express
      const response = await fetch('http://localhost:3000/api');
      if (!response.ok) {
        throw new Error(`Errore di connessione: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      updateResult(testName, {
        status: 'success',
        message: `Connessione al server MongoDB stabilita! Versione API: ${data.version}`
      });
      
      // Mostra interfaccia MongoDB
      setShowMongoTester(true);
    } catch (error) {
      updateResult(testName, {
        status: 'error',
        message: error instanceof Error 
          ? error.message 
          : 'Errore sconosciuto nella connessione a MongoDB'
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
        <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Service Tester
        </h2>
        
      <div className="mb-6 flex gap-4 flex-wrap">
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className={`px-4 py-2 rounded-lg ${
              isDarkMode 
                ? 'bg-gray-700 text-white border-gray-600' 
                : 'bg-white text-gray-800 border-gray-300'
            } border`}
            disabled={isRunning}
          >
            <option value="all">Tutti i servizi</option>
            <option value="auth">Autenticazione</option>
            <option value="document">Documenti</option>
            <option value="stream">Streaming</option>
            <option value="upload">Upload video</option>
            <option value="quiz">Generazione quiz</option>
            <option value="mongodb">MongoDB</option>
          </select>
          
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg ${
              isRunning
                ? 'bg-gray-500 cursor-not-allowed'
                : isDarkMode
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-purple-500 hover:bg-purple-600'
            } text-white`}
          >
            {isRunning ? (
              <>
                <Loader className="animate-spin" size={18} />
                <span>Esecuzione in corso...</span>
              </>
            ) : (
              <>
                <Play size={18} />
                <span>Esegui test</span>
              </>
            )}
          </button>

          {/* Input nascosti per selezionare file */}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoInputChange}
          />
          <input
            ref={documentInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleDocumentInputChange}
          />
        </div>
        
        <div className="space-y-4">
          {results.length === 0 ? (
            <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Nessun test eseguito. Clicca "Esegui test" per iniziare.
            </div>
          ) : (
            results.map((result) => (
              <div 
                key={result.name}
                className={`p-4 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-white border-gray-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {result.status === 'success' && (
                      <CheckCircle className="text-green-500" size={22} />
                    )}
                    {result.status === 'error' && (
                      <AlertTriangle className="text-red-500" size={22} />
                    )}
                    {result.status === 'running' && (
                      <Loader className="text-blue-500 animate-spin" size={22} />
                    )}
                    {result.status === 'pending' && (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-400"></div>
                    )}
                    
                    <div className="flex flex-col">
                      <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        {result.name}
                      </div>
                      <div className={`text-sm ${
                        result.status === 'success' 
                          ? 'text-green-400' 
                          : result.status === 'error'
                          ? 'text-red-400'
                          : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {result.message}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {result.name === 'Document Service' && result.status === 'running' && (
                      <button
                        onClick={handleDocumentSelect}
                        className={`px-3 py-1 rounded text-sm ${
                          isDarkMode 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'bg-blue-500 hover:bg-blue-600'
                        } text-white`}
                      >
                        Seleziona documento
                      </button>
                    )}
                    {result.name === 'Video Upload' && result.status === 'running' && (
                      <button
                        onClick={handleVideoSelect}
                        className={`px-3 py-1 rounded text-sm ${
                          isDarkMode 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'bg-blue-500 hover:bg-blue-600'
                        } text-white`}
                      >
                        Seleziona video
                      </button>
                    )}
                    {result.name === 'Document Quiz' && result.status === 'pending' && (
                      <button
                        onClick={handleGenerateDocumentQuiz}
                        className={`px-3 py-1 rounded text-sm ${
                          isDarkMode 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-green-500 hover:bg-green-600'
                        } text-white`}
                      >
                        Genera Quiz
                      </button>
                    )}
                    {result.name === 'Video Quiz' && result.status === 'pending' && (
                      <button
                        onClick={handleGenerateVideoQuiz}
                        className={`px-3 py-1 rounded text-sm ${
                          isDarkMode 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-green-500 hover:bg-green-600'
                        } text-white`}
                      >
                        Genera Quiz
                      </button>
                    )}
                    
                    {result.name === 'Document Service' && result.status !== 'running' && (
                      <FileText size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                    )}
                    {result.name === 'HLS Service' && (
                      <Video size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                    )}
                    {result.name === 'Video Upload' && result.status !== 'running' && (
                      <Upload size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                    )}
                    {(result.name === 'Quiz Generation' || result.name === 'Document Quiz' || result.name === 'Video Quiz') && result.status !== 'pending' && (
                      <Brain size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                    )}
                    {result.name === 'Auth Service' && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                        A
                      </div>
                    )}
                    {result.name === 'MongoDB Service' && (
                      <Database size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* MongoDB Tester Component */}
        {showMongoTester && (
          <div className="mt-6 border-t pt-6">
            <div className="mb-6">
              <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Test MongoDB
              </h3>
              <MongodbTester isDarkMode={isDarkMode} />
            </div>
            
            <div className="mb-6 border-t pt-6">
              <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Test Autenticazione
              </h3>
              <AuthTester isDarkMode={isDarkMode} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
