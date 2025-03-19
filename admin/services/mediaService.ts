import { MediaItem, TranscodingJob } from '../types/media';

/**
 * Servizio per la gestione dei media che interagisce con le API del server
 */
export const mediaService = {
  /**
   * Recupera la lista dei media con opzioni di filtro e ordinamento
   */
  getMedia: async ({ type, sort }: { type?: string, sort?: { field: string, order: string } }): Promise<{ data: MediaItem[] | null, error: Error | null }> => {
    try {
      const queryParams = new URLSearchParams();
      if (type) queryParams.set('type', type);
      if (sort) {
        queryParams.set('sort', sort.field);
        queryParams.set('order', sort.order);
      }
      
      const response = await fetch(`/api/media?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch media items');
      
      const data = await response.json();
      return { data: data.data, error: null };
    } catch (error) {
      console.error('Error fetching media:', error);
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  },
  
  /**
   * Carica un file multimediale con metadati e traccia il progresso
   */
  uploadMedia: async (file: File, metadata: any, onProgress: (progress: number) => void): Promise<MediaItem> => {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (key === 'knowledge_base' && value instanceof File) {
          formData.append('knowledge_base', value);
        } else {
          formData.append(key, String(value));
        }
      }
    });
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Tracking di progresso
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
      
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        }
      };
      
      xhr.open('POST', '/api/media/upload', true);
      xhr.send(formData);
    });
  },
  
  /**
   * Aggiorna i metadati di un elemento multimediale
   */
  updateMedia: async (id: string, updates: { title?: string, description?: string }): Promise<any> => {
    const response = await fetch(`/api/media/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) throw new Error('Failed to update media');
    
    return await response.json();
  },
  
  /**
   * Elimina un elemento multimediale
   */
  deleteMedia: async (id: string): Promise<any> => {
    const response = await fetch(`/api/media/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) throw new Error('Failed to delete media');
    
    return await response.json();
  },

  /**
   * Recupera la lista dei job di transcoding
   */
  getTranscodingJobs: async (): Promise<TranscodingJob[]> => {
    const response = await fetch('/api/media/transcoding');
    if (!response.ok) throw new Error('Failed to load transcoding jobs');
    
    const data = await response.json();
    return data.jobs || [];
  },

  /**
   * Recupera un job di transcoding specifico
   */
  getTranscodingJob: async (jobId: string): Promise<TranscodingJob> => {
    const response = await fetch(`/api/media/transcoding/${jobId}`);
    if (!response.ok) throw new Error('Failed to load transcoding job');
    
    return await response.json();
  },

  /**
   * Avvia un nuovo job di transcoding per un video
   */
  startTranscoding: async (videoId: string): Promise<any> => {
    const response = await fetch(`/api/media/transcoding/${videoId}/start`, {
      method: 'POST'
    });
    
    if (!response.ok) throw new Error('Failed to start transcoding');
    
    return await response.json();
  },

  /**
   * Riavvia tutti i job di transcoding falliti o bloccati
   */
  restartFailedJobs: async (maxHours = 24): Promise<any> => {
    const response = await fetch('/api/media/transcoding/restart-failed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ maxHours }),
    });
    
    if (!response.ok) throw new Error('Failed to restart failed jobs');
    
    return await response.json();
  },

  /**
   * Avvia il processamento di tutti i video in coda per transcoding
   */
  processQueue: async (): Promise<any> => {
    const response = await fetch('/api/media/transcoding/process-queue', {
      method: 'POST'
    });
    
    if (!response.ok) throw new Error('Failed to process queue');
    
    return await response.json();
  }
};

export default mediaService;
