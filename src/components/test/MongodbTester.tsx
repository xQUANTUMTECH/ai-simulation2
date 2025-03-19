import { useState, useEffect } from 'react';
import { UserApi, DocumentApi, checkApiConnection } from '../../services/api-client';

interface MongodbTesterProps {
  isDarkMode: boolean;
}

export const MongodbTester = ({ isDarkMode }: MongodbTesterProps) => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [statusMessage, setStatusMessage] = useState('Verifica connessione al server MongoDB...');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    fullName: ''
  });
  const [docFormData, setDocFormData] = useState({
    title: '',
    content: ''
  });
  const [activeTab, setActiveTab] = useState<'users' | 'documents'>('users');

  useEffect(() => {
    // Verifica connessione all'API
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setConnectionStatus('checking');
      setStatusMessage('Verifica connessione al server MongoDB...');
      
      const response = await checkApiConnection();
      
      setConnectionStatus('connected');
      setStatusMessage('Connessione al server MongoDB stabilita!');
      setApiResponse(response);
      
      // Carica i dati iniziali
      loadUsers();
      loadDocuments();
    } catch (error) {
      setConnectionStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Errore di connessione al server');
    }
  };

  const loadUsers = async () => {
    try {
      const users = await UserApi.getAll();
      setUsers(users || []);
    } catch (error) {
      console.error('Errore nel caricamento utenti:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const documents = await DocumentApi.getAll();
      setDocuments(documents || []);
    } catch (error) {
      console.error('Errore nel caricamento documenti:', error);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await UserApi.create(formData);
      // Reset form
      setFormData({
        email: '',
        username: '',
        fullName: ''
      });
      // Ricarica utenti
      await loadUsers();
    } catch (error) {
      console.error('Errore nella creazione utente:', error);
    }
  };

  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await DocumentApi.create(docFormData);
      // Reset form
      setDocFormData({
        title: '',
        content: ''
      });
      // Ricarica documenti
      await loadDocuments();
    } catch (error) {
      console.error('Errore nella creazione documento:', error);
    }
  };

  return (
    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-md'}`}>
      <h2 className="text-2xl font-bold mb-4">Test MongoDB</h2>
      
      {/* Stato connessione */}
      <div className={`mb-6 p-4 rounded-lg ${
        connectionStatus === 'connected' 
          ? (isDarkMode ? 'bg-green-900/30' : 'bg-green-100') 
          : connectionStatus === 'error'
            ? (isDarkMode ? 'bg-red-900/30' : 'bg-red-100')
            : (isDarkMode ? 'bg-gray-700' : 'bg-gray-100')
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full ${
            connectionStatus === 'connected' 
              ? 'bg-green-500' 
              : connectionStatus === 'error'
                ? 'bg-red-500'
                : 'bg-yellow-500 animate-pulse'
          }`}></div>
          <span className={`font-medium ${
            connectionStatus === 'connected' 
              ? (isDarkMode ? 'text-green-400' : 'text-green-700') 
              : connectionStatus === 'error'
                ? (isDarkMode ? 'text-red-400' : 'text-red-700')
                : (isDarkMode ? 'text-yellow-400' : 'text-yellow-700')
          }`}>
            {statusMessage}
          </span>
        </div>
        
        {connectionStatus === 'connected' && apiResponse && (
          <div className="mt-2 text-sm">
            <p>Versione API: {apiResponse.version}</p>
            <p>Timestamp: {new Date(apiResponse.timestamp).toLocaleString()}</p>
          </div>
        )}
        
        {connectionStatus === 'error' && (
          <button
            onClick={checkConnection}
            className={`mt-2 px-3 py-1 rounded-md ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Riprova
          </button>
        )}
      </div>
      
      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'users'
              ? (isDarkMode ? 'border-b-2 border-purple-500 text-purple-400' : 'border-b-2 border-purple-500 text-purple-700')
              : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
          }`}
          onClick={() => setActiveTab('users')}
        >
          Utenti
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === 'documents'
              ? (isDarkMode ? 'border-b-2 border-purple-500 text-purple-400' : 'border-b-2 border-purple-500 text-purple-700')
              : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
          }`}
          onClick={() => setActiveTab('documents')}
        >
          Documenti
        </button>
      </div>
      
      {/* Contenuto Tab */}
      {activeTab === 'users' ? (
        <div>
          <h3 className="text-xl font-semibold mb-4">Gestione Utenti</h3>
          
          {/* Form creazione utente */}
          <form onSubmit={handleUserSubmit} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block mb-1 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } border`}
                />
              </div>
              <div>
                <label className={`block mb-1 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } border`}
                />
              </div>
              <div>
                <label className={`block mb-1 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } border`}
                />
              </div>
            </div>
            <button
              type="submit"
              className={`mt-3 px-4 py-2 rounded-md ${
                isDarkMode 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              Crea Utente
            </button>
          </form>
          
          {/* Lista utenti */}
          <div className="mt-4">
            <h4 className="font-medium mb-2">Utenti in Database</h4>
            {users.length === 0 ? (
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Nessun utente trovato
              </p>
            ) : (
              <div className={`border rounded-md overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <table className="w-full">
                  <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                    <tr>
                      <th className="px-4 py-2 text-left">ID</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Username</th>
                      <th className="px-4 py-2 text-left">Nome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr 
                        key={user._id || user.id} 
                        className={isDarkMode ? 'border-t border-gray-700' : 'border-t border-gray-200'}
                      >
                        <td className="px-4 py-2 text-sm">{user._id || user.id}</td>
                        <td className="px-4 py-2">{user.email}</td>
                        <td className="px-4 py-2">{user.username}</td>
                        <td className="px-4 py-2">{user.fullName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-xl font-semibold mb-4">Gestione Documenti</h3>
          
          {/* Form creazione documento */}
          <form onSubmit={handleDocumentSubmit} className="mb-6">
            <div className="space-y-4">
              <div>
                <label className={`block mb-1 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Titolo
                </label>
                <input
                  type="text"
                  required
                  value={docFormData.title}
                  onChange={(e) => setDocFormData({...docFormData, title: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } border`}
                />
              </div>
              <div>
                <label className={`block mb-1 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Contenuto
                </label>
                <textarea
                  required
                  value={docFormData.content}
                  onChange={(e) => setDocFormData({...docFormData, content: e.target.value})}
                  rows={4}
                  className={`w-full px-3 py-2 rounded-md ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } border`}
                />
              </div>
            </div>
            <button
              type="submit"
              className={`mt-3 px-4 py-2 rounded-md ${
                isDarkMode 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              Crea Documento
            </button>
          </form>
          
          {/* Lista documenti */}
          <div className="mt-4">
            <h4 className="font-medium mb-2">Documenti in Database</h4>
            {documents.length === 0 ? (
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Nessun documento trovato
              </p>
            ) : (
              <div className={`border rounded-md overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <table className="w-full">
                  <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                    <tr>
                      <th className="px-4 py-2 text-left">ID</th>
                      <th className="px-4 py-2 text-left">Titolo</th>
                      <th className="px-4 py-2 text-left">Contenuto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr 
                        key={doc._id || doc.id} 
                        className={isDarkMode ? 'border-t border-gray-700' : 'border-t border-gray-200'}
                      >
                        <td className="px-4 py-2 text-sm">{doc._id || doc.id}</td>
                        <td className="px-4 py-2">{doc.title}</td>
                        <td className="px-4 py-2">
                          <div className="max-w-xs truncate">{doc.content}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MongodbTester;
