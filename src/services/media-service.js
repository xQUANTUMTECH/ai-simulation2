/**
 * Service per la gestione dei media con il server Express
 * Usa implementazioni isomorfiche per compatibilità browser/Node.js
 */

// Importa le versioni isomorfiche di FormData, File e fetch
import { FormData, File, fetch, createFileFromPath } from './isomorphic-fetch.js';

// URL di base per le chiamate API
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Funzione che carica un file multimediale al server
 * @param {File|String} file - Il file da caricare o percorso del file (in Node.js)
 * @param {Object} metadata - Metadati del file (title, description, file_type)
 * @param {Function} onProgress - Callback per aggiornamenti sul progresso
 * @returns {Promise<Object>} - Risposta dal server con i dati del file caricato
 */
export async function uploadMedia(file, metadata, onProgress) {
  try {
    // Gestisce sia oggetti File che percorsi
    let fileToUpload = file;
    
    // Se è una stringa in ambiente Node.js, assumiamo sia un percorso file
    if (typeof file === 'string') {
      fileToUpload = createFileFromPath(file, { 
        type: metadata.file_type === 'video' ? 'video/mp4' : 'application/octet-stream'
      });
    } else if (file && typeof file === 'object' && !(file instanceof File) && file.name) {
      // Se è un oggetto con proprietà name ma non è un File reale (mock)
      // crealo come File vero partendo dai dati disponibili
      fileToUpload = new File(
        [Buffer.alloc(file.size || 1024)], // Crea un buffer vuoto della dimensione dichiarata 
        file.name,
        { type: file.type || 'application/octet-stream' }
      );
    }
    
    // Crea un FormData con il file e i metadati
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('title', metadata.title || '');
    formData.append('description', metadata.description || '');
    formData.append('file_type', metadata.file_type || 'video');

    // Opzionalmente aggiungi il file di conoscenza se presente
    if (metadata.knowledge_base) {
      formData.append('knowledge_base', metadata.knowledge_base);
    }

    // Simula chiamata con progresso
    let uploadProgress = 0;
    const interval = setInterval(() => {
      uploadProgress += 5;
      if (uploadProgress <= 95) {
        onProgress && onProgress(uploadProgress);
      } else {
        clearInterval(interval);
      }
    }, 100);

    // Esegui la richiesta al server
    const response = await fetch(`${API_BASE_URL}/media/upload`, {
      method: 'POST',
      body: formData,
      // Non impostare Content-Type, sarà impostato automaticamente con il boundary
    });

    clearInterval(interval);
    onProgress && onProgress(100);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Errore nell'upload: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Errore di upload:', error);
    throw error;
  }
}

/**
 * Ottiene la lista dei media dal server
 * @param {Object} options - Opzioni di filtro e ordinamento
 * @returns {Promise<Object>} - Risposta dal server con i dati dei media
 */
export async function getMedia(options = {}) {
  try {
    // Costruisce i parametri di query
    const queryParams = new URLSearchParams();
    
    if (options.type && options.type !== 'all') {
      queryParams.append('type', options.type);
    }
    
    if (options.sort) {
      queryParams.append('sort', options.sort.field || 'date');
      queryParams.append('order', options.sort.order || 'desc');
    }
    
    // Esegue la richiesta
    const url = `${API_BASE_URL}/media${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Errore nel recupero media: ${response.status}`);
    }
    
    const data = await response.json();
    return { data: data.data || [], error: null };
  } catch (error) {
    console.error('Errore nel recupero media:', error);
    return { data: null, error };
  }
}

/**
 * Ottiene i dettagli di un media specifico
 * @param {string} id - ID del media
 * @returns {Promise<Object>} - Risposta dal server con i dati del media
 */
export async function getMediaById(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/media/${id}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Errore nel recupero media: ${response.status}`);
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error(`Errore nel recupero del media ${id}:`, error);
    return { data: null, error };
  }
}

/**
 * Aggiorna i metadati di un media
 * @param {string} id - ID del media
 * @param {Object} updates - Campi da aggiornare
 * @returns {Promise<Object>} - Risposta dal server
 */
export async function updateMedia(id, updates) {
  try {
    const response = await fetch(`${API_BASE_URL}/media/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Errore nell'aggiornamento: ${response.status}`);
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error(`Errore nell'aggiornamento del media ${id}:`, error);
    return { success: false, error };
  }
}

/**
 * Elimina un media
 * @param {string} id - ID del media
 * @returns {Promise<Object>} - Risposta dal server
 */
export async function deleteMedia(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/media/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Errore nell'eliminazione: ${response.status}`);
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error(`Errore nell'eliminazione del media ${id}:`, error);
    return { success: false, error };
  }
}

// Esporta tutte le funzioni come un oggetto
export const mediaService = {
  uploadMedia,
  getMedia,
  getMediaById,
  updateMedia,
  deleteMedia
};

export default mediaService;
