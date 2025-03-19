import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  change: string;
  isDarkMode: boolean;
}

export function StatCard({ icon, title, value, change, isDarkMode }: StatCardProps) {
  return (
    <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-700 bg-opacity-50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        {icon}
        <span className="text-green-500">{change}</span>
      </div>
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}