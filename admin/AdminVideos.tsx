import React from 'react';
import { Video, Play, Upload, Settings, BarChart } from 'lucide-react';

interface AdminVideosProps {
  isDarkMode: boolean;
}

export function AdminVideos({ isDarkMode }: AdminVideosProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Gestione Video</h2>

      {/* Video Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500 bg-opacity-20 flex items-center justify-center">
              <Video className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-medium">Total Videos</h3>
              <p className="text-2xl font-bold">324</p>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Active</span>
            <span>256</span>
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500 bg-opacity-20 flex items-center justify-center">
              <Play className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-medium">Total Views</h3>
              <p className="text-2xl font-bold">15.2K</p>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>This Month</span>
            <span>+2.4K</span>
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
              <p className="text-2xl font-bold">256GB</p>
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Capacity</span>
            <span>500GB</span>
          </div>
        </div>
      </div>

      {/* Video Management features would go here */}
    </div>
  );
}