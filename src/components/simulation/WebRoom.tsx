import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Users, Mic, MicOff, Video, VideoOff, X, PenTool, Eraser, 
  Undo, Redo, Share2, Grid, Lock, Unlock, MessageSquare, 
  Download, ChevronDown, ChevronRight, FileText, Brain, 
  Upload, Clock, Settings, ArrowLeft, Send, BookOpen,
  Save, AlertCircle, Sun, Moon
} from 'lucide-react';
import { Groq } from 'groq-sdk'; // Installa con: npm install groq-sdk
import { aiService } from '../../services/ai-service';
import { voiceService } from '../../services/voice-service';
import { ttsQueueService } from '../../services/tts-queue-service';

interface WebRoomProps {
  roomId: string;
  participants: Array<{
    id: string;
    name: string;
    isAI: boolean;
    role: string;
    state?: {
      speaking: boolean;
      emotion: string;
      activity: string;
      position: Position;
    };
    avatar?: string;
  }>;
  isDarkMode: boolean;
  onLeave: () => void;
}

interface Position {
  x: number;
  y: number;
  rotation: number;
  targetX?: number;
  targetY?: number;
  targetRotation?: number;
  velocity?: number;
}

interface InteractionZone {
  id: string;
  type: 'discussion' | 'presentation' | 'observation';
  position: Position;
  radius: number;
  participants: string[];
}

export function WebRoom({ roomId, participants, isDarkMode, onLeave }: WebRoomProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourcesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());
  const audioPannersRef = useRef<Map<string, PannerNode>>(new Map());
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasSpectroRef = useRef<HTMLCanvasElement>(null);

  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [zones, setZones] = useState<InteractionZone[]>([]);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0, rotation: 0 });
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState<{ sender: string; content: string; timestamp: string }[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [showTranscription, setShowTranscription] = useState(true);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState({
    groq: false,
    openRouter: false,
    supabase: false
  });
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));

  // Creazione di un client Groq
  const groqClient = new Groq({ 
    apiKey: import.meta.env.VITE_GROQ_API_KEY || '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',
    dangerouslyAllowBrowser: true // Enable browser usage
  });

  // Verifica dello stato delle API
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        // Test Groq
        const groqTest = await groqClient.chat.completions.create({
          messages: [{ role: "user", content: "Test" }],
          model: "mixtral-8x7b-32768",
          max_tokens: 5,
        });
        setApiStatus(prev => ({ ...prev, groq: !!groqTest }));
      } catch (e) {
        console.error("Groq API test failed:", e);
      }

      try {
        // Test OpenRouter tramite aiService
        const openRouterTest = await aiService.generateResponse("Semplice test di connessione", "mistral");
        setApiStatus(prev => ({ ...prev, openRouter: !!openRouterTest }));
      } catch (e) {
        console.error("OpenRouter API test failed:", e);
      }
      
      // Inizializza anche il servizio vocale con aiService come TTS
      voiceService.setTTSService(aiService);
    };

    checkApiStatus();
  }, []);

  // Inizializza Audio Context
  useEffect(() => {
    audioContextRef.current = new AudioContext();
    
    // Configurazione Analyser per spettro vocale
    if (audioContextRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      setAudioData(new Uint8Array(analyserRef.current.frequencyBinCount));
    }
    
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Animazione spettro vocale
  useEffect(() => {
    if (!analyserRef.current || !canvasSpectroRef.current || !audioData.length) return;
    
    const spectroCanvas = canvasSpectroRef.current;
    const spectroCtx = spectroCanvas.getContext('2d');
    if (!spectroCtx) return;
    
    let animationFrame: number;
    
    const drawSpectrum = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(audioData);
      
      spectroCtx.clearRect(0, 0, spectroCanvas.width, spectroCanvas.height);
      
      const barWidth = (spectroCanvas.width / audioData.length) * 2.5;
      let x = 0;
      
      for (let i = 0; i < audioData.length; i++) {
        const barHeight = (audioData[i] / 255) * spectroCanvas.height;
        
        // Gradiente in base all'altezza
        const hue = i / audioData.length * 360;
        spectroCtx.fillStyle = isSpeaking 
          ? `hsl(${hue}, 100%, 50%)` 
          : `rgba(147, 51, 234, ${barHeight / spectroCanvas.height})`;
          
        spectroCtx.fillRect(x, spectroCanvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
      
      animationFrame = requestAnimationFrame(drawSpectrum);
    };
    
    drawSpectrum();
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [audioData, isSpeaking]);

  // Configurazione STT con Groq
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (audioEnabled) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        audioRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        const chunks: Blob[] = [];

        // Creiamo la connessione all'analizzatore audio
        const source = audioContextRef.current!.createMediaStreamSource(stream);
        
        // Collegamento all'analizzatore per lo spettro vocale
        if (analyserRef.current) {
          source.connect(analyserRef.current);
        }
        
        // Creazione del panner spaziale ma senza connessione diretta all'output
        // Questo risolve il problema dell'eco audio
        const panner = audioContextRef.current!.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1;
        panner.maxDistance = 10000;
        panner.rolloffFactor = 1;
        
        // NON colleghiamo l'audio dell'utente all'output 
        // per prevenire l'eco (rimuoviamo la connessione diretta all'output)
        
        // Aggiungiamo un nodo Gain per controllare meglio il volume
        const gainNode = audioContextRef.current!.createGain();
        gainNode.gain.value = 0; // 0 = non si sente l'eco, ma l'analizzatore funziona ancora
        
        // Colleghiamo la sorgente audio dell'utente all'analizzatore e al gain node
        source.connect(gainNode);
        
        // Archiviamo i riferimenti per la gestione successiva
        audioSourcesRef.current.set('user', source);
        audioPannersRef.current.set('user', panner);

        audioRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
        audioRecorderRef.current.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const file = new File([blob], 'recording.webm', { type: 'audio/webm' });

          try {
            setIsSpeaking(true);
            const transcription = await groqClient.audio.transcriptions.create({
              file,
              model: 'whisper-large-v3-turbo',
              response_format: 'text',
              language: 'it',
              temperature: 0.0,
            });
            
            if (transcription.text.trim()) {
              setTranscriptions(prev => [transcription.text, ...prev].slice(0, 10));
              setCurrentMessage(prev => prev + (prev ? ' ' : '') + transcription.text);
            }
            setIsSpeaking(false);
          } catch (error) {
            console.error('Errore nella trascrizione con Groq:', error);
            setIsSpeaking(false);
          }
          chunks.length = 0;
        };

        audioRecorderRef.current.start();
        intervalId = setInterval(() => {
          if (audioRecorderRef.current?.state === 'recording') {
            audioRecorderRef.current.stop();
            audioRecorderRef.current.start();
          }
        }, 5000);
      }).catch(err => console.error('Errore accesso microfono:', err));
    }

    return () => {
      clearInterval(intervalId);
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
        audioRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      audioSourcesRef.current.forEach(source => source.disconnect());
      audioPannersRef.current.forEach(panner => panner.disconnect());
    };
  }, [audioEnabled]);

  // Aggiorna posizioni audio spaziali
  const updateAudioPositions = useCallback(() => {
    positions.forEach((pos, participantId) => {
      const panner = audioPannersRef.current.get(participantId);
      if (panner && audioContextRef.current) {
        const x = (pos.x / (canvasRef.current?.width || 1)) * 2 - 1;
        const y = (pos.y / (canvasRef.current?.height || 1)) * 2 - 1;
        panner.positionX.setValueAtTime(x, audioContextRef.current.currentTime);
        panner.positionY.setValueAtTime(y, audioContextRef.current.currentTime);
        panner.positionZ.setValueAtTime(0, audioContextRef.current.currentTime);
      }
    });
  }, [positions]);

  // Animazione Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    participants.forEach(participant => {
      if (!positions.has(participant.id)) {
        setPositions(prev => new Map(prev).set(participant.id, {
          x: Math.random() * (canvas.width - 100),
          y: Math.random() * (canvas.height - 100),
          rotation: Math.random() * Math.PI * 2,
          velocity: 0.1,
        }));
      }
    });

    let animationFrame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (showGrid) drawGrid(ctx, canvas.width, canvas.height);
      zones.forEach(zone => drawZone(ctx, zone));

      participants.forEach(participant => {
        const pos = positions.get(participant.id);
        if (!pos) return;

        if (isDragging === participant.id) {
          pos.x += (mousePos.x - pos.x) * 0.2;
          pos.y += (mousePos.y - pos.y) * 0.2;
        } else if (pos.targetX !== undefined && pos.targetY !== undefined) {
          const dx = pos.targetX - pos.x;
          const dy = pos.targetY - pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 1) {
            pos.x += dx * (pos.velocity || 0.1);
            pos.y += dy * (pos.velocity || 0.1);
            const targetAngle = Math.atan2(dy, dx);
            const angleDiff = (targetAngle - pos.rotation + Math.PI) % (2 * Math.PI) - Math.PI;
            pos.rotation += angleDiff * 0.1;
          } else {
            pos.targetX = undefined;
            pos.targetY = undefined;
          }
        }

        drawParticipant(ctx, participant, pos, participant.id === 'user');
      });

      updateAudioPositions();
      animationFrame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [participants, positions, isDragging, mousePos, showGrid, zones, updateAudioPositions]);

  // Funzioni di Disegno
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 50) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += 50) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  };

  const drawZone = (ctx: CanvasRenderingContext2D, zone: InteractionZone) => {
    ctx.beginPath();
    ctx.arc(zone.position.x, zone.position.y, zone.radius, 0, Math.PI * 2);
    ctx.fillStyle = zone.type === 'discussion' ? 'rgba(147, 51, 234, 0.2)' :
                    zone.type === 'presentation' ? 'rgba(59, 130, 246, 0.2)' :
                    'rgba(34, 197, 94, 0.2)';
    ctx.fill();
    ctx.strokeStyle = zone.type === 'discussion' ? '#9333ea' :
                      zone.type === 'presentation' ? '#3b82f6' :
                      '#22c55e';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawParticipant = (
    ctx: CanvasRenderingContext2D, 
    participant: WebRoomProps['participants'][0],
    pos: Position,
    isSelf: boolean = false
  ) => {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
    ctx.fillStyle = participant.isAI ? '#9333ea' : '#3b82f6';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + Math.cos(pos.rotation) * 40, pos.y + Math.sin(pos.rotation) * 40);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '14px sans-serif';
    ctx.fillText(participant.name, pos.x, pos.y + 50);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(participant.role, pos.x, pos.y + 65);

    // Verifica che participant.state esista prima di accedere alle sue proprietà
    if (participant.state && participant.state.speaking) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 35, 0, Math.PI * 2);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Disegna l'indicatore di emozione solo se state e emotion esistono
    if (participant.state && participant.state.emotion) {
      const emotionColor = participant.state.emotion === 'happy' ? '#22c55e' :
                          participant.state.emotion === 'sad' ? '#3b82f6' :
                          participant.state.emotion === 'angry' ? '#ef4444' :
                          '#94a3b8';
      ctx.beginPath();
      ctx.arc(pos.x - 25, pos.y - 25, 5, 0, Math.PI * 2);
      ctx.fillStyle = emotionColor;
      ctx.fill();

      // Mostra l'attività solo se state e activity esistono
      if (participant.state.activity) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(participant.state.activity, pos.x, pos.y + 80);
      }
    }
  };

  // Gestione Mouse
  const [showAvatarProfile, setShowAvatarProfile] = useState<string | null>(null);
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isLocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    participants.forEach(participant => {
      const pos = positions.get(participant.id);
      if (!pos) return;

      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
      if (distance < 30) {
        // Se è un click semplice (non c'è movimento), mostra il profilo
        if (e.detail === 1) {
          setShowAvatarProfile(participant.id);
        } else {
          // Altrimenti è un trascinamento
          setIsDragging(participant.id);
          setMousePos({ x, y, rotation: 0 });
        }
      }
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top, rotation: 0 });
  };

  const handleMouseUp = () => setIsDragging(null);

  // Inizializza i partecipanti nel sistema TTS Queue
  useEffect(() => {
    // Registriamo i partecipanti nel sistema TTS Queue
    participants.forEach((participant) => {
      if (participant.isAI) {
        // Registra solo gli agenti AI, non l'utente
        ttsQueueService.registerAgentVoice({
          agentId: participant.id,
          name: participant.name,
          voiceConfig: {
            language: 'it-IT',
            emotion: 'neutral'
          },
          role: participant.role,
          priority: participant.role.toLowerCase().includes('direttore') ? 8 : 5
        });
      }
    });
    
    // Configura gli eventi di voce
    ttsQueueService.on('agentStartedSpeaking', (agentId: string) => {
      // Aggiorna lo stato di chi sta parlando nell'interfaccia grafica
      setIsSpeaking(true);
    });
    
    ttsQueueService.on('agentStoppedSpeaking', () => {
      // Aggiorna lo stato di chi ha finito di parlare
      setIsSpeaking(false);
    });
    
    return () => {
      // Rimuovi gli handler degli eventi
      ttsQueueService.removeAllListeners();
      // Pulisci la coda di messaggi
      ttsQueueService.clearQueue();
    };
  }, [participants]);
  
  // Gestione Messaggi e TTS
  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const timestamp = new Date().toLocaleTimeString();
    setMessages(prev => [...prev, { sender: 'user', content: currentMessage, timestamp }]);
    
    // Non attivare TTS quando scrivi manualmente (solo per input microfono)
    // Il TTS viene attivato solo quando l'audio è abilitato e arriva da trascrizione vocale
    const messageFromVoice = audioEnabled && transcriptions.some(t => currentMessage.includes(t));
    
    if (messageFromVoice) {
      // Attiva TTS solo se il messaggio proviene da input vocale
      ttsQueueService.enqueue(
        'user', // L'ID dell'utente
        currentMessage,
        { 
          language: 'it-IT',
          emotion: 'neutral'
        },
        7 // Priorità media-alta per l'utente
      );
    }
    
    const messageToRespond = currentMessage;
    setCurrentMessage('');
    
    // Simula risposta AI
    setTimeout(async () => {
      try {
        // Utilizza aiService per generare una risposta
        const aiResponse = await aiService.generateResponse(
          `Sei un assistente in una simulazione virtuale. Rispondi brevemente a: ${messageToRespond}`,
          'mistral'
        );
        
        setMessages(prev => [...prev, { 
          sender: 'AI', 
          content: aiResponse, 
          timestamp: new Date().toLocaleTimeString() 
        }]);
        
        // Trova un agente AI per rispondere (prendiamo il primo disponibile)
        const aiAgent = participants.find(p => p.isAI);
        
        if (aiAgent) {
          // Aggiungi la risposta dell'agente AI alla coda TTS
          ttsQueueService.enqueue(
            aiAgent.id,
            aiResponse,
            {
              language: 'it-IT',
              emotion: 'happy',
              voice: 'italian'
            },
            6 // Priorità media per l'agente
          );
        } else {
          // Fallback se non c'è un agente
          ttsQueueService.enqueue(
            'ai-assistant',
            aiResponse,
            {
              language: 'it-IT',
              emotion: 'happy',
            },
            6
          );
        }
      } catch (err) {
        console.error("Errore nella generazione risposta AI:", err);
        
        // Risposta di fallback
        const fallbackResponse = "Mi dispiace, non sono riuscito a elaborare una risposta al momento.";
        setMessages(prev => [...prev, { 
          sender: 'AI', 
          content: fallbackResponse, 
          timestamp: new Date().toLocaleTimeString() 
        }]);
        
        // Aggiungi la risposta di fallback alla coda
        ttsQueueService.enqueue(
          'ai-fallback',
          fallbackResponse,
          { 
            language: 'it-IT',
            emotion: 'sad'
          },
          3 // Priorità più bassa per messaggi di errore
        );
      }
    }, 1000);
  };

  // Gestione degli strumenti e dei modali associati
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [notes, setNotes] = useState<string>('');
  
  const handleToolClick = (toolName: string) => {
    setSelectedTool(toolName);
    
    // In base allo strumento selezionato, apriamo il modal corrispondente
    switch(toolName) {
      case 'partecipanti':
        setShowParticipantsModal(true);
        break;
      case 'documenti':
        setShowDocumentsModal(true);
        break;
      case 'analisi':
        setShowAnalysisModal(true);
        break;
      case 'upload':
        setShowUploadModal(true);
        break;
      case 'appunti':
        setShowNotesModal(true);
        break;
      case 'impostazioni':
        setShowSettingsModal(true);
        break;
      default:
        break;
    }

    // Reset strumento selezionato dopo breve tempo (solo per evidenziazione UI)
    setTimeout(() => setSelectedTool(null), 1000);
  };

  return (
    <div className={`fixed inset-0 flex ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
      {/* Area Principale */}
      <div className="flex-1 relative bg-gray-900 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        
        {/* Modal del profilo avatar quando selezionato */}
        {showAvatarProfile && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={() => setShowAvatarProfile(null)}>
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              {(() => {
                const participant = participants.find(p => p.id === showAvatarProfile);
                if (!participant) return null;
                
                return (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold">Profilo Avatar</h2>
                      <button 
                        onClick={() => setShowAvatarProfile(null)}
                        className="p-1 rounded-full hover:bg-gray-700"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: participant.isAI ? '#9333ea' : '#3b82f6' }}
                      >
                        {participant.avatar ? (
                          <img src={participant.avatar} alt={participant.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <Users size={32} className="text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{participant.name}</h3>
                        <p className="text-gray-400">{participant.role}</p>
                        {participant.isAI && <span className="px-2 py-0.5 bg-purple-500 bg-opacity-20 text-purple-400 rounded text-xs">AI</span>}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="border-t border-gray-700 pt-4">
                        <h4 className="font-medium mb-2">Stato attuale</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-sm">
                            <span className="text-gray-400">Emozione:</span>
                            <span className="ml-2">{participant.state?.emotion || 'Neutrale'}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-400">Attività:</span>
                            <span className="ml-2">{participant.state?.activity || 'Inattivo'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-700 pt-4">
                        <h4 className="font-medium mb-2">File associati</h4>
                        <p className="text-sm text-gray-400">Nessun file associato all'avatar</p>
                      </div>
                      
                      <div className="border-t border-gray-700 pt-4">
                        <h4 className="font-medium mb-2">Azioni</h4>
                        <div className="flex flex-wrap gap-2">
                          <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                            Invia messaggio
                          </button>
                          <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm">
                            Modifica nome
                          </button>
                          <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm">
                            Elimina avatar
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
        <button
          onClick={onLeave}
          className="absolute top-4 right-4 p-2 bg-red-500 rounded-full hover:bg-red-600"
        >
          <X size={20} />
        </button>
        
        {/* Status API */}
        <div className="absolute top-4 left-4 p-2 bg-gray-800 bg-opacity-90 rounded-lg shadow-lg text-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${apiStatus.groq ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>Groq API</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${apiStatus.openRouter ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>OpenRouter API</span>
          </div>
        </div>
        
        {/* Barra strumenti inferiore */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 p-2 bg-gray-800 bg-opacity-90 rounded-lg shadow-lg">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-full transition-colors ${audioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button
            onClick={() => setVideoEnabled(!videoEnabled)}
            className={`p-2 rounded-full transition-colors ${videoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-full transition-colors ${showGrid ? 'bg-purple-500' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`p-2 rounded-full transition-colors ${isLocked ? 'bg-orange-500' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
          </button>
          <button
            onClick={() => setShowTranscription(!showTranscription)}
            className={`p-2 rounded-full transition-colors ${showTranscription ? 'bg-green-500' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            <BookOpen size={20} />
          </button>
        </div>
        
        {/* Spettro vocale */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-1/3 h-10">
          <canvas 
            ref={canvasSpectroRef} 
            className="w-full h-full rounded-lg"
            width={400}
            height={40}
          />
        </div>
        
        {/* Trascrizione */}
        {showTranscription && transcriptions.length > 0 && (
          <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-2/3 bg-gray-800 bg-opacity-90 p-4 rounded-lg max-h-48 overflow-y-auto">
            <h3 className="font-medium mb-2 text-sm">Trascrizioni</h3>
            <ul className="space-y-2">
              {transcriptions.map((text, idx) => (
                <li key={idx} className="text-sm text-gray-200 border-l-2 border-purple-500 pl-2">
                  {text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Modali degli strumenti */}
      {showParticipantsModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={() => setShowParticipantsModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Partecipanti</h2>
              <button 
                onClick={() => setShowParticipantsModal(false)}
                className="p-1 rounded-full hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {participants.map(participant => (
                <div key={participant.id} className="p-3 bg-gray-700 rounded-lg flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: participant.isAI ? '#9333ea' : '#3b82f6' }}
                  >
                    {participant.avatar ? (
                      <img src={participant.avatar} alt={participant.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <Users size={18} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <p className="font-medium">{participant.name}</p>
                      {participant.isAI && <span className="ml-2 px-2 py-0.5 bg-purple-500 bg-opacity-20 text-purple-400 rounded text-xs">AI</span>}
                    </div>
                    <p className="text-sm text-gray-400">{participant.role}</p>
                  </div>
                  <button 
                    onClick={() => setShowAvatarProfile(participant.id)}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                  >
                    Dettagli
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {showDocumentsModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={() => setShowDocumentsModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Documenti</h2>
              <button 
                onClick={() => setShowDocumentsModal(false)}
                className="p-1 rounded-full hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-400 mb-4">Documenti disponibili per questa simulazione</p>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                <div className="p-3 bg-gray-700 rounded-lg flex items-center">
                  <FileText className="text-blue-400 mr-3" size={20} />
                  <div className="flex-1">
                    <p className="font-medium">Documento di esempio 1</p>
                    <p className="text-xs text-gray-400">PDF • 2.5 MB</p>
                  </div>
                  <button className="p-2 bg-gray-600 hover:bg-gray-500 rounded">
                    <Download size={16} />
                  </button>
                </div>
                <div className="p-3 bg-gray-700 rounded-lg flex items-center">
                  <FileText className="text-green-400 mr-3" size={20} />
                  <div className="flex-1">
                    <p className="font-medium">Documento di esempio 2</p>
                    <p className="text-xs text-gray-400">DOCX • 1.3 MB</p>
                  </div>
                  <button className="p-2 bg-gray-600 hover:bg-gray-500 rounded">
                    <Download size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-center p-6 border border-dashed border-gray-600 rounded-lg">
                  <p className="text-center text-gray-500 text-sm">Nessun altro documento disponibile</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showAnalysisModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={() => setShowAnalysisModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Analisi AI</h2>
              <button 
                onClick={() => setShowAnalysisModal(false)}
                className="p-1 rounded-full hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-purple-500 bg-opacity-10 border border-purple-500 rounded-lg">
                <h3 className="font-medium text-purple-400 mb-2">Analisi della conversazione</h3>
                <p className="text-gray-300 text-sm">
                  L'intelligenza artificiale ha analizzato la conversazione tra i partecipanti e ha identificato i seguenti punti chiave:
                </p>
                <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-gray-300">
                  <li>Gli argomenti principali trattati sono: gestione ERP, simulazione e training</li>
                  <li>Il tono della conversazione è professionale con un livello di formalità medio</li>
                  <li>Sono state identificate 3 domande importanti che richiedono risposta</li>
                </ul>
              </div>
              
              <div className="p-4 bg-blue-500 bg-opacity-10 border border-blue-500 rounded-lg">
                <h3 className="font-medium text-blue-400 mb-2">Suggerimenti</h3>
                <ul className="space-y-1 list-disc list-inside text-sm text-gray-300">
                  <li>Considerare di fornire maggiori dettagli sul processo di implementazione</li>
                  <li>Proporre esempi pratici per illustrare meglio i concetti discussi</li>
                  <li>Chiarire i termini tecnici che potrebbero non essere familiari a tutti i partecipanti</li>
                </ul>
              </div>
              
              <div className="p-4 bg-gray-700 rounded-lg">
                <h3 className="font-medium mb-2">Richiesta analisi personalizzata</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Inserisci la tua richiesta di analisi..."
                    className="flex-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                  <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                    Analizza
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showUploadModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={() => setShowUploadModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Upload Documenti</h2>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-full hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-center p-6 h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                <div className="text-center">
                  <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                  <p className="text-gray-400">Trascina i file qui o clicca per caricare</p>
                  <p className="text-xs text-gray-500 mt-1">Supporta PDF, DOCX, JPG e PNG fino a 10MB</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-gray-400">File recenti</h3>
              <div className="p-3 bg-gray-700 rounded-lg flex items-center">
                <FileText className="text-blue-400 mr-3" size={20} />
                <div className="flex-1">
                  <p className="font-medium">Presentazione.pdf</p>
                  <div className="w-full bg-gray-600 h-1.5 rounded-full mt-1">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Caricamento: 75%</p>
                </div>
                <button className="p-2 bg-gray-600 hover:bg-gray-500 rounded">
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showNotesModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={() => setShowNotesModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Appunti</h2>
              <button 
                onClick={() => setShowNotesModal(false)}
                className="p-1 rounded-full hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Scrivi i tuoi appunti qui..."
                className="w-full h-64 p-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
              ></textarea>
              
              <div className="flex gap-2 justify-end">
                <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2">
                  <Download size={16} />
                  <span>Esporta</span>
                </button>
                <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2">
                  <Save size={16} />
                  <span>Salva</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showSettingsModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Impostazioni</h2>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-full hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="font-medium">Audio spaziale</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Attiva audio spaziale 3D</span>
                  <div className="w-12 h-6 bg-gray-700 rounded-full p-1 flex items-center cursor-pointer">
                    <div className="w-4 h-4 bg-purple-500 rounded-full ml-auto"></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="font-medium">Volume TTS</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="75"
                  className="w-full h-2 bg-gray-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="font-medium">Modalità visualizzazione</p>
                <div className="grid grid-cols-2 gap-2">
                  <button className={`p-2 rounded-lg flex items-center justify-center ${!isDarkMode ? 'bg-purple-500' : 'bg-gray-700'}`}>
                    <Sun size={16} className="mr-2" />
                    <span>Chiaro</span>
                  </button>
                  <button className={`p-2 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-purple-500' : 'bg-gray-700'}`}>
                    <Moon size={16} className="mr-2" />
                    <span>Scuro</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="font-medium">Lingua AI</p>
                <select className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-purple-500">
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Sidebar Collassabile */}
      <div className={`bg-gray-900 border-l border-gray-800 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-96' : 'w-16'}`}>
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className={`${sidebarOpen ? 'block' : 'hidden'} text-lg font-medium`}>Simulazione</h2>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-800 rounded-lg">
            {sidebarOpen ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {sidebarOpen && (
          <>
            {/* Sezione Chat */}
            <div className="border-b border-gray-800">
              <div className="p-4 flex justify-between items-center">
                <h3 className="text-md font-medium">Chat</h3>
                <button onClick={() => setChatCollapsed(!chatCollapsed)}>
                  {chatCollapsed ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>
              {!chatCollapsed && (
                <div className="p-4 space-y-4 max-h-64 overflow-y-auto">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-lg ${msg.sender === 'user' ? 'bg-purple-500 text-white' : 'bg-gray-800 text-white'}`}>
                        <p>{msg.content}</p>
                        <p className="text-xs mt-1 opacity-60">{msg.timestamp}</p>
                      </div>
                    </div>
                  ))}
                  
                  {isSpeaking && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    <input
                      type="text"
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Scrivi o parla..."
                      className="flex-1 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!currentMessage.trim()}
                      className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Sezione Strumenti */}
            <div className="border-b border-gray-800">
              <div className="p-4 flex justify-between items-center">
                <h3 className="text-md font-medium">Strumenti</h3>
                <button onClick={() => setToolsCollapsed(!toolsCollapsed)}>
                  {toolsCollapsed ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>
              {!toolsCollapsed && (
                <div className="grid grid-cols-3 gap-2 p-4">
                  <button 
                    onClick={() => handleToolClick('partecipanti')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${selectedTool === 'partecipanti' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                  >
                    <Users size={20} />
                    <span className="text-xs mt-1">Partecipanti</span>
                  </button>
                  <button 
                    onClick={() => handleToolClick('documenti')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${selectedTool === 'documenti' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                  >
                    <FileText size={20} />
                    <span className="text-xs mt-1">Documenti</span>
                  </button>
                  <button 
                    onClick={() => handleToolClick('analisi')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${selectedTool === 'analisi' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                  >
                    <Brain size={20} />
                    <span className="text-xs mt-1">Analisi AI</span>
                  </button>
                  <button 
                    onClick={() => handleToolClick('upload')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${selectedTool === 'upload' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                  >
                    <Upload size={20} />
                    <span className="text-xs mt-1">Upload</span>
                  </button>
                  <button 
                    onClick={() => handleToolClick('appunti')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${selectedTool === 'appunti' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                  >
                    <PenTool size={20} />
                    <span className="text-xs mt-1">Appunti</span>
                  </button>
                  <button 
                    onClick={() => handleToolClick('impostazioni')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${selectedTool === 'impostazioni' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'}`}
                  >
                    <Settings size={20} />
                    <span className="text-xs mt-1">Impostazioni</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
