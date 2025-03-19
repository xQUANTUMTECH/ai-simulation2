// Tipi condivisi per i componenti della Media Library

// Tipi di media supportati
export type MediaType = 'all' | 'video' | 'document' | 'image';

// Struttura di un elemento media
export interface MediaItem {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail?: string;
  created_at: string;
  created_by: string;
  metadata?: any;
  mediaType: 'video' | 'document' | 'image';
  status: string;
}

// Campi per ordinamento
export type SortField = 'name' | 'created_at' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';

// Opzioni per i temi
export interface ThemeProps {
  isDarkMode: boolean;
}

// Formatta la dimensione del file in KB/MB/GB
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
