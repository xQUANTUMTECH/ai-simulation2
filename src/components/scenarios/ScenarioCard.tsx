import React from 'react';
import { Play, UserPlus, Settings as SettingsIcon, Users } from 'lucide-react';

interface ScenarioCardProps {
  scenario: {
    id: string;
    title: string;
    description: string;
    avatars: number;
    status: string;
  };
  onStart: () => void;
  onInvite: () => void;
  onAvatarDetails: () => void;
}

export function ScenarioCard({ scenario, onStart, onInvite, onAvatarDetails }: ScenarioCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{scenario.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{scenario.description}</p>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={onStart}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Play size={16} />
              Avvia Simulazione
            </button>
            <button
              onClick={onInvite}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              <UserPlus size={16} />
              Invita
            </button>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs rounded-full bg-gray-200 text-gray-700">
              {scenario.avatars} Avatar
            </span>
            <span className="px-3 py-1 text-xs rounded-full bg-blue-200 text-blue-700">
              {scenario.status}
            </span>
            <button
              onClick={onAvatarDetails}
              className="px-3 py-1 text-xs rounded-full bg-purple-500 text-white hover:bg-purple-600 transition-colors flex items-center gap-1"
            >
              <Users size={12} />
              Dettagli Avatar
            </button>
          </div>
          <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <SettingsIcon size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}