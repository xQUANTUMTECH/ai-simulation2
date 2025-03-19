import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Users, Gamepad2, AlertTriangle, CheckCircle, X, PlusCircle, Brain } from 'lucide-react';
import { Document } from '../services/document-service';
import { Modal } from './Modal';
import { aiService } from '../services/ai-service';
import { scenarioService } from '../services/scenario-service';
import { supabase } from '../services/supabase';

interface DocumentAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  isDarkMode: boolean;
  onCreateAvatar: (avatarData: any) => void;
  onCreateScenario: (scenarioData: any) => void;
}

interface SuggestedAvatar {
  id: string;
  name: string;
  role: string;
  personality: string;
  selected: boolean;
}

interface SuggestedScenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'Facile' | 'Medio' | 'Avanzato';
  avatarsRequired: number;
  selected: boolean;
}

export function DocumentAnalysisModal({ 
  isOpen, 
  onClose, 
  document, 
  isDarkMode,
  onCreateAvatar,
  onCreateScenario
}: DocumentAnalysisModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [currentTab, setCurrentTab] = useState<'avatars' | 'scenarios'>('avatars');
  const [suggestedAvatars, setSuggestedAvatars] = useState<SuggestedAvatar[]>([]);
  const [suggestedScenarios, setSuggestedScenarios] = useState<SuggestedScenario[]>([]);
  
  // Riferimento al bottone di creazione per il focus
  const createButtonRef = useRef<HTMLButtonElement>(null);
  
  // Reset dello stato quando si chiude il modale
  useEffect(() => {
    if (!isOpen) {
      // Non resettiamo tutto quando si chiude, per mantenere i risultati
      // se l'utente riapre il modale. Resettiamo solo l'analisi in corso
      setIsAnalyzing(false);
    }
  }, [isOpen]);
  
  // Analisi del documento con OpenRouter
  useEffect(() => {
    if (isOpen && document) {
      setIsAnalyzing(true);
      setAnalysisComplete(false);
      setAnalysisError(null);
      
      console.log(`Analisi documento ${document.name} in corso...`);
      
      const analyzeDocumentWithAI = async () => {
        try {
          // Costruiamo il prompt per l'analisi del documento
          const prompt = `
            Analizza il seguente documento: "${document.name}" (tipo: ${document.type}, dimensione: ${(document.size / 1024 / 1024).toFixed(2)} MB)
            
            Basandoti sul nome e sul tipo di documento, suggerisci:
            1. 2-4 avatar realistici che potrebbero essere esperti in questo tipo di documentazione
            2. 2-3 scenari di simulazione che potrebbero utilizzare questo documento come base
            
            Per ogni avatar fornisci:
            - Nome professionale realistico
            - Ruolo specifico
            - Personalità e competenze in breve
            
            Per ogni scenario fornisci:
            - Titolo descrittivo
            - Descrizione di 1-2 frasi
            - Livello di difficoltà (Facile, Medio, Avanzato)
            - Numero di avatar richiesti (1-3)
            
            Rispondi in formato JSON come segue:
            {
              "avatars": [
                {"name": "Nome Avatar", "role": "Ruolo", "personality": "Descrizione personalità e competenze"}
              ],
              "scenarios": [
                {"title": "Titolo Scenario", "description": "Descrizione", "difficulty": "Livello", "avatarsRequired": numero}
              ]
            }
            
            Importante: Tutto il JSON deve essere in italiano e focalizzato su contesti aziendali/professionali.
          `;
          
          // Eseguiamo la chiamata all'API usando il servizio AI (con OpenRouter)
          console.log("Invio richiesta ad OpenRouter via aiService...");
          const response = await aiService.generateResponse(prompt, 'mistral');
          console.log("Risposta ricevuta:", response.substring(0, 100) + "...");
          
          try {
            // Estraiamo solo la parte JSON dalla risposta
            const jsonRegex = /\{[\s\S]*\}/;
            const jsonMatch = response.match(jsonRegex);
            
            if (jsonMatch) {
              const jsonData = JSON.parse(jsonMatch[0]);
              
              // Trasformiamo i dati nel formato richiesto dal nostro componente
              const avatars: SuggestedAvatar[] = (jsonData.avatars || []).map((a: any) => ({
                id: crypto.randomUUID(),
                name: a.name || 'Esperto Professionale',
                role: a.role || 'Consulente',
                personality: a.personality || 'Esperto nel settore',
                selected: false
              }));
              
              const scenarios: SuggestedScenario[] = (jsonData.scenarios || []).map((s: any) => ({
                id: crypto.randomUUID(),
                title: s.title || 'Scenario di Formazione',
                description: s.description || 'Scenario basato sul documento caricato',
                difficulty: (s.difficulty === 'Facile' || s.difficulty === 'Medio' || s.difficulty === 'Avanzato') 
                  ? s.difficulty as 'Facile' | 'Medio' | 'Avanzato' 
                  : 'Medio',
                avatarsRequired: typeof s.avatarsRequired === 'number' ? s.avatarsRequired : 2,
                selected: false
              }));
              
              // Assicuriamoci di avere almeno un avatar e uno scenario
              if (avatars.length === 0) {
                avatars.push({
                  id: crypto.randomUUID(),
                  name: 'Consulente Professionale',
                  role: 'Esperto di documenti',
                  personality: 'Analitico, attento ai dettagli e orientato alle soluzioni',
                  selected: false
                });
              }
              
              if (scenarios.length === 0) {
                scenarios.push({
                  id: crypto.randomUUID(),
                  title: 'Analisi Documentale',
                  description: 'Scenario di analisi e interpretazione del documento caricato',
                  difficulty: 'Medio',
                  avatarsRequired: 1,
                  selected: false
                });
              }
              
              // Aggiorniamo lo stato con i risultati
              setSuggestedAvatars(avatars);
              setSuggestedScenarios(scenarios);
              setAnalysisComplete(true);
            } else {
              throw new Error("Formato JSON non trovato nella risposta");
            }
          } catch (parseError) {
            console.error('Errore nel parsing della risposta AI:', parseError);
            
            // Fallback se c'è un errore di parsing
            useFallbackAnalysis();
          }
        } catch (error) {
          console.error('Errore durante l\'analisi AI del documento:', error);
          
          // Mostriamo un messaggio di errore ma cerchiamo comunque di fornire suggerimenti
          setAnalysisError('Si è verificato un problema con l\'analisi AI. Visualizzazione dei suggerimenti predefiniti.');
          
          // Utilizziamo l'analisi fallback
          useFallbackAnalysis();
        } finally {
          setIsAnalyzing(false);
          
          // Dopo l'analisi, focus sul primo bottone selezionabile
          setTimeout(() => {
            if (createButtonRef.current) {
              createButtonRef.current.focus();
            }
          }, 100);
        }
      };
      
      // Funzione di fallback che usa l'analisi basata su regole semplici
      const useFallbackAnalysis = () => {
        console.log("Utilizzando analisi fallback basata su regole...");
        
        // Analisi semplice basata sul nome e tipo del documento
        const isLegal = document.name.toLowerCase().includes('legal') || 
                        document.name.toLowerCase().includes('contr');
        
        const isFinancial = document.name.toLowerCase().includes('finan') || 
                          document.name.toLowerCase().includes('budget');
                          
        const isTechnical = document.name.toLowerCase().includes('tech') || 
                          document.name.toLowerCase().includes('manual');
                          
        // Generazione avatar in base al contesto rilevato
        const avatars: SuggestedAvatar[] = [];
        
        if (isLegal || Math.random() > 0.5) {
          avatars.push({
            id: crypto.randomUUID(),
            name: 'Consulente Legale',
            role: 'Esperto di diritto contrattuale',
            personality: 'Professionale, preciso e attento ai dettagli',
            selected: false
          });
        }
        
        if (isFinancial || Math.random() > 0.5) {
          avatars.push({
            id: crypto.randomUUID(),
            name: 'Analista Finanziario',
            role: 'Consulente economico',
            personality: 'Analitico, orientato ai numeri, strategico',
            selected: false
          });
        }
        
        if (isTechnical || Math.random() > 0.5) {
          avatars.push({
            id: crypto.randomUUID(),
            name: 'Tecnico Specializzato',
            role: 'Esperto tecnico di settore',
            personality: 'Pratico, orientato alle soluzioni, diretto',
            selected: false
          });
        }
        
        // Aggiungi sempre almeno un avatar generico
        if (avatars.length === 0) {
          avatars.push({
            id: crypto.randomUUID(),
            name: 'Assistente Virtuale',
            role: 'Supporto generale',
            personality: 'Collaborativo, versatile, orientato al servizio',
            selected: false
          });
        }
        
        // Generazione scenari suggeriti
        const scenarios: SuggestedScenario[] = [];
        
        if (isLegal) {
          scenarios.push({
            id: crypto.randomUUID(),
            title: 'Analisi Contrattuale',
            description: 'Simulazione di revisione e analisi di un contratto con identificazione di clausole critiche',
            difficulty: 'Medio',
            avatarsRequired: 2,
            selected: false
          });
        }
        
        if (isFinancial) {
          scenarios.push({
            id: crypto.randomUUID(),
            title: 'Consulenza Finanziaria',
            description: 'Scenario di consulenza su investimenti e pianificazione finanziaria',
            difficulty: 'Avanzato',
            avatarsRequired: 3,
            selected: false
          });
        }
        
        if (isTechnical) {
          scenarios.push({
            id: crypto.randomUUID(),
            title: 'Supporto Tecnico',
            description: 'Simulazione di risoluzione problemi tecnici in un ambiente aziendale',
            difficulty: 'Facile',
            avatarsRequired: 2,
            selected: false
          });
        }
        
        // Aggiungi sempre almeno uno scenario generico
        scenarios.push({
          id: crypto.randomUUID(),
          title: 'Conversazione Generale',
          description: 'Dialogo generico basato sui contenuti del documento caricato',
          difficulty: 'Facile',
          avatarsRequired: 1,
          selected: false
        });
        
        // Aggiorniamo lo stato con i risultati
        setSuggestedAvatars(avatars);
        setSuggestedScenarios(scenarios);
        setAnalysisComplete(true);
      };
      
      // Inizia l'analisi con un breve ritardo per mostrare il loader
      const timer = setTimeout(analyzeDocumentWithAI, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, document]);
  
  const toggleAvatarSelection = (id: string) => {
    setSuggestedAvatars(prev => 
      prev.map(avatar => 
        avatar.id === id ? { ...avatar, selected: !avatar.selected } : avatar
      )
    );
  };
  
  const toggleScenarioSelection = (id: string) => {
    setSuggestedScenarios(prev => 
      prev.map(scenario => 
        scenario.id === id ? { ...scenario, selected: !scenario.selected } : scenario
      )
    );
  };
  
  const handleCreateSelected = async () => {
    // Flag per prevenire invii multipli
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      if (currentTab === 'avatars') {
        const selectedAvatars = suggestedAvatars.filter(a => a.selected);
        if (selectedAvatars.length > 0) {
          for (const avatar of selectedAvatars) {
            await onCreateAvatar(avatar);
          }
          onClose();
        }
      } else {
        const selectedScenarios = suggestedScenarios.filter(s => s.selected);
        if (selectedScenarios.length > 0) {
          for (const scenario of selectedScenarios) {
            try {
              // Ottieni l'utente corrente
              let userId = 'anonymous';
              if (supabase) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  userId = user.id;
                }
              }
              
              // Utilizza lo scenario-service per creare lo scenario in modo persistente
              const createdScenario = await scenarioService.createScenario({
                title: scenario.title,
                description: scenario.description,
                avatars: scenario.avatarsRequired,
                difficulty: scenario.difficulty,
                created_by: userId,
                status: 'Disponibile'
              });
              
              console.log('Scenario creato:', createdScenario);
              
              // Notifica al componente padre
              onCreateScenario({
                ...scenario,
                id: createdScenario.id // Usa l'ID generato dal servizio
              });
            } catch (err) {
              console.error('Errore nella creazione dello scenario:', err);
              setAnalysisError(`Errore nella creazione dello scenario: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`);
            }
          }
          // Chiudiamo il modale solo se non ci sono stati errori
          if (!analysisError) {
            onClose();
          }
        }
      }
    } catch (error) {
      console.error('Errore durante l\'operazione di creazione:', error);
      setAnalysisError(`Errore durante l'operazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Funzione per gestire la pressione dei tasti nella lista
  const handleItemKeyDown = (e: React.KeyboardEvent, id: string, isAvatar: boolean) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isAvatar) {
        toggleAvatarSelection(id);
      } else {
        toggleScenarioSelection(id);
      }
    }
  };
  
  if (!document) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Analisi documento: ${document.name}`}
      isDarkMode={isDarkMode}
    >
      <div className="space-y-6">
        {/* Stato analisi */}
        {isAnalyzing && (
          <div className={`p-4 rounded-lg flex items-center justify-center gap-3 ${isDarkMode ? 'bg-purple-900 bg-opacity-20' : 'bg-purple-50'}`}>
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <p className={isDarkMode ? 'text-purple-300' : 'text-purple-700'}>
              {currentTab === 'avatars' ? 'Creazione avatar in corso...' : 'Creazione scenari in corso...'}
            </p>
          </div>
        )}
        
        {analysisError && (
          <div className={`p-4 rounded-lg flex items-center ${isDarkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'}`}>
            <AlertTriangle className="text-red-500 mr-3" size={20} aria-hidden="true" />
            <p className={isDarkMode ? 'text-red-300' : 'text-red-700'} role="alert">{analysisError}</p>
          </div>
        )}
        
        {analysisComplete && !isAnalyzing && (
          <div className={`p-4 rounded-lg flex items-center ${isDarkMode ? 'bg-green-900 bg-opacity-20' : 'bg-green-50'}`}>
            <CheckCircle className="text-green-500 mr-3" size={20} aria-hidden="true" />
            <p className={isDarkMode ? 'text-green-300' : 'text-green-700'}>
              Analisi completata. Ecco i suggerimenti basati sul contenuto del documento.
            </p>
          </div>
        )}
        
        {/* Tabs */}
        {analysisComplete && !isAnalyzing && (
          <>
            <div className="flex border-b border-gray-700" role="tablist">
              <button
                role="tab"
                aria-selected={currentTab === 'avatars'}
                aria-controls="avatars-panel"
                id="avatars-tab"
                className={`px-4 py-2 font-medium ${
                  currentTab === 'avatars'
                    ? 'border-b-2 border-purple-500 text-purple-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => setCurrentTab('avatars')}
              >
                <div className="flex items-center gap-2">
                  <Users size={18} aria-hidden="true" />
                  <span>Avatar Suggeriti</span>
                </div>
              </button>
              <button
                role="tab"
                aria-selected={currentTab === 'scenarios'}
                aria-controls="scenarios-panel"
                id="scenarios-tab"
                className={`px-4 py-2 font-medium ${
                  currentTab === 'scenarios'
                    ? 'border-b-2 border-purple-500 text-purple-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => setCurrentTab('scenarios')}
              >
                <div className="flex items-center gap-2">
                  <Gamepad2 size={18} aria-hidden="true" />
                  <span>Scenari Suggeriti</span>
                </div>
              </button>
            </div>
            
            {/* Tab Content - Avatars */}
            <div 
              role="tabpanel"
              id="avatars-panel"
              aria-labelledby="avatars-tab"
              hidden={currentTab !== 'avatars'}
              className="max-h-96 overflow-y-auto pr-2"
            >
              {currentTab === 'avatars' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestedAvatars.map(avatar => (
                    <div 
                      key={avatar.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        avatar.selected
                          ? isDarkMode
                            ? 'border-purple-500 bg-purple-900 bg-opacity-20'
                            : 'border-purple-500 bg-purple-50'
                          : isDarkMode
                            ? 'border-gray-700 hover:border-gray-600'
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleAvatarSelection(avatar.id)}
                      role="checkbox"
                      aria-checked={avatar.selected}
                      tabIndex={0}
                      onKeyDown={(e) => handleItemKeyDown(e, avatar.id, true)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold">{avatar.name}</h3>
                        <div className={`w-5 h-5 rounded-full ${
                          avatar.selected
                            ? 'bg-purple-500 text-white'
                            : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                        } flex items-center justify-center`} aria-hidden="true">
                          {avatar.selected && <CheckCircle size={12} />}
                        </div>
                      </div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                        <strong>Ruolo:</strong> {avatar.role}
                      </p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <strong>Personalità:</strong> {avatar.personality}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Tab Content - Scenarios */}
            <div 
              role="tabpanel"
              id="scenarios-panel"
              aria-labelledby="scenarios-tab"
              hidden={currentTab !== 'scenarios'}
              className="max-h-96 overflow-y-auto pr-2"
            >
              {currentTab === 'scenarios' && (
                <div className="space-y-4">
                  {suggestedScenarios.map(scenario => (
                    <div 
                      key={scenario.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        scenario.selected
                          ? isDarkMode
                            ? 'border-purple-500 bg-purple-900 bg-opacity-20'
                            : 'border-purple-500 bg-purple-50'
                          : isDarkMode
                            ? 'border-gray-700 hover:border-gray-600'
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleScenarioSelection(scenario.id)}
                      role="checkbox"
                      aria-checked={scenario.selected}
                      tabIndex={0}
                      onKeyDown={(e) => handleItemKeyDown(e, scenario.id, false)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold">{scenario.title}</h3>
                        <div className={`w-5 h-5 rounded-full ${
                          scenario.selected
                            ? 'bg-purple-500 text-white'
                            : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                        } flex items-center justify-center`} aria-hidden="true">
                          {scenario.selected && <CheckCircle size={12} />}
                        </div>
                      </div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                        {scenario.description}
                      </p>
                      <div className="flex justify-between items-center mt-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          scenario.difficulty === 'Facile'
                            ? isDarkMode ? 'bg-green-900 bg-opacity-20 text-green-300' : 'bg-green-100 text-green-800'
                            : scenario.difficulty === 'Medio'
                              ? isDarkMode ? 'bg-yellow-900 bg-opacity-20 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                              : isDarkMode ? 'bg-red-900 bg-opacity-20 text-red-300' : 'bg-red-100 text-red-800'
                        }`}>
                          {scenario.difficulty}
                        </span>
                        <span className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Users size={14} aria-hidden="true" />
                          {scenario.avatarsRequired} avatar richiesti
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-700 mt-4">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
                disabled={isAnalyzing}
                aria-label="Chiudi senza creare"
              >
                Chiudi
              </button>
              
              <button
                ref={createButtonRef}
                onClick={handleCreateSelected}
                disabled={isAnalyzing || (currentTab === 'avatars' 
                  ? !suggestedAvatars.some(a => a.selected)
                  : !suggestedScenarios.some(s => s.selected))}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  isAnalyzing 
                    ? isDarkMode ? 'bg-gray-700 cursor-not-allowed text-gray-500' : 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : (currentTab === 'avatars' 
                      ? suggestedAvatars.some(a => a.selected)
                      : suggestedScenarios.some(s => s.selected))
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                aria-busy={isAnalyzing}
                aria-disabled={isAnalyzing || (currentTab === 'avatars' 
                  ? !suggestedAvatars.some(a => a.selected)
                  : !suggestedScenarios.some(s => s.selected))}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" aria-hidden="true" />
                    <span>Creazione in corso...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle size={18} aria-hidden="true" />
                    <span>
                      Crea {currentTab === 'avatars' 
                        ? `${suggestedAvatars.filter(a => a.selected).length} Avatar` 
                        : `${suggestedScenarios.filter(s => s.selected).length} Scenario`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
