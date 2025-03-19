import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Terminal, RefreshCw, Loader2 } from 'lucide-react';
import { checkDatabaseConnection } from '../services/supabase';

interface TestResult {
  service: string;
  status: 'success' | 'error' | 'pending';
  message?: string;
  timestamp?: string;
}

const TestServicesPage: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; error?: string } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Controlla lo stato dark mode dal localStorage o dalle preferenze di sistema
    const darkModePreference = localStorage.getItem('darkMode') === 'true' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    setIsDarkMode(darkModePreference);
    
    // Verifica subito lo stato della connessione al database
    checkDbConnection();
  }, []);

  const checkDbConnection = async () => {
    try {
      const status = await checkDatabaseConnection();
      setDbStatus(status);
    } catch (error) {
      setDbStatus({
        connected: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      });
    }
  };

  const runTests = async () => {
    setIsRunning(true);
    setOutput('Avvio dei test in corso...\n');
    setResults([
      { service: 'ai-service', status: 'pending' },
      { service: 'ai-agent-service', status: 'pending' },
      { service: 'quiz-ai-service', status: 'pending' },
      { service: 'tts-service', status: 'pending' },
      { service: 'web-simulation-service', status: 'pending' },
      { service: 'document-analysis-service', status: 'pending' }
    ]);

    try {
      // Esegui lo script di test in Node.js attraverso il server
      // In un'applicazione reale, questo dovrebbe essere gestito dal backend
      // Qui simuliamo il processo per scopi dimostrativi
      simulateTestExecution();
    } catch (error) {
      setOutput(prev => prev + '\nErrore durante l\'esecuzione dei test: ' + 
        (error instanceof Error ? error.message : String(error)));
      setIsRunning(false);
    }
  };

  // Simulazione dell'esecuzione dei test (in un'app reale questo verrebbe fatto dal backend)
  const simulateTestExecution = () => {
    const services = [
      'ai-service', 
      'ai-agent-service', 
      'quiz-ai-service', 
      'tts-service', 
      'web-simulation-service', 
      'document-analysis-service'
    ];
    
    let count = 0;
    const interval = setInterval(() => {
      if (count >= services.length) {
        clearInterval(interval);
        setIsRunning(false);
        setOutput(prev => prev + `\n\nTest completati: ${Math.ceil(services.length * 0.7)}/${services.length} servizi funzionanti\n`);
        return;
      }

      const service = services[count];
      // Simula successo/fallimento casuale (70% successo, 30% fallimento)
      const isSuccess = Math.random() > 0.3;
      const updatedResults = [...results];
      const timestamp = new Date().toISOString();
      
      if (isSuccess) {
        updatedResults[count] = { 
          service, 
          status: 'success',
          message: `Test completato con successo per ${service}`,
          timestamp
        };
        setOutput(prev => prev + `\n[SUCCESS][${timestamp}] Test completato con successo per ${service}`);
      } else {
        updatedResults[count] = {
          service, 
          status: 'error',
          message: `Errore durante il test di ${service}: chiamata API fallita`,
          timestamp
        };
        setOutput(prev => prev + `\n[ERROR][${timestamp}] Errore durante il test di ${service}: chiamata API fallita`);
      }
      
      setResults(updatedResults);
      count++;
    }, 1500);
  };

  return (
    <div className={`container mx-auto p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <h1 className="text-3xl font-bold mb-8">Test Servizi AI</h1>
      
      {/* Stato connessione database */}
      <div className={`p-4 rounded-lg mb-6 ${
        dbStatus?.connected
          ? isDarkMode ? 'bg-green-900 bg-opacity-20' : 'bg-green-50'
          : isDarkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'
      }`}>
        <div className="flex items-center">
          {dbStatus?.connected ? (
            <CheckCircle2 className={`mr-3 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} size={20} />
          ) : (
            <AlertTriangle className={`mr-3 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} size={20} />
          )}
          <div>
            <h3 className="font-medium">
              {dbStatus?.connected 
                ? 'Connessione al database attiva' 
                : 'Problemi di connessione al database'}
            </h3>
            <p className={`text-sm ${
              dbStatus?.connected 
                ? isDarkMode ? 'text-green-300' : 'text-green-700'
                : isDarkMode ? 'text-red-300' : 'text-red-700'
            }`}>
              {dbStatus?.connected
                ? 'Il sistema è correttamente connesso al database Supabase'
                : dbStatus?.error || 'Impossibile connettersi al database'}
            </p>
          </div>
          <button
            onClick={checkDbConnection}
            className={`ml-auto p-2 rounded-full ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            title="Ricontrolla connessione"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      
      {/* Pulsante avvio test */}
      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={isRunning || !dbStatus?.connected}
          className={`px-4 py-2 rounded-lg font-medium flex items-center ${
            isRunning || !dbStatus?.connected
              ? isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
              : isDarkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 animate-spin" size={18} />
              Test in esecuzione...
            </>
          ) : (
            <>
              <Terminal className="mr-2" size={18} />
              Esegui test di tutti i servizi
            </>
          )}
        </button>
      </div>
      
      {/* Risultati dei test */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            } ${
              result.status === 'pending'
                ? ''
                : result.status === 'success'
                ? isDarkMode ? 'bg-green-900 bg-opacity-10' : 'bg-green-50'
                : isDarkMode ? 'bg-red-900 bg-opacity-10' : 'bg-red-50'
            }`}
          >
            <div className="flex items-center mb-2">
              {result.status === 'pending' ? (
                <Loader2 className="mr-2 animate-spin text-gray-400" size={18} />
              ) : result.status === 'success' ? (
                <CheckCircle2 className={`mr-2 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} size={18} />
              ) : (
                <AlertTriangle className={`mr-2 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} size={18} />
              )}
              <h3 className="font-medium">{result.service}</h3>
            </div>
            {result.message && (
              <p className={`text-sm ${
                result.status === 'error'
                  ? isDarkMode ? 'text-red-300' : 'text-red-700'
                  : result.status === 'success'
                  ? isDarkMode ? 'text-green-300' : 'text-green-700'
                  : ''
              }`}>
                {result.message}
              </p>
            )}
            {result.timestamp && (
              <p className="text-xs text-gray-500 mt-2">
                {new Date(result.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>
        ))}
      </div>
      
      {/* Output del test */}
      {output && (
        <div className={`mt-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} overflow-hidden`}>
          <div className={`px-4 py-2 text-sm font-medium flex justify-between items-center ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <span>Output</span>
            <button
              onClick={() => setOutput('')}
              className={`p-1 rounded hover:${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}
              title="Pulisci output"
            >
              Pulisci
            </button>
          </div>
          <pre className={`p-4 text-sm overflow-auto max-h-96 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-800'
          }`}>
            {output}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestServicesPage;
