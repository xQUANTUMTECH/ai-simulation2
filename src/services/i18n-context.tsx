/**
 * React Context per integrare il servizio di internazionalizzazione nell'applicazione
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import i18nService from './i18n-service';

// Definizione delle interfacce per TypeScript
export type SupportedLanguage = 'it-IT' | 'en-US';

export interface I18nContextType {
  t: (key: string, params?: Record<string, any>) => string;
  currentLanguage: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

// Creazione del Context
const I18nContext = createContext<I18nContextType>({
  t: (key) => key,
  currentLanguage: 'it-IT',
  setLanguage: () => {}
});

interface I18nProviderProps {
  children: React.ReactNode;
}

// Provider component
export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [currentState, setCurrentState] = useState(i18nService.state$.value);
  
  // Subscribe to changes
  useEffect(() => {
    const subscription = i18nService.state$.subscribe(setCurrentState);
    return () => subscription.unsubscribe();
  }, []);
  
  const contextValue: I18nContextType = {
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
export const useTranslation = (): I18nContextType => useContext(I18nContext);

export default { I18nProvider, useTranslation };
