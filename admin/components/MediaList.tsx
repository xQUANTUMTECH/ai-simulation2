import React from 'react';
import { Video, FileText, Edit, Trash2, Cog } from 'lucide-react';
import { MediaItem, TranscodingJob } from '../types/media';

interface MediaListProps {
  items: MediaItem[];
  isDarkMode: boolean;
  transcodingJobs: TranscodingJob[];
  selectedItems: string[];
  onToggleSelectItem: (id: string, selected: boolean) => void;
  onToggleSelectAll: (selected: boolean) => void;
  onSelectTranscoding: (job: TranscodingJob) => void;
  onSelectItem: (item: MediaItem) => void;
  onDeleteItem: (id: string) => void;
  onStartTranscoding: (id: string) => Promise<void>;
  setError: (message: string) => void;
}

/**
 * Componente che visualizza i media in formato tabella
 */
export const MediaList: React.FC<MediaListProps> = ({
  items,
  isDarkMode,
  transcodingJobs,
  selectedItems,
  onToggleSelectItem,
  onToggleSelectAll,
  onSelectTranscoding,
  onSelectItem,
  onDeleteItem,
  onStartTranscoding,
  setError
}) => {
  return (
    <div className={`rounded-xl border ${
      isDarkMode ? 'border-gray-700' : 'border-gray-200'
    }`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
            <tr>
              <th className="w-8 px-6 py-3">
                <input
                  type="checkbox"
                  checked={selectedItems.length === items.length && items.length > 0}
                  onChange={(e) => {
                    onToggleSelectAll(e.target.checked);
                  }}
                  className="rounded border-gray-600"
                />
              </th>
              <th className="text-left px-6 py-3">Name</th>
              <th className="text-left px-6 py-3">Type</th>
              <th className="text-left px-6 py-3">Size</th>
              <th className="text-left px-6 py-3">Created</th>
              <th className="text-left px-6 py-3">Status</th>
              <th className="text-right px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {items.map(item => (
              <tr key={item.id} className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) => {
                      onToggleSelectItem(item.id, e.target.checked);
                    }}
                    className="rounded border-gray-600"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {item.file_type === 'video' ? (
                      <Video size={20} className="text-blue-500" />
                    ) : (
                      <FileText size={20} className="text-green-500" />
                    )}
                    <span className="font-medium">{item.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4">{item.file_type}</td>
                <td className="px-6 py-4">
                  {(item.file_size / 1024 / 1024).toFixed(1)} MB
                </td>
                <td className="px-6 py-4">
                  {new Date(item.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.status === 'ready'
                        ? 'bg-green-500 bg-opacity-10 text-green-500'
                        : item.status === 'processing'
                        ? 'bg-yellow-500 bg-opacity-10 text-yellow-500'
                        : 'bg-red-500 bg-opacity-10 text-red-500'
                    }`}>
                      {item.status}
                    </span>
                    
                    {item.file_type === 'video' && item.transcoding_completed && (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-500 bg-opacity-10 text-blue-500">
                        Transcoded
                      </span>
                    )}
                    
                    {item.file_type === 'video' && item.transcoding_started && !item.transcoding_completed && (
                      <span className="px-2 py-1 rounded-full text-xs bg-yellow-500 bg-opacity-10 text-yellow-500">
                        Transcoding
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {item.file_type === 'video' && (
                      <button
                        onClick={async () => {
                          try {
                            // Cerca job di transcoding esistenti per questo video
                            const videoJobs = transcodingJobs.filter(job => job.videoId === item.id);
                            
                            if (videoJobs.length > 0) {
                              // Mostra info sul job di transcoding più recente
                              onSelectTranscoding(videoJobs[0]);
                            } else if (item.transcoding_job_id) {
                              // Recupera le informazioni sul job
                              const response = await fetch(`/api/media/transcoding/${item.transcoding_job_id}`);
                              if (response.ok) {
                                const jobData = await response.json();
                                onSelectTranscoding(jobData);
                              } else {
                                throw new Error('Failed to load transcoding job');
                              }
                            } else if (!item.transcoding_started) {
                              // Avvia nuovo job di transcoding
                              await onStartTranscoding(item.id);
                            }
                          } catch (err) {
                            console.error('Error with transcoding job:', err);
                            setError(err instanceof Error ? err.message : 'Error with transcoding');
                          }
                        }}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-blue-400"
                        title="Gestisci transcoding"
                      >
                        <Cog size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => onSelectItem(item)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      title="Modifica"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-red-400"
                      title="Elimina"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MediaList;
