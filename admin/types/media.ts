export interface MediaItem {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  status: string;
  metadata: {
    originalName: string;
    lastModified: string;
  };
  created_at: string;
  updated_at: string;
  transcoding_completed?: boolean;
  transcoding_started?: boolean;
  transcoding_job_id?: string;
  master_playlist_url?: string;
  variants?: any[];
}

export interface TranscodingJob {
  jobId: string;
  videoId: string;
  status: 'queued' | 'processing' | 'completed' | 'error' | 'restarted';
  progress: number;
  variants: {
    quality: string;
    resolution: string;
    bitrate: string;
    mp4_url: string;
    hls_url: string;
    size: number;
  }[];
  master_playlist_url?: string;
  error?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}
