import React, { useState } from 'react';
import { Users, Search, Brain, Plus, X } from 'lucide-react';

interface Avatar {
  id: string;
  name: string;
  role: string;
  type: string;
  expertise: string[];
}

interface AvatarSelectorProps {
  onSelect: (avatar: Avatar) => void;
  selectedAvatars: Avatar[];
  isDarkMode: boolean;
}

export function AvatarSelector({ onSelect, selectedAvatars, isDarkMode }: AvatarSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const availableAvatars: Avatar[] = [
    {
      id: '1',
      name: 'Assistente Chirurgo',
      role: 'Chirurgo',
      type: 'medical',
      expertise: ['Chirurgia generale', 'Procedure mini-invasive']
    },
    {
      id: '2',
      name: 'Anestesista AI',
      role: 'Anestesista',
      type: 'medical',
      expertise: ['Anestesia generale', 'Monitoraggio parametri']
    },
    {
      id: '3',
      name: 'Infermiere Virtuale',
      role: 'Infermiere',
      type: 'medical',
      expertise: ['Assistenza chirurgica', 'Gestione emergenze']
    }
  ];

  const filteredAvatars = availableAvatars.filter(avatar => 
    avatar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    avatar.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    avatar.expertise.some(exp => exp.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Avatar Disponibili</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Plus size={20} />
          Nuovo Avatar
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca per nome, ruolo o competenza..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
        />
      </div>

      <div className="space-y-4">
        {filteredAvatars.map((avatar) => (
          <div
            key={avatar.id}
            className="p-4 bg-gray-700 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                  {avatar.type === 'medical' ? (
                    <Users size={24} className="text-white" />
                  ) : (
                    <Brain size={24} className="text-white" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium">{avatar.name}</h4>
                  <p className="text-sm text-gray-400">{avatar.role}</p>
                </div>
              </div>
              <button
                onClick={() => onSelect(avatar)}
                disabled={selectedAvatars.some(a => a.id === avatar.id)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedAvatars.some(a => a.id === avatar.id)
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-purple-500 hover:bg-purple-600'
                }`}
              >
                {selectedAvatars.some(a => a.id === avatar.id) ? 'Aggiunto' : 'Aggiungi'}
              </button>
            </div>
            <div className="mt-3">
              <h5 className="text-sm text-gray-400 mb-2">Competenze</h5>
              <div className="flex flex-wrap gap-2">
                {avatar.expertise.map((exp, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-xs bg-gray-600 rounded-full"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedAvatars.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">Avatar Selezionati</h3>
          <div className="space-y-2">
            {selectedAvatars.map((avatar) => (
              <div
                key={avatar.id}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                    <Users size={16} className="text-white" />
                  </div>
                  <span>{avatar.name}</span>
                </div>
                <button
                  onClick={() => {
                    const newSelected = selectedAvatars.filter(a => a.id !== avatar.id);
                    onSelect(newSelected as any);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}