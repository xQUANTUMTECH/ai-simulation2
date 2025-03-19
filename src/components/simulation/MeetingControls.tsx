import React, { useState } from 'react';
import { 
  Presentation, UserCog, Lightbulb, GitBranch, ClipboardList, 
  Microscope, FileText, CheckSquare, AlertTriangle, Save,
  Brain, MessageSquare, Users, Settings, Play, Pause,
  Clock, BarChart, Share2, Download, ChevronDown, ChevronUp,
  Bell, Calendar, List, Grid, Filter, Search, Plus, X,
  Video, Mic, Volume2, VolumeX, ScreenShare, StopCircle
} from 'lucide-react';
import { Modal } from '../Modal';

interface MeetingControlsProps {
  isDarkMode: boolean;
  onToolSelect: (tool: string) => void;
}

interface Participant {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'offline';
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
}

export function MeetingControls({ isDarkMode, onToolSelect }: MeetingControlsProps) {
  const [meetingStatus, setMeetingStatus] = useState<'waiting' | 'active' | 'paused'>('waiting');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: '1',
      name: 'Dr. Rossi',
      role: 'Presentatore',
      status: 'online',
      isMuted: false,
      isVideoOn: true,
      isScreenSharing: false
    },
    {
      id: '2',
      name: 'Dr. Bianchi',
      role: 'Partecipante',
      status: 'online',
      isMuted: true,
      isVideoOn: true,
      isScreenSharing: false
    }
  ]);

  const toggleMeetingStatus = () => {
    if (meetingStatus === 'waiting') {
      setMeetingStatus('active');
    } else if (meetingStatus === 'active') {
      setMeetingStatus('paused');
    } else {
      setMeetingStatus('active');
    }
  };

  const toggleParticipantAudio = (participantId: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === participantId ? { ...p, isMuted: !p.isMuted } : p
    ));
  };

  const toggleParticipantVideo = (participantId: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === participantId ? { ...p, isVideoOn: !p.isVideoOn } : p
    ));
  };

  return (
    <div className="space-y-4 p-4">
      {/* Meeting Status */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              meetingStatus === 'active' ? 'bg-green-500' :
              meetingStatus === 'paused' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
            <span className="font-medium">
              {meetingStatus === 'active' ? 'Riunione in corso' :
               meetingStatus === 'paused' ? 'Riunione in pausa' :
               'In attesa di iniziare'}
            </span>
          </div>
          <span className="text-gray-400">{elapsedTime}</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={toggleMeetingStatus}
            className={`p-3 rounded-lg transition-colors flex flex-col items-center gap-1 ${
              meetingStatus === 'active' ? 'bg-red-500 hover:bg-red-600' :
              'bg-green-500 hover:bg-green-600'
            }`}
          >
            {meetingStatus === 'active' ? <Pause size={20} /> : <Play size={20} />}
            <span className="text-xs">
              {meetingStatus === 'active' ? 'Pausa' : 'Inizia'}
            </span>
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-lg transition-colors flex flex-col items-center gap-1 ${
              isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            <span className="text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-3 rounded-lg transition-colors flex flex-col items-center gap-1 ${
              !isVideoOn ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <Video size={20} />
            <span className="text-xs">{isVideoOn ? 'Stop Video' : 'Start Video'}</span>
          </button>

          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`p-3 rounded-lg transition-colors flex flex-col items-center gap-1 ${
              isScreenSharing ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <ScreenShare size={20} />
            <span className="text-xs">Condividi</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowParticipants(true)}
          className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <Users size={20} />
          Partecipanti ({participants.length})
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <Settings size={20} />
          Impostazioni
        </button>
      </div>

      {/* Participants Modal */}
      <Modal
        isOpen={showParticipants}
        onClose={() => setShowParticipants(false)}
        title="Partecipanti"
        isDarkMode={isDarkMode}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Search className="text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cerca partecipanti..."
              className="flex-1 bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-2">
            {participants.map(participant => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                      <span className="text-white font-medium">
                        {participant.name.charAt(0)}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-700 ${
                      participant.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">{participant.name}</p>
                    <p className="text-sm text-gray-400">{participant.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleParticipantAudio(participant.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      participant.isMuted ? 'bg-red-500 hover:bg-red-600' : 'hover:bg-gray-600'
                    }`}
                  >
                    {participant.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <button
                    onClick={() => toggleParticipantVideo(participant.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      !participant.isVideoOn ? 'bg-red-500 hover:bg-red-600' : 'hover:bg-gray-600'
                    }`}
                  >
                    <Video size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            className="w-full p-3 rounded-lg bg-purple-500 hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Invita Partecipanti
          </button>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Impostazioni Riunione"
        isDarkMode={isDarkMode}
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Audio</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Dispositivo di Input
                </label>
                <select className="w-full bg-gray-700 rounded-lg px-4 py-2">
                  <option>Microfono Predefinito</option>
                  <option>Microfono USB</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Dispositivo di Output
                </label>
                <select className="w-full bg-gray-700 rounded-lg px-4 py-2">
                  <option>Altoparlanti Predefiniti</option>
                  <option>Cuffie USB</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Video</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Webcam
                </label>
                <select className="w-full bg-gray-700 rounded-lg px-4 py-2">
                  <option>Webcam Integrata</option>
                  <option>Webcam USB</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Ottimizza per illuminazione scarsa</span>
                <button className="w-12 h-6 rounded-full bg-purple-500 relative">
                  <div className="w-4 h-4 rounded-full bg-white absolute right-1 top-1" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Registrazione</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Registra automaticamente</span>
                <button className="w-12 h-6 rounded-full bg-gray-600 relative">
                  <div className="w-4 h-4 rounded-full bg-white absolute left-1 top-1" />
                </button>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Posizione di salvataggio
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value="/recordings"
                    readOnly
                    className="flex-1 bg-gray-700 rounded-lg px-4 py-2"
                  />
                  <button className="px-4 py-2 bg-gray-700 rounded-lg">
                    Sfoglia
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}