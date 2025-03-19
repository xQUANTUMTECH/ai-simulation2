import React from 'react';
import { X } from 'lucide-react';

interface SimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  isDarkMode?: boolean;
}

/**
 * Componente modale semplificato riutilizzabile
 */
export const SimpleModal: React.FC<SimpleModalProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  isDarkMode = true 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div 
        onClick={e => e.stopPropagation()}
        className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl`}>
        <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className={`p-2 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SimpleModal;
