/**
 * Adattatore CommonJS per media-service
 * 
 * Questo file consente l'importazione del servizio media tramite require() in un contesto CommonJS.
 * Il modulo media-service.js è di tipo ESM, ma possiamo esportarlo come CommonJS con questo adattatore.
 */

// Poiché non possiamo usare import in un file CJS, utilizziamo un workaround
// caricando il modulo con dynamic import e esponendolo tramite module.exports
(async () => {
  try {
    // Carica il modulo ESM in modo dinamico
    const mediaServiceModule = await import('./media-service.js');
    
    // Assegna tutte le esportazioni al module.exports
    Object.assign(module.exports, mediaServiceModule);
    
    // Assegna anche la funzione principale come default per require()
    module.exports.default = mediaServiceModule.default;
    
    // Esporta singole funzioni anche come proprietà dirette
    module.exports.uploadMedia = mediaServiceModule.uploadMedia;
    module.exports.getMedia = mediaServiceModule.getMedia;
    module.exports.getMediaById = mediaServiceModule.getMediaById;
    module.exports.updateMedia = mediaServiceModule.updateMedia;
    module.exports.deleteMedia = mediaServiceModule.deleteMedia;
    
  } catch (error) {
    console.error('Errore nel caricamento del modulo media-service:', error);
    
    // Fornisce stub per le funzioni in caso di errore
    module.exports = {
      uploadMedia: async () => ({ error: 'Modulo non caricato correttamente' }),
      getMedia: async () => ({ error: 'Modulo non caricato correttamente' }),
      getMediaById: async () => ({ error: 'Modulo non caricato correttamente' }),
      updateMedia: async () => ({ error: 'Modulo non caricato correttamente' }),
      deleteMedia: async () => ({ error: 'Modulo non caricato correttamente' }),
      default: { error: 'Modulo non caricato correttamente' }
    };
  }
})();
