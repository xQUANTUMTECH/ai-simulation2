import { supabase } from './supabase';

export interface RecordingSegment {
  id: string;
  recording_id: string;
  start_time: number;
  end_time: number;
  type: 'video' | 'audio' | 'screen' | 'events';
  data: Blob;
}

export interface Recording {
  id: string;
  simulation_id: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  size?: number;
  status: 'recording' | 'processing' | 'ready' | 'error';
  metadata?: {
    participants: string[];
    events: Array<{
      time: number;
      type: string;
      data: any;
    }>;
  };
}

class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private currentRecordingId: string | null = null;

  async startRecording(simulationId: string, stream: MediaStream): Promise<void> {
    try {
      // Create recording entry
      const { data: recording, error } = await supabase?.from('recordings').insert({
        simulation_id: simulationId,
        start_time: new Date().toISOString(),
        status: 'recording'
      }).select().single();

      if (error) throw error;
      this.currentRecordingId = recording.id;

      // Initialize MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      this.startTime = Date.now();
      this.recordedChunks = [];

      // Handle data available
      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
          await this.saveSegment({
            recording_id: this.currentRecordingId!,
            start_time: this.startTime,
            end_time: Date.now(),
            type: 'video',
            data: event.data
          });
        }
      };

      // Start recording
      this.mediaRecorder.start(10000); // Save in 10-second segments
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.currentRecordingId) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          // Update recording status
          const { error } = await supabase?.from('recordings').update({
            end_time: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            status: 'processing'
          }).eq('id', this.currentRecordingId!);

          if (error) throw error;

          // Process recording
          await this.processRecording(this.currentRecordingId!);

          resolve(this.currentRecordingId!);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  private async saveSegment(segment: Omit<RecordingSegment, 'id'>): Promise<void> {
    try {
      const fileName = `${segment.recording_id}/${Date.now()}.webm`;
      
      // Upload to storage
      const { error: uploadError } = await supabase?.storage
        .from('recordings')
        .upload(fileName, segment.data);

      if (uploadError) throw uploadError;

      // Save segment metadata
      const { error } = await supabase?.from('recording_segments').insert({
        recording_id: segment.recording_id,
        start_time: segment.start_time,
        end_time: segment.end_time,
        type: segment.type,
        file_path: fileName
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving segment:', error);
      throw error;
    }
  }

  private async processRecording(recordingId: string): Promise<void> {
    try {
      // Get all segments
      const { data: segments, error } = await supabase?.from('recording_segments')
        .select('*')
        .eq('recording_id', recordingId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Combine segments and generate final video
      const finalBlob = await this.combineSegments(segments);

      // Upload final video
      const fileName = `${recordingId}/final.webm`;
      const { error: uploadError } = await supabase?.storage
        .from('recordings')
        .upload(fileName, finalBlob);

      if (uploadError) throw uploadError;

      // Update recording status
      const { error: updateError } = await supabase?.from('recordings').update({
        status: 'ready',
        size: finalBlob.size
      }).eq('id', recordingId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error processing recording:', error);
      
      // Update recording status to error
      await supabase?.from('recordings').update({
        status: 'error'
      }).eq('id', recordingId);

      throw error;
    }
  }

  private async combineSegments(segments: RecordingSegment[]): Promise<Blob> {
    // Combine video segments
    const chunks = await Promise.all(
      segments.map(async (segment) => {
        const { data } = await supabase?.storage
          .from('recordings')
          .download(segment.data.toString());
        return data;
      })
    );

    return new Blob(chunks, { type: 'video/webm' });
  }

  async getRecording(recordingId: string): Promise<Recording> {
    const { data, error } = await supabase?.from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single();

    if (error) throw error;
    return data;
  }

  async getRecordingUrl(recordingId: string): Promise<string> {
    const { data } = await supabase?.storage
      .from('recordings')
      .getPublicUrl(`${recordingId}/final.webm`);

    return data.publicUrl;
  }
}

export const recordingService = new RecordingService();