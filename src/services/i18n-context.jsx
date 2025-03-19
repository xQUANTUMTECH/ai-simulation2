/**
 * React Context per integrare il servizio di internazionalizzazione nell'applicazione
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import i18nService from './i18n-service';

// Creazione del Context
const I18nContext = createContext({
  t: (key, params) => key,
  currentLanguage: 'it-IT',
  setLanguage: () => {}
});

// Provider component
export const I18nProvider = ({ children }) => {
  const [currentState, setCurrentState] = useState(i18nService.state$.value);
  
  // Subscribe to changes
  useEffect(() => {
    const subscription = i18nService.state$.subscribe(setCurrentState);
    return () => subscription.unsubscribe();
  }, []);
  
  const contextValue = {
    t: (key, params) => i18nService.translate(key, params),
    currentLanguage: currentState.currentLanguage,
    setLanguage: (lang) => i18nService.setLanguage(lang)
  };
  
  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

// Hook for component use
export const useTranslation = () => useContext(I18nContext);

export default { I18nProvider, useTranslation };
