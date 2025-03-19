import React from 'react';
import { RotateCw, Smartphone, Laptop, Tv, Download, Play } from 'lucide-react';
import { TranscodingJob } from '../types/media';
import SimpleModal from './SimpleModal';

interface TranscodingModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: TranscodingJob | null;
  isDarkMode: boolean;
  onRestartTranscoding: (videoId: string) => Promise<void>;
  setError: (message: string) => void;
}

/**
 * Componente che mostra i dettagli di un job di transcoding
 */
export const TranscodingModal: React.FC<TranscodingModalProps> = ({
  isOpen,
  onClose,
  job,
  isDarkMode,
  onRestartTranscoding,
  setError
}) => {
  if (!isOpen || !job) return null;

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Video Transcoding Status"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-lg font-medium">Job ID: {job.jobId}</h3>
            <p className="text-gray-400">Video ID: {job.videoId}</p>
          </div>
          
          <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            job.status === 'completed'
              ? 'bg-green-500 bg-opacity-10 text-green-500'
              : job.status === 'processing'
              ? 'bg-yellow-500 bg-opacity-10 text-yellow-500'
              : job.status === 'queued'
              ? 'bg-blue-500 bg-opacity-10 text-blue-500'
              : 'bg-red-500 bg-opacity-10 text-red-500'
          }`}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </div>
        </div>
        
        {job.status === 'processing' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso transcoding</span>
              <span>{job.progress}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full">
              <div
                className="h-2 bg-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>
        )}
        
        {job.error && (
          <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg">
            <p className="font-medium text-red-500">Error:</p>
            <p className="text-gray-300">{job.error}</p>
          </div>
        )}
        
        {job.status === 'completed' && job.variants && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Video Variants</h3>
            
            <div className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                    <tr>
                      <th className="text-left px-6 py-3">Quality</th>
                      <th className="text-left px-6 py-3">Resolution</th>
                      <th className="text-left px-6 py-3">Bitrate</th>
                      <th className="text-left px-6 py-3">Size</th>
                      <th className="text-right px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {job.variants.map((variant) => (
                      <tr key={variant.quality} className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {variant.quality === 'low' ? (
                              <Smartphone size={20} className="text-blue-500" />
                            ) : variant.quality === 'medium' ? (
                              <Laptop size={20} className="text-green-500" />
                            ) : (
                              <Tv size={20} className="text-purple-500" />
                            )}
                            <span className="font-medium capitalize">{variant.quality}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">{variant.resolution}</td>
                        <td className="px-6 py-4">{variant.bitrate}</td>
                        <td className="px-6 py-4">
                          {(variant.size / 1024 / 1024).toFixed(1)} MB
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={variant.mp4_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                              title="Download MP4"
                            >
                              <Download size={16} />
                            </a>
                            <a
                              href={variant.hls_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                              title="Play HLS Stream"
                            >
                              <Play size={16} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {job.master_playlist_url && (
              <div className="p-4 rounded-lg bg-gray-700">
                <p className="mb-2 font-medium">Master Playlist URL (Adaptive Streaming):</p>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={job.master_playlist_url} 
                    readOnly
                    className="flex-1 px-3 py-2 rounded bg-gray-800 text-sm overflow-x-auto"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(job.master_playlist_url || '');
                    }}
                    className="p-2 hover:bg-gray-600 rounded transition-colors"
                    title="Copy URL"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                </div>
              </div>
            )}
            
            <div className="p-4 rounded-lg bg-blue-500 bg-opacity-10">
              <p className="font-medium text-blue-400 mb-2">Come utilizzare:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                <li>Utilizza l'URL HLS Master Playlist per lo streaming adattivo</li>
                <li>L'HLS si adatta automaticamente alla larghezza di banda dell'utente</li>
                <li>Utilizza formati MP4 diretti per download specifici</li>
                <li>La versione "high" è ottimale per visualizzazione su desktop</li>
                <li>La versione "low" è ottimizzata per dispositivi mobili</li>
              </ul>
            </div>
          </div>
        )}
        
        <div className="flex justify-end gap-4">
          {(job.status === 'error' || job.status === 'completed') && (
            <button
              onClick={async () => {
                try {
                  await onRestartTranscoding(job.videoId);
                  onClose();
                } catch (err) {
                  console.error('Error restarting transcoding:', err);
                  setError(err instanceof Error ? err.message : 'Error restarting transcoding');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RotateCw size={16} />
              {job.status === 'error' ? 'Retry Transcoding' : 'Re-Transcode'}
            </button>
          )}
          
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </SimpleModal>
  );
};

export default TranscodingModal;
