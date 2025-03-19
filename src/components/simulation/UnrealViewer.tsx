import React, { useEffect, useRef, useState } from 'react';
import { Play, Maximize2, Volume2, VolumeX, Loader2 } from 'lucide-react';

interface UnrealViewerProps {
  streamUrl: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
  isDarkMode?: boolean;
}

export function UnrealViewer({ streamUrl, onLoad, onError, isDarkMode = true }: UnrealViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Placeholder for Unreal Engine integration
  useEffect(() => {
    // Here we'll integrate with Unreal Engine's native web player
    // For now, simulate loading and connection
    const timer = setTimeout(() => {
      setIsLoading(false);
      setIsConnected(true);
      onLoad?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onLoad]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    const video = containerRef.current?.querySelector('video');
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  return (
    <div className="relative w-full h-full">
      <div 
        ref={containerRef}
        className={`w-full h-full rounded-lg overflow-hidden ${
          isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
        }`}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        )}
      </div>

      {/* Controlli */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between px-4 py-2 bg-black bg-opacity-50 rounded-lg">
        <div className="flex items-center gap-4">
          {!isConnected ? (
            <button
              onClick={() => window.location.reload()}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Play className="w-5 h-5" />
            </button>
          ) : null}
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        </div>

        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}