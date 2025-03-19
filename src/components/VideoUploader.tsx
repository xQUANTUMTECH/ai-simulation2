import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Play, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';
import { adminAuthService } from '../services/admin-auth-service';
import { createClient } from '@supabase/supabase-js';

// Constante di fallback per la sicurezza type
const nullSafeSupabase = supabase || 
  createClient('https://placeholder.supabase.co', 'placeholder-key');

interface VideoUploaderProps {
  onUploadComplete: (videoData: {
    url: string;
    duration: number;
    size: number;
    format: string;
  }) => void;
  onError?: (error: string) => void;
  maxSize?: number; // in MB
  allowedFormats?: string[];
  isDarkMode?: boolean;
}

export function VideoUploader({
  onUploadComplete,
  onError,
  maxSize = 500, // 500MB default
  allowedFormats = ['video/mp4', 'video/webm', 'video/quicktime'],
  isDarkMode = true
}: VideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chunkSize = 1024 * 1024 * 2; // 2MB chunks

  const validateFile = (file: File): string | null => {
    if (!allowedFormats.includes(file.type)) {
      return `Unsupported format. Allowed formats: ${allowedFormats.map(f => f.split('/')[1]).join(', ')}`;
    }

    if (file.size > maxSize * 1024 * 1024) {
      return `File too large. Maximum size: ${maxSize}MB`;
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    setFile(file);
    setError(null);

    // Create video preview
    const videoUrl = URL.createObjectURL(file);
    setPreview(videoUrl);

    // Get video duration
    const video = document.createElement('video');
    video.src = videoUrl;
    video.onloadedmetadata = () => {
      setDuration(video.duration);
    };
  };

  const uploadChunk = async (
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number,
    uploadId: string
  ): Promise<void> => {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('uploadId', uploadId);

    const response = await fetch('/api/upload/chunk', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload chunk');
    }

    // Update progress
    setProgress(((chunkIndex + 1) / totalChunks) * 100);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      
      // Get current user
      const { data: { user }, error: authError } = await nullSafeSupabase.auth.getUser();
      if (authError || !user) throw new Error('Authentication required');
      
      // Verifica che l'utente sia un amministratore
      const isAdmin = await adminAuthService.validateAdminRequest(user.id);
      if (!isAdmin) throw new Error('Permessi insufficienti: richiesto ruolo amministratore');

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await nullSafeSupabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = nullSafeSupabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      // Create video record
      const { error: recordError } = await nullSafeSupabase
        .from('admin_content_uploads')
        .upsert({
          title: file.name,
          file_url: publicUrl,
          file_type: 'video',
          file_size: file.size,
          mime_type: file.type,
          status: 'processing',
          created_by: user.id,
          updated_at: new Date().toISOString()
        });

      if (recordError) throw recordError;

      onUploadComplete({
        url: publicUrl,
        duration: duration || 0,
        size: file.size,
        format: file.type
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          error
            ? 'border-red-500 bg-red-500 bg-opacity-10'
            : uploading
            ? 'border-blue-500 bg-blue-500 bg-opacity-10'
            : file
            ? 'border-green-500 bg-green-500 bg-opacity-10'
            : isDarkMode
            ? 'border-gray-700 hover:border-purple-500'
            : 'border-gray-300 hover:border-purple-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedFormats.join(',')}
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
        />

        {error ? (
          <>
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
            <p className="text-red-500 font-medium">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setFile(null);
                setPreview(null);
              }}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </>
        ) : uploading ? (
          <>
            <RefreshCw size={48} className="mx-auto mb-4 animate-spin text-blue-500" />
            <p className="text-blue-500 font-medium">Uploading... {Math.round(progress)}%</p>
            <div className="mt-4 h-2 bg-gray-700 rounded-full">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : file ? (
          <>
            <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
            <p className="font-medium mb-2">{file.name}</p>
            <p className="text-sm text-gray-400">
              {(file.size / 1024 / 1024).toFixed(2)} MB • {duration ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}` : 'Loading duration...'}
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
              <button
                onClick={handleUpload}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Play size={20} />
              </button>
            </div>
          </>
        ) : (
          <>
            <Upload size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-400 mb-2">
              Drag and drop your video here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              MP4, WebM, MOV • Max {maxSize}MB
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Select Video
            </button>
          </>
        )}
      </div>

      {preview && (
        <video
          src={preview}
          controls
          className="w-full rounded-lg"
          onError={() => {
            setError('Error loading video preview');
            setPreview(null);
          }}
        />
      )}
    </div>
  );
}
