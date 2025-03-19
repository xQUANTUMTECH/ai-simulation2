import React from 'react';
import { Video, FileText, Play, Edit, Trash2, Cog } from 'lucide-react';
import { MediaItem, TranscodingJob } from '../types/media';

interface MediaGridProps {
  items: MediaItem[];
  isDarkMode: boolean;
  transcodingJobs: TranscodingJob[];
  onSelectTranscoding: (job: TranscodingJob) => void;
  onSelectItem: (item: MediaItem) => void;
  onDeleteItem: (id: string) => void;
  onStartTranscoding: (id: string) => Promise<void>;
  setError: (message: string) => void;
}

/**
 * Componente che visualizza i media in formato griglia
 */
export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  isDarkMode,
  transcodingJobs,
  onSelectTranscoding,
  onSelectItem,
  onDeleteItem,
  onStartTranscoding,
  setError
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {items.map(item => (
        <div
          key={item.id}
          className={`rounded-xl border ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="aspect-video relative rounded-t-xl overflow-hidden">
            {item.file_type === 'video' ? (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <Play size={48} className="text-white opacity-50" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <FileText size={48} className="text-gray-400" />
              </div>
            )}
          </div>

          <div className="p-4">
            <h3 className="font-medium mb-1 truncate">{item.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <span>{item.file_type}</span>
              <span>•</span>
              <span>{(item.file_size / 1024 / 1024).toFixed(1)} MB</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-1">
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
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                    title="Gestisci transcoding"
                  >
                    <Cog size={16} />
                  </button>
                )}
                <button
                  onClick={() => onSelectItem(item)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MediaGrid;
