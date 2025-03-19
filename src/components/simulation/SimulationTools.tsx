import React, { useState } from 'react';
import { 
  PenTool, Eraser, Undo, Redo, Users, MessageSquare, Brain,
  Settings, Grid, Lock, Unlock, Share2, FileText, Upload,
  Clock, CheckSquare, AlertTriangle, Book, BarChart
} from 'lucide-react';

interface SimulationToolsProps {
  isDarkMode: boolean;
  onToolSelect: (tool: string) => void;
  onAddNote?: (note: { text: string; type: 'observation' | 'feedback' | 'action' }) => void;
  onClose?: () => void;
}

interface Note {
  id: string;
  text: string;
  type: 'observation' | 'feedback' | 'action';
  timestamp: string;
}

export function SimulationTools({ isDarkMode, onToolSelect, onClose }: SimulationToolsProps) {
  const [activeTab, setActiveTab] = useState('info');
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState('');
  const [currentNoteType, setCurrentNoteType] = useState<Note['type']>('observation');

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="font-medium">Strumenti</h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg md:hidden"
          >
            <Settings size={20} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 overflow-x-auto">
        {[
          { id: 'info', icon: <FileText size={16} />, label: 'Info' },
          { id: 'notes', icon: <PenTool size={16} />, label: 'Note' },
          { id: 'analysis', icon: <Brain size={16} />, label: 'Analisi' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 p-4 transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-purple-500 text-purple-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.icon}
            <span className="text-sm">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Note Type Selection */}
            <div className="flex gap-2">
              {[
                { type: 'observation', icon: <FileText size={16} />, label: 'Osservazione' },
                { type: 'feedback', icon: <MessageSquare size={16} />, label: 'Feedback' },
                { type: 'action', icon: <Play size={16} />, label: 'Azione' }
              ].map(option => (
                <button
                  key={option.type}
                  onClick={() => setCurrentNoteType(option.type as Note['type'])}
                  className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg transition-colors ${
                    currentNoteType === option.type
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {option.icon}
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>

            {/* Note Input */}
            <div className="space-y-2">
              <textarea
                value={currentNote}
                onChange={(e) => setCurrentNote(e.target.value)}
                placeholder="Aggiungi una nota..."
                className="w-full h-24 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-purple-500 resize-none"
              />
              <button
                onClick={() => {
                  if (currentNote.trim()) {
                    setNotes(prev => [...prev, {
                      id: Date.now().toString(),
                      text: currentNote,
                      type: currentNoteType,
                      timestamp: new Date().toLocaleTimeString()
                    }]);
                    setCurrentNote('');
                  }
                }}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Salva Nota
              </button>
            </div>

            {/* Notes List */}
            <div className="space-y-2">
              {notes.map(note => (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg ${
                    note.type === 'observation' ? 'bg-blue-500 bg-opacity-10' :
                    note.type === 'feedback' ? 'bg-green-500 bg-opacity-10' :
                    'bg-yellow-500 bg-opacity-10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm ${
                      note.type === 'observation' ? 'text-blue-400' :
                      note.type === 'feedback' ? 'text-green-400' :
                      'text-yellow-400'
                    }`}>
                      {note.type === 'observation' ? 'Osservazione' :
                       note.type === 'feedback' ? 'Feedback' : 'Azione'}
                    </span>
                    <span className="text-sm text-gray-400">{note.timestamp}</span>
                  </div>
                  <p>{note.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-4">
            {/* AI Analysis */}
            <div className="p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain size={20} className="text-purple-500" />
                <h4 className="font-medium">Analisi AI</h4>
              </div>
              <p className="text-sm text-gray-400">
                L'AI sta analizzando l'interazione in tempo reale...
              </p>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-2">
              {[
                { label: 'Comunicazione', value: 85 },
                { label: 'Decisioni', value: 92 },
                { label: 'Collaborazione', value: 78 }
              ].map((metric, index) => (
                <div key={index} className="p-4 bg-gray-800 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">{metric.label}</span>
                    <span className="text-sm text-purple-500">{metric.value}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full">
                    <div
                      className="h-2 bg-purple-500 rounded-full transition-all"
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}