import React from 'react';
import { UserCog } from 'lucide-react';
import { UserDetailsProps } from './UserTypes';

export function UserDetails({ 
  user, 
  isDarkMode,
  onUpdateUserRole,
  onUpdateUserStatus
}: UserDetailsProps) {
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

  return (
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
                onClick={() => onUpdateUserRole(user.id, 'USER')}
              >
                User
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${
                  user.role === 'INSTRUCTOR'
                    ? isDarkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700'
                    : isDarkMode ? 'bg-gray-700 hover:bg-blue-700' : 'bg-gray-200 hover:bg-blue-100'
                }`}
                onClick={() => onUpdateUserRole(user.id, 'INSTRUCTOR')}
              >
                Instructor
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${
                  user.role === 'ADMIN'
                    ? isDarkMode ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-700'
                    : isDarkMode ? 'bg-gray-700 hover:bg-purple-700' : 'bg-gray-200 hover:bg-purple-100'
                }`}
                onClick={() => onUpdateUserRole(user.id, 'ADMIN')}
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
                onClick={() => onUpdateUserStatus(user.id, 'active')}
              >
                Attiva
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${
                  user.account_status === 'pending'
                    ? isDarkMode ? 'bg-yellow-700 text-white' : 'bg-yellow-100 text-yellow-800'
                    : isDarkMode ? 'bg-gray-700 hover:bg-yellow-700' : 'bg-gray-200 hover:bg-yellow-100'
                }`}
                onClick={() => onUpdateUserStatus(user.id, 'pending')}
              >
                In attesa
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${
                  user.account_status === 'suspended'
                    ? isDarkMode ? 'bg-red-700 text-white' : 'bg-red-100 text-red-800'
                    : isDarkMode ? 'bg-gray-700 hover:bg-red-700' : 'bg-gray-200 hover:bg-red-100'
                }`}
                onClick={() => onUpdateUserStatus(user.id, 'suspended')}
              >
                Sospendi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Funzione di utilità per formattare le date
function formatDate(dateString: string) {
  if (!dateString || dateString === 'N/A') return 'N/A';
  
  return new Date(dateString).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default UserDetails;
