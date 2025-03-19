/**
 * Componente per il cambio lingua dell'applicazione
 * Utilizza il servizio i18n per gestire il cambio della lingua corrente
 */
import React, { useState, useEffect, useRef } from 'react';
import { Languages } from 'lucide-react';
import i18nService from '../services/i18n-service.js';

/**
 * Componente per il cambio della lingua dell'applicazione
 * 
 * @param {object} props - Le proprietà del componente
 * @param {boolean} props.isDarkMode - Indica se l'applicazione è in modalità scura
 */
const LanguageSwitcher = ({ isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('it-IT');
  const menuRef = useRef(null);

  // Carica la lingua corrente dal servizio i18n all'inizializzazione
  useEffect(() => {
    // Imposta la lingua iniziale
    setCurrentLanguage(i18nService.state$.value.currentLanguage);
    
    // Sottoscrizione alle modifiche
    const subscription = i18nService.state$.subscribe(state => {
      setCurrentLanguage(state.currentLanguage);
    });
    
    // Cleanup della sottoscrizione
    return () => subscription.unsubscribe();
  }, []);

  // Gestisce la chiusura del menu quando si clicca all'esterno
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cambio lingua
  const handleLanguageChange = (language) => {
    i18nService.setLanguage(language);
    setIsOpen(false);
  };

  // Ottieni il nome della lingua per la visualizzazione
  const getLanguageName = (code) => {
    switch (code) {
      case 'it-IT':
        return 'Italiano';
      case 'en-US':
        return 'English';
      default:
        return code;
    }
  };

  // Ottieni la bandiera della lingua
  const getLanguageFlag = (code) => {
    switch (code) {
      case 'it-IT':
        return '🇮🇹';
      case 'en-US':
        return '🇺🇸';
      default:
        return '🌐';
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${
          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
        }`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Cambia lingua"
        title="Cambia lingua"
      >
        <Languages size={20} />
        <span className="ml-1 text-xs">{getLanguageFlag(currentLanguage)}</span>
      </button>

      {isOpen && (
        <div 
          className={`absolute right-0 mt-2 w-40 rounded-md shadow-lg py-1 z-10 ${
            isDarkMode 
              ? 'bg-gray-800 border border-gray-700'
              : 'bg-white border border-gray-200'
          }`}
        >
          {/* Utilizziamo le lingue disponibili dal servizio */}
          {i18nService.state$.value.availableLanguages.map((language) => (
            <button
              key={language}
              onClick={() => handleLanguageChange(language)}
              className={`flex items-center w-full text-left px-4 py-2 text-sm ${
                currentLanguage === language 
                  ? isDarkMode 
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-900'
                  : isDarkMode 
                    ? 'text-gray-200 hover:bg-gray-700'
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{getLanguageFlag(language)}</span>
              {getLanguageName(language)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
