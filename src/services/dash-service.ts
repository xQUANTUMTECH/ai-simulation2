import { supabase } from './supabase';
import { videoService } from './video-service';

interface DASHOptions {
  segmentDuration: number;
  targetBitrates: number[];
  keyframeInterval: number;
  manifestType: 'static' | 'dynamic';
  encryption?: {
    method: 'cenc' | 'cbcs';
    key: string;
    kid: string;
    pssh?: string[];
  };
}

interface DASHOutput {
  manifestUrl: string;
  segmentBaseUrl: string;
  representations: Array<{
    id: string;
    bitrate: number;
    resolution: string;
    codecs: string;
  }>;
}

class DASHService {
  private readonly STORAGE_BUCKET = 'video-streaming';
  private readonly DEFAULT_OPTIONS: DASHOptions = {
    segmentDuration: 4,
    targetBitrates: [400, 800, 1200, 2500, 4000], // kbps
    keyframeInterval: 48,
    manifestType: 'static'
  };

  async createDASHStream(
    videoId: string,
    options: Partial<DASHOptions> = {}
  ): Promise<DASHOutput> {
    try {
      // Get video source
      const { data: video } = await supabase
        .from('admin_content_uploads')
        .select('file_url, metadata')
        .eq('id', videoId)
        .single();

      if (!video?.file_url) throw new Error('Video not found');

      // Merge options
      const mergedOptions = {
        ...this.DEFAULT_OPTIONS,
        ...options
      };

      // Create output directory
      const outputDir = `${videoId}/dash`;

      // Generate representations
      const representations = await Promise.all(
        mergedOptions.targetBitrates.map(bitrate =>
          this.createRepresentation(video.file_url, outputDir, bitrate, mergedOptions)
        )
      );

      // Generate manifest
      const manifest = this.generateManifest(representations, mergedOptions);

      // Upload manifest
      const manifestFileName = `${outputDir}/manifest.mpd`;
      const { error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(manifestFileName, manifest, {
          contentType: 'application/dash+xml'
        });

      if (uploadError) throw uploadError;

      // Get public URLs
      const { data: { publicUrl: baseUrl } } = supabase.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(outputDir);

      const { data: { publicUrl: manifestUrl } } = supabase.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(manifestFileName);

      // Update video metadata
      await supabase
        .from('admin_content_uploads')
        .update({
          metadata: {
            ...video.metadata,
            streaming: {
              ...video.metadata?.streaming,
              dash: {
                manifestUrl,
                segmentBaseUrl: baseUrl,
                representations
              }
            }
          }
        })
        .eq('id', videoId);

      return {
        manifestUrl,
        segmentBaseUrl: baseUrl,
        representations
      };
    } catch (error) {
      console.error('Error creating DASH stream:', error);
      throw error;
    }
  }

  private async createRepresentation(
    sourceUrl: string,
    outputDir: string,
    bitrate: number,
    options: DASHOptions
  ): Promise<{
    id: string;
    bitrate: number;
    resolution: string;
    codecs: string;
  }> {
    // This would use FFmpeg to:
    // 1. Transcode video to target bitrate
    // 2. Split into segments
    // 3. Generate initialization segment
    // 4. Upload segments

    // For now, return mock data
    return {
      id: `rep_${bitrate}`,
      bitrate,
      resolution: this.getResolutionForBitrate(bitrate),
      codecs: 'avc1.4d401f,mp4a.40.2'
    };
  }

  private generateManifest(
    representations: Array<{
      id: string;
      bitrate: number;
      resolution: string;
      codecs: string;
    }>,
    options: DASHOptions
  ): string {
    const duration = 300; // Example duration in seconds
    const now = new Date().toISOString();

    let manifest = `<?xml version="1.0" encoding="utf-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011"
     profiles="urn:mpeg:dash:profile:isoff-live:2011"
     type="${options.manifestType === 'static' ? 'static' : 'dynamic'}"
     minBufferTime="PT4S"
     mediaPresentationDuration="PT${duration}S"
     maxSegmentDuration="PT${options.segmentDuration}S"
     availabilityStartTime="${now}">
  <Period id="1" start="PT0S">
    <AdaptationSet
      mimeType="video/mp4"
      segmentAlignment="true"
      startWithSAP="1"
      maxWidth="${this.getMaxResolution(representations).width}"
      maxHeight="${this.getMaxResolution(representations).height}"
      maxFrameRate="30"
      par="16:9">`;

    // Add video representations
    representations.forEach(rep => {
      const [width, height] = rep.resolution.split('x').map(Number);
      manifest += `
      <Representation
        id="${rep.id}"
        bandwidth="${rep.bitrate * 1000}"
        width="${width}"
        height="${height}"
        frameRate="30"
        codecs="${rep.codecs}">
        <SegmentTemplate
          timescale="1000"
          duration="${options.segmentDuration * 1000}"
          initialization="$RepresentationID$/init.mp4"
          media="$RepresentationID$/$Number$.m4s"
          startNumber="1" />
      </Representation>`;
    });

    manifest += `
    </AdaptationSet>
  </Period>
</MPD>`;

    return manifest;
  }

  private getResolutionForBitrate(bitrate: number): string {
    // Simple mapping of bitrates to resolutions
    if (bitrate <= 400) return '640x360';
    if (bitrate <= 800) return '854x480';
    if (bitrate <= 1200) return '1280x720';
    if (bitrate <= 2500) return '1920x1080';
    return '2560x1440';
  }

  private getMaxResolution(representations: Array<{ resolution: string }>): {
    width: number;
    height: number;
  } {
    let maxWidth = 0;
    let maxHeight = 0;

    representations.forEach(rep => {
      const [width, height] = rep.resolution.split('x').map(Number);
      maxWidth = Math.max(maxWidth, width);
      maxHeight = Math.max(maxHeight, height);
    });

    return { width: maxWidth, height: maxHeight };
  }

  async deleteDASHStream(videoId: string): Promise<void> {
    try {
      // List all files in the DASH directory
      const { data: files, error: listError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .list(`${videoId}/dash`);

      if (listError) throw listError;

      if (files && files.length > 0) {
        // Delete all files
        const { error: deleteError } = await supabase.storage
          .from(this.STORAGE_BUCKET)
          .remove(files.map(file => `${videoId}/dash/${file.name}`));

        if (deleteError) throw deleteError;
      }

      // Update video metadata
      await supabase
        .from('admin_content_uploads')
        .update({
          metadata: supabase.sql`metadata #- '{streaming,dash}'`
        })
        .eq('id', videoId);
    } catch (error) {
      console.error('Error deleting DASH stream:', error);
      throw error;
    }
  }

  async regenerateDASHStream(
    videoId: string,
    options: Partial<DASHOptions> = {}
  ): Promise<DASHOutput> {
    await this.deleteDASHStream(videoId);
    return this.createDASHStream(videoId, options);
  }
}

export const dashService = new DASHService();