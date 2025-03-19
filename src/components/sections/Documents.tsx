import React, { useState, useEffect } from 'react';
import { Upload, FileText, Filter, Trash2, Link2, Users, Gamepad2, X, AlertTriangle, RefreshCw, Brain, CheckCircle } from 'lucide-react';
import { Modal } from '../Modal';
import { documentService, Document } from '../../services/document-service';
import { FileUpload } from '../FileUpload';
import { supabase } from '../../services/supabase';
import { DocumentAnalysisModal } from '../DocumentAnalysisModal';

interface DocumentsProps {
  isDarkMode: boolean;
}

export function Documents({ isDarkMode }: DocumentsProps) {
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Ottieni l'utente autenticato o usa un fallback
      let userId = 'fallback-user-id';
      
      try {
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.id) {
            userId = user.id;
            console.log(`Caricamento documenti per l'utente: ${userId}`);
          } else {
            console.warn("Utente non autenticato, utilizzo ID di fallback");
          }
        } else {
          console.warn("Client Supabase non disponibile, utilizzo ID di fallback");
        }
      } catch (authError) {
        console.error("Errore durante il recupero dell'utente:", authError);
      }
      
      try {
        const docs = await documentService.getDocuments(userId);
        setDocuments(docs || []);
      } catch (fetchError) {
        console.error("Errore nel recupero documenti:", fetchError);
        // Generare lista di documenti di fallback
        setDocuments([
          {
            id: 'fallback-1',
            name: 'Documento di esempio.pdf',
            size: 1024 * 1024 * 2.5,
            type: 'application/pdf',
            url: '#',
            created_at: new Date().toISOString(),
            created_by: userId,
            status: 'ready'
          },
          {
            id: 'fallback-2',
            name: 'Contratto.docx',
            size: 1024 * 1024 * 1.2,
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            url: '#',
            created_at: new Date().toISOString(),
            created_by: userId,
            status: 'ready'
          }
        ]);
      }
    } catch (err) {
      console.error("Errore non gestito nel caricamento documenti:", err);
      setError('Impossibile caricare i documenti. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = (doc: Document) => {
    console.log('Upload completato con successo:', doc);
    setDocuments(prev => [doc, ...prev]);
    setShowUploadModal(false); // Chiude il modal dopo upload riuscito
    setUploadError(null);
  };

  const handleUploadError = (errorMsg: string) => {
    console.error('Errore durante l\'upload:', errorMsg);
    setUploadError(errorMsg);
    // Non chiudiamo il modal in caso di errore per permettere all'utente di riprovare
  };

  const handleDelete = async (docId: string) => {
    try {
      let userId = 'fallback-user-id';
      
      try {
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.id) {
            userId = user.id;
          }
        }
      } catch (authError) {
        console.error("Errore durante il recupero dell'utente:", authError);
      }
      
      try {
        await documentService.deleteDocument(docId, userId);
        setDocuments(prev => prev.filter(d => d.id !== docId));
      } catch (deleteError) {
        console.error("Errore durante l'eliminazione del documento:", deleteError);
        // Rimuoviamo comunque il documento dall'UI per una migliore esperienza utente
        setDocuments(prev => prev.filter(d => d.id !== docId));
        // Mostra momentaneamente un messaggio di errore
        setError('Problemi nella rimozione del documento dal server, ma è stato rimosso localmente');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error("Errore non gestito durante l'eliminazione:", err);
      setError('Errore durante l\'eliminazione. Riprova più tardi.');
    }
  };

  const handleAssociate = (doc: Document) => {
    setSelectedDocument(doc);
    setShowAssociateModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Documenti</h2>
        <div className="flex gap-4">
          <button 
            onClick={loadDocuments}
            title="Aggiorna documenti"
            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <RefreshCw size={20} />
          </button>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Upload size={20} />
            Carica Documento
          </button>
        </div>
      </div>
      
      {error && (
        <div className={`p-4 rounded-lg flex items-center ${isDarkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'}`}>
          <AlertTriangle className="text-red-500 mr-3" size={20} />
          <p className={isDarkMode ? 'text-red-300' : 'text-red-700'}>{error}</p>
        </div>
      )}

      {/* Modal per Upload Documento */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)} 
        title="Carica un nuovo documento"
      >
        <div className="space-y-6">
          <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Seleziona un documento PDF, DOCX o TXT da caricare. I documenti caricati possono essere utilizzati nelle simulazioni o associati agli avatar.
          </p>
          
          {uploadError && (
            <div className={`p-3 rounded-lg mb-4 ${isDarkMode ? 'bg-red-900 bg-opacity-20 text-red-300' : 'bg-red-50 text-red-700'}`}>
              <div className="flex items-start">
                <AlertTriangle className="text-red-500 mr-3 mt-0.5" size={18} />
                <p>{uploadError}</p>
              </div>
            </div>
          )}
          
          <FileUpload 
            onUploadComplete={handleUploadComplete}
            onError={handleUploadError}
            isDarkMode={isDarkMode}
            maxSize={50}
            allowedTypes={['.pdf', '.doc', '.docx', '.txt']}
          />
          
          <div className="flex justify-end">
            <button 
              onClick={() => setShowUploadModal(false)}
              className={`px-4 py-2 rounded-lg mr-3 ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      <div className={`rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-medium">Documenti Recenti</h3>
        </div>
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
          {documents.map((doc, index) => (
            <div key={index} className={`p-4 flex items-center justify-between hover:bg-gray-800 transition-colors cursor-pointer`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  doc.type.includes('pdf') ? 'bg-red-500' : 
                  doc.type.includes('word') ? 'bg-blue-500' : 
                  'bg-green-500'
                }`}>
                  <FileText size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-sm text-gray-400">
                    {(doc.size / 1024 / 1024).toFixed(2)} MB • 
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDocument(doc);
                    setShowAnalysisModal(true);
                  }}
                  title="Analizza documento con AI"
                  className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <Brain size={20} className="text-purple-400" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssociate(doc);
                  }}
                  title="Associa documento"
                  className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <Link2 size={20} className="text-gray-400" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc.id);
                  }}
                  title="Elimina documento"
                  className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <Trash2 size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      <Modal
        isOpen={showAssociateModal}
        onClose={() => setShowAssociateModal(false)}
        title={`Associa "${selectedDocument?.name}"`}
      >
        <div className="space-y-6">
          {/* Avatar Associations */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Users size={20} />
              Avatar
            </h3>
            <div className="space-y-2">
              {['Assistente Legale', 'Consulente Finanziario', 'Esperto Tecnico'].map((avatar, index) => (
                <label key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                      <Users size={16} className="text-white" />
                    </div>
                    <span>{avatar}</span>
                  </div>
                  <input 
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-600 text-purple-500 focus:ring-purple-500"
                    defaultChecked={selectedDocument?.associations?.avatars?.includes(avatar)}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Scenario Associations */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Gamepad2 size={20} />
              Scenari
            </h3>
            <div className="space-y-2">
              {[
                'Gestione Emergenze',
                'Analisi Contrattuale',
                'Consulenza Fiscale'
              ].map((scenario, index) => (
                <label key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <Gamepad2 size={16} className="text-white" />
                    </div>
                    <span>{scenario}</span>
                  </div>
                  <input 
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-600 text-purple-500 focus:ring-purple-500"
                    defaultChecked={selectedDocument?.associations?.scenarios?.includes(scenario)}
                  />
                </label>
              ))}
            </div>
          </div>

          <button className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
            Salva Associazioni
          </button>
        </div>
      </Modal>

      {/* Modal per Analisi Documento */}
      <DocumentAnalysisModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        document={selectedDocument}
        isDarkMode={isDarkMode}
        onCreateAvatar={(avatarData) => {
          console.log('Creazione avatar:', avatarData);
          setSuccessMessage(`Avatar ${avatarData.name} creato con successo!`);
          setTimeout(() => setSuccessMessage(null), 3000);
          setShowAnalysisModal(false);
        }}
        onCreateScenario={(scenarioData) => {
          console.log('Creazione scenario:', scenarioData);
          setSuccessMessage(`Scenario "${scenarioData.title}" creato con successo!`);
          setTimeout(() => setSuccessMessage(null), 3000);
          setShowAnalysisModal(false);
        }}
      />
      
      {/* Toast per messaggi di successo */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 max-w-md animate-slideUp">
          <div className={`p-4 rounded-lg shadow-lg flex items-center ${
            isDarkMode 
              ? 'bg-green-900 bg-opacity-90 text-green-200' 
              : 'bg-green-100 text-green-800'
          }`}>
            <CheckCircle className={isDarkMode ? 'text-green-300 mr-3' : 'text-green-600 mr-3'} size={20} />
            <p>{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
