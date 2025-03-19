import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertTriangle } from 'lucide-react';
import { documentService } from '../services/document-service';

interface FileUploadProps {
  onUploadComplete: (file: any) => void;
  onError?: (error: string) => void;
  isDarkMode: boolean;
  maxSize?: number; // in MB
  allowedTypes?: string[];
}

export function FileUpload({ 
  onUploadComplete, 
  onError, 
  isDarkMode,
  maxSize = 50,
  allowedTypes = ['.pdf', '.doc', '.docx', '.txt']
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File troppo grande. Dimensione massima: ${maxSize}MB`;
    }

    // Check file type
    const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!allowedTypes.includes(fileExt)) {
      return `Tipo file non supportato. Tipi permessi: ${allowedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFiles = async (files: FileList) => {
    if (!files || files.length === 0) {
      setError("Nessun file selezionato");
      onError?.("Nessun file selezionato");
      return;
    }
    
    const file = files[0];
    console.log(`Preparazione upload file: ${file.name} (${file.size} bytes)`);
    
    const validationError = validateFile(file);
    
    if (validationError) {
      console.error(`Errore validazione: ${validationError}`);
      setError(validationError);
      onError?.(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Ottieni l'utente dal Supabase auth o usa un fallback
      let userId = 'fallback-user-id';
      
      try {
        // Importazione dinamica per evitare dipendenze circolari
        const { supabase } = await import('../services/supabase');
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.id) {
            userId = user.id;
            console.log(`Upload per l'utente autenticato: ${userId}`);
          } else {
            console.warn("Utente non autenticato, utilizzo ID di fallback");
          }
        } else {
          console.warn("Client Supabase non disponibile, utilizzo ID di fallback");
        }
      } catch (authError) {
        console.error("Errore durante il recupero dell'utente:", authError);
      }
      
      console.log(`Iniziando upload file ${file.name} per utente ${userId}`);
      
      // Multiple tentatives for upload with fallback
      let uploadedDoc = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!uploadedDoc && attempts < maxAttempts) {
        attempts++;
        try {
          uploadedDoc = await documentService.uploadDocument(file, userId);
          console.log(`Upload completato con successo al tentativo ${attempts}:`, uploadedDoc);
        } catch (uploadError) {
          console.warn(`Tentativo ${attempts}/${maxAttempts} fallito:`, uploadError);
          
          if (attempts === maxAttempts) {
            throw uploadError; // Rilancia l'errore dopo tutti i tentativi falliti
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (uploadedDoc) {
        onUploadComplete(uploadedDoc);
      } else {
        throw new Error("Impossibile caricare il documento dopo multipli tentativi");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore durante il caricamento';
      console.error("Errore finale upload:", errorMsg);
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-purple-500 bg-purple-500 bg-opacity-10'
            : isUploading
            ? 'border-blue-500 bg-blue-500 bg-opacity-10'
            : error
            ? 'border-red-500 bg-red-500 bg-opacity-10'
            : `border-gray-600 hover:border-purple-500 ${
                isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
              }`
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept={allowedTypes.join(',')}
        />
        
        {error ? (
          <>
            <AlertTriangle size={32} className="mx-auto mb-4 text-red-500" />
            <p className="text-red-500 font-medium">{error}</p>
          </>
        ) : isUploading ? (
          <>
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-blue-500 font-medium">Caricamento in corso...</p>
          </>
        ) : (
          <>
            <Upload size={32} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-400 mb-2">
              Trascina i file qui o clicca per selezionare
            </p>
            <p className="text-sm text-gray-500">
              {allowedTypes.join(', ')} - Max {maxSize}MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}
