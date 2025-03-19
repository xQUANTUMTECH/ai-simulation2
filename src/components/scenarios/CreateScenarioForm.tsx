import React, { useState } from 'react';
import { X, Upload, Users, Brain, MessageSquare } from 'lucide-react';
import { AvatarSelector } from './AvatarSelector';
import { FileUploader } from './FileUploader';

interface CreateScenarioFormProps {
  onSubmit: (scenario: any) => void;
  isDarkMode: boolean;
}

interface Avatar {
  id: string;
  name: string;
  role: string;
  type: string;
  expertise: string[];
}

export function CreateScenarioForm({ onSubmit, isDarkMode }: CreateScenarioFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'medical',
    difficulty: 'intermediate',
    duration: '30',
    objectives: [] as string[],
    selectedAvatars: [] as Avatar[],
    uploadedFiles: [] as { name: string; type: string; size: string }[]
  });

  const [currentStep, setCurrentStep] = useState<'basic' | 'avatars' | 'files'>('basic');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      id: Math.random().toString(36).substr(2, 9),
      avatars: formData.selectedAvatars.length,
      status: 'Disponibile',
      duration: formData.duration + ' min'
    });
  };

  const handleAvatarSelect = (avatar: Avatar) => {
    setFormData(prev => ({
      ...prev,
      selectedAvatars: [...prev.selectedAvatars, avatar]
    }));
  };

  const handleFileUpload = (files: Array<{ name: string; type: string; size: string }>) => {
    setFormData(prev => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...files]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step Navigation */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'basic', label: 'Info Base', icon: <MessageSquare size={20} /> },
          { id: 'avatars', label: 'Avatar', icon: <Users size={20} /> },
          { id: 'files', label: 'File', icon: <Upload size={20} /> }
        ].map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setCurrentStep(step.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
              currentStep === step.id
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {step.icon}
            {step.label}
          </button>
        ))}
      </div>

      {currentStep === 'basic' && (<>
        <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Titolo
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
          placeholder="Inserisci il titolo dello scenario"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Descrizione
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full h-32 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
          placeholder="Descrivi lo scenario..."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Tipo
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600"
          >
            <option value="medical">Medico</option>
            <option value="emergency">Emergenza</option>
            <option value="surgical">Chirurgico</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Difficoltà
          </label>
          <select
            value={formData.difficulty}
            onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
            className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600"
          >
            <option value="beginner">Base</option>
            <option value="intermediate">Intermedio</option>
            <option value="advanced">Avanzato</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Durata (minuti)
        </label>
        <input
          type="number"
          value={formData.duration}
          onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
          className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
          min="5"
          max="180"
          step="5"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Obiettivi
        </label>
        <div className="space-y-2">
          {formData.objectives.map((objective, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={objective}
                onChange={(e) => {
                  const newObjectives = [...formData.objectives];
                  newObjectives[index] = e.target.value;
                  setFormData(prev => ({ ...prev, objectives: newObjectives }));
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => {
                  const newObjectives = formData.objectives.filter((_, i) => i !== index);
                  setFormData(prev => ({ ...prev, objectives: newObjectives }));
                }}
                className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-gray-600"
              >
                <X size={20} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFormData(prev => ({
              ...prev,
              objectives: [...prev.objectives, '']
            }))}
            className="w-full px-4 py-2 rounded-lg border border-dashed border-gray-600 hover:border-purple-500 transition-colors text-gray-400 hover:text-purple-500"
          >
            + Aggiungi Obiettivo
          </button>
        </div>
      </div></>)}

      {currentStep === 'avatars' && (
        <AvatarSelector
          onSelect={handleAvatarSelect}
          selectedAvatars={formData.selectedAvatars}
          isDarkMode={isDarkMode}
        />
      )}

      {currentStep === 'files' && (
        <FileUploader
          onUpload={handleFileUpload}
          uploadedFiles={formData.uploadedFiles}
          isDarkMode={isDarkMode}
        />
      )}

      <button
        type="submit"
        className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!formData.title || !formData.description || formData.selectedAvatars.length === 0}
      >
        Crea Scenario
      </button>
    </form>
  );
}