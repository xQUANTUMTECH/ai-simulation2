import React from 'react';
import { AlertsTabProps } from './types';

/**
 * Componente tab per visualizzare gli avvisi di sistema
 */
export function AlertsTab({ 
  isDarkMode, 
  onViewDetails,
  onResolve,
  onAssign
}: AlertsTabProps) {
  return (
    <div className={`p-6 rounded-xl border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <h2 className="text-lg font-semibold mb-4">Avvisi di Sistema</h2>
      
      {/* Usa direttamente SystemAlerts dal componente parent */}
    </div>
  );
}

export default AlertsTab;
