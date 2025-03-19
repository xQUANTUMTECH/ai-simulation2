import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  Settings, MessageSquare, BookmarkPlus, AlertTriangle, RefreshCw,
  Clock, Download
} from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  title: string;
  duration: number;
  onTimeUpdate?: (time: number) => void;
  onComplete?: () => void;
  onSkipAttempt?: () => void;
  isDarkMode?: boolean;
  initialProgress?: number;
}

export function VideoPlayer({ 
  src, 
  title,
  duration,
  onTimeUpdate,
  onComplete,
  onSkipAttempt,
  isDarkMode = true,
  initialProgress = 0
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [notes, setNotes] = useState<Array<{ time: number; text: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSeekTime, setLastSeekTime] = useState<number>(0);
  const [seekCount, setSeekCount] = useState(0);
  const controlsTimeoutRef = useRef<number>();
  const retryCount = useRef(0);
  const maxRetries = 3;
  const MAX_ALLOWED_SEEKS = 3;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleLoadedData = () => {
      setIsLoading(false);
      retryCount.current = 0;
    };

    const handleError = (e: Event) => {
      const mediaError = (e.target as HTMLVideoElement).error;
      console.error('Video error:', mediaError);
      
      let errorMessage = 'Errore durante la riproduzione del video';
      if (mediaError) {
        switch (mediaError.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'La riproduzione è stata interrotta';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Si è verificato un errore di rete';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            retryCount.current++;
            errorMessage = 'Impossibile decodificare il video';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Formato video non supportato';
            break;
        }
      }

      // Auto-retry for network/decode errors
      if (mediaError?.code === MediaError.MEDIA_ERR_NETWORK ||
          mediaError?.code === MediaError.MEDIA_ERR_DECODE) {
        if (retryCount.current < maxRetries) {
          setTimeout(() => {
            if (video) {
              video.load();
              video.play().catch(() => {});
            }
          }, 1000 * Math.pow(2, retryCount.current)); // Exponential backoff
          return;
        }
      }
      
      setError(errorMessage);
      setIsPlaying(false);
      setIsLoading(false);
    };

    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadeddata', handleLoadedData);

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Handle seeking attempts
    const handleSeeking = () => {
      const now = Date.now();
      if (now - lastSeekTime < 5000) { // Within 5 seconds
        setSeekCount(prev => prev + 1);
        if (seekCount + 1 >= MAX_ALLOWED_SEEKS) {
          onSkipAttempt?.();
          video.currentTime = currentTime; // Prevent seeking
        }
      } else {
        setSeekCount(1);
      }
      setLastSeekTime(now);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);

      // Check if video is complete
      if (video.currentTime >= video.duration * 0.9) {
        onComplete?.();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeking', handleSeeking);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeking', handleSeeking);
    };
  }, [initialProgress, onTimeUpdate, onComplete, onSkipAttempt, lastSeekTime, seekCount, currentTime]);

  useEffect(() => {
    const hideControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = window.setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    hideControlsTimeout();

    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, showControls]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;
    if (isFinite(newTime) && newTime >= 0) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleAddNote = () => {
    if (currentNote.trim()) {
      setNotes(prev => [...prev, { time: currentTime, text: currentNote }]);
      setCurrentNote('');
      setShowNoteInput(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="relative group"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => !error && isPlaying && setShowControls(false)}
    >
      {isLoading ? (
        <div className="w-full aspect-video rounded-lg bg-gray-900 flex flex-col items-center justify-center">
          <RefreshCw size={48} className="text-purple-500 animate-spin mb-4" />
          <p className="text-gray-400">Caricamento video...</p>
        </div>
      ) : error ? (
        <div className="w-full aspect-video rounded-lg bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Errore Video</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => {
              retryCount.current = 0;
              setError(null);
              setIsLoading(true);
              if (videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(() => {});
              }
            }}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <div className="flex items-center gap-2">
              <RefreshCw size={16} />
              <span>Riprova</span>
            </div>
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={src}
          preload="auto"
          playsInline
          className="w-full rounded-lg bg-black"
          onClick={togglePlay}
        />
      )}

      {/* Controls Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/50 to-transparent transition-opacity duration-300 pointer-events-none ${
        showControls || error ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Title */}
        <div className="absolute top-4 left-4 right-4">
          <h3 className="text-white font-medium">{title}</h3>
        </div>

        {!error && (
          <button
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-purple-500 bg-opacity-80 flex items-center justify-center hover:bg-opacity-100 transition-colors pointer-events-auto"
          >
            {isPlaying ? <Pause size={32} /> : <Play size={32} />}
          </button>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 pointer-events-auto">
          {/* Progress Bar */}
          <div 
            ref={progressRef}
            className="h-1 bg-gray-600 rounded-full cursor-pointer"
            onClick={!error ? handleProgressClick : undefined}
          >
            <div 
              className="h-1 bg-purple-500 rounded-full relative"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-500 rounded-full" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} disabled={!!error}>
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>

              <div className="flex items-center gap-2">
                <button onClick={toggleMute} disabled={!!error}>
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  disabled={!!error}
                  className="w-20"
                />
              </div>

              <div className="text-sm">
                <span>{formatTime(currentTime)}</span>
                <span className="mx-1">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowNoteInput(!showNoteInput)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <BookmarkPlus size={20} />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                <Settings size={20} />
              </button>
              <button 
                onClick={toggleFullscreen}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Note Input */}
      {showNoteInput && (
        <div className="absolute bottom-20 left-4 right-4 p-4 bg-gray-800 rounded-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="Aggiungi una nota..."
              className="flex-1 px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500"
            />
            <button
              onClick={handleAddNote}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Salva
            </button>
          </div>
        </div>
      )}
    </div>
  );
}