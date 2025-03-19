import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  isDarkMode?: boolean;
  fullscreen?: boolean;
}

export function Modal({ isOpen, onClose, children, title, isDarkMode = true, fullscreen = false }: ModalProps) {
  // Se non è aperto, non renderizzare nulla
  if (!isOpen) return null;
  
  // Riferimento al contenitore del modale
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Gestione della chiusura con il tasto Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);
  
  // Aggiunge e rimuove listener per tasto Escape
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    // Blocca lo scroll del body quando il modale è aperto
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Ripristina lo scroll quando il modale viene chiuso
      document.body.style.overflow = originalStyle;
    };
  }, [handleKeyDown]);
  
  // Previene la propagazione del click all'interno del modale
  const handleInnerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50" 
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        onClick={handleInnerClick}
        className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} ${
          fullscreen ? 'w-full h-full' : 'rounded-xl w-full max-w-4xl max-h-[90vh]'
        } flex flex-col shadow-xl animate-slideIn`}
      >
        {!fullscreen && (
          <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h2 id="modal-title" className="text-xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className={`p-2 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
              aria-label="Chiudi"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className={`${fullscreen ? '' : 'p-6'} flex-1 overflow-y-auto animate-fadeIn`}>
          {children}
        </div>
      </div>
    </div>
  );
}
