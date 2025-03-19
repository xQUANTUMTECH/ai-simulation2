import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock di supabase
vi.mock('../src/services/supabase', () => ({
  // @ts-ignore - Mock semplificato per i test
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/document.pdf' }
        })
      })
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'doc-1' }, error: null })
        })
      }),
      upsert: vi.fn().mockResolvedValue({ error: null })
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      })
    }
  }
}));

// Importiamo il servizio dopo il mock
import { documentService, Document } from '../src/services/document-service';

describe('DocumentService', () => {
  beforeEach(() => {
    // Reset delle mock per ogni test
    vi.clearAllMocks();
  });
  
  describe('uploadDocument', () => {
    it('Dovrebbe caricare un documento con successo', async () => {
      const mockFile = new File(['test content'], 'test-document.pdf', { type: 'application/pdf' });
      const mockUserId = 'test-user-id';
      
      // Mock della risposta
      const mockDocumentData = {
        id: 'doc-1',
        name: 'test-document.pdf',
        size: mockFile.size,
        type: 'application/pdf',
        url: 'https://example.com/document.pdf',
        created_by: mockUserId,
        created_at: new Date().toISOString(),
        status: 'processing'
      };
      
      // @ts-ignore - Configuriamo il mock per restituire i dati corretti
      const supabase = await import('../src/services/supabase');
      // @ts-ignore - Mock insert
      vi.mocked(supabase.supabase.from).mockImplementationOnce(() => ({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockDocumentData, error: null })
          })
        })
      }));
      
      const result = await documentService.uploadDocument(mockFile, mockUserId);
      
      // Verifica che il documento sia stato caricato su Storage
      expect(result.url).toBe('https://example.com/document.pdf');
      expect(result.name).toBe('test-document.pdf');
      
      // Verifica che sia stato registrato nel database
      // @ts-ignore - È un mock
      const storageMock = vi.mocked(supabase.supabase.storage.from);
      expect(storageMock).toHaveBeenCalledWith('documents');
    });
    
    it('Dovrebbe gestire un errore durante il caricamento', async () => {
      // Modifica il mock per simulare un errore
      const supabase = await import('../src/services/supabase');
      // @ts-ignore - Mock con errore
      vi.mocked(supabase.supabase.storage.from).mockReturnValueOnce({
        upload: vi.fn().mockResolvedValue({ error: new Error('Upload failed'), data: null }),
        getPublicUrl: vi.fn()
      });
      
      const mockFile = new File(['test content'], 'test-document.pdf', { type: 'application/pdf' });
      
      // Verifica che l'eccezione venga lanciata
      await expect(documentService.uploadDocument(mockFile, 'test-user-id')).rejects.toThrow();
    });
  });
  
  describe('getDocuments', () => {
    it('Dovrebbe recuperare i documenti di un utente', async () => {
      const mockDocuments = [
        { 
          id: 'doc-1', 
          name: 'Document 1.pdf',
          size: 1024,
          type: 'application/pdf',
          url: 'https://example.com/doc1.pdf',
          created_at: new Date().toISOString(),
          created_by: 'test-user-id',
          status: 'ready'
        },
        { 
          id: 'doc-2', 
          name: 'Document 2.pdf',
          size: 2048,
          type: 'application/pdf',
          url: 'https://example.com/doc2.pdf',
          created_at: new Date().toISOString(),
          created_by: 'test-user-id',
          status: 'ready'
        }
      ];
      
      // Modifica il mock per restituire dati specifici
      const supabase = await import('../src/services/supabase');
      // @ts-ignore - Mock per getDocuments
      vi.mocked(supabase.supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockDocuments, error: null })
          })
        })
      });
      
      const result = await documentService.getDocuments('test-user-id');
      
      expect(result).toEqual(mockDocuments);
      // @ts-ignore - È un mock
      expect(supabase.supabase.from).toHaveBeenCalledWith('documents');
    });
  });
  
  describe('updateDocumentStatus', () => {
    it('Dovrebbe aggiornare lo stato di un documento', async () => {
      const documentId = 'doc-1';
      const newStatus = 'ready' as const;
      
      // Mock dell'operazione di aggiornamento
      const supabase = await import('../src/services/supabase');
      // @ts-ignore - Mock per updateDocumentStatus
      vi.mocked(supabase.supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });
      
      await documentService.updateDocumentStatus(documentId, newStatus);
      
      // @ts-ignore - È un mock
      expect(supabase.supabase.from).toHaveBeenCalledWith('documents');
    });
  });
  
  describe('updateDocumentMetadata', () => {
    it('Dovrebbe aggiornare i metadati di un documento', async () => {
      const documentId = 'doc-1';
      const newMetadata = {
        pageCount: 10,
        author: 'John Doe',
        keywords: ['test', 'document']
      };
      
      // Mock dell'operazione di aggiornamento
      const supabase = await import('../src/services/supabase');
      // @ts-ignore - Mock per updateDocumentMetadata
      vi.mocked(supabase.supabase.from).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      });
      
      await documentService.updateDocumentMetadata(documentId, newMetadata);
      
      // @ts-ignore - È un mock
      expect(supabase.supabase.from).toHaveBeenCalledWith('documents');
    });
  });
  
  describe('deleteDocument', () => {
    it('Dovrebbe eliminare un documento per ID', async () => {
      const documentId = 'doc-to-delete';
      const userId = 'test-user-id';
      
      // Mock per ottenere prima il documento
      const supabase = await import('../src/services/supabase');
      // @ts-ignore - Mock per select
      vi.mocked(supabase.supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: documentId, url: 'https://example.com/documents/test-user-id/test-file.pdf' },
                error: null
              })
            })
          })
        })
      });
      
      // Mock per la rimozione da storage
      // @ts-ignore - Mock per storage
      vi.mocked(supabase.supabase.storage.from).mockReturnValueOnce({
        remove: vi.fn().mockResolvedValue({ error: null })
      });
      
      // Mock dell'operazione di eliminazione
      // @ts-ignore - Mock per delete
      vi.mocked(supabase.supabase.from).mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        })
      });
      
      await documentService.deleteDocument(documentId, userId);
      
      // @ts-ignore - È un mock
      expect(supabase.supabase.from).toHaveBeenCalledWith('documents');
      // @ts-ignore - È un mock
      expect(supabase.supabase.storage.from).toHaveBeenCalledWith('documents');
    });
  });
});
