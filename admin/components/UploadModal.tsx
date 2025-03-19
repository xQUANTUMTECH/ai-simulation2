import React, { useState } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';
import SimpleModal from './SimpleModal';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onUpload: (videoFile: File, title: string, description: string, knowledgeFile: File | null) => Promise<void>;
  uploading: boolean;
  uploadProgress: number;
}

/**
 * Componente modale per il caricamento di nuovi media
 */
export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onUpload,
  uploading,
  uploadProgress
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoFile || !title) return;
    
    try {
      await onUpload(videoFile, title, description, knowledgeFile);
      resetForm();
    } catch (error) {
      // Error handling gestito nel componente parent
      console.error('Error in upload form:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setVideoFile(null);
    setKnowledgeFile(null);
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={() => {
        if (!uploading) {
          onClose();
          resetForm();
        }
      }}
      title="Upload Files"
      isDarkMode={isDarkMode}
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
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
            disabled={uploading}
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
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">File Video</label>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              isDarkMode ? 'border-gray-700' : 'border-gray-300'
            } transition-colors cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => {
              if (uploading) return;
              
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
            } transition-colors cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => {
              if (uploading) return;
              
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
            type="button"
            onClick={() => {
              if (!uploading) {
                onClose();
                resetForm();
              }
            }}
            className={`px-4 py-2 rounded-lg ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!videoFile || !title || uploading}
            className={`px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Upload
          </button>
        </div>
      </form>
    </SimpleModal>
  );
};

export default UploadModal;
