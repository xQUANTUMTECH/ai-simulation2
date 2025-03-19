import React, { useState } from 'react';
import { Mail, Lock, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  onSubmit: (username: string, password: string) => void;
  error?: string;
  isDarkMode: boolean;
}

export function LoginForm({ onSubmit, error, isDarkMode }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validazione di base
    if (!username.trim() || !password.trim()) {
      return;
    }
    
    setIsLoading(true);
    try {
      await onSubmit(username, password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className={`w-full max-w-md mx-auto p-8 rounded-xl border ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
      data-testid="login-form"
    >
      <h2 className="text-2xl font-bold mb-6 text-center">Accedi</h2>
      
      {error && (
        <div 
          className="mb-4 p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-center gap-2 text-red-500"
          data-testid="login-error"
        >
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="username">Username o Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="Username o email"
              required
              data-testid="username-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="password">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="••••••••"
              required
              data-testid="password-input"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          data-testid="login-button"
        >
          {isLoading ? 'Accesso in corso...' : 'Accedi'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400">
          Non hai un account?{' '}
          <a href="/register" className="text-purple-500 hover:text-purple-600" data-testid="register-link">
            Registrati
          </a>
        </p>
      </div>
    </div>
  );
}
