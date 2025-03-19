import React, { useState } from 'react';
import { 
  Presentation, UserCog, Lightbulb, GitBranch, ClipboardList, 
  Microscope, FileText, CheckSquare, AlertTriangle, Save,
  Brain, MessageSquare, Users, Settings, Eraser, Undo, Redo,
  Share2, Download, ChevronDown, ChevronUp, PenTool, Square,
  Circle, Type, Image, Trash2, Lock, Unlock, Eye, EyeOff,
  BarChart, PieChart, LineChart, Table, List, Grid, Filter,
  Search, Plus, Minus, Move, ZoomIn, ZoomOut, RotateCw
} from 'lucide-react';

interface MeetingToolsProps {
  isDarkMode: boolean;
  onToolSelect: (tool: string) => void;
}

interface Tool {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  color?: string;
}

export function MeetingTools({ isDarkMode, onToolSelect }: MeetingToolsProps) {
  const [activeSection, setActiveSection] = useState<string>('whiteboard');
  const [selectedColor, setSelectedColor] = useState<string>('#FFFFFF');
  const [brushSize, setBrushSize] = useState<number>(2);
  const [opacity, setOpacity] = useState<number>(100);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  const whiteboardTools: Tool[] = [
    { id: 'pen', icon: <PenTool size={20} />, label: 'Penna', shortcut: 'P' },
    { id: 'eraser', icon: <Eraser size={20} />, label: 'Gomma', shortcut: 'E' },
    { id: 'square', icon: <Square size={20} />, label: 'Rettangolo', shortcut: 'R' },
    { id: 'circle', icon: <Circle size={20} />, label: 'Cerchio', shortcut: 'C' },
    { id: 'text', icon: <Type size={20} />, label: 'Testo', shortcut: 'T' },
    { id: 'image', icon: <Image size={20} />, label: 'Immagine', shortcut: 'I' }
  ];

  const colors = [
    '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'
  ];

  const handleToolSelect = (toolId: string) => {
    onToolSelect(toolId);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => {
      const newZoom = direction === 'in' ? prev + 10 : prev - 10;
      return Math.max(50, Math.min(200, newZoom));
    });
  };

  return (
    <div className="space-y-4 p-4">
      {/* Whiteboard Tools */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Strumenti Lavagna</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLocked(!isLocked)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              title={isLocked ? 'Sblocca' : 'Blocca'}
            >
              {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              title={showGrid ? 'Nascondi griglia' : 'Mostra griglia'}
            >
              {showGrid ? <Grid size={16} /> : <Grid size={16} className="text-gray-500" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2 mb-4">
          {whiteboardTools.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors flex flex-col items-center gap-1"
              title={`${tool.label} (${tool.shortcut})`}
            >
              {tool.icon}
              <span className="text-xs">{tool.shortcut}</span>
            </button>
          ))}
        </div>

        {/* Color Picker */}
        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-2 block">Colore</label>
          <div className="grid grid-cols-10 gap-1">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-6 h-6 rounded-full border-2 ${
                  selectedColor === color ? 'border-purple-500' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Brush Size */}
        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-2 block">Dimensione ({brushSize}px)</label>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-full accent-purple-500"
          />
        </div>

        {/* Opacity */}
        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-2 block">Opacità ({opacity}%)</label>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => setOpacity(parseInt(e.target.value))}
            className="w-full accent-purple-500"
          />
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleZoom('out')}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              disabled={zoomLevel <= 50}
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-sm">{zoomLevel}%</span>
            <button
              onClick={() => handleZoom('in')}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              disabled={zoomLevel >= 200}
            >
              <ZoomIn size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {/* Reset zoom */}}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              title="Reset zoom"
            >
              <RotateCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {/* Undo action */}}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <Undo size={16} />
          Annulla
        </button>
        <button
          onClick={() => {/* Redo action */}}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <Redo size={16} />
          Ripeti
        </button>
      </div>

      {/* Export Options */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-medium mb-3">Esporta</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {/* Export as image */}}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={16} />
            Immagine
          </button>
          <button
            onClick={() => {/* Share whiteboard */}}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <Share2 size={16} />
            Condividi
          </button>
        </div>
      </div>
    </div>
  );
}