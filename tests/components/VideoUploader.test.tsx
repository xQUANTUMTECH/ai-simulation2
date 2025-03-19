import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoUploader } from '../../src/components/VideoUploader';

// Mock di supabase
vi.mock('../../src/services/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ 
          data: { user: { id: 'test-user-id' } }, 
          error: null 
        })
      },
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ 
            data: { publicUrl: 'https://example.com/video.mp4' } 
          })
        })
      },
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null })
      })
    }
  };
});

// Mock del metodo URL.createObjectURL
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');

// Mock della classe crypto per generare UUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234'
  }
});

describe('VideoUploader', () => {
  const mockOnUploadComplete = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock di document.createElement per video
    const mockVideoElement = {
      src: '',
      onloadedmetadata: null as (() => void) | null,
      duration: 120 // 2 minuti di video
    };

    const originalCreateElement = document.createElement;
    global.document.createElement = vi.fn().mockImplementation((tag) => {
      if (tag === 'video') {
        // Simuliamo il caricamento dei metadati
        setTimeout(() => {
          if (mockVideoElement.onloadedmetadata) {
            mockVideoElement.onloadedmetadata();
          }
        }, 50);
        return mockVideoElement as any;
      }
      // Usiamo l'implementazione originale per altri tag
      return originalCreateElement.call(document, tag);
    });
  });

  it('Renderizza correttamente il componente iniziale', () => {
    render(<VideoUploader onUploadComplete={mockOnUploadComplete} />);
    
    expect(screen.getByText(/Drag and drop your video here/i)).toBeInTheDocument();
    expect(screen.getByText(/MP4, WebM, MOV/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Select Video/i })).toBeInTheDocument();
  });

  it('Gestisce correttamente la selezione di un file valido', async () => {
    render(<VideoUploader onUploadComplete={mockOnUploadComplete} />);

    const file = new File(['test content'], 'test-video.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 * 10 }); // 10MB
    
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('Input not found');

    fireEvent.change(input, { target: { files: [file] } });
    
    // Attendiamo che il previewer sia caricato
    await waitFor(() => {
      expect(screen.getByText(/test-video.mp4/i)).toBeInTheDocument();
      expect(screen.getByText(/10.00 MB/i)).toBeInTheDocument();
    });
  });

  it('Mostra errore per file troppo grande', async () => {
    render(
      <VideoUploader 
        onUploadComplete={mockOnUploadComplete} 
        onError={mockOnError}
        maxSize={5} // 5MB massimo
      />
    );

    const file = new File(['test content'], 'large-video.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 * 10 }); // 10MB
    
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('Input not found');

    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/File too large/i)).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('File too large'));
    });
  });

  it('Mostra errore per formato non supportato', async () => {
    render(
      <VideoUploader 
        onUploadComplete={mockOnUploadComplete} 
        onError={mockOnError}
        allowedFormats={['video/mp4']} // Solo MP4
      />
    );

    const file = new File(['test content'], 'test-video.webm', { type: 'video/webm' });
    
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('Input not found');

    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/Unsupported format/i)).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith(expect.stringContaining('Unsupported format'));
    });
  });

  it('Esegue il caricamento con successo', async () => {
    render(<VideoUploader onUploadComplete={mockOnUploadComplete} />);

    const file = new File(['test content'], 'test-video.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 * 10 }); // 10MB
    
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('Input not found');

    fireEvent.change(input, { target: { files: [file] } });
    
    // Attendiamo che il previewer sia caricato
    await waitFor(() => {
      expect(screen.getByText(/test-video.mp4/i)).toBeInTheDocument();
    });

    // Troviamo il pulsante di upload (Play)
    const uploadButton = screen.getByRole('button', { name: '' }); // Il pulsante ha solo un'icona
    fireEvent.click(uploadButton);

    // Verifichiamo che l'upload venga completato
    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith({
        url: 'https://example.com/video.mp4',
        duration: 120,
        size: 1024 * 1024 * 10,
        format: 'video/mp4'
      });
    });
  });
});
