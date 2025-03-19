import { supabase } from './supabase';

export interface VideoFormat {
  id: string;
  name: string;
  description: string;
  codec: string;
  container: string;
  resolution: string;
  bitrate: number;
  fps: number;
  quality_preset: 'low' | 'medium' | 'high' | 'ultra';
  is_default: boolean;
}

export interface VideoProcessingJob {
  id: string;
  video_id: string;
  format_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  output_url?: string;
  error_message?: string;
  processing_settings: any;
  started_at?: string;
  completed_at?: string;
}

class VideoService {
  async getFormats(): Promise<VideoFormat[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('video_formats')
      .select('*')
      .order('quality_preset', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getDefaultFormat(): Promise<VideoFormat> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('video_formats')
      .select('*')
      .eq('is_default', true)
      .single();

    if (error) throw error;
    return data;
  }

  async createProcessingJob(
    videoId: string,
    formatId: string,
    settings?: any
  ): Promise<VideoProcessingJob> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('video_processing_jobs')
      .insert({
        video_id: videoId,
        format_id: formatId,
        processing_settings: settings || {}
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getProcessingJobs(videoId: string): Promise<VideoProcessingJob[]> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await supabase
      .from('video_processing_jobs')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async updateJobProgress(
    jobId: string,
    progress: number,
    status?: VideoProcessingJob['status']
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const updates: any = { progress };
    if (status) {
      updates.status = status;
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else if (status === 'processing' && !updates.started_at) {
        updates.started_at = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from('video_processing_jobs')
      .update(updates)
      .eq('id', jobId);

    if (error) throw error;
  }

  async setJobError(jobId: string, errorMessage: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('video_processing_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) throw error;
  }

  async setJobOutput(jobId: string, outputUrl: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized');

    const { error } = await supabase
      .from('video_processing_jobs')
      .update({
        output_url: outputUrl,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) throw error;
  }
}

export const videoService = new VideoService();