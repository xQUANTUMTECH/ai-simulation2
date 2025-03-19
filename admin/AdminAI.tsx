import React from 'react';
import { Brain, Settings, BarChart, RefreshCw } from 'lucide-react';

interface AdminAIProps {
  isDarkMode: boolean;
}

export function AdminAI({ isDarkMode }: AdminAIProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Gestione AI</h2>

      {/* Model Status */}
      <div className={`p-6 rounded-xl border ${
        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      }`}>
        <h3 className="text-lg font-medium mb-4">Stato dei Modelli</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'Primary Model', status: 'active', accuracy: 92, load: 65 },
            { name: 'Backup Model', status: 'standby', accuracy: 89, load: 10 },
            { name: 'Training Model', status: 'training', accuracy: 87, load: 95 }
          ].map((model, index) => (
            <div key={index} className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{model.name}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  model.status === 'active' ? 'bg-green-500 bg-opacity-20 text-green-500' :
                  model.status === 'standby' ? 'bg-blue-500 bg-opacity-20 text-blue-500' :
                  'bg-yellow-500 bg-opacity-20 text-yellow-500'
                }`}>
                  {model.status}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Accuracy</span>
                  <span>{model.accuracy}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Load</span>
                  <span>{model.load}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className={`p-6 rounded-xl border ${
        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      }`}>
        <h3 className="text-lg font-medium mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="font-medium mb-4">Response Time</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Average</span>
                <span>245ms</span>
              </div>
              <div className="flex justify-between">
                <span>95th Percentile</span>
                <span>450ms</span>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-700 rounded-lg">
            <h4 className="font-medium mb-4">Success Rate</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Successful</span>
                <span>98.5%</span>
              </div>
              <div className="flex justify-between">
                <span>Failed</span>
                <span>1.5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}