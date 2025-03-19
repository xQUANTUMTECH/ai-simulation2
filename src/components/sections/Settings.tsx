import React from 'react';
import { Moon, Sun, Volume2, Mic } from 'lucide-react';

interface SettingsProps {
  isDarkMode: boolean;
  voiceInput: boolean;
  setIsDarkMode: (value: boolean) => void;
  setVoiceInput: (value: boolean) => void;
}

export function Settings({ isDarkMode, voiceInput, setIsDarkMode, setVoiceInput }: SettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Impostazioni</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4">Preferenze</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Tema Scuro</p>
                <p className="text-sm text-gray-400">Cambia l'aspetto dell'interfaccia</p>
              </div>
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'bg-purple-500' : 'bg-gray-200'}`}
              >
                {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Input Vocale</p>
                <p className="text-sm text-gray-400">Abilita il controllo vocale</p>
              </div>
              <button 
                onClick={() => setVoiceInput(!voiceInput)}
                className={`p-2 rounded-lg transition-colors ${voiceInput ? 'bg-purple-500' : 'bg-gray-200'}`}
              >
                {voiceInput ? <Volume2 size={20} /> : <Mic size={20} />}
              </button>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4">Profilo</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
                alt="Profile"
                className="w-16 h-16 rounded-xl"
              />
              <button className="px-4 py-2 text-sm border border-gray-600 rounded-lg hover:border-purple-500 transition-colors">
                Cambia Immagine
              </button>
            </div>
            <div>
              <label className="text-sm text-gray-400">Nome</label>
              <input
                type="text"
                defaultValue="Mario Rossi"
                className={`mt-1 w-full p-2 rounded-lg border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Email</label>
              <input
                type="email"
                defaultValue="mario.rossi@example.com"
                className={`mt-1 w-full p-2 rounded-lg border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}