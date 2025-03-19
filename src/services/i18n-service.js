/**
 * Servizio di internazionalizzazione (i18n) per l'applicazione Cafasso AI Academy
 */
import { BehaviorSubject } from 'rxjs';

// Tipi di lingue supportate dall'applicazione
const SUPPORTED_LANGUAGES = ['it-IT', 'en-US'];

/**
 * Classe singleton per la gestione delle traduzioni e internazionalizzazione
 */
class I18nService {
  // Chiave per localStorage
  STORAGE_KEY = 'cafasso_academy_language';
  
  constructor() {
    // Stato iniziale
    const initialState = {
      currentLanguage: this.getBrowserLanguage(),
      availableLanguages: SUPPORTED_LANGUAGES,
      translations: {
        'it-IT': this.getItalianTranslations(),
        'en-US': this.getEnglishTranslations()
      }
    };
    
    this.state$ = new BehaviorSubject(initialState);
    
    // Carica la lingua dal localStorage se presente
    this.loadLanguageFromStorage();
  }
  
  /**
   * Imposta la lingua corrente
   */
  setLanguage(language) {
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
  translate(key, params) {
    const { currentLanguage, translations } = this.state$.value;
    const langTranslations = translations[currentLanguage] || {};
    
    // Recupera la traduzione o la chiave come fallback
    let translation = langTranslations[key] || key;
    
    // Sostituisci i parametri se presenti
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        const regexPattern = new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g');
        translation = translation.replace(regexPattern, value);
      });
    }
    
    return translation;
  }
  
  /**
   * Ottiene la lingua del browser e la mappa a una lingua supportata
   */
  getBrowserLanguage() {
    // Utilizza la lingua del browser o il valore salvato
    const savedLanguage = localStorage.getItem(this.STORAGE_KEY);
    
    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
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
  loadLanguageFromStorage() {
    const savedLanguage = localStorage.getItem(this.STORAGE_KEY);
    
    if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
      this.setLanguage(savedLanguage);
    }
  }
  
  /**
   * Restituisce le traduzioni italiane
   */
  getItalianTranslations() {
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
      'common.microphone': 'Microfono',
      'common.stop': 'Stop',
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
      
      'error.required': 'Campo obbligatorio',
      'error.invalidEmail': 'Email non valida',
      'error.passwordLength': 'La password deve contenere almeno 8 caratteri',
      'error.invalidCredentials': 'Credenziali non valide',
      'error.userExists': 'Utente già esistente',
      'error.serverError': 'Errore del server',
      'error.sessionExpired': 'Sessione scaduta, effettua nuovamente l\'accesso',
      'error.microphoneDenied': 'Accesso al microfono negato',
      
      'voice.notSupported': 'Riconoscimento vocale non supportato in questo browser',
      'voice.listening': 'In ascolto...',
      'voice.ready': 'Pronto per l\'ascolto',
      'voice.speakNow': 'Parla ora...',
      'voice.clickToStart': 'Clicca sul microfono per iniziare',
      'voice.start': 'Avvia riconoscimento',
      'voice.stop': 'Interrompi riconoscimento',
    };
  }
  
  /**
   * Restituisce le traduzioni inglesi
   */
  getEnglishTranslations() {
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
      'common.microphone': 'Microphone',
      'common.stop': 'Stop',
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
      
      'error.required': 'Required field',
      'error.invalidEmail': 'Invalid email',
      'error.passwordLength': 'Password must be at least 8 characters',
      'error.invalidCredentials': 'Invalid credentials',
      'error.userExists': 'User already exists',
      'error.serverError': 'Server error',
      'error.sessionExpired': 'Session expired, please login again',
      'error.microphoneDenied': 'Microphone access denied',
      
      'voice.notSupported': 'Voice recognition not supported in this browser',
      'voice.listening': 'Listening...',
      'voice.ready': 'Ready to listen',
      'voice.speakNow': 'Speak now...',
      'voice.clickToStart': 'Click the microphone to start',
      'voice.start': 'Start recognition',
      'voice.stop': 'Stop recognition',
    };
  }
}

// Istanza singleton del servizio
const i18nService = new I18nService();

export default i18nService;
