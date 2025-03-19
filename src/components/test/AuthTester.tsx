import React, { useState, useRef } from 'react';
import { CheckCircle, AlertTriangle, Loader, User, Lock, Mail } from 'lucide-react';

interface AuthTesterProps {
  isDarkMode?: boolean;
}

// Componente per testare l'autenticazione con MongoDB
const AuthTester: React.FC<AuthTesterProps> = ({ isDarkMode = true }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginType, setLoginType] = useState<'email' | 'username'>('email');
  
  // Stati per i campi del form
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Credenziali preimpostate per facilitare i test
  const presetCredentials = [
    { label: 'Admin', email: 'direzione@cafasso.it', username: 'direzione', password: 'Caf@sso2025!' },
    { label: 'Utente', email: 'utente@cafasso.it', username: 'utente', password: 'CafassoUser2025!' }
  ];

  // Funzione per selezionare credenziali predefinite
  const selectPreset = (preset: typeof presetCredentials[0]) => {
    if (loginType === 'email') {
      setEmail(preset.email);
      setUsername('');
    } else {
      setEmail('');
      setUsername(preset.username);
    }
    setPassword(preset.password);
  };

// Funzione per eseguire il login
  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    console.log('Tentativo di login con:', loginType === 'email' ? email : username);

    try {
      const loginFn = loginType === 'email' 
        ? (email: string, password: string) => {
            console.log('Chiamata API di login con email:', email);
            return fetch('http://localhost:3000/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
          }
        : (username: string, password: string) => {
            console.log('Chiamata API di login con username:', username);
            return fetch('http://localhost:3000/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password })
            });
          };
      
      const identifier = loginType === 'email' ? email : username;
      const response = await loginFn(identifier, password);
      
      console.log('Stato risposta:', response.status);
      const data = await response.json();
      console.log('Dati risposta:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante il login');
      }

      setResult(data);
    } catch (err: any) {
      console.error('Errore login:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cambio tra login con email o username
  const handleLoginTypeChange = (type: 'email' | 'username') => {
    setLoginType(type);
    setEmail('');
    setUsername('');
  };

  return (
    <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
      <h2 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        Test Autenticazione MongoDB
      </h2>
      
      <div className="mb-6">
        <h3 className={`text-lg font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          Credenziali di test:
        </h3>
        <div className="flex gap-3 mb-6">
          {presetCredentials.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => selectPreset(preset)}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => handleLoginTypeChange('email')}
            className={`px-4 py-2 rounded-lg ${
              loginType === 'email'
                ? isDarkMode 
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-500 text-white'
                : isDarkMode
                ? 'bg-gray-700 text-gray-300'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Login con Email
          </button>
          <button
            onClick={() => handleLoginTypeChange('username')}
            className={`px-4 py-2 rounded-lg ${
              loginType === 'username'
                ? isDarkMode 
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-500 text-white'
                : isDarkMode
                ? 'bg-gray-700 text-gray-300'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Login con Username
          </button>
        </div>
        
        {loginType === 'email' ? (
          <div className="mb-4">
            <label 
              className={`block mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="direzione@cafasso.it"
                className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-white text-gray-800 border-gray-300'
                } border`}
              />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label 
              className={`block mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}
              htmlFor="username"
            >
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <User size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="direzione"
                className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-white text-gray-800 border-gray-300'
                } border`}
              />
            </div>
          </div>
        )}

        <div className="mb-4">
          <label 
            className={`block mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-700 text-white border-gray-600'
                  : 'bg-white text-gray-800 border-gray-300'
              } border`}
            />
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading || (!email && !username) || !password}
          className={`w-full flex justify-center items-center gap-2 px-6 py-2 rounded-lg ${
            loading || (!email && !username) || !password
              ? 'bg-gray-500 cursor-not-allowed'
              : isDarkMode
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-green-500 hover:bg-green-600'
          } text-white`}
        >
          {loading ? (
            <>
              <Loader className="animate-spin" size={18} />
              <span>Login in corso...</span>
            </>
          ) : (
            <>
              <User size={18} />
              <span>Login</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className={`p-4 mb-6 rounded-lg border ${
          isDarkMode 
            ? 'bg-red-900/20 border-red-800 text-red-300' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={18} />
            <h3 className="font-semibold">Errore di autenticazione</h3>
          </div>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className={`p-4 rounded-lg border ${
          isDarkMode 
            ? 'bg-green-900/20 border-green-800 text-green-300' 
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={18} />
            <h3 className="font-semibold">Login riuscito</h3>
          </div>
          <pre className="mt-2 p-2 rounded overflow-auto text-sm max-h-60 whitespace-pre-wrap break-words">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AuthTester;
