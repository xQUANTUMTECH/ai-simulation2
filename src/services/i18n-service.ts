/**
 * Servizio di internazionalizzazione (i18n) per l'applicazione Cafasso AI Academy
 */
import { BehaviorSubject } from 'rxjs';
import React, { useContext, useEffect, useState, createContext } from 'react';

// Tipi di lingue supportate dall'applicazione
export type SupportedLanguage = 'it-IT' | 'en-US';

// Interfaccia per lo stato del servizio i18n
interface I18nState {
  currentLanguage: SupportedLanguage;
  availableLanguages: SupportedLanguage[];
  translations: Record<string, Record<string, string>>;
}

// Interfaccia per il contesto i18n
interface I18nContextType {
  t: (key: string, params?: Record<string, string>) => string;
  currentLanguage: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

/**
 * Classe singleton per la gestione delle traduzioni e internazionalizzazione
 */
class I18nService {
  // BehaviorSubject per gestire lo stato e le sottoscrizioni
  public state$: BehaviorSubject<I18nState>;
  
  // Chiave per localStorage
  private readonly STORAGE_KEY = 'cafasso_academy_language';
  
  constructor() {
    // Stato iniziale
    const initialState: I18nState = {
      currentLanguage: this.getBrowserLanguage(),
      availableLanguages: ['it-IT', 'en-US'],
      translations: {
        'it-IT': this.getItalianTranslations(),
        'en-US': this.getEnglishTranslations()
      }
    };
    
    this.state$ = new BehaviorSubject<I18nState>(initialState);
    
    // Carica la lingua dal localStorage se presente
    this.loadLanguageFromStorage();
  }
  
  /**
   * Imposta la lingua corrente
   */
  public setLanguage(language: SupportedLanguage): void {
    if (!this.state$.value.availableLanguages.includes(language)) {
      console.warn(`Lingua '${language}' non supportata. Lingue disponibili: ${this.state$.value.availableLanguages.join(', ')}`);
      return;
    }
    
    const currentState = this.state$.value;
    
    // Aggiorna lo stato solo se la lingua è cambiata
    if (currentState.currentLanguage !== language) {
      this.state$.next({
        ...currentState,
        currentLanguage: language
      });
      
      // Salva la lingua nel localStorage
      localStorage.setItem(this.STORAGE_KEY, language);
      
      // Emetti evento personalizzato per altri sistemi
      const event = new CustomEvent('languageChanged', { detail: { language } });
      window.dispatchEvent(event);
      
      console.log(`Lingua cambiata a: ${language}`);
    }
  }
  
  /**
   * Traduce una chiave nel formato 'namespace.key'
   */
  public translate(key: string, params?: Record<string, string>): string {
    const { currentLanguage, translations } = this.state$.value;
    const langTranslations = translations[currentLanguage] || {};
    
    // Recupera la traduzione o la chiave come fallback
    let translation = langTranslations[key] || key;
    
    // Sostituisci i parametri se presenti
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        const regex = new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g');
        translation = translation.replace(regex, value);
      });
    }
    
    return translation;
  }
  
  /**
   * Ottiene la lingua del browser e la mappa a una lingua supportata
   */
  private getBrowserLanguage(): SupportedLanguage {
    // Utilizza la lingua del browser o il valore salvato
    const savedLanguage = localStorage.getItem(this.STORAGE_KEY) as SupportedLanguage | null;
    
    if (savedLanguage && (savedLanguage === 'it-IT' || savedLanguage === 'en-US')) {
      return savedLanguage;
    }
    
    // Ottieni la lingua del browser
    const browserLang = navigator.language;
    
    // Mappa alla lingua supportata più vicina
    if (browserLang.startsWith('it')) {
      return 'it-IT';
    } 
    
    // Default a inglese se la lingua non è supportata
    return 'en-US';
  }
  
  /**
   * Carica la lingua dal localStorage
   */
  private loadLanguageFromStorage(): void {
    const savedLanguage = localStorage.getItem(this.STORAGE_KEY);
    
    if (savedLanguage && (savedLanguage === 'it-IT' || savedLanguage === 'en-US')) {
      this.setLanguage(savedLanguage);
    }
  }
  
  /**
   * Restituisce le traduzioni italiane
   */
  private getItalianTranslations(): Record<string, string> {
    return {
      'common.loading': 'Caricamento in corso...',
      'common.error': 'Si è verificato un errore',
      'common.save': 'Salva',
      'common.cancel': 'Annulla',
      'common.confirm': 'Conferma',
      'common.delete': 'Elimina',
      'common.edit': 'Modifica',
      'common.search': 'Cerca',
      'common.close': 'Chiudi',
      'common.back': 'Indietro',
      'common.next': 'Avanti',
      'common.logout': 'Esci',
      'common.login': 'Accedi',
      'common.register': 'Registrati',
      'common.avatar': 'Avatar',
      'common.yes': 'Sì',
      'common.no': 'No',
      'common.stop': 'Stop',
      'common.microphone': 'Microfono',
      'common.clear': 'Cancella',
      
      'auth.welcome': 'Benvenuto su Cafasso AI Academy',
      'auth.loginTitle': 'Accedi al tuo account',
      'auth.registerTitle': 'Crea un nuovo account',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.username': 'Nome utente',
      'auth.fullName': 'Nome completo',
      'auth.company': 'Azienda',
      'auth.loginButton': 'Accedi',
      'auth.registerButton': 'Registrati',
      'auth.forgotPassword': 'Password dimenticata?',
      'auth.noAccount': 'Non hai un account?',
      'auth.haveAccount': 'Hai già un account?',
      'auth.loginSuccess': 'Accesso effettuato con successo',
      'auth.registerSuccess': 'Registrazione completata con successo',
      
      'navbar.dashboard': 'Dashboard',
      'navbar.courses': 'Corsi',
      'navbar.documents': 'Documenti',
      'navbar.statistics': 'Statistiche',
      'navbar.scenarios': 'Scenari',
      'navbar.avatars': 'Avatar',
      'navbar.interactions': 'Interazioni',
      'navbar.friends': 'Amici',
      'navbar.settings': 'Impostazioni',
      'navbar.admin': 'Admin Dashboard',
      'navbar.userMode': 'Modalità utente',
      
      'dashboard.welcome': 'Benvenuto, {{name}}',
      'dashboard.recentActivity': 'Attività recenti',
      'dashboard.courseProgress': 'Progresso corsi',
      'dashboard.upcomingEvents': 'Eventi in programma',
      'dashboard.aiAssistant': 'Assistente AI',
      
      'settings.theme': 'Tema',
      'settings.language': 'Lingua',
      'settings.notifications': 'Notifiche',
      'settings.privacy': 'Privacy',
      'settings.account': 'Account',
      'settings.dark': 'Scuro',
      'settings.light': 'Chiaro',
      'settings.voice': 'Input vocale',
      
      'admin.userManagement': 'Gestione utenti',
      'admin.courseManagement': 'Gestione corsi',
      'admin.analytics': 'Analisi',
      'admin.system': 'Impostazioni di sistema',
      
      'voice.start': 'Inizia a parlare',
      'voice.stop': 'Interrompi registrazione',
      'voice.listening': 'In ascolto...',
      'voice.speaking': 'Sto parlando...',
      'voice.notSupported': 'Riconoscimento vocale non supportato',
      'voice.microphonePermission': 'Permesso microfono richiesto',
      'voice.noSpeechDetected': 'Nessun parlato rilevato',
      'voice.tryAgain': 'Prova di nuovo',
      'voice.ready': 'Pronto per l\'ascolto',
      'voice.speakNow': 'Parla adesso...',
      'voice.clickToStart': 'Clicca sul pulsante microfono per iniziare',
      
      'avatar.speak': 'Parla',
      'avatar.pause': 'Pausa',
      'avatar.playAudio': 'Riproduci audio',
      'avatar.pauseAudio': 'Metti in pausa audio',
      'avatar.expressionSmile': 'Espressione: sorriso',
      'avatar.expressionNeutral': 'Espressione: neutra',
      'avatar.expressionConfused': 'Espressione: confusa',
      'avatar.expressionSad': 'Espressione: triste',
      'avatar.expressionSurprised': 'Espressione: sorpresa',
      
      'simulation.startChat': 'Inizia conversazione',
      'simulation.endChat': 'Termina conversazione',
      'simulation.typeMessage': 'Scrivi un messaggio...',
      'simulation.sendMessage': 'Invia messaggio',
      'simulation.toggleVoice': 'Attiva/disattiva input vocale',
      
      'error.required': 'Campo obbligatorio',
      'error.invalidEmail': 'Email non valida',
      'error.passwordLength': 'La password deve contenere almeno 8 caratteri',
      'error.invalidCredentials': 'Credenziali non valide',
      'error.userExists': 'Utente già esistente',
      'error.serverError': 'Errore del server',
      'error.sessionExpired': 'Sessione scaduta, effettua nuovamente l\'accesso',
      'error.microphoneDenied': 'Permesso microfono negato',
      'error.browserNotSupported': 'Browser non supportato per questa funzionalità',
      'error.networkError': 'Errore di connessione alla rete',
    };
  }
  
  /**
   * Restituisce le traduzioni inglesi
   */
  private getEnglishTranslations(): Record<string, string> {
    return {
      'common.loading': 'Loading...',
      'common.error': 'An error occurred',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.confirm': 'Confirm',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.search': 'Search',
      'common.close': 'Close',
      'common.back': 'Back',
      'common.next': 'Next',
      'common.logout': 'Logout',
      'common.login': 'Login',
      'common.register': 'Register',
      'common.avatar': 'Avatar',
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.stop': 'Stop',
      'common.microphone': 'Microphone',
      'common.clear': 'Clear',
      
      'auth.welcome': 'Welcome to Cafasso AI Academy',
      'auth.loginTitle': 'Log in to your account',
      'auth.registerTitle': 'Create a new account',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.username': 'Username',
      'auth.fullName': 'Full Name',
      'auth.company': 'Company',
      'auth.loginButton': 'Login',
      'auth.registerButton': 'Register',
      'auth.forgotPassword': 'Forgot password?',
      'auth.noAccount': 'Don\'t have an account?',
      'auth.haveAccount': 'Already have an account?',
      'auth.loginSuccess': 'Login successful',
      'auth.registerSuccess': 'Registration successful',
      
      'navbar.dashboard': 'Dashboard',
      'navbar.courses': 'Courses',
      'navbar.documents': 'Documents',
      'navbar.statistics': 'Statistics',
      'navbar.scenarios': 'Scenarios',
      'navbar.avatars': 'Avatars',
      'navbar.interactions': 'Interactions',
      'navbar.friends': 'Friends',
      'navbar.settings': 'Settings',
      'navbar.admin': 'Admin Dashboard',
      'navbar.userMode': 'User Mode',
      
      'dashboard.welcome': 'Welcome, {{name}}',
      'dashboard.recentActivity': 'Recent Activity',
      'dashboard.courseProgress': 'Course Progress',
      'dashboard.upcomingEvents': 'Upcoming Events',
      'dashboard.aiAssistant': 'AI Assistant',
      
      'settings.theme': 'Theme',
      'settings.language': 'Language',
      'settings.notifications': 'Notifications',
      'settings.privacy': 'Privacy',
      'settings.account': 'Account',
      'settings.dark': 'Dark',
      'settings.light': 'Light',
      'settings.voice': 'Voice Input',
      
      'admin.userManagement': 'User Management',
      'admin.courseManagement': 'Course Management',
      'admin.analytics': 'Analytics',
      'admin.system': 'System Settings',
      
      'voice.start': 'Start speaking',
      'voice.stop': 'Stop recording',
      'voice.listening': 'Listening...',
      'voice.speaking': 'Speaking...',
      'voice.notSupported': 'Voice recognition not supported',
      'voice.microphonePermission': 'Microphone permission required',
      'voice.noSpeechDetected': 'No speech detected',
      'voice.tryAgain': 'Try again',
      'voice.ready': 'Ready for voice input',
      'voice.speakNow': 'Speak now...',
      'voice.clickToStart': 'Click the microphone button to start',
      
      'avatar.speak': 'Speak',
      'avatar.pause': 'Pause',
      'avatar.playAudio': 'Play audio',
      'avatar.pauseAudio': 'Pause audio',
      'avatar.expressionSmile': 'Expression: smile',
      'avatar.expressionNeutral': 'Expression: neutral',
      'avatar.expressionConfused': 'Expression: confused',
      'avatar.expressionSad': 'Expression: sad',
      'avatar.expressionSurprised': 'Expression: surprised',
      
      'simulation.startChat': 'Start conversation',
      'simulation.endChat': 'End conversation',
      'simulation.typeMessage': 'Type a message...',
      'simulation.sendMessage': 'Send message',
      'simulation.toggleVoice': 'Toggle voice input',
      
      'error.required': 'Required field',
      'error.invalidEmail': 'Invalid email',
      'error.passwordLength': 'Password must be at least 8 characters',
      'error.invalidCredentials': 'Invalid credentials',
      'error.userExists': 'User already exists',
      'error.serverError': 'Server error',
      'error.sessionExpired': 'Session expired, please login again',
      'error.microphoneDenied': 'Microphone permission denied',
      'error.browserNotSupported': 'Browser not supported for this feature',
      'error.networkError': 'Network connection error',
    };
  }
}

// Istanza singleton del servizio
export const i18nService = new I18nService();

// Creazione del Context con tipo definito
const I18nContext = createContext<I18nContextType>({
  t: (key) => key,
  currentLanguage: 'it-IT',
  setLanguage: () => {}
});

// Provider component
export const I18nProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [currentState, setCurrentState] = useState<I18nState>(i18nService.state$.value);
  
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
export const useTranslation = () => useContext(I18nContext);

export default i18nService;
