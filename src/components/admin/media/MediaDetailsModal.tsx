import React from 'react';
import { AlertTriangle, X, Calendar, FileType, Info, User, CheckCircle } from 'lucide-react';
import { MediaItem, ThemeProps, formatFileSize } from './MediaTypes';

interface MediaDetailsModalProps extends ThemeProps {
  item: MediaItem | null;
  onClose: () => void;
}

/**
 * Modal per visualizzare i dettagli di un elemento media
 */
export function MediaDetailsModal({ isDarkMode, item, onClose }: MediaDetailsModalProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-2xl p-6 rounded-xl ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Dettagli Media</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Anteprima */}
          {item.mediaType === 'video' && (
            <div className={`aspect-video rounded-lg overflow-hidden ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              {item.thumbnail ? (
                <img 
                  src={item.thumbnail} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <AlertTriangle size={48} className="text-gray-400" />
                </div>
              )}
            </div>
          )}
          
          {/* Informazioni di base */}
          <div className={`p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <p className="font-medium">Nome file:</p>
            <p>{item.name}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <p className="font-medium">Tipo:</p>
              <p className="capitalize">{item.mediaType} - {item.type}</p>
            </div>
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <p className="font-medium">Dimensione:</p>
              <p>{formatFileSize(item.size)}</p>
            </div>
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <p className="font-medium">Data creazione:</p>
              <p>{new Date(item.created_at).toLocaleString()}</p>
            </div>
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <p className="font-medium">Stato:</p>
              <p className="flex items-center">
                <span className={`inline-block h-2.5 w-2.5 rounded-full mr-2 ${
                  item.status === 'ready'
                    ? 'bg-green-500'
                    : item.status === 'processing' || item.status === 'transcoding'
                      ? 'bg-yellow-500'
                      : item.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-gray-500'
                }`}></span>
                {item.status === 'ready' ? 'Pronto' :
                 item.status === 'processing' ? 'In elaborazione' :
                 item.status === 'transcoding' ? 'Transcodifica' :
                 item.status === 'error' ? 'Errore' : 'N/A'}
              </p>
            </div>
          </div>
          
          {/* URL */}
          <div className={`p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <p className="font-medium">URL:</p>
            <div className="flex items-center mt-1">
              <input
                type="text"
                value={item.url}
                readOnly
                className={`flex-1 px-3 py-1.5 rounded-l-lg border ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-600 text-gray-300'
                    : 'bg-white border-gray-300 text-gray-800'
                } font-mono text-sm`}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(item.url);
                  // Qui potresti aggiungere un feedback di "copiato"
                }}
                className={`px-3 py-1.5 rounded-r-lg border-t border-r border-b ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700'
                }`}
              >
                Copia
              </button>
            </div>
          </div>
          
          {/* Metadati (se presenti) */}
          {item.metadata && Object.keys(item.metadata).length > 0 && (
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <p className="font-medium mb-2">Metadati:</p>
              <pre className={`mt-2 p-2 rounded overflow-auto text-xs ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                {JSON.stringify(item.metadata, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Pulsanti azioni */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => window.open(item.url, '_blank')}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              Visualizza
            </button>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
