import { vi, describe, it, expect, beforeEach } from 'vitest';
import { videoService, VideoFormat, VideoProcessingJob } from '../../src/services/video-service';

// Mock di supabase con @ts-ignore per non far considerare gli errori di tipo nei test
vi.mock('../../src/services/supabase', () => {
  return {
    // @ts-ignore - Ignoriamo problemi di tipo nei test
    supabase: {
      from: vi.fn()
    }
  };
});

// Importiamo supabase dopo il mock
import { supabase } from '../../src/services/supabase';


describe('VideoService', () => {
  const mockVideoFormats: VideoFormat[] = [
    {
      id: 'format-1',
      name: 'HD',
      description: 'High Definition',
      codec: 'h264',
      container: 'mp4',
      resolution: '1920x1080',
      bitrate: 5000000,
      fps: 30,
      quality_preset: 'high',
      is_default: true
    },
    {
      id: 'format-2',
      name: 'SD',
      description: 'Standard Definition',
      codec: 'h264',
      container: 'mp4',
      resolution: '1280x720',
      bitrate: 2500000,
      fps: 30,
      quality_preset: 'medium',
      is_default: false
    }
  ];

  const mockProcessingJob: VideoProcessingJob = {
    id: 'job-1',
    video_id: 'video-1',
    format_id: 'format-1',
    status: 'pending',
    progress: 0,
    processing_settings: { quality: 'high' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFormats', () => {
    it('Dovrebbe recuperare i formati video disponibili', async () => {
      // Mock della risposta da Supabase
      const mockFrom = vi.mocked(supabase.from);
      const mockResponse = { data: mockVideoFormats, error: null };
      
      // @ts-ignore - Ignoriamo problemi di tipo nei test
      mockFrom.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(mockResponse)
        })
      }));

      // Chiamiamo il metodo che stiamo testando
      const result = await videoService.getFormats();

      // Verifichiamo che la query sia corretta
      expect(mockFrom).toHaveBeenCalledWith('video_formats');
      expect(result).toEqual(mockVideoFormats);
    });

    it('Dovrebbe gestire gli errori', async () => {
      // Mock di un errore da Supabase
      const mockFrom = vi.mocked(supabase.from);
      const mockError = new Error('Database error');
      
      // @ts-ignore - Ignoriamo problemi di tipo nei test
      mockFrom.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: mockError })
        })
      }));

      // Verifichiamo che l'errore venga propagato
      await expect(videoService.getFormats()).rejects.toThrow(mockError);
    });
  });

  describe('getDefaultFormat', () => {
    it('Dovrebbe recuperare il formato predefinito', async () => {
      // Mock della risposta da Supabase
      const mockFrom = vi.mocked(supabase.from);
      const mockDefaultFormat = mockVideoFormats[0]; // HD è quello predefinito
      
      // @ts-ignore - Ignoriamo problemi di tipo nei test
      mockFrom.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ 
              data: mockDefaultFormat, 
              error: null 
            })
          })
        })
      }));

      // Chiamiamo il metodo che stiamo testando
      const result = await videoService.getDefaultFormat();

      // Verifichiamo che la query sia corretta
      expect(mockFrom).toHaveBeenCalledWith('video_formats');
      expect(result).toEqual(mockDefaultFormat);
    });
  });

  describe('createProcessingJob', () => {
    it('Dovrebbe creare un nuovo job di elaborazione', async () => {
      // Mock della risposta da Supabase
      const mockFrom = vi.mocked(supabase.from);
      
      // @ts-ignore - Ignoriamo problemi di tipo nei test
      mockFrom.mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProcessingJob,
              error: null
            })
          })
        })
      }));

      // Chiamiamo il metodo che stiamo testando
      const result = await videoService.createProcessingJob('video-1', 'format-1', { quality: 'high' });

      // Verifichiamo che la query sia corretta
      expect(mockFrom).toHaveBeenCalledWith('video_processing_jobs');
      expect(result).toEqual(mockProcessingJob);
    });
  });

  describe('getProcessingJobs', () => {
    it('Dovrebbe recuperare i job per un video specifico', async () => {
      // Mock della risposta da Supabase
      const mockFrom = vi.mocked(supabase.from);
      const mockJobs = [mockProcessingJob];
      
      // @ts-ignore - Ignoriamo problemi di tipo nei test
      mockFrom.mockImplementationOnce(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockJobs,
              error: null
            })
          })
        })
      }));

      // Chiamiamo il metodo che stiamo testando
      const result = await videoService.getProcessingJobs('video-1');

      // Verifichiamo che la query sia corretta
      expect(mockFrom).toHaveBeenCalledWith('video_processing_jobs');
      expect(result).toEqual(mockJobs);
    });
  });

  describe('updateJobProgress', () => {
    it('Dovrebbe aggiornare il progresso di un job', async () => {
      // Mock della risposta da Supabase
      const mockFrom = vi.mocked(supabase.from);
      
      // @ts-ignore - Ignoriamo problemi di tipo nei test
      mockFrom.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      }));

      // Chiamiamo il metodo che stiamo testando
      await videoService.updateJobProgress('job-1', 50, 'processing');

      // Verifichiamo che la query sia corretta
      expect(mockFrom).toHaveBeenCalledWith('video_processing_jobs');
    });
  });

  describe('setJobError', () => {
    it('Dovrebbe impostare un errore in un job', async () => {
      // Mock della risposta da Supabase
      const mockFrom = vi.mocked(supabase.from);
      
      // @ts-ignore - Ignoriamo problemi di tipo nei test
      mockFrom.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      }));

      // Chiamiamo il metodo che stiamo testando
      await videoService.setJobError('job-1', 'Errore di elaborazione');

      // Verifichiamo che la query sia corretta
      expect(mockFrom).toHaveBeenCalledWith('video_processing_jobs');
    });
  });

  describe('setJobOutput', () => {
    it('Dovrebbe impostare l\'URL di output per un job completato', async () => {
      // Mock della risposta da Supabase
      const mockFrom = vi.mocked(supabase.from);
      
      // @ts-ignore - Ignoriamo problemi di tipo nei test
      mockFrom.mockImplementationOnce(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      }));

      // Chiamiamo il metodo che stiamo testando
      await videoService.setJobOutput('job-1', 'https://example.com/processed-video.mp4');

      // Verifichiamo che la query sia corretta
      expect(mockFrom).toHaveBeenCalledWith('video_processing_jobs');
    });
  });
});
