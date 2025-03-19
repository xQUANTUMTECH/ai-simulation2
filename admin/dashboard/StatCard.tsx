import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { StatCardProps } from './types';

/**
 * Componente che visualizza una statistica con un'icona, un valore e la variazione
 */
export function StatCard({ icon, label, value, change, isDarkMode }: StatCardProps) {
  return (
    <div className={`p-6 rounded-xl border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 ${
          change >= 0 ? 'text-green-500' : 'text-red-500'
        }`}>
          {change >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <h3 className="text-2xl font-bold mb-1">{value.toLocaleString()}</h3>
      <p className="text-gray-400">{label}</p>
    </div>
  );
}

export default StatCard;
