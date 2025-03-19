import React, { useState } from 'react';
import { UserPlus, Search, Users, MessageSquare, Gamepad2, BarChart, Mail, X } from 'lucide-react';
import { Modal } from '../Modal';

interface FriendsProps {
  isDarkMode: boolean;
}

interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline';
  lastActive: string;
  stats: {
    scenariCompleted: number;
    averageScore: number;
    hoursPlayed: number;
  };
}

export function Friends({ isDarkMode }: FriendsProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showFriendStats, setShowFriendStats] = useState(false);

  const friends: Friend[] = [
    {
      id: '1',
      name: 'Marco Rossi',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      status: 'online',
      lastActive: 'Ora',
      stats: {
        scenariCompleted: 45,
        averageScore: 92,
        hoursPlayed: 120
      }
    },
    {
      id: '2',
      name: 'Laura Bianchi',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      status: 'offline',
      lastActive: '2 ore fa',
      stats: {
        scenariCompleted: 38,
        averageScore: 88,
        hoursPlayed: 95
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Amici</h2>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <UserPlus size={20} />
          Invita Amici
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Cerca amici..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700 focus:border-purple-500' 
              : 'bg-white border-gray-200 focus:border-purple-400'
          }`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className={`p-6 rounded-xl border ${
              isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={friend.avatar}
                  alt={friend.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div
                  className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-gray-800 ${
                    friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{friend.name}</h3>
                <p className="text-sm text-gray-400">
                  {friend.status === 'online' ? 'Online' : `Ultimo accesso: ${friend.lastActive}`}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedFriend(friend);
                  setShowFriendStats(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <BarChart size={16} />
                Statistiche
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 transition-colors text-white"
              >
                <Gamepad2 size={16} />
                Invita a Scenario
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invita Amici"
      >
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca per nome o email..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Suggeriti</h3>
            {[
              { name: 'Giuseppe Verdi', email: 'g.verdi@example.com' },
              { name: 'Anna Neri', email: 'a.neri@example.com' }
            ].map((user, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                </div>
                <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                  Invita
                </button>
              </div>
            ))}
          </div>

          <div>
            <h3 className="font-medium mb-4">Invita via Email</h3>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Inserisci email..."
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
              />
              <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                <Mail size={20} />
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Friend Stats Modal */}
      <Modal
        isOpen={showFriendStats}
        onClose={() => setShowFriendStats(false)}
        title={`Statistiche di ${selectedFriend?.name}`}
      >
        {selectedFriend && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-700 rounded-lg text-center">
                <h4 className="text-sm text-gray-400 mb-2">Scenari Completati</h4>
                <p className="text-2xl font-bold">{selectedFriend.stats.scenariCompleted}</p>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg text-center">
                <h4 className="text-sm text-gray-400 mb-2">Punteggio Medio</h4>
                <p className="text-2xl font-bold text-green-500">{selectedFriend.stats.averageScore}%</p>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg text-center">
                <h4 className="text-sm text-gray-400 mb-2">Ore Giocate</h4>
                <p className="text-2xl font-bold">{selectedFriend.stats.hoursPlayed}h</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Scenari Recenti</h3>
              {[
                { name: 'Gestione Emergenze', date: '2 giorni fa', score: 95 },
                { name: 'Analisi Contrattuale', date: '5 giorni fa', score: 88 },
                { name: 'Consulenza Tecnica', date: '1 settimana fa', score: 92 }
              ].map((scenario, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium">{scenario.name}</p>
                    <p className="text-sm text-gray-400">{scenario.date}</p>
                  </div>
                  <span className="text-green-500 font-medium">{scenario.score}%</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowFriendStats(false);
                // Handle scenario invitation
              }}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Invita a uno Scenario
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}