import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Mail, 
  Users, 
  AlertTriangle,
  RefreshCw,
  Database
} from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { adminAuthService } from '../../../services/admin-auth-service';
import { User, UserStats } from './UserTypes';
import UserDetails from './UserDetails';
import UserStatsCard from './UserStatsCard';
import { dbConnection } from '../../../services/db-connection';
import { checkDatabaseConnection } from '../../../services/supabase';

interface UserManagerProps {
  isDarkMode: boolean;
  isAdmin: boolean;
}

export function UserManager({ isDarkMode, isAdmin }: UserManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    error?: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<{[key: string]: UserStats}>({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Solo gli admin possono accedere a questa pagina
    if (!isAdmin) {
      setError('Accesso non autorizzato. Solo gli amministratori possono gestire gli utenti.');
      setLoading(false);
      return;
    }
    
    // Controlla lo stato della connessione al database
    checkConnection();
  }, [isAdmin, retryCount]);

  useEffect(() => {
    if (users.length > 0) {
      applyFilters();
    }
  }, [searchTerm, statusFilter, roleFilter, users]);

  const checkConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const status = await checkDatabaseConnection();
      setConnectionStatus(status);
      
      if (status.connected) {
        await fetchUsers();
      } else {
        setError(`Errore di connessione al database: ${status.error || 'Verifica le credenziali e la connettività'}`);
        setLoading(false);
      }
    } catch (err) {
      console.error('Errore durante il controllo della connessione:', err);
      setConnectionStatus({
        connected: false,
        error: err instanceof Error ? err.message : 'Errore sconosciuto durante la verifica della connessione'
      });
      setError('Impossibile connettersi al database. Riprova più tardi.');
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        throw new Error('Connessione al database non disponibile');
      }
      
      // Recupera tutti gli utenti
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setUsers(data);
        setFilteredUsers(data);
      } else {
        setUsers([]);
        setFilteredUsers([]);
        setError('Nessun utente trovato nel database.');
      }
    } catch (err) {
      console.error('Errore nel recupero utenti:', err);
      setError('Si è verificato un errore nel caricamento degli utenti. Riprova più tardi.');
      // Reimposta la connessione per permettere un nuovo tentativo
      dbConnection.resetConnectionState();
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...users];
    
    // Applica il filtro di ricerca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.email.toLowerCase().includes(term) || 
        user.username?.toLowerCase().includes(term) || 
        user.full_name?.toLowerCase().includes(term)
      );
    }
    
    // Applica il filtro di stato
    if (statusFilter !== 'all') {
      result = result.filter(user => user.account_status === statusFilter);
    }
    
    // Applica il filtro di ruolo
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter);
    }
    
    setFilteredUsers(result);
  };

  const toggleUserExpanded = async (userId: string) => {
    if (expandedUsers.includes(userId)) {
      setExpandedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setExpandedUsers(prev => [...prev, userId]);
      
      // Carica le statistiche dell'utente se non sono già state caricate
      if (!userStats[userId]) {
        await fetchUserStats(userId);
      }
    }
  };

  const fetchUserStats = async (userId: string) => {
    try {
      if (!supabase) {
        throw new Error('Connessione al database non disponibile');
      }
      
      // Recupero dei corsi a cui l'utente è iscritto
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('user_id', userId);
      
      if (enrollmentsError) throw enrollmentsError;
      
      // Recupero delle attività dell'utente
      const { data: activities, error: activitiesError } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (activitiesError) throw activitiesError;
      
      // Recupero dei quiz completati
      const { data: quizzes, error: quizzesError } = await supabase
        .from('quiz_responses')
        .select('*')
        .eq('user_id', userId);
      
      if (quizzesError) throw quizzesError;
      
      // Calcola le statistiche
      const stats: UserStats = {
        courses_enrolled: enrollments?.length || 0,
        courses_completed: enrollments?.filter(e => e.completed)?.length || 0,
        certificates_earned: enrollments?.filter(e => e.certificate_issued)?.length || 0,
        quizzes_taken: quizzes?.length || 0,
        average_score: quizzes?.length 
          ? quizzes.reduce((acc, q) => acc + (q.score || 0), 0) / quizzes.length 
          : 0,
        total_time_spent_minutes: enrollments?.reduce((acc, e) => acc + (e.time_spent_minutes || 0), 0) || 0,
        last_active: activities?.length ? activities[0].created_at : 'N/A'
      };
      
      setUserStats(prev => ({
        ...prev,
        [userId]: stats
      }));
    } catch (err) {
      console.error(`Errore nel recupero delle statistiche per l'utente ${userId}:`, err);
      // In caso di errore, crea statistiche vuote
      const emptyStats: UserStats = {
        courses_enrolled: 0,
        courses_completed: 0,
        certificates_earned: 0,
        quizzes_taken: 0,
        average_score: 0,
        total_time_spent_minutes: 0,
        last_active: 'N/A'
      };
      
      setUserStats(prev => ({
        ...prev,
        [userId]: emptyStats
      }));
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: 'active' | 'pending' | 'suspended') => {
    try {
      if (!supabase) {
        throw new Error('Connessione al database non disponibile');
      }
      
      // Verifica che l'utente corrente sia un admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Autenticazione richiesta');
      
      const isAdmin = await adminAuthService.validateAdminRequest(user.id);
      if (!isAdmin) throw new Error('Permessi insufficienti');
      
      // Aggiorna lo stato dell'utente
      const { error } = await supabase
        .from('users')
        .update({ 
          account_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Aggiorna la lista utenti
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, account_status: newStatus, updated_at: new Date().toISOString() } 
          : u
      ));
    } catch (err) {
      console.error('Errore nell\'aggiornamento dello stato utente:', err);
      alert('Si è verificato un errore nell\'aggiornamento dello stato utente. Riprova più tardi.');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'USER' | 'ADMIN' | 'INSTRUCTOR') => {
    try {
      if (!supabase) {
        throw new Error('Connessione al database non disponibile');
      }
      
      // Verifica che l'utente corrente sia un admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Autenticazione richiesta');
      
      const isAdmin = await adminAuthService.validateAdminRequest(user.id);
      if (!isAdmin) throw new Error('Permessi insufficienti');
      
      // Aggiorna il ruolo dell'utente
      const { error } = await supabase
        .from('users')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      // Aggiorna la lista utenti
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, role: newRole, updated_at: new Date().toISOString() } 
          : u
      ));
    } catch (err) {
      console.error('Errore nell\'aggiornamento del ruolo utente:', err);
      alert('Si è verificato un errore nell\'aggiornamento del ruolo utente. Riprova più tardi.');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return isDarkMode ? 'text-purple-400' : 'text-purple-700';
      case 'INSTRUCTOR':
        return isDarkMode ? 'text-blue-400' : 'text-blue-700';
      default:
        return '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
            Attivo
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
            In Attesa
          </span>
        );
      case 'suspended':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
            Sospeso
          </span>
        );
      default:
        return null;
    }
  };

  const handleRetryConnection = () => {
    // Resetta lo stato della connessione e incrementa il contatore dei tentativi
    dbConnection.resetConnectionState();
    setRetryCount(prevCount => prevCount + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Mostra errore di connessione con pulsante per riprovare
  if (!connectionStatus?.connected) {
    return (
      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <Database className={`${isDarkMode ? 'text-red-400' : 'text-red-500'}`} size={48} />
          <h3 className="text-xl font-medium">Errore di connessione al database</h3>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} max-w-lg`}>
            Non è stato possibile connettersi al database Supabase. Questo potrebbe essere causato da credenziali non valide, problemi di rete o il database potrebbe essere temporaneamente non disponibile.
          </p>
          {connectionStatus?.error && (
            <div className={`p-3 rounded ${isDarkMode ? 'bg-red-900 bg-opacity-20 text-red-300' : 'bg-red-50 text-red-700'} text-sm w-full max-w-lg`}>
              <p className="font-medium">Dettagli errore:</p>
              <p className="font-mono">{connectionStatus.error}</p>
            </div>
          )}
          <button
            onClick={handleRetryConnection}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Riprova connessione
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg flex items-center ${isDarkMode ? 'bg-red-900 bg-opacity-20' : 'bg-red-50'}`}>
        <AlertTriangle className="text-red-500 mr-3" size={20} />
        <p className={isDarkMode ? 'text-red-300' : 'text-red-700'}>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestione Utenti</h2>
        <div className="flex gap-2">
          <button 
            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
            onClick={() => alert('Funzionalità di invito utente da implementare')}
          >
            <Mail size={16} />
            <span className="hidden sm:inline">Invita</span>
          </button>
          <button 
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
            onClick={() => fetchUsers()}
          >
            <Users size={16} />
            <span className="hidden sm:inline">Aggiorna</span>
          </button>
        </div>
      </div>
      
      {/* Filtri e ricerca */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search 
            size={18} 
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} 
          />
          <input
            type="text"
            placeholder="Cerca per nome, email o username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 placeholder-gray-500'
            }`}
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="all">Tutti gli stati</option>
            <option value="active">Attivi</option>
            <option value="pending">In attesa</option>
            <option value="suspended">Sospesi</option>
          </select>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="all">Tutti i ruoli</option>
            <option value="USER">Utenti</option>
            <option value="INSTRUCTOR">Istruttori</option>
            <option value="ADMIN">Amministratori</option>
          </select>
        </div>
      </div>
      
      {/* Lista utenti */}
      {filteredUsers.length === 0 ? (
        <div className={`p-6 rounded-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <Users className={`mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} size={48} />
          <h3 className="text-lg font-medium mb-2">Nessun utente trovato</h3>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
              ? 'Nessun utente corrisponde ai filtri selezionati. Modifica i tuoi criteri di ricerca.'
              : 'Non ci sono utenti registrati nel sistema.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div 
              key={user.id} 
              className={`border rounded-lg overflow-hidden ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <div 
                className={`p-4 flex items-center justify-between cursor-pointer ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}
                onClick={() => toggleUserExpanded(user.id)}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0 mr-3">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.username || user.email} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full rounded-full flex items-center justify-center ${
                        isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-300 text-gray-700'
                      }`}>
                        {(user.full_name || user.username || user.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{user.full_name || user.username || user.email}</p>
                    <div className="flex items-center text-sm">
                      <span className={getRoleColor(user.role)}>{user.role}</span>
                      <span className="mx-2">•</span>
                      {getStatusBadge(user.account_status)}
                    </div>
                  </div>
                </div>
              </div>
              
              {expandedUsers.includes(user.id) && (
                <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <UserDetails 
                      user={user} 
                      isDarkMode={isDarkMode} 
                      onUpdateUserRole={handleUpdateUserRole}
                      onUpdateUserStatus={handleUpdateUserStatus}
                    />
                    
                    {userStats[user.id] ? (
                      <UserStatsCard stats={userStats[user.id]} isDarkMode={isDarkMode} />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserManager;
