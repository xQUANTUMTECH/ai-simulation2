import React from 'react';
import { Award, Download, CheckCircle2, Clock } from 'lucide-react';

interface AdminCertificatesProps {
  isDarkMode: boolean;
}

export function AdminCertificates({ isDarkMode }: AdminCertificatesProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Gestione Certificati</h2>

      {/* Certificate Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500 bg-opacity-20 flex items-center justify-center">
              <Award className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-medium">Total Certificates</h3>
              <p className="text-2xl font-bold">450</p>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Active</span>
            <span>412</span>
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500 bg-opacity-20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-medium">Issued This Month</h3>
              <p className="text-2xl font-bold">45</p>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Pending</span>
            <span>12</span>
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500 bg-opacity-20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="font-medium">Average Issue Time</h3>
              <p className="text-2xl font-bold">24h</p>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Target</span>
            <span>48h</span>
          </div>
        </div>
      </div>

      {/* Certificate Management features would go here */}
    </div>
  );
}