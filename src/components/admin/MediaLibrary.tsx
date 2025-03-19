import React from 'react';
import { MediaManager } from './media/MediaManager';

interface MediaLibraryProps {
  isDarkMode: boolean;
}

/**
 * Componente wrapper per la Media Library
 * Utilizza il componente MediaManager modulare
 */
export function MediaLibrary({ isDarkMode }: MediaLibraryProps) {
  return <MediaManager isDarkMode={isDarkMode} />;
}
