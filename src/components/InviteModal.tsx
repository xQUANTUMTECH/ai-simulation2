import React, { useState, useEffect } from 'react';
import { Search, Users, Clock, Calendar, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { Modal } from './Modal';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  scenario: {
    title: string;
    description: string;
    duration: string;
    maxParticipants: number;
  } | null;
}

interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline';
  role?: string;
}

export function InviteModal({ isOpen, onClose, isDarkMode = true, scenario }: InviteModalProps) {
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Reset dello stato quando si apre/chiude il modale
  useEffect(() => {
    if (!isOpen) {
      // Reset dello stato quando il modale si chiude
      setSelectedFriends([]);
      setSearchQuery('');
      setShowConfirmation(false);
    }
  }, [isOpen]);

  const friends: Friend[] = [
    {
      id: '1',
      name: 'Marco Rossi',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
      status: 'online',
      role: 'Chirurgo'
    },
    {
      id: '2',
      name: 'Laura Bianchi',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      status: 'offline',
      role: 'Anestesista'
    }
  ];

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleInvite = () => {
    // Evita invii multipli
    if (showConfirmation) return;
    
    setShowConfirmation(true);
    
    // Qui implementeresti la logica di invito
    // Per ora simulo un'operazione asincrona
    setTimeout(() => {
      setShowConfirmation(false);
      onClose();
    }, 2000);
  };

  // Se non c'è uno scenario o il modale non è aperto, non renderizzare nulla
  if (!scenario || !isOpen) return null;

  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (friend.role && friend.role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invita Partecipanti" isDarkMode={isDarkMode}>
      <div className="space-y-6">
        {/* Scenario Info */}
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <h3 className="font-medium mb-2">{scenario.title}</h3>
          <p className="text-sm text-gray-400 mb-4">{scenario.description}</p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock size={16} />
              {scenario.duration}
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} />
              Max {scenario.maxParticipants} partecipanti
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cerca partecipanti..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                : 'bg-white border-gray-200 focus:border-purple-400'
            }`}
            aria-label="Cerca partecipanti"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              aria-label="Cancella ricerca"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Friends List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredFriends.length > 0 ? (
            filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 bg-gray-800' 
                    : 'hover:bg-gray-100 bg-white'
                }`}
                onClick={() => toggleFriendSelection(friend.id)}
                role="checkbox"
                aria-checked={selectedFriends.includes(friend.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleFriendSelection(friend.id);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${
                        isDarkMode ? 'border-gray-800' : 'border-white'
                      } ${
                        friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{friend.name}</p>
                    <p className="text-sm text-gray-400">{friend.role}</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedFriends.includes(friend.id)
                    ? 'bg-purple-500 border-purple-500'
                    : isDarkMode
                      ? 'border-gray-600'
                      : 'border-gray-300'
                }`}>
                  {selectedFriends.includes(friend.id) && (
                    <CheckCircle2 size={16} className="text-white" />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className={`p-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Nessun risultato trovato
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-100 text-gray-700'
            }`}
            aria-label="Annulla invito"
          >
            Annulla
          </button>
          <button
            onClick={handleInvite}
            disabled={selectedFriends.length === 0 || showConfirmation}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              selectedFriends.length === 0 || showConfirmation
                ? isDarkMode
                  ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                  : 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
            aria-busy={showConfirmation}
            aria-disabled={selectedFriends.length === 0 || showConfirmation}
          >
            {showConfirmation ? (
              <>
                <CheckCircle2 size={20} />
                Inviti Inviati!
              </>
            ) : (
              <>
                <ArrowRight size={20} />
                Invia Inviti ({selectedFriends.length})
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
