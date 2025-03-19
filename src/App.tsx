import React from 'react';
import { useEffect, useState } from 'react';
import { LayoutGrid, FileText, Users, MessageSquare, Settings, Bell, Search, ChevronDown, Zap, Sun, Moon, BarChart, Mic, Volume2, Gamepad2, UserPlus, GraduationCap, BookOpen, Video, Award } from 'lucide-react';
import LanguageSwitcher from './components/LanguageSwitcher.jsx';
import { NavItem } from './components/NavItem';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { authService } from './services/auth-service';
import { Homepage } from './components/sections/Homepage';
import { Dashboard } from './components/sections/Dashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLayout } from './components/admin/AdminLayout';
import { UserManagement } from './components/admin/UserManagement';
import { AdminAnalytics } from './components/admin/AdminAnalytics';
import { AdminNotifications } from './components/admin/AdminNotifications';
import { AdminAI } from './components/admin/AdminAI';
import { AdminVideos } from './components/admin/AdminVideos';
import { AdminDocuments } from './components/admin/AdminDocuments';
import { AdminCertificates } from './components/admin/AdminCertificates';
import { CourseManagement } from './components/admin/CourseManagement';
import { SystemSettings } from './components/admin/SystemSettings';
import { MediaLibrary } from './components/admin/MediaLibrary';
import { ServiceTester } from './components/test/ServiceTester';
import { Documents } from './components/sections/Documents';
import { Statistics } from './components/sections/Statistics';
import { Friends } from './components/sections/Friends';
import { Avatars } from './components/sections/Avatars';
import { Interactions } from './components/sections/Interactions';
import { Settings as SettingsSection } from './components/sections/Settings';
import { Scenarios } from './components/sections/Scenarios';
import { Courses } from './components/sections/Courses';
import { Videos } from './components/sections/Videos';
import { AcademyDocuments } from './components/sections/AcademyDocuments';
import { Certificates } from './components/sections/Certificates';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [authView, setAuthView] = useState<'login' | 'register' | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [voiceInput, setVoiceInput] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Verifica se abbiamo un token JWT nel localStorage
    const checkAuthState = async () => {
      try {
        setIsLoading(true);
        
        // Controlla se l'utente è già autenticato
        if (authService.isAuthenticated()) {
          // Recupera i dati dell'utente
          const user = await authService.getCurrentUser();
          setSession({ user });
          
          // Verifica lo stato admin chiamando il server - garantisce consistenza del ruolo
          const isUserAdmin = await authService.checkAdminStatus();
          
          if (isUserAdmin) {
            console.log('Utente admin verificato dal server, attivando vista admin');
            setIsAdminView(true);
          } else {
            console.log('Utente standard o verifica admin fallita, utilizzando vista utente');
            setIsAdminView(false);
          }
        }
      } catch (error) {
        console.error('Errore durante il controllo dello stato di autenticazione:', error);
        // In caso di errore, pulisci lo stato di autenticazione
        authService.clearAuth();
        setSession(null);
        setIsAdminView(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthState();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      setAuthError(null);
      setIsLoading(true);
      
      // Login con il nostro servizio Express/MongoDB
      const result = await authService.login(email, password);
      
      if (result && result.user) {
        // Se il login ha successo, imposta la sessione con i dati utente
        setSession({ user: result.user });
        
        // Verifica se l'utente è admin
        if (result.user.role === 'ADMIN') {
          console.log('Utente admin rilevato, attivando vista admin');
          setIsAdminView(true);
        } else {
          setIsAdminView(false);
        }
      }
    } catch (error) {
      console.error('Errore durante il login:', error);
      setAuthError(error instanceof Error ? error.message : 'Errore durante il login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    company: string;
  }) => {
    try {
      setAuthError(null);
      setIsLoading(true);
      
      // Verifiche di sicurezza
      const lastRegistrationAttempt = localStorage.getItem('lastRegistrationAttempt');
      if (lastRegistrationAttempt) {
        const timeDiff = Date.now() - parseInt(lastRegistrationAttempt);
        if (timeDiff < 60000) { // 60 secondi
          throw new Error(`Per motivi di sicurezza, attendi ${Math.ceil((60000 - timeDiff) / 1000)} secondi prima di riprovare.`);
        }
      }
      
      // Registrazione con il nostro servizio Express/MongoDB
      const userData = {
        email: data.email,
        password: data.password,
        username: data.username,
        full_name: data.fullName,
        company: data.company
      };
      
      // Salva il timestamp del tentativo
      localStorage.setItem('lastRegistrationAttempt', Date.now().toString());
      
      // Invia richiesta di registrazione
      const result = await authService.register(userData);
      
      if (result && result.user) {
        setAuthError('Registrazione completata con successo! Ora puoi accedere.');
        setAuthView('login');
      }
    } catch (error) {
      console.error('Errore durante la registrazione:', error);
      setAuthError(error instanceof Error ? error.message : 'Errore durante la registrazione');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show auth forms if not authenticated
  if (!session) {
    if (authView === 'register') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
          <RegisterForm
            onSubmit={handleRegister}
            error={authError || undefined}
            isDarkMode={true}
          />
        </div>
      );
    }

    if (authView === 'login') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
          <LoginForm
            onSubmit={handleLogin}
            error={authError || undefined}
            isDarkMode={true}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <Homepage isDarkMode={true} />
        <div className="fixed top-4 right-4 flex items-center gap-2">
          <button
            onClick={() => setAuthView('login')}
            className="px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Accedi
          </button>
          <button
            onClick={() => setAuthView('register')}
            className="px-6 py-2 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
          >
            Registrati
          </button>
        </div>
      </div>
    );
  }

  // Reindirizza alla dashboard in modalità demo
  if (session?.role === 'demo') {
    return (
      <div className={`min-h-screen flex ${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white' : 'bg-gradient-to-br from-blue-50 to-white text-gray-900'}`}>
        <div className="w-64 backdrop-blur-lg p-6 border-r bg-gray-800 bg-opacity-50 border-gray-700">
          <div className="flex items-center gap-2 mb-8">
            <Zap className="w-8 h-8 text-purple-500" />
            <span className="text-xl font-bold">Simulazione AI</span>
            <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">Demo</span>
          </div>
          
          <div className="mt-6 space-y-4">
            <button
              onClick={() => {
                setSession(null);
                setAuthView('login');
              }}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              Accedi per accesso completo
            </button>
            
            <div className="px-4 py-3 bg-gray-700 bg-opacity-50 rounded-lg text-sm">
              <p className="text-gray-300 mb-2">Modalità demo attiva</p>
              <p className="text-gray-400">Funzionalità limitate in questa modalità</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <Dashboard isDarkMode={true} onSectionChange={() => {}} />
        </div>
      </div>
    );
  }
  
  // Show admin interface for admin users
  if (session?.user && isAdminView) {
    return (
      <AdminLayout 
        isDarkMode={isDarkMode} 
        onThemeChange={setIsDarkMode}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      >
        {session.role !== 'demo' ? (
          <>
            {activeSection === 'dashboard' && <AdminDashboard isDarkMode={isDarkMode} />}
            {activeSection === 'users' && <UserManagement isDarkMode={isDarkMode} />}
            {activeSection === 'courses' && <CourseManagement isDarkMode={isDarkMode} />}
            {activeSection === 'media' && <MediaLibrary isDarkMode={isDarkMode} />}
            {activeSection === 'settings' && <SystemSettings isDarkMode={isDarkMode} />}
          </>
        ) : (
          <div className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Demo Mode</h2>
            <p className="text-gray-400 mb-4">You are viewing the application in demo mode. Some features are restricted.</p>
            <button
              onClick={() => setAuthView('login')}
              className="px-6 py-2 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
            >
              Login for Full Access
            </button>
          </div>
        )}
        {activeSection === 'analytics' && <AdminAnalytics isDarkMode={isDarkMode} />}
        {activeSection === 'notifications' && <AdminNotifications isDarkMode={isDarkMode} />}
        {activeSection === 'ai' && <AdminAI isDarkMode={isDarkMode} />}
        {activeSection === 'videos' && <AdminVideos isDarkMode={isDarkMode} />}
        {activeSection === 'documents' && <AdminDocuments isDarkMode={isDarkMode} />}
        {activeSection === 'certificates' && <AdminCertificates isDarkMode={isDarkMode} />}
      </AdminLayout>
    );
  }

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white' : 'bg-gradient-to-br from-blue-50 to-white text-gray-900'}`}>
      {/* Sidebar */}
      <aside className={`w-64 backdrop-blur-lg p-6 border-r ${
        isDarkMode ? 'bg-gray-800 bg-opacity-50 border-gray-700' : 'bg-white bg-opacity-90 border-gray-200 shadow-lg'
      }`}>
        <div className="flex items-center gap-2 mb-8">
          <Zap className="w-8 h-8 text-purple-500" />
          <span className="text-xl font-bold">Simulazione AI</span>
          {session.role === 'demo' && (
            <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full">Demo</span>
          )}
        </div>
        
        <nav className="space-y-2">
          <div className="px-3 py-2">
            <span className="text-sm font-medium text-gray-400">Academy</span>
          </div>
          
          <NavItem 
            icon={<GraduationCap size={20} />} 
            text="Corsi" 
            isDarkMode={isDarkMode}
            active={activeSection === 'corsi'} 
            onClick={() => setActiveSection('corsi')}
          />
          <NavItem 
            icon={<Video size={20} />} 
            text="Video" 
            isDarkMode={isDarkMode}
            active={activeSection === 'video'} 
            onClick={() => setActiveSection('video')}
          />
          <NavItem 
            icon={<BookOpen size={20} />} 
            text="Documenti" 
            isDarkMode={isDarkMode}
            active={activeSection === 'documenti-academy'} 
            onClick={() => setActiveSection('documenti-academy')}
          />
          <NavItem 
            icon={<Award size={20} />} 
            text="Certificati" 
            isDarkMode={isDarkMode}
            active={activeSection === 'certificati'} 
            onClick={() => setActiveSection('certificati')}
          />

          <div className="my-4 border-t border-gray-700"></div>
          
          <div className="px-3 py-2">
            <span className="text-sm font-medium text-gray-400">Simulazione</span>
          </div>

          <NavItem 
            icon={<LayoutGrid size={20} />} 
            text="Dashboard" 
            isDarkMode={isDarkMode}
            active={activeSection === 'dashboard'} 
            onClick={() => setActiveSection('dashboard')}
          />
          <NavItem 
            icon={<FileText size={20} />} 
            text="Documenti" 
            isDarkMode={isDarkMode}
            active={activeSection === 'documenti'} 
            onClick={() => setActiveSection('documenti')}
          />
          <NavItem 
            icon={<BarChart size={20} />} 
            text="Statistiche" 
            isDarkMode={isDarkMode}
            active={activeSection === 'statistiche'} 
            onClick={() => setActiveSection('statistiche')}
          />
          <NavItem 
            icon={<Gamepad2 size={20} />} 
            text="Scenari" 
            isDarkMode={isDarkMode}
            active={activeSection === 'scenari'} 
            onClick={() => setActiveSection('scenari')}
          />
          <NavItem 
            icon={<Users size={20} />} 
            text="Avatar" 
            isDarkMode={isDarkMode}
            active={activeSection === 'avatar'} 
            onClick={() => setActiveSection('avatar')}
          />
          <NavItem 
            icon={<MessageSquare size={20} />} 
            text="Interazioni" 
            isDarkMode={isDarkMode}
            active={activeSection === 'interazioni'} 
            onClick={() => setActiveSection('interazioni')}
          />
          <NavItem 
            icon={<UserPlus size={20} />} 
            text="Amici" 
            isDarkMode={isDarkMode}
            active={activeSection === 'amici'} 
            onClick={() => setActiveSection('amici')}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            text="Impostazioni" 
            isDarkMode={isDarkMode}
            active={activeSection === 'impostazioni'} 
            onClick={() => setActiveSection('impostazioni')}
          />
          
          <NavItem 
            icon={<FileText size={20} />} 
            text="Test Servizi" 
            isDarkMode={isDarkMode}
            active={activeSection === 'test'} 
            onClick={() => setActiveSection('test')}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className={`h-16 border-b backdrop-blur-lg flex items-center justify-between px-6 ${isDarkMode ? 'border-gray-700 bg-gray-800 bg-opacity-50' : 'border-gray-200 bg-white bg-opacity-90 shadow-sm'}`}>
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cerca media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}
              />
            </div>
            
            {/* Pulsante Admin Dashboard - visibile solo agli admin quando sono in modalità utente */}
            {!isAdminView && session?.user && session?.user?.role === 'ADMIN' && (
              <button
                onClick={() => setIsAdminView(true)}
                className={`px-4 py-2 ${
                  isDarkMode 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                } rounded-lg transition-colors ml-2`}
              >
                Admin Dashboard
              </button>
            )}
            
            {/* Pulsante Modalità utente per amministratori */}
            {isAdminView && (
              <button
                onClick={() => setIsAdminView(false)}
                className={`px-4 py-2 ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                } rounded-lg transition-colors ml-2`}
              >
                Modalità utente
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setVoiceInput(!voiceInput)}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${voiceInput ? 'text-purple-500' : ''}`}
            >
              {voiceInput ? <Volume2 size={20} /> : <Mic size={20} />}
            </button>
            <LanguageSwitcher isDarkMode={isDarkMode} />
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
              <Bell size={20} />
            </button>
            <div className="relative group">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  authService.logout().then(() => {
                    setSession(null);
                    setAuthView(null);
                  });
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                  isDarkMode ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                Logout
              </button>
              
              <div className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100 shadow-sm'}`}>
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
                />
                <ChevronDown size={16} />
              </div>
              
              {/* Menu dropdown */}
              <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-10 hidden group-hover:block ${
                isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <button
                  onClick={() => {
                    authService.logout().then(() => {
                      setSession(null);
                      setAuthView(null);
                    });
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Esci
                </button>
              </div>
            </div>
            </div>
          </div>
        </header>

        <main className="p-6 space-y-6 overflow-auto">
          {activeSection === 'corsi' && <Courses isDarkMode={isDarkMode} />}
          {activeSection === 'video' && <Videos isDarkMode={isDarkMode} />}
          {activeSection === 'documenti-academy' && <AcademyDocuments isDarkMode={isDarkMode} />}
          {activeSection === 'certificati' && <Certificates isDarkMode={isDarkMode} />}
          {activeSection === 'dashboard' && <Dashboard isDarkMode={isDarkMode} onSectionChange={setActiveSection} />}
          {activeSection === 'documenti' && <Documents isDarkMode={isDarkMode} />}
          {activeSection === 'avatar' && <Avatars isDarkMode={isDarkMode} />}
          {activeSection === 'statistiche' && <Statistics isDarkMode={isDarkMode} />}
          {activeSection === 'amici' && <Friends isDarkMode={isDarkMode} />}
          {activeSection === 'interazioni' && <Interactions isDarkMode={isDarkMode} />}
          {activeSection === 'impostazioni' && (
            <SettingsSection 
              isDarkMode={isDarkMode}
              voiceInput={voiceInput}
              setIsDarkMode={setIsDarkMode}
              setVoiceInput={setVoiceInput}
            />
          )}
          {activeSection === 'scenari' && <Scenarios isDarkMode={isDarkMode} />}
          {activeSection === 'test' && <ServiceTester isDarkMode={isDarkMode} />}
        </main>
        {session.role === 'demo' && (
          <button
            onClick={() => {
              setSession(null);
              setAuthView('login');
            }}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Accedi per l'accesso completo
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
