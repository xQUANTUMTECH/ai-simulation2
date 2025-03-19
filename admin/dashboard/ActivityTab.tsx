import React from 'react';
import { ActivityTabProps } from './types';
import { ActivityFeed } from '../ActivityFeed';

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
      <ActivityFeed
        isDarkMode={isDarkMode}
        limit={10}
        showFilters={true}
        showSearch={true}
        height="600px"
        onViewDetails={onViewDetails}
      />
    </div>
  );
}

export default ActivityTab;
