import React, { useState, useEffect } from 'react';
import { 
  Video, FileText, Upload, Search, Filter, MoreVertical, Edit, Trash2, 
  Play, Download, Clock, AlertTriangle, RefreshCw, CheckCircle2, X,
  Film, Image, Folder, Grid, List, SortAsc, SortDesc
} from 'lucide-react';
import { Modal } from '../Modal';
import { adminContentService } from '../../services/admin-content-service';

interface MediaManagementProps {
  isDarkMode: boolean;
}

export function MediaManagement({ isDarkMode }: MediaManagementProps) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [mediaType, setMediaType] = useState<'all' | 'video' | 'document'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processingQueue, setProcessingQueue] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchOperation, setBatchOperation] = useState<'delete' | 'tag' | 'move' | null>(null);

  useEffect(() => {
    loadMediaItems();
  }, [mediaType, sortBy, sortOrder]);

  const loadMediaItems = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await adminContentService.getContent({
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

  const handleFileSelect = (files: FileList) => {
    setSelectedFiles(Array.from(files));
  };

  const handleUpload = async () => {
    try {
      setUploading(true);
      setError(null);

      if (!videoFile || !title) {
        throw new Error('Please provide a title and video file');
      }
      
      const upload = await adminContentService.uploadContent(videoFile, {
        title,
        description,
        file_type: 'video',
        knowledge_base: knowledgeFile
      }, (progress) => {
        setUploadProgress(progress);
      });

      setProcessingQueue(prev => [...prev, upload.id]);

      setShowUploadModal(false);
      loadMediaItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error uploading files');
    } finally {
      setUploading(false);
      setVideoFile(null);
      setKnowledgeFile(null);
      setTitle('');
      setDescription('');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminContentService.deleteContent(id);
      setMediaItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting item');
    }
  };

  const handleBatchOperation = async () => {
    if (!batchOperation || selectedItems.length === 0) return;

    try {
      await adminContentService.performBatchOperation({
        type: batchOperation,
        ids: selectedItems,
        data: batchOperation === 'tag' ? { tags: [] } : undefined
      });

      setSelectedItems([]);
      setBatchOperation(null);
      setShowBatchModal(false);
      loadMediaItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error performing batch operation');
    }
  };

  const filteredItems = mediaItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className={`rounded-xl border ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="aspect-video relative rounded-t-xl overflow-hidden">
                {item.file_type === 'video' ? (
                  <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <Play size={48} className="text-white opacity-50" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <FileText size={48} className="text-gray-400" />
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-medium mb-1 truncate">{item.title}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                  <span>{item.file_type}</span>
                  <span>•</span>
                  <span>{(item.file_size / 1024 / 1024).toFixed(1)} MB</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setShowDetailsModal(true);
                      }}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 hover:bg-gray-700 rounded transition-colors text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`rounded-xl border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                <tr>
                  <th className="w-8 px-6 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredItems.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(filteredItems.map(item => item.id));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                      className="rounded border-gray-600"
                    />
                  </th>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">Type</th>
                  <th className="text-left px-6 py-3">Size</th>
                  <th className="text-left px-6 py-3">Created</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-right px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredItems.map(item => (
                  <tr key={item.id} className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(prev => [...prev, item.id]);
                          } else {
                            setSelectedItems(prev => prev.filter(id => id !== item.id));
                          }
                        }}
                        className="rounded border-gray-600"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.file_type === 'video' ? (
                          <Video size={20} className="text-blue-500" />
                        ) : (
                          <FileText size={20} className="text-green-500" />
                        )}
                        <span className="font-medium">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{item.file_type}</td>
                    <td className="px-6 py-4">
                      {(item.file_size / 1024 / 1024).toFixed(1)} MB
                    </td>
                    <td className="px-6 py-4">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === 'ready'
                          ? 'bg-green-500 bg-opacity-10 text-green-500'
                          : item.status === 'processing'
                          ? 'bg-yellow-500 bg-opacity-10 text-yellow-500'
                          : 'bg-red-500 bg-opacity-10 text-red-500'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowDetailsModal(true);
                          }}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Files"
        isDarkMode={isDarkMode}
      >
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Titolo Video</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="Inserisci il titolo del video"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descrizione</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full h-32 px-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="Descrivi il contenuto del video"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">File Video</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                isDarkMode ? 'border-gray-700' : 'border-gray-300'
              } transition-colors cursor-pointer`}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'video/*';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files[0]) setVideoFile(files[0]);
                };
                input.click();
              }}
            >
              {videoFile ? (
                <>
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium mb-2">{videoFile.name}</p>
                  <p className="text-sm text-gray-400">
                    {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Carica video</p>
                  <p className="text-sm text-gray-400">
                    Formati supportati: MP4, WebM, MOV
                  </p>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">File Knowledge Base</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                isDarkMode ? 'border-gray-700' : 'border-gray-300'
              } transition-colors cursor-pointer`}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.txt,.doc,.docx,.pdf';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files && files[0]) setKnowledgeFile(files[0]);
                };
                input.click();
              }}
            >
              {knowledgeFile ? (
                <>
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium mb-2">{knowledgeFile.name}</p>
                  <p className="text-sm text-gray-400">
                    {(knowledgeFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Carica file di testo</p>
                  <p className="text-sm text-gray-400">
                    Questo file verrà usato dall'AI per generare quiz e ripetizioni
                  </p>
                </>
              )}
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full">
                <div
                  className="h-2 bg-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowUploadModal(false)}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!videoFile || !title || uploading}
              className={`px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Upload
            </button>
          </div>
        </form>
      </Modal>

      {/* Batch Operation Modal */}
      <Modal
        isOpen={showBatchModal}
        onClose={() => {
          setShowBatchModal(false);
          setBatchOperation(null);
        }}
        title={`Batch ${batchOperation?.charAt(0).toUpperCase()}${batchOperation?.slice(1)}`}
        isDarkMode={isDarkMode}
      >
        <div className="space-y-6">
          <p>Are you sure you want to {batchOperation} {selectedItems.length} items?</p>
          
          <div className="flex justify-end gap-4">
            <button
              onClick={() => {
                setShowBatchModal(false);
                setBatchOperation(null);
              }}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleBatchOperation}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Media Details"
        isDarkMode={isDarkMode}
      >
        {selectedItem && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={selectedItem.title}
                onChange={(e) => setSelectedItem({ ...selectedItem, title: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={selectedItem.description || ''}
                onChange={(e) => setSelectedItem({ ...selectedItem, description: e.target.value })}
                className={`w-full h-32 px-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-white border-gray-200 focus:border-purple-400'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <input
                  type="text"
                  value={selectedItem.file_type}
                  disabled
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Size</label>
                <input
                  type="text"
                  value={`${(selectedItem.file_size / 1024 / 1024).toFixed(1)} MB`}
                  disabled
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 opacity-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Created</label>
                <input
                  type="text"
                  value={new Date(selectedItem.created_at).toLocaleString()}
                  disabled
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <div className={`px-4 py-2 rounded-lg text-center ${
                  selectedItem.status === 'ready'
                    ? 'bg-green-500 bg-opacity-10 text-green-500'
                    : selectedItem.status === 'processing'
                    ? 'bg-yellow-500 bg-opacity-10 text-yellow-500'
                    : 'bg-red-500 bg-opacity-10 text-red-500'
                }`}>
                  {selectedItem.status}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDetailsModal(false)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await adminContentService.updateContent(selectedItem.id, {
                      title: selectedItem.title,
                      description: selectedItem.description
                    });
                    setShowDetailsModal(false);
                    loadMediaItems();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Error updating item');
                  }
                }}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}