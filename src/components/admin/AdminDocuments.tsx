import React from 'react';
import { FileText, Upload, Download, Trash2 } from 'lucide-react';

interface AdminDocumentsProps {
  isDarkMode: boolean;
}

export function AdminDocuments({ isDarkMode }: AdminDocumentsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Gestione Documenti</h2>

      {/* Document Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500 bg-opacity-20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-medium">Total Documents</h3>
              <p className="text-2xl font-bold">892</p>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Active</span>
            <span>745</span>
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500 bg-opacity-20 flex items-center justify-center">
              <Download className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-medium">Downloads</h3>
              <p className="text-2xl font-bold">12.5K</p>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>This Month</span>
            <span>+1.8K</span>
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500 bg-opacity-20 flex items-center justify-center">
              <Upload className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="font-medium">Storage Used</h3>
              <p className="text-2xl font-bold">45GB</p>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Capacity</span>
            <span>100GB</span>
          </div>
        </div>
      </div>

      {/* Document Management features would go here */}
    </div>
  );
}