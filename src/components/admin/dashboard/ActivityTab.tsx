import React from 'react';
import { ActivityTabProps } from './types';

/**
 * Componente tab per visualizzare le attività recenti
 */
export function ActivityTab({ 
  isDarkMode, 
  onViewDetails 
}: ActivityTabProps) {
  return (
    <div className={`p-6 rounded-xl border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <h2 className="text-lg font-semibold mb-4">Attività Recenti</h2>
      
      {/* Usa direttamente ActivityFeed dal componente parent */}
    </div>
  );
}

export default ActivityTab;
