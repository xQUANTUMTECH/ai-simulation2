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

  useEffect(() => {
    let pixelStreaming: any;

    const initializePixelStreaming = async () => {
      try {
        setIsLoading(true);

        // Carica il player di Pixel Streaming
        const { PixelStreamingPlayer } = await import('@epicgames-ps/lib-pixelstreamingfrontend-ue5.2');
        
        if (containerRef.current) {
          pixelStreaming = new PixelStreamingPlayer(containerRef.current, {
            stream: streamUrl,
            autoConnect: true,
            autoPlay: true,
            preferredCodec: 'h264',
            enableSpsMetadata: true
          });

          // Eventi del player
          pixelStreaming.addEventListener('connected', () => {
            setIsConnected(true);
            setIsLoading(false);
            onLoad?.();
          });

          pixelStreaming.addEventListener('disconnected', () => {
            setIsConnected(false);
            onError?.('Connessione persa');
          });

          pixelStreaming.addEventListener('error', (error: any) => {
            onError?.(error.message);
          });
        }
      } catch (error) {
        setIsLoading(false);
        onError?.(error instanceof Error ? error.message : 'Errore di inizializzazione');
      }
    };

    initializePixelStreaming();

    return () => {
      if (pixelStreaming) {
        pixelStreaming.disconnect();
      }
    };
  }, [streamUrl, onLoad, onError]);

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