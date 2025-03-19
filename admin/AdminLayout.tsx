import React from 'react';
import { 
  LayoutGrid, Users, FileText, Settings, Bell, Search, 
  BookOpen, Video, Award, Brain, BarChart, MessageSquare,
  LogOut, ChevronDown, Sun, Moon
} from 'lucide-react';
import { authService } from '../src/services/auth-service';

interface AdminLayoutProps {
  children: React.ReactNode;
  isDarkMode: boolean;
  onThemeChange: (isDark: boolean) => void;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function AdminLayout({ children, isDarkMode, onThemeChange, activeSection, onSectionChange }: AdminLayoutProps) {
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
      // Reindirizza alla pagina di login o homepage
      window.location.href = '/';
    } catch (error) {
      console.error('Errore durante il logout:', error);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid size={20} /> },
    { id: 'users', label: 'Utenti', icon: <Users size={20} /> },
    { id: 'courses', label: 'Corsi e Video', icon: <BookOpen size={20} /> },
    { id: 'media', label: 'Gestione Media', icon: <FileText size={20} /> },
    { id: 'certificates', label: 'Certificati', icon: <Award size={20} /> },
    { id: 'ai', label: 'Gestione AI', icon: <Brain size={20} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart size={20} /> },
    { id: 'notifications', label: 'Notifiche', icon: <Bell size={20} /> },
    { id: 'settings', label: 'Impostazioni', icon: <Settings size={20} /> }
  ];

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <aside className={`w-64 border-r ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } flex flex-col`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <Brain className="w-8 h-8 text-purple-500" />
            <span className="text-xl font-bold">Admin Panel</span>
          </div>

          <nav className="space-y-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeSection === item.id
                    ? 'bg-purple-500 text-white'
                    : isDarkMode
                    ? 'text-gray-400 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className={`h-16 border-b ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } flex items-center justify-between px-6`}>
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cerca..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                    : 'bg-gray-50 border-gray-200 focus:border-purple-400'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onThemeChange(!isDarkMode)}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button className="relative">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                3
              </span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2"
              >
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop"
                  alt="Admin"
                  className="w-8 h-8 rounded-full"
                />
                <ChevronDown size={16} />
              </button>

              {showUserMenu && (
                <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg border shadow-lg ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="p-2">
                    <button
                      onClick={handleLogout}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
