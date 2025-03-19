import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { adminAuthService } from '../../../services/admin-auth-service';
import { apiErrorService, ApiErrorType } from '../../../services/api-error-service';
import { documentService } from '../../../services/document-service';
import { MediaType, MediaItem, SortField, SortOrder, ThemeProps } from './MediaTypes';
import { MediaControls } from './MediaControls';
import { MediaGridView } from './MediaGridView';
import { MediaListView } from './MediaListView';
import { MediaDetailsModal } from './MediaDetailsModal';

interface MediaManagerProps extends ThemeProps {
  // Eventuali proprietà aggiuntive
}

/**
 * Componente principale per la gestione dei media
 */
export function MediaManager({ isDarkMode }: MediaManagerProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedType, setSelectedType] = useState<MediaType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Ordinamento
  const [sortBy, setSortBy] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);

  // Carica i media all'avvio
  useEffect(() => {
    loadMediaItems();
  }, []);
  
  // Filtra gli elementi quando cambiano i filtri
  useEffect(() => {
    filterItems();
  }, [mediaItems, selectedType, searchQuery, sortBy, sortOrder]);
  
  // Aggiorna la paginazione quando cambiano gli elementi filtrati
  useEffect(() => {
    setTotalPages(Math.ceil(filteredItems.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page when filters change
  }, [filteredItems, itemsPerPage]);

  // Verifica se l'utente è admin e carica i media
  async function loadMediaItems() {
    try {
      setLoading(true);
      
      // Verifica se l'utente è admin
      await adminAuthService.validateAdminRequest();
      
      if (!supabase) throw new Error('Supabase client not initialized');
      
      // 1. Carica i video
      const { data: videos, error: videosError } = await supabase
        .from('academy_videos')
        .select('*');
        
      if (videosError) throw videosError;
      
      // 2. Carica i documenti
      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('*');
        
      if (documentsError) throw documentsError;
      
      // 3. Combina i risultati
      const formattedVideos: MediaItem[] = (videos || []).map(video => ({
        id: video.id,
        name: video.title,
        type: video.file_type || 'video/mp4',
        size: video.file_size || 0,
        url: video.file_url || '',
        thumbnail: video.thumbnail_url,
        created_at: video.created_at,
        created_by: video.uploaded_by,
        mediaType: 'video',
        status: video.status,
        metadata: {
          description: video.description,
          duration: video.duration,
          views: video.view_count || 0
        }
      }));
      
      const formattedDocuments: MediaItem[] = (documents || []).map(doc => ({
        id: doc.id,
        name: doc.name,
        type: doc.type || 'application/pdf',
        size: doc.size || 0,
        url: doc.url || '',
        created_at: doc.created_at,
        created_by: doc.created_by,
        mediaType: 'document',
        status: doc.status,
        metadata: doc.metadata
      }));
      
      // Unisci tutti i media
      setMediaItems([...formattedVideos, ...formattedDocuments]);
      setError(null);
    } catch (err) {
      console.error('Errore nel caricamento dei media:', err);
      const error = apiErrorService.parseError(err, 'loadMediaItems', 'media-library');
      setError(error.message);
      if (error.type === ApiErrorType.AUTHENTICATION) {
        adminAuthService.handleAuthError(error);
      }
    } finally {
      setLoading(false);
    }
  }

  // Filtra gli elementi in base ai criteri
  function filterItems() {
    let filtered = [...mediaItems];
    
    // Filtra per tipo
    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.mediaType === selectedType);
    }
    
    // Filtra per ricerca testuale (case insensitive)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) || 
        (item.metadata?.description && item.metadata.description.toLowerCase().includes(query))
      );
    }
    
    // Ordina gli elementi
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortBy === 'created_at') {
        return sortOrder === 'asc' 
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'size') {
        return sortOrder === 'asc' 
          ? a.size - b.size
          : b.size - a.size;
      } else if (sortBy === 'type') {
        return sortOrder === 'asc' 
          ? a.type.localeCompare(b.type)
          : b.type.localeCompare(a.type);
      }
      
      return 0;
    });
    
    setFilteredItems(filtered);
  }

  // Gestisce l'eliminazione di un elemento
  async function handleDelete(item: MediaItem) {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      
      // Ottieni l'utente corrente
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Utente non autenticato');
      
      if (item.mediaType === 'video') {
        const { error } = await supabase
          .from('academy_videos')
          .delete()
          .eq('id', item.id);
          
        if (error) throw error;
        
      } else if (item.mediaType === 'document') {
        await documentService.deleteDocument(item.id, user.id);
      }
      
      // Aggiorna la lista
      setMediaItems(mediaItems.filter(i => i.id !== item.id));
      setSuccess(`${item.mediaType === 'video' ? 'Video' : 'Documento'} eliminato con successo`);
      
      // Chiudi il modale dei dettagli se aperto
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
        setShowDetails(false);
      }
    } catch (err) {
      console.error('Errore nell\'eliminazione:', err);
      const error = apiErrorService.parseError(err, 'handleDelete', 'media-library');
      setError(error.message);
    }
  }

  // Mostra i dettagli di un elemento
  function handleViewDetails(item: MediaItem) {
    setSelectedItem(item);
    setShowDetails(true);
  }

  // Ottieni gli elementi paginati
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Media Library</h2>

      {/* Messaggi di notifica */}
      {error && (
        <div className={`p-4 rounded-xl border border-red-500 bg-red-500 bg-opacity-10 flex items-center gap-2 text-red-500`}>
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="ml-auto p-1 rounded-full hover:bg-red-500 hover:bg-opacity-20"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className={`p-4 rounded-xl border border-green-500 bg-green-500 bg-opacity-10 flex items-center gap-2 text-green-500`}>
          <Check size={20} />
          <span>{success}</span>
          <button 
            onClick={() => setSuccess(null)} 
            className="ml-auto p-1 rounded-full hover:bg-green-500 hover:bg-opacity-20"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filtri e controlli */}
      <div className={`p-6 rounded-xl border ${
        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      }`}>
        <MediaControls
          isDarkMode={isDarkMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          viewMode={viewMode}
          setViewMode={setViewMode}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />

        {/* Media Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : viewMode === 'grid' ? (
          <MediaGridView
            isDarkMode={isDarkMode}
            items={paginatedItems}
            onViewDetails={handleViewDetails}
            onDelete={handleDelete}
          />
        ) : (
          <MediaListView
            isDarkMode={isDarkMode}
            items={paginatedItems}
            onViewDetails={handleViewDetails}
            onDelete={handleDelete}
          />
        )}

        {/* Paginazione */}
        {filteredItems.length > 0 && (
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
              } ${currentPage === 1 || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}`}
            >
              Precedente
            </button>
            
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Pagina {currentPage} di {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages || loading}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
              } ${currentPage >= totalPages || loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}`}
            >
              Successiva
            </button>
          </div>
        )}
      </div>

      {/* Modal dettagli */}
      {showDetails && (
        <MediaDetailsModal
          isDarkMode={isDarkMode}
          item={selectedItem}
          onClose={() => {
            setSelectedItem(null);
            setShowDetails(false);
          }}
        />
      )}
    </div>
  );
}
