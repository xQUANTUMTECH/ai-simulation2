/**
 * Client API per frontend - Comunica con il backend Express
 * Questo approccio evita dipendenze dirette da moduli Node.js nel frontend
 */

// URL base per le chiamate API
const API_BASE_URL = 'http://localhost:3000/api';

// Token di autenticazione salvato in localStorage
let authToken = localStorage.getItem('authToken');

/**
 * Funzione di utilità per chiamate HTTP
 * @param {string} endpoint - Endpoint API relativo
 * @param {Object} options - Opzioni fetch
 * @returns {Promise<any>} Dati della risposta
 */
async function fetchApi(endpoint, options = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Imposta le opzioni predefinite
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Unisce le opzioni predefinite con quelle fornite
    const fetchOptions = {
      ...defaultOptions,
      ...options,
    };
    
    // Esegue la richiesta
    const response = await fetch(url, fetchOptions);
    
    // Verifica se la risposta è ok (status 200-299)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    // Restituisce i dati come JSON
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Esportazione di funzioni specifiche per le diverse entità

/**
 * Funzioni per le operazioni sugli utenti
 */
export const UserApi = {
  /**
   * Recupera tutti gli utenti
   * @returns {Promise<Array>} Array di utenti
   */
  getAll: () => fetchApi('/users'),
  
  /**
   * Recupera un utente specifico per ID
   * @param {string} id - ID dell'utente
   * @returns {Promise<Object>} Dati dell'utente
   */
  getById: (id) => fetchApi(`/users/${id}`),
  
  /**
   * Crea un nuovo utente
   * @param {Object} userData - Dati dell'utente da creare
   * @returns {Promise<Object>} Utente creato
   */
  create: (userData) => fetchApi('/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  
  /**
   * Aggiorna un utente esistente
   * @param {string} id - ID dell'utente
   * @param {Object} userData - Dati dell'utente da aggiornare
   * @returns {Promise<Object>} Utente aggiornato
   */
  update: (id, userData) => fetchApi(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  
  /**
   * Elimina un utente
   * @param {string} id - ID dell'utente
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  delete: (id) => fetchApi(`/users/${id}`, {
    method: 'DELETE',
  }),
};

/**
 * Funzioni per le operazioni sui documenti
 */
export const DocumentApi = {
  /**
   * Recupera tutti i documenti
   * @returns {Promise<Array>} Array di documenti
   */
  getAll: () => fetchApi('/documents'),
  
  /**
   * Recupera un documento specifico per ID
   * @param {string} id - ID del documento
   * @returns {Promise<Object>} Dati del documento
   */
  getById: (id) => fetchApi(`/documents/${id}`),
  
  /**
   * Crea un nuovo documento
   * @param {Object} documentData - Dati del documento da creare
   * @returns {Promise<Object>} Documento creato
   */
  create: (documentData) => fetchApi('/documents', {
    method: 'POST',
    body: JSON.stringify(documentData),
  }),
  
  /**
   * Aggiorna un documento esistente
   * @param {string} id - ID del documento
   * @param {Object} documentData - Dati del documento da aggiornare
   * @returns {Promise<Object>} Documento aggiornato
   */
  update: (id, documentData) => fetchApi(`/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(documentData),
  }),
  
  /**
   * Elimina un documento
   * @param {string} id - ID del documento
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  delete: (id) => fetchApi(`/documents/${id}`, {
    method: 'DELETE',
  }),
};

/**
 * Funzione per verificare la connessione al backend
 * @returns {Promise<Object>} Informazioni sullo stato del server
 */
export function checkApiConnection() {
  return fetchApi('');
}

/**
 * Funzioni per l'autenticazione
 */
export const AuthApi = {
  /**
   * Effettua il login con email e password
   * @param {string} email - Email dell'utente
   * @param {string} password - Password dell'utente
   * @returns {Promise<Object>} Dati dell'utente e token
   */
  loginWithEmail: (email, password) => fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }).then(handleAuthResponse),
  
  /**
   * Effettua il login con username e password
   * @param {string} username - Username dell'utente
   * @param {string} password - Password dell'utente
   * @returns {Promise<Object>} Dati dell'utente e token
   */
  loginWithUsername: (username, password) => fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }).then(handleAuthResponse),
  
  /**
   * Verifica se l'utente è autenticato
   * @returns {boolean} true se l'utente è autenticato
   */
  isAuthenticated: () => !!authToken,
  
  /**
   * Effettua il logout
   */
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
  },
  
  /**
   * Ottiene i dati dell'utente corrente memorizzati
   * @returns {Object|null} Dati dell'utente o null se non autenticato
   */
  getCurrentUser: () => {
    try {
      const userString = localStorage.getItem('currentUser');
      return userString ? JSON.parse(userString) : null;
    } catch (e) {
      console.error('Errore nel parsing dei dati utente:', e);
      return null;
    }
  }
};

/**
 * Gestisce la risposta di autenticazione
 * @param {Object} response - Risposta dal server
 * @returns {Object} Dati e token
 */
function handleAuthResponse(response) {
  if (response.token) {
    // Salva il token
    authToken = response.token;
    localStorage.setItem('authToken', authToken);
    
    // Salva l'utente
    if (response.user) {
      localStorage.setItem('currentUser', JSON.stringify(response.user));
    }
  }
  return response;
}

/**
 * Funzioni per i servizi AI
 */
export const AIApi = {
  /**
   * Genera una risposta testuale
   * @param {string} prompt - Prompt da inviare
   * @param {string} model - Modello da utilizzare (deepseek, gemini, claude, gpt, mixtral)
   * @returns {Promise<Object>} Risposta generata
   */
  generateResponse: (prompt, model = 'deepseek') => fetchApi('/ai/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, model, startTime: Date.now() }),
  }),
  
  /**
   * Converte testo in audio con miglior supporto per caching e feedback
   * @param {string} text - Testo da convertire
   * @param {Object} options - Opzioni TTS
   * @param {Function} onProgress - Callback per stato di avanzamento
   * @returns {Promise<Object>} Risultato con audioUrl o testo, e metadati
   */
  textToSpeech: async (text, options = {}, onProgress = null) => {
    const url = `${API_BASE_URL}/ai/tts`;
    const startTime = Date.now();
    
    try {
      // Se è stato fornito un callback di progresso, notifica l'inizio
      if (onProgress && typeof onProgress === 'function') {
        onProgress({ status: 'requesting', progress: 0 });
      }
      
      // Sanitizza le opzioni
      const sanitizedOptions = {
        voice: options.voice || 'Microsoft Elsa',
        rate: options.rate || 1.0,
        textOnly: !!options.textOnly,
        autoplay: options.autoplay !== false,
        // Includi un hash del testo nell'opzione cacheKey per migliorare la cache
        cacheKey: text.length > 0 ? text.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0).toString() : ''
      };
      
      // Notifica che la richiesta è stata inviata
      if (onProgress) onProgress({ status: 'sending', progress: 10 });
      
      // Prepara gli header per includere il token di autenticazione se disponibile
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Aggiungi l'header di autorizzazione se c'è un token
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          text, 
          options: sanitizedOptions, 
          startTime: startTime 
        }),
      });
      
      // Notifica che la risposta è stata ricevuta
      if (onProgress) onProgress({ status: 'received', progress: 60 });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `TTS error: ${response.status}`);
      }
      
      // Controllo se la risposta è audio o testo
      const contentType = response.headers.get('content-type');
      
      // Estrai metadati dagli header custom
      const metadata = {
        generatedAt: response.headers.get('X-Generated-At'),
        fromCache: response.headers.get('X-From-Cache') === 'true',
        generationTime: parseInt(response.headers.get('X-Generation-Time') || '0', 10),
        contentType: contentType,
        responseTime: Date.now() - startTime
      };
      
      // Notifica l'elaborazione dei dati
      if (onProgress) onProgress({ status: 'processing', progress: 80, metadata });
      
      if (contentType && contentType.includes('audio')) {
        // Gestisci risposta audio
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Se si vuole riprodurre l'audio automaticamente
        if (sanitizedOptions.autoplay) {
          try {
            const audio = new Audio(audioUrl);
            
            // Notifica quando l'audio è pronto per essere riprodotto
            audio.oncanplaythrough = () => {
              if (onProgress) onProgress({ status: 'ready', progress: 95 });
            };
            
            // Notifica quando l'audio è finito
            audio.onended = () => {
              if (onProgress) onProgress({ status: 'completed', progress: 100 });
            };
            
            // Gestisci errori di riproduzione
            audio.onerror = (err) => {
              console.error('Errore riproduzione audio:', err);
              if (onProgress) onProgress({ 
                status: 'error', 
                progress: 0,
                error: 'Errore durante la riproduzione dell\'audio'
              });
            };
            
            // Avvia la riproduzione
            await audio.play();
          } catch (playError) {
            console.error('Errore avvio riproduzione:', playError);
            // Non bloccare l'esecuzione in caso di errore di riproduzione
          }
        } else {
          // Segnala completamento anche senza autoplay
          if (onProgress) onProgress({ status: 'completed', progress: 100 });
        }
        
        return {
          type: 'audio',
          audioUrl,
          metadata,
          text: text // Includiamo anche il testo originale
        };
      } else {
        // Gestisci risposta testuale
        const textData = await response.json();
        
        // Segnala completamento
        if (onProgress) onProgress({ status: 'completed', progress: 100, metadata });
        
        return {
          type: 'text',
          text: textData.text,
          metadata,
          voice: textData.voice
        };
      }
    } catch (error) {
      console.error('TTS request failed:', error);
      
      // Notifica l'errore
      if (onProgress) {
        onProgress({ 
          status: 'error', 
          progress: 0, 
          error: error.message || 'Errore sconosciuto nella sintesi vocale'
        });
      }
      
      throw error;
    }
  },
  
  /**
   * Genera uno scenario basato su conversazione
   * @param {Array} messages - Messaggi della conversazione
   * @returns {Promise<Object>} Scenario generato
   */
  generateScenario: (messages) => fetchApi('/ai/scenario', {
    method: 'POST',
    body: JSON.stringify({ messages, startTime: Date.now() }),
  }),
};

/**
 * Funzioni per gestire gli scenari
 */
export const ScenarioApi = {
  /**
   * Recupera tutti gli scenari
   * @returns {Promise<Array>} Lista di scenari
   */
  getAll: () => fetchApi('/scenarios'),
  
  /**
   * Recupera uno scenario specifico
   * @param {string} id - ID dello scenario
   * @returns {Promise<Object>} Dettagli dello scenario
   */
  getById: (id) => fetchApi(`/scenarios/${id}`),
  
  /**
   * Crea un nuovo scenario
   * @param {Object} scenarioData - Dati dello scenario
   * @returns {Promise<Object>} Scenario creato
   */
  create: (scenarioData) => fetchApi('/scenarios', {
    method: 'POST',
    body: JSON.stringify(scenarioData),
  }),
  
  /**
   * Aggiorna uno scenario esistente
   * @param {string} id - ID dello scenario
   * @param {Object} scenarioData - Dati aggiornati
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  update: (id, scenarioData) => fetchApi(`/scenarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(scenarioData),
  }),
  
  /**
   * Elimina uno scenario
   * @param {string} id - ID dello scenario
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  delete: (id) => fetchApi(`/scenarios/${id}`, {
    method: 'DELETE',
  }),
};

/**
 * Helper per ottenere l'header di autorizzazione
 * @returns {Object} Header di autorizzazione o oggetto vuoto
 */
fetchApi.getAuthHeader = () => {
  return authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
};

// Esporta la versione default con tutte le API
export default {
  UserApi,
  DocumentApi,
  AuthApi,
  AIApi,
  ScenarioApi,
  checkApiConnection,
  getAuthHeader: fetchApi.getAuthHeader
};
