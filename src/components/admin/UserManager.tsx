import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  UserCheck, 
  UserX, 
  Edit, 
  Mail, 
  Clock, 
  Shield, 
  Eye,
  BarChart4,
  UserCog,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp,
  Calendar
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { adminAuthService } from '../../services/admin-auth-service';

interface UserManagerProps {
  isDarkMode: boolean;
  isAdmin: boolean;
}

interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role: 'USER' | 'ADMIN' | 'INSTRUCTOR';
  account_status: 'active' | 'pending' | 'suspended';
  created_at: string;
  updated_at: string;
  last_login?: string;
  avatar_url?: string;
  email_confirmed: boolean;
}

interface UserStats {
  courses_enrolled: number;
  courses_completed: number;
  certificates_earned: number;
  quizzes_taken: number;
  average_score: number;
  total_time_spent_minutes: number;
  last_active: string;
}

export function UserManager({ isDarkMode, isAdmin }: UserManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<{[key: string]: UserStats}>({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<string[]>([]);

  // Null-safe supabase instance
  const nullSafeSupabase = supabase || 
    { from: () => ({ select: () => ({}) }) };

  useEffect(() => {
    // Solo gli admin possono accedere a questa pagina
    if (!isAdmin) {
      setError('Accesso non autorizzato. Solo gli amministratori possono gestire gli utenti.');
      setLoading(false);
      return;
    }
    
    fetchUsers();
  }, [isAdmin]);

  useEffect(() => {
    if (users.length > 0) {
      applyFilters();
    }
  }, [searchTerm, statusFilter, roleFilter, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verifica che supabase sia disponibile
      if (!supabase) {
        throw new Error('Connessione al database non disponibile');
      }
      
      // Recupera tutti gli utenti
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (err) {
      console.error('Errore nel recupero utenti:', err);
      setError('Si è verificato un errore nel caricamento degli utenti. Riprova più tardi.');
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
      
      // In un caso reale, questa query sarebbe più complessa
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
    }
  };

  const handleViewProfile = (user: User) => {
    setSelectedUser(user);
    setShowProfileModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
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

  const handleUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!selectedUser) return;
    
    try {
      if (!supabase) {
        throw new Error('Connessione al database non disponibile');
      }
      
      // Recupera i dati dal form
      const form = event.currentTarget;
      const fullNameInput = form.elements.namedItem('full_name') as HTMLInputElement;
      const usernameInput = form.elements.namedItem('username') as HTMLInputElement;
      const roleSelect = form.elements.namedItem('role') as HTMLSelectElement;
      const statusSelect = form.elements.namedItem('status') as HTMLSelectElement;
      
      // Prepara i dati da aggiornare
      const updateData = {
        full_name: fullNameInput.value,
        username: usernameInput.value,
        role: roleSelect.value as 'USER' | 'ADMIN' | 'INSTRUCTOR',
        account_status: statusSelect.value as 'active' | 'pending' | 'suspended',
        updated_at: new Date().toISOString()
      };
      
      // Aggiorna l'utente
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', selectedUser.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Aggiorna la lista utenti
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id 
          ? { ...u, ...updateData } 
          : u
      ));
      
      setShowEditModal(false);
    } catch (err) {
      console.error('Errore nell\'aggiornamento dell\'utente:', err);
      alert('Si è verificato un errore nell\'aggiornamento dell\'utente. Riprova più tardi.');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
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
        <div className="overflow-x-auto">
          <table className={`w-full border-collapse ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            <thead>
              <tr className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <th className="px-4 py-3 text-left">Utente</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Ruolo</th>
                <th className="px-4 py-3 text-left">Stato</th>
                <th className="px-4 py-3 text-left">Creato il</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <React.Fragment key={user.id}>
                  <tr 
                    className={`border-b cursor-pointer hover:${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                    } ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                    onClick={() => toggleUserExpanded(user.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 mr-3">
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
                          <p className="font-medium">{user.full_name || user.username || 'N/A'}</p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            @{user.username || 'senza username'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <span>{user.email}</span>
                        {user.email_confirmed ? (
                          <UserCheck className="ml-1 text-green-500" size={16} />
                        ) : (
                          <UserX className="ml-1 text-yellow-500" size={16} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={getRoleColor(user.role)}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(user.account_status)}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProfile(user);
                          }}
                          className={`p-2 rounded-full ${
                            isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                          }`}
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditUser(user);
                          }}
                          className={`p-2 rounded-full ${
                            isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                          }`}
                        >
                          <Edit size={16} />
                        </button>
                        {expandedUsers.includes(user.id) 
                          ? <ChevronUp size={16} /> 
                          : <ChevronDown size={16} />
                        }
                      </div>
                    </td>
                  </tr>
                  
                  {expandedUsers.includes(user.id) && (
                    <tr>
                      <td colSpan={6} className={`px-4 py-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
                            <h4 className="font-medium mb-3 flex items-center">
                              <UserCog className="mr-2" size={18} />
                              Dettagli Utente
                            </h4>
                            
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Nome Completo</p>
                                <p>{user.full_name || 'Non specificato'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Username</p>
                                <p>{user.username || 'Non specificato'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Email</p>
                                <p>{user.email}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Email confermata</p>
                                  <p>{user.email_confirmed ? 'Sì' : 'No'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Ultimo accesso</p>
                                  <p>{user.last_login ? formatDate(user.last_login) : 'N/A'}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Ruolo attuale</p>
                                <div className="flex items-center justify-between mt-1">
                                  <p className={getRoleColor(user.role)}>{user.role}</p>
                                  <div className="flex gap-2">
                                    <button 
                                      className={`px-2 py-1 text-xs rounded ${
                                        user.role === 'USER'
                                          ? isDarkMode ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-700'
                                          : isDarkMode ? 'bg-gray-700 hover:bg-purple-700' : 'bg-gray-200 hover:bg-purple-100'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateUserRole(user.id, 'USER');
                                      }}
                                    >
                                      User
                                    </button>
                                    <button 
                                      className={`px-2 py-1 text-xs rounded ${
                                        user.role === 'INSTRUCTOR'
                                          ? isDarkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700'
                                          : isDarkMode ? 'bg-gray-700 hover:bg-blue-700' : 'bg-gray-200 hover:bg-blue-100'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateUserRole(user.id, 'INSTRUCTOR');
                                      }}
                                    >
                                      Instructor
                                    </button>
                                    <button 
                                      className={`px-2 py-1 text-xs rounded ${
                                        user.role === 'ADMIN'
                                          ? isDarkMode ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-700'
                                          : isDarkMode ? 'bg-gray-700 hover:bg-purple-700' : 'bg-gray-200 hover:bg-purple-100'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateUserRole(user.id, 'ADMIN');
                                      }}
                                    >
                                      Admin
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Stato account</p>
                                <div className="flex items-center justify-between mt-1">
                                  {getStatusBadge(user.account_status)}
                                  <div className="flex gap-2">
                                    <button 
                                      className={`px-2 py-1 text-xs rounded ${
                                        user.account_status === 'active'
                                          ? isDarkMode ? 'bg-green-700 text-white' : 'bg-green-100 text-green-700'
                                          : isDarkMode ? 'bg-gray-700 hover:bg-green-700' : 'bg-gray-200 hover:bg-green-100'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateUserStatus(user.id, 'active');
                                      }}
                                    >
                                      Attiva
                                    </button>
                                    <button 
                                      className={`px-2 py-1 text-xs rounded ${
                                        user.account_status === 'pending'
                                          ? isDarkMode ? 'bg-yellow-700 text-white' : 'bg-yellow-100 text-yellow-800'
                                          : isDarkMode ? 'bg-gray-700 hover:bg-yellow-700' : 'bg-gray-200 hover:bg-yellow-100'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUpdateUserStatus(user.id, 'pending');
                                      }}
                                    >
                                      In attesa
                                    </button>
                                    <button 
                                      className={`px-2 py-1 text-xs rounded ${
                                        user.account_status === 'suspended'
                                          ? isDarkMode ? 'bg-red-700 text-white' : 'bg-
