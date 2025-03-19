import React, { useState, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface FileUploaderProps {
  onUpload: (files: Array<{ name: string; type: string; size: string }>) => void;
  uploadedFiles: Array<{ name: string; type: string; size: string }>;
  isDarkMode: boolean;
}

export function FileUploader({ onUpload, uploadedFiles, isDarkMode }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).map(file => ({
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
    }));
    
    onUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).map(file => ({
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
      }));
      
      onUpload(files);
    }
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-purple-500 bg-purple-500 bg-opacity-10'
            : 'border-gray-700 hover:border-purple-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt"
        />
        <Upload size={32} className="mx-auto mb-4 text-gray-400" />
        <p className="text-gray-400 mb-2">
          Trascina i file qui o clicca per selezionare
        </p>
        <p className="text-sm text-gray-500">
          PDF, DOCX, TXT - Max 50MB per file
        </p>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium">File Caricati</h3>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-gray-400" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-400">{file.size}</p>
                  </div>
                </div>
                <button className="text-red-400 hover:text-red-300">
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}