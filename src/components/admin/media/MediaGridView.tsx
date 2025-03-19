import React from 'react';
import { Video, Calendar, Eye, Trash } from 'lucide-react';
import { MediaItem, ThemeProps, formatFileSize } from './MediaTypes';
import { MediaIcon } from './MediaIcon';

interface MediaGridViewProps extends ThemeProps {
  items: MediaItem[];
  onViewDetails: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}

/**
 * Visualizzazione a griglia degli elementi media
 */
export function MediaGridView({ isDarkMode, items, onViewDetails, onDelete }: MediaGridViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Video size={64} className="mb-4 opacity-20" />
        <p className="text-xl font-medium mb-2">Nessun media trovato</p>
        <p className="text-sm">Cambia i criteri di ricerca o carica nuovi media</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map(item => (
        <div 
          key={item.id}
          className={`rounded-lg border overflow-hidden transition-shadow hover:shadow-md ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
        >
          {/* Preview/Thumbnail */}
          <div 
            className={`aspect-video relative ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            } cursor-pointer`}
            onClick={() => onViewDetails(item)}
          >
            {item.mediaType === 'video' && item.thumbnail ? (
              <img 
                src={item.thumbnail} 
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                {item.mediaType === 'video' ? (
                  <Video size={48} className="text-gray-400" />
                ) : item.type.includes('pdf') ? (
                  <MediaIcon item={item} size={48} />
                ) : (
                  <MediaIcon item={item} size={48} />
                )}
              </div>
            )}
            
            <div className="absolute bottom-2 right-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                item.status === 'ready'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : item.status === 'processing' || item.status === 'transcoding'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : item.status === 'error'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }`}>
                {item.status === 'ready' ? 'Pronto' :
                 item.status === 'processing' ? 'In elaborazione' :
                 item.status === 'transcoding' ? 'Transcodifica' :
                 item.status === 'error' ? 'Errore' : 'N/A'}
              </span>
            </div>
          </div>
          
          {/* Info */}
          <div className="p-3">
            <div className="flex items-start gap-2">
              <MediaIcon item={item} />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate" title={item.name}>
                  {item.name}
                </h3>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(item.created_at).toLocaleDateString()}
                  <span className="inline-block mx-1">•</span>
                  {formatFileSize(item.size)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Azioni */}
          <div className={`flex border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              onClick={() => window.open(item.url, '_blank')}
              className={`flex-1 p-2 text-center text-sm ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-300' 
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
              title="Visualizza"
            >
              <Eye size={16} className="inline mr-1" />
              <span className="hidden sm:inline">Visualizza</span>
            </button>
            
            <button
              onClick={() => onDelete(item)}
              className={`flex-1 p-2 text-center text-sm ${
                isDarkMode 
                  ? 'hover:bg-red-900 hover:bg-opacity-20 text-red-400' 
                  : 'hover:bg-red-50 text-red-500'
              }`}
              title="Elimina"
            >
              <Trash size={16} className="inline mr-1" />
              <span className="hidden sm:inline">Elimina</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
