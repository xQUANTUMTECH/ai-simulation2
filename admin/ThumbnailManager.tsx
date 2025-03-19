import React, { useState, useEffect } from 'react';
import { 
  Image, RefreshCw, AlertTriangle, Clock, Download,
  Play, Pause, ChevronRight, ChevronLeft, Plus
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface ThumbnailManagerProps {
  videoId: string;
  videoUrl: string;
  onThumbnailGenerated?: (thumbnailUrl: string) => void;
  isDarkMode?: boolean;
}

interface ThumbnailJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: number;
  output_urls: Record<string, string>;
  error_message?: string;
}

export function ThumbnailManager({ 
  videoId, 
  videoUrl,
  onThumbnailGenerated,
  isDarkMode = true 
}: ThumbnailManagerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ThumbnailJob[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>('320');

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 5000); // Poll for updates
    return () => clearInterval(interval);
  }, [videoId]);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('thumbnail_jobs')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error loading thumbnail jobs:', err);
    }
  };

  const handleTimeChange = (newTime: number) => {
    setCurrentTime(Math.max(0, Math.min(newTime, duration)));
  };

  const generateThumbnail = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // Call RPC function to queue thumbnail generation
      const { data, error } = await supabase.rpc(
        'queue_thumbnail_generation',
        { 
          video_id: videoId,
          timestamp: Math.floor(currentTime)
        }
      );

      if (error) throw error;

      // Wait for job to complete
      const jobId = data;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        const { data: job, error: jobError } = await supabase
          .from('thumbnail_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (jobError) throw jobError;

        if (job.status === 'completed') {
          onThumbnailGenerated?.(job.output_urls[selectedSize]);
          await loadJobs();
          break;
        } else if (job.status === 'failed') {
          throw new Error(job.error_message || 'Thumbnail generation failed');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Thumbnail generation timed out');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating thumbnail');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Video Preview */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          src={videoUrl}
          className="w-full h-full"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          currentTime={currentTime}
        />
        
        {/* Time Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleTimeChange(currentTime - 1)}
              className="p-2 bg-black bg-opacity-50 rounded-full hover:bg-opacity-75 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={(e) => handleTimeChange(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              onClick={() => handleTimeChange(currentTime + 1)}
              className="p-2 bg-black bg-opacity-50 rounded-full hover:bg-opacity-75 transition-colors"
            >
              <ChevronRight size={20} />
            </button>

            <span className="text-sm">
              {Math.floor(currentTime / 60)}:
              {Math.floor(currentTime % 60).toString().padStart(2, '0')} / 
              {Math.floor(duration / 60)}:
              {Math.floor(duration % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <select
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
        >
          <option value="120">120px</option>
          <option value="320">320px</option>
          <option value="640">640px</option>
          <option value="1280">1280px</option>
        </select>

        <button
          onClick={generateThumbnail}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="animate-spin" size={20} />
              Generating...
            </>
          ) : (
            <>
              <Plus size={20} />
              Generate Thumbnail
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-center gap-2 text-red-500">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      {/* Thumbnails Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {jobs.map(job => (
          <div
            key={job.id}
            className={`relative rounded-lg overflow-hidden border ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}
          >
            {job.status === 'completed' ? (
              <>
                <img
                  src={job.output_urls[selectedSize]}
                  alt={`Thumbnail at ${job.timestamp}s`}
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50 text-white text-sm">
                  {Math.floor(job.timestamp / 60)}:
                  {Math.floor(job.timestamp % 60).toString().padStart(2, '0')}
                </div>
                <button
                  onClick={() => window.open(job.output_urls[selectedSize], '_blank')}
                  className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 rounded-full hover:bg-opacity-75 transition-colors"
                >
                  <Download size={16} className="text-white" />
                </button>
              </>
            ) : job.status === 'failed' ? (
              <div className="aspect-video flex items-center justify-center bg-red-500 bg-opacity-10">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center bg-gray-800">
                <RefreshCw size={24} className="text-gray-400 animate-spin" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}