import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Grid, List, CheckCircle2, Trash2, Upload, AlertTriangle } from 'lucide-react';
import { MediaItem, TranscodingJob } from './types/media';
import mediaService from './services/mediaService';

// Importazione dei componenti modulari
import MediaGrid from './components/MediaGrid';
import MediaList from './components/MediaList';
import UploadModal from './components/UploadModal';
import TranscodingModal from './components/TranscodingModal';
import ItemDetailsModal from './components/ItemDetailsModal';

interface MediaManagementProps {
  isDarkMode: boolean;
}

export function MediaManagement({ isDarkMode }: MediaManagementProps) {
  // Stati per la visualizzazione e il filtraggio
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [mediaType, setMediaType] = useState<'all' | 'video' | 'document'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stati per il caricamento e gli errori
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Stati per i dati
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [transcodingJobs, setTranscodingJobs] = useState<TranscodingJob[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Stati per le modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTranscodingModal, setShowTranscodingModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  
  // Stati per gli item selezionati
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [selectedTranscodingJob, setSelectedTranscodingJob] = useState<TranscodingJob | null>(null);
  
  // Stati per il caricamento file
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Altri stati di controllo
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [batchOperation, setBatchOperation] = useState<'delete' | 'tag' | 'move' | null>(null);

  // Caricamento iniziale dei dati
  useEffect(() => {
    loadMediaItems();
    loadTranscodingJobs();
  }, [mediaType, sortBy, sortOrder]);
  
  // Polling per aggiornamenti di stato transcoding ogni 10 secondi
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Aggiorna solo se ci sono job in corso
      if (transcodingJobs.some(job => job.status === 'processing' || job.status === 'queued')) {
        loadTranscodingJobs();
      }
    }, 10000);
    
    return () => clearInterval(intervalId);
  }, [transcodingJobs]);

  // Carica i job di transcoding
  const loadTranscodingJobs = async () => {
    try {
      setIsLoadingJobs(true);
      const jobs = await mediaService.getTranscodingJobs();
      setTranscodingJobs(jobs);
    } catch (err) {
      console.error('Error loading transcoding jobs:', err);
      setError(err instanceof Error ? err.message : 'Error loading transcoding jobs');
    } finally {
      setIsLoadingJobs(false);
    }
  };
  
  // Carica gli elementi multimediali
  const loadMediaItems = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await mediaService.getMedia({
        type: mediaType === 'all' ? undefined : mediaType,
        sort: { field: sortBy, order: sortOrder }
      });

      if (error) throw error;
      setMediaItems(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading media items');
    } finally {
      setIsLoading(false);
    }
  };

  // Gestisce il caricamento di un nuovo file
  const handleUpload = async (videoFile: File, title: string, description: string, knowledgeFile: File | null) => {
    try {
      setUploading(true);
      setError(null);
      
      await mediaService.uploadMedia(videoFile, {
        title,
        description,
        file_type: 'video',
        knowledge_base: knowledgeFile
      }, (progress) => {
        setUploadProgress(progress);
      });

      setShowUploadModal(false);
      loadMediaItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading files');
      throw err;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Gestisce l'eliminazione di un elemento
  const handleDelete = async (id: string) => {
    try {
      await mediaService.deleteMedia(id);
      setMediaItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting item');
    }
  };

  // Gestisce l'aggiornamento di un elemento
  const handleUpdateItem = async (id: string, updates: { title: string, description: string }) => {
    try {
      await mediaService.updateMedia(id, updates);
      
      // Aggiorna l'elemento locale
      setMediaItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
      
      // Chiude la modale dei dettagli
      setShowDetailsModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating item');
    }
  };

  // Avvia un job di transcoding
  const handleStartTranscoding = async (videoId: string) => {
    try {
      const result = await mediaService.startTranscoding(videoId);
      await loadTranscodingJobs();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error starting transcoding');
      throw err;
    }
  };

  // Riavvia un job di transcoding
  const handleRestartTranscoding = async (videoId: string) => {
    try {
      await handleStartTranscoding(videoId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error restarting transcoding');
      throw err;
    }
  };

  // Gestisce le operazioni batch
  const handleBatchOperation = async () => {
    if (!batchOperation || selectedItems.length === 0) return;

    try {
      // Operazione batch: elimina elementi multipli
      if (batchOperation === 'delete') {
        // Elimina tutti gli elementi selezionati uno per uno
        for (const id of selectedItems) {
          await mediaService.deleteMedia(id);
        }
      }
      // Altri tipi di operazioni batch non ancora implementati

      setSelectedItems([]);
      setBatchOperation(null);
      setShowBatchModal(false);
      loadMediaItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error performing batch operation');
    }
  };

  // Toggle selezione tutti gli elementi
  const handleToggleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(filteredItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  // Toggle selezione di un elemento
  const handleToggleSelectItem = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    }
  };

  // Filtra gli elementi in base alla ricerca
  const filteredItems = mediaItems.filter(item => 
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mostra loader durante il caricamento
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Media Library</h2>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Upload size={20} />
          Upload Video
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-center gap-2 text-red-500">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 focus:border-purple-500' 
                : 'bg-white border-gray-200 focus:border-purple-400'
            }`}
          />
        </div>

        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value as any)}
          className={`px-4 py-2 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}
        >
          <option value="all">All Types</option>
          <option value="video">Videos</option>
          <option value="document">Documents</option>
        </select>

        <div className="flex gap-2">
          <button
            onClick={() => setView('grid')}
            className={`p-2 rounded-lg transition-colors ${
              view === 'grid'
                ? 'bg-purple-500 text-white'
                : isDarkMode
                ? 'hover:bg-gray-700'
                : 'hover:bg-gray-100'
            }`}
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-lg transition-colors ${
              view === 'list'
                ? 'bg-purple-500 text-white'
                : isDarkMode
                ? 'hover:bg-gray-700'
                : 'hover:bg-gray-100'
            }`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className={`mb-4 p-4 rounded-xl border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-purple-500" />
              <span>{selectedItems.length} items selected</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setBatchOperation('delete');
                  setShowBatchModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'grid' ? (
        <MediaGrid 
          items={filteredItems}
          isDarkMode={isDarkMode}
          transcodingJobs={transcodingJobs}
          onSelectTranscoding={(job) => {
            setSelectedTranscodingJob(job);
            setShowTranscodingModal(true);
          }}
          onSelectItem={(item) => {
            setSelectedItem(item);
            setShowDetailsModal(true);
          }}
          onDeleteItem={handleDelete}
          onStartTranscoding={handleStartTranscoding}
          setError={setError}
        />
      ) : (
        <MediaList 
          items={filteredItems}
          isDarkMode={isDarkMode}
          transcodingJobs={transcodingJobs}
          selectedItems={selectedItems}
          onToggleSelectItem={handleToggleSelectItem}
          onToggleSelectAll={handleToggleSelectAll}
          onSelectTranscoding={(job) => {
            setSelectedTranscodingJob(job);
            setShowTranscodingModal(true);
          }}
          onSelectItem={(item) => {
            setSelectedItem(item);
            setShowDetailsModal(true);
          }}
          onDeleteItem={handleDelete}
          onStartTranscoding={handleStartTranscoding}
          setError={setError}
        />
      )}

      {/* Upload Modal */}
      <UploadModal 
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        isDarkMode={isDarkMode}
        onUpload={handleUpload}
        uploading={uploading}
        uploadProgress={uploadProgress}
      />

      {/* Item Details Modal */}
      <ItemDetailsModal 
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        item={selectedItem}
        isDarkMode={isDarkMode}
        onSave={handleUpdateItem}
      />

      {/* Transcoding Modal */}
      <TranscodingModal 
        isOpen={showTranscodingModal}
        onClose={() => setShowTranscodingModal(false)}
        job={selectedTranscodingJob}
        isDarkMode={isDarkMode}
        onRestartTranscoding={handleRestartTranscoding}
        setError={setError}
      />

      {/* Batch Operation Confirmation Modal */}
      {showBatchModal && batchOperation === 'delete' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-md`}>
            <h3 className="text-xl font-semibold mb-4">Confirm Deletion</h3>
            <p className="mb-6">Are you sure you want to delete {selectedItems.length} items? This action cannot be undone.</p>
            
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowBatchModal(false)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleBatchOperation}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaManagement;
