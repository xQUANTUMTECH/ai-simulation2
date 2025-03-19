import React from 'react';
import { Eye, Download, Trash, Video } from 'lucide-react';
import { MediaItem, ThemeProps, formatFileSize } from './MediaTypes';
import { MediaIcon } from './MediaIcon';

interface MediaListViewProps extends ThemeProps {
  items: MediaItem[];
  onViewDetails: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}

/**
 * Visualizzazione a lista degli elementi media
 */
export function MediaListView({ isDarkMode, items, onViewDetails, onDelete }: MediaListViewProps) {
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className={`${
          isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <tr>
            <th className="px-4 py-3 text-left">Nome</th>
            <th className="px-4 py-3 text-left">Tipo</th>
            <th className="px-4 py-3 text-left">Dimensione</th>
            <th className="px-4 py-3 text-left">Data</th>
            <th className="px-4 py-3 text-left">Stato</th>
            <th className="px-4 py-3 text-center">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className={`${
              index % 2 === 0
                ? isDarkMode ? 'bg-gray-800' : 'bg-white'
                : isDarkMode ? 'bg-gray-750' : 'bg-gray-50'
            } border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <MediaIcon item={item} />
                  <span className="truncate max-w-[200px]" title={item.name}>
                    {item.name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm">
                {item.mediaType === 'video' ? 'Video' :
                 item.type.includes('pdf') ? 'PDF' :
                 item.type.includes('word') ? 'Word' :
                 item.type.includes('excel') ? 'Excel' :
                 item.type.split('/').pop()?.toUpperCase() || 'File'}
              </td>
              <td className="px-4 py-3 text-sm">
                {formatFileSize(item.size)}
              </td>
              <td className="px-4 py-3 text-sm">
                {new Date(item.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
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
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onViewDetails(item)}
                    className={`p-1.5 rounded-lg ${
                      isDarkMode 
                        ? 'hover:bg-gray-700 text-blue-400' 
                        : 'hover:bg-blue-50 text-blue-500'
                    }`}
                    title="Dettagli"
                  >
                    <Eye size={16} />
                  </button>
                  
                  <button
                    onClick={() => window.open(item.url, '_blank')}
                    className={`p-1.5 rounded-lg ${
                      isDarkMode 
                        ? 'hover:bg-gray-700 text-gray-300' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title="Scarica"
                  >
                    <Download size={16} />
                  </button>
                  
                  <button
                    onClick={() => onDelete(item)}
                    className={`p-1.5 rounded-lg ${
                      isDarkMode 
                        ? 'hover:bg-red-900 hover:bg-opacity-20 text-red-400' 
                        : 'hover:bg-red-50 text-red-500'
                    }`}
                    title="Elimina"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
