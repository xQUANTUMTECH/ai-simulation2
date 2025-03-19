import React, { useState } from 'react';
import { Mail, Lock, User, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RegisterFormProps {
  onSubmit: (data: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    company: string;
  }) => void;
  error?: string;
  isDarkMode: boolean;
}

export function RegisterForm({ onSubmit, error, isDarkMode }: RegisterFormProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    company: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validazione base
    const requiredFields = ['username', 'email', 'password', 'fullName', 'company'];
    const allFieldsFilled = requiredFields.every(field => 
      formData[field as keyof typeof formData].trim() !== ''
    );
    
    if (!allFieldsFilled) {
      return;
    }
    
    setSuccessMessage(null);
    setIsLoading(true);
    
    try {
      await onSubmit(formData);
      setSuccessMessage('Registrazione completata! Ti abbiamo inviato un\'email di conferma. Controlla la tua casella di posta per attivare il tuo account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className={`w-full max-w-md mx-auto p-8 rounded-xl border ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
      data-testid="register-form"
    >
      <h2 className="text-2xl font-bold mb-6 text-center">Registrati</h2>
      
      {successMessage && (
        <div 
          className="mb-4 p-4 bg-green-500 bg-opacity-10 border border-green-500 rounded-lg flex items-center gap-2 text-green-500"
          data-testid="register-success"
        >
          <CheckCircle2 size={20} />
          <p>{successMessage}</p>
        </div>
      )}

      {error && (
        <div 
          className="mb-4 p-4 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg flex items-center gap-2 text-red-500"
          data-testid="register-error"
        >
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="username">Username</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="Scegli un username"
              required
              data-testid="username-input"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="fullName">Nome Completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="Mario Rossi"
              required
              data-testid="fullname-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="company">Azienda</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              id="company"
              type="text"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="Nome Azienda"
              required
              data-testid="company-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="email">Email Aziendale</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="nome@azienda.it"
              required
              data-testid="email-input"
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
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-purple-500' 
                  : 'bg-white border-gray-200 focus:border-purple-400'
              }`}
              placeholder="••••••••"
              required
              minLength={8}
              data-testid="password-input"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">La password deve avere almeno 8 caratteri</p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          data-testid="register-button"
        >
          {isLoading ? 'Registrazione in corso...' : 'Registrati'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400">
          Hai già un account?{' '}
          <a href="/login" className="text-purple-500 hover:text-purple-600" data-testid="login-link">
            Accedi
          </a>
        </p>
      </div>
    </div>
  );
}
