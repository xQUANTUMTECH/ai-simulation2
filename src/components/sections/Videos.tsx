import React, { useState } from 'react';
import { Play, Pause, Clock, FileText, Plus } from 'lucide-react';
import { VideoDetails } from './VideoDetails';

interface VideosProps {
  isDarkMode: boolean;
}

export function Videos({ isDarkMode }: VideosProps) {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [videos] = useState([
    {
      id: '1',
      title: 'Introduzione alle Emergenze Cardiache',
      thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=400&fit=crop',
      duration: '45:30',
      progress: 80,
      documents: 3,
      course: 'Gestione Emergenze Mediche'
    },
    {
      id: '2',
      title: 'Protocolli di Primo Intervento',
      thumbnail: 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=800&h=400&fit=crop',
      duration: '32:15',
      progress: 0,
      documents: 2,
      course: 'Gestione Emergenze Mediche'
    }
  ]);

  return (
    <div className="space-y-6">
      {selectedVideo ? (
        <VideoDetails
          isDarkMode={isDarkMode}
          onBack={() => setSelectedVideo(null)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Video</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
              <Plus size={20} />
              Nuovo Video
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map(video => (
              <div 
                key={video.id}
                className={`rounded-xl border overflow-hidden ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                } cursor-pointer`}
                onClick={() => setSelectedVideo(video.id)}
              >
                <div className="relative">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    className="w-full h-48 object-cover"
                  />
                  <button className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                    {video.progress > 0 ? <Play size={48} className="text-white" /> : <Play size={48} className="text-white" />}
                  </button>
                  {video.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                      <div 
                        className="h-1 bg-purple-500 transition-all"
                        style={{ width: `${video.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-semibold mb-2">{video.title}</h3>
                  <p className="text-sm text-gray-400 mb-4">{video.course}</p>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-gray-400" />
                        <span>{video.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        <span>{video.documents} doc</span>
                      </div>
                    </div>
                    {video.progress > 0 && (
                      <span className="text-purple-500">{video.progress}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}