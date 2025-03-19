import React, { useState } from 'react';
import { MediaItem } from '../types/media';
import SimpleModal from './SimpleModal';

interface ItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MediaItem | null;
  isDarkMode: boolean;
  onSave: (id: string, updates: { title: string, description: string }) => Promise<void>;
}

/**
 * Modale per visualizzare e modificare i dettagli di un item multimediale
 */
export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  isOpen,
  onClose,
  item,
  isDarkMode,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Aggiorna lo stato locale quando l'item cambia
  React.useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || '');
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;
    
    try {
      setIsSaving(true);
      await onSave(item.id, { title, description });
      onClose();
    } catch (error) {
      console.error('Error saving item details:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Media Details"
      isDarkMode={isDarkMode}
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                : 'bg-white border-gray-200 focus:border-purple-400'
            }`}
            disabled={isSaving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full h-32 px-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                : 'bg-white border-gray-200 focus:border-purple-400'
            }`}
            disabled={isSaving}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <input
              type="text"
              value={item.file_type}
              readOnly
              className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Size</label>
            <input
              type="text"
              value={`${(item.file_size / 1024 / 1024).toFixed(1)} MB`}
              readOnly
              className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 opacity-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Created</label>
            <input
              type="text"
              value={new Date(item.created_at).toLocaleString()}
              readOnly
              className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <div className={`px-4 py-2 rounded-lg text-center ${
              item.status === 'ready'
                ? 'bg-green-500 bg-opacity-10 text-green-500'
                : item.status === 'processing'
                ? 'bg-yellow-500 bg-opacity-10 text-yellow-500'
                : 'bg-red-500 bg-opacity-10 text-red-500'
            }`}>
              {item.status}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            Save Changes
          </button>
        </div>
      </div>
    </SimpleModal>
  );
};

export default ItemDetailsModal;
