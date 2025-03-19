import { supabase } from './supabase';

interface ThumbnailOptions {
  sizes: number[];
  format: 'jpeg' | 'png' | 'webp';
  quality: number;
  timestamp?: number;
}

interface ThumbnailResult {
  urls: {
    [size: number]: string;
  };
  timestamp: number;
  format: string;
}

class ThumbnailService {
  private readonly STORAGE_BUCKET = 'thumbnails';
  private readonly DEFAULT_OPTIONS: ThumbnailOptions = {
    sizes: [120, 320, 640, 1280],
    format: 'jpeg',
    quality: 80
  };

  async generateThumbnails(
    videoId: string,
    options: Partial<ThumbnailOptions> = {}
  ): Promise<ThumbnailResult> {
    try {
      // Get video source
      const { data: video } = await supabase
        .from('admin_content_uploads')
        .select('file_url, metadata')
        .eq('id', videoId)
        .single();

      if (!video?.file_url) throw new Error('Video not found');

      // Merge options with defaults
      const mergedOptions = {
        ...this.DEFAULT_OPTIONS,
        ...options
      };

      // Create video element to extract frame
      const videoEl = document.createElement('video');
      videoEl.src = video.file_url;
      await new Promise((resolve, reject) => {
        videoEl.onloadedmetadata = resolve;
        videoEl.onerror = reject;
      });

      // Set timestamp for thumbnail
      const timestamp = options.timestamp || Math.floor(videoEl.duration / 2);
      videoEl.currentTime = timestamp;

      // Wait for frame to be ready
      await new Promise((resolve) => {
        videoEl.onseeked = resolve;
      });

      // Create canvas for frame extraction
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Generate thumbnails at different sizes
      const urls: { [size: number]: string } = {};
      for (const size of mergedOptions.sizes) {
        // Set canvas size
        canvas.width = size;
        canvas.height = Math.floor((size / videoEl.videoWidth) * videoEl.videoHeight);

        // Draw video frame
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        // Convert to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(
            (b) => resolve(b!),
            `image/${mergedOptions.format}`,
            mergedOptions.quality / 100
          );
        });

        // Upload to storage
        const fileName = `${videoId}/${size}.${mergedOptions.format}`;
        const { error: uploadError } = await supabase.storage
          .from(this.STORAGE_BUCKET)
          .upload(fileName, blob);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(this.STORAGE_BUCKET)
          .getPublicUrl(fileName);

        urls[size] = publicUrl;
      }

      // Update video metadata with thumbnail info
      const { error: updateError } = await supabase
        .from('admin_content_uploads')
        .update({
          metadata: {
            ...video.metadata,
            thumbnails: {
              urls,
              timestamp,
              format: mergedOptions.format
            }
          }
        })
        .eq('id', videoId);

      if (updateError) throw updateError;

      return {
        urls,
        timestamp,
        format: mergedOptions.format
      };
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      throw error;
    }
  }

  async deleteThumbnails(videoId: string): Promise<void> {
    try {
      // List all thumbnails for video
      const { data: files, error: listError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .list(videoId);

      if (listError) throw listError;

      if (files && files.length > 0) {
        // Delete all thumbnails
        const { error: deleteError } = await supabase.storage
          .from(this.STORAGE_BUCKET)
          .remove(files.map(file => `${videoId}/${file.name}`));

        if (deleteError) throw deleteError;
      }

      // Update video metadata
      const { error: updateError } = await supabase
        .from('admin_content_uploads')
        .update({
          metadata: supabase.sql`metadata - 'thumbnails'`
        })
        .eq('id', videoId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error deleting thumbnails:', error);
      throw error;
    }
  }

  async regenerateThumbnail(
    videoId: string,
    timestamp: number,
    options: Partial<ThumbnailOptions> = {}
  ): Promise<ThumbnailResult> {
    // Delete existing thumbnails
    await this.deleteThumbnails(videoId);

    // Generate new thumbnails
    return this.generateThumbnails(videoId, {
      ...options,
      timestamp
    });
  }
}

export const thumbnailService = new ThumbnailService();