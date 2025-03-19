import React from 'react';
import { Video, FileText, Image } from 'lucide-react';
import { MediaItem } from './MediaTypes';

interface MediaIconProps {
  item: MediaItem;
  size?: number;
}

/**
 * Componente che mostra l'icona appropriata per il tipo di media
 */
export function MediaIcon({ item, size = 20 }: MediaIconProps) {
  if (item.mediaType === 'video') {
    return <Video size={size} className="text-purple-500" />;
  } else if (item.mediaType === 'document') {
    if (item.type.includes('pdf')) {
      return <FileText size={size} className="text-red-500" />;
    } else if (item.type.includes('word') || item.type.includes('msword')) {
      return <FileText size={size} className="text-blue-500" />;
    } else if (item.type.includes('excel') || item.type.includes('spreadsheet')) {
      return <FileText size={size} className="text-green-500" />;
    } else {
      return <FileText size={size} className="text-gray-500" />;
    }
  } else if (item.mediaType === 'image') {
    return <Image size={size} className="text-blue-500" />;
  } else {
    return <FileText size={size} className="text-gray-500" />;
  }
}
